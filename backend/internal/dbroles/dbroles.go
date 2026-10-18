// Package dbroles provisions the least-privilege PostgreSQL roles used in
// production deployments:
//
//   - <migrate role> owns the schema objects and is used only by the migration
//     runner (DDL).
//   - <app role> can only run DML on the public schema; it cannot create or
//     alter objects. This is the role the API connects as.
//
// Provisioning is idempotent: it creates missing roles, rotates their
// passwords, transfers ownership of existing objects to the migration role and
// (re)applies grants. It must be run with a superuser (or CREATEROLE + owner)
// connection before migrations, and again after a restore if object ownership
// was lost.
package dbroles

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// Execer is the subset of pgx used by Apply. *pgx.Conn and *pgxpool.Pool both
// satisfy it.
type Execer interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

// Options describes the roles to provision.
type Options struct {
	// AppRole is the login role the API uses (DML only).
	AppRole string
	// AppPassword is the password for AppRole.
	AppPassword string
	// MigrateRole is the login role the migration runner uses (owns objects).
	MigrateRole string
	// MigratePassword is the password for MigrateRole.
	MigratePassword string
	// Database is the application database name (grants are database-scoped).
	Database string
}

// Validate rejects incomplete options before any SQL runs.
func (o Options) Validate() error {
	if err := o.validateRoles(); err != nil {
		return err
	}
	return checkIdentifierValue("database", o.Database)
}

// ValidateRoles checks the role names and passwords only. Callers use it to
// fail fast before opening a connection; the database name is usually learned
// from that connection.
func (o Options) ValidateRoles() error { return o.validateRoles() }

func (o Options) validateRoles() error {
	fields := []struct {
		name  string
		value string
	}{
		{"app role", o.AppRole},
		{"app password", o.AppPassword},
		{"migrate role", o.MigrateRole},
		{"migrate password", o.MigratePassword},
	}
	for _, f := range fields {
		if err := checkIdentifierValue(f.name, f.value); err != nil {
			return err
		}
	}
	if o.AppRole == o.MigrateRole {
		return fmt.Errorf("dbroles: app role and migrate role must differ")
	}
	return nil
}

// checkIdentifierValue rejects empty values and NUL bytes. Both role names and
// passwords end up inside quoted literals; a NUL byte cannot be represented in
// a PostgreSQL string literal at all.
func checkIdentifierValue(name, value string) error {
	if strings.TrimSpace(value) == "" {
		return fmt.Errorf("dbroles: %s must not be empty", name)
	}
	if strings.ContainsRune(value, '\x00') {
		return fmt.Errorf("dbroles: %s must not contain NUL bytes", name)
	}
	return nil
}

// Plan returns the ordered, idempotent SQL statements that provision the roles.
// Passwords are embedded as quoted literals; identifiers are quoted as well, so
// callers must not pre-quote anything.
//
// Note: PostgreSQL has no parameterised ALTER ROLE, so the passwords appear in
// the generated SQL. Apply never logs it, but the server writes utility
// statements to the log when log_statement is `all` or `ddl`; keep the default
// (`none`) in production, or audit only `role` statements with pgaudit.
func Plan(o Options) ([]string, error) {
	if err := o.Validate(); err != nil {
		return nil, err
	}

	app := pgx.Identifier{o.AppRole}.Sanitize()
	migrate := pgx.Identifier{o.MigrateRole}.Sanitize()
	db := pgx.Identifier{o.Database}.Sanitize()

	statements := []string{
		createRoleStmt(o.AppRole),
		setPasswordStmt(o.AppRole, o.AppPassword),
		createRoleStmt(o.MigrateRole),
		setPasswordStmt(o.MigrateRole, o.MigratePassword),

		fmt.Sprintf("GRANT CONNECT ON DATABASE %s TO %s, %s;", db, app, migrate),

		// The migration role owns the schema so future migrations can create
		// and alter objects without running as superuser.
		fmt.Sprintf("ALTER SCHEMA public OWNER TO %s;", migrate),
		"REVOKE CREATE ON SCHEMA public FROM PUBLIC;",
		fmt.Sprintf("GRANT USAGE ON SCHEMA public TO %s;", app),

		// Take ownership of objects created before this role existed (for
		// example a database migrated while running as postgres). Covers every
		// relkind the migration role may later ALTER, DROP or CREATE OR
		// REPLACE: tables (incl. partitioned), views, materialized views,
		// sequences (incl. identity/serial not tied to a column) and foreign
		// tables, plus standalone enum/composite types and plain functions.
		// Anything left owned by another role blocks future migrations
		// ("must be owner of ...").
		transferOwnershipStmt(o.MigrateRole),

		fmt.Sprintf("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %s;", app),
		fmt.Sprintf("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %s;", app),

		// Future objects created by the migration role automatically grant the
		// app role DML, so new migrations do not need a follow-up provisioning
		// run.
		fmt.Sprintf("ALTER DEFAULT PRIVILEGES FOR ROLE %s IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %s;", migrate, app),
		fmt.Sprintf("ALTER DEFAULT PRIVILEGES FOR ROLE %s IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %s;", migrate, app),
	}

	return statements, nil
}

// Apply runs Plan against the given connection.
func Apply(ctx context.Context, conn Execer, o Options) error {
	statements, err := Plan(o)
	if err != nil {
		return err
	}
	for _, stmt := range statements {
		if _, err := conn.Exec(ctx, stmt); err != nil {
			// Password-bearing statements are redacted: logging the SQL would
			// leak the role password into structured logs. Other statements are
			// reduced to their first line to keep the error actionable.
			if strings.Contains(stmt, secretMarker) {
				return fmt.Errorf("dbroles: provisioning statement failed (redacted): %w", err)
			}
			return fmt.Errorf("dbroles: provisioning statement failed: %s: %w", firstLine(stmt), err)
		}
	}
	return nil
}

// firstLine returns the first non-empty line of a SQL statement, trimmed for
// logging.
func firstLine(stmt string) string {
	for _, line := range strings.Split(stmt, "\n") {
		if line = strings.TrimSpace(line); line != "" {
			return line
		}
	}
	return ""
}

// createRoleStmt creates the role when missing. CREATE ROLE has no IF NOT
// EXISTS, hence the DO block.
func createRoleStmt(role string) string {
	return fmt.Sprintf(`DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = %s) THEN
    CREATE ROLE %s LOGIN;
  END IF;
END $$;`, quoteLiteral(role), pgx.Identifier{role}.Sanitize())
}

// setPasswordStmt rotates the password on every run so a changed secret in
// .env takes effect. This statement contains the plaintext password, so it is
// recognised by secretMarker and never echoed in an error message.
func setPasswordStmt(role, password string) string {
	return fmt.Sprintf("ALTER ROLE %s WITH LOGIN PASSWORD %s;",
		pgx.Identifier{role}.Sanitize(), quoteLiteral(password))
}

// secretMarker identifies statements holding a password.
const secretMarker = "PASSWORD"

// transferOwnershipStmt moves ownership of every object in the public schema
// to role. Safe to re-run; objects already owned by role are skipped.
func transferOwnershipStmt(role string) string {
	r := quoteLiteral(role)
	return fmt.Sprintf(`DO $$
DECLARE obj record;
BEGIN
  FOR obj IN
    SELECT c.relname, c.relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
      AND c.relowner <> (SELECT oid FROM pg_roles WHERE rolname = %[1]s)
  LOOP
    EXECUTE format('ALTER %%s public.%%I OWNER TO %%I',
      CASE obj.relkind
        WHEN 'r' THEN 'TABLE'
        WHEN 'p' THEN 'TABLE'
        WHEN 'v' THEN 'VIEW'
        WHEN 'm' THEN 'MATERIALIZED VIEW'
        WHEN 'S' THEN 'SEQUENCE'
        WHEN 'f' THEN 'FOREIGN TABLE'
      END, obj.relname, %[1]s);
  END LOOP;
  FOR obj IN
    SELECT t.typname
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typtype IN ('e', 'c', 'd')
      AND NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.reltype = t.oid)
      AND t.typowner <> (SELECT oid FROM pg_roles WHERE rolname = %[1]s)
  LOOP
    EXECUTE format('ALTER TYPE public.%%I OWNER TO %%I', obj.typname, %[1]s);
  END LOOP;
  FOR obj IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args, p.prokind
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind IN ('f', 'p')
      AND p.proowner <> (SELECT oid FROM pg_roles WHERE rolname = %[1]s)
  LOOP
    EXECUTE format('ALTER %%s public.%%I(%%s) OWNER TO %%I',
      CASE obj.prokind WHEN 'p' THEN 'PROCEDURE' ELSE 'FUNCTION' END,
      obj.proname, obj.args, %[1]s);
  END LOOP;
END $$;`, r)
}

// quoteLiteral renders a string literal for standard_conforming_strings = on
// (the server default): only single quotes are doubled. Role passwords never
// need to be interpreted as SQL.
func quoteLiteral(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "''") + "'"
}
