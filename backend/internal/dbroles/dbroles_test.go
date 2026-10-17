package dbroles

import (
	"strings"
	"testing"

	"github.com/jackc/pgx/v5"
)

func testOptions() Options {
	return Options{
		AppRole:         "gymtrack_app",
		AppPassword:     "s3cret-app",
		MigrateRole:     "gymtrack_migrate",
		MigratePassword: "s3cret-migrate",
		Database:        "gymtrack",
	}
}

func TestOptionsValidate(t *testing.T) {
	if err := testOptions().Validate(); err != nil {
		t.Fatalf("valid options rejected: %v", err)
	}

	tests := []struct {
		name   string
		mutate func(*Options)
		want   string
	}{
		{"missing app role", func(o *Options) { o.AppRole = "" }, "app role"},
		{"missing app password", func(o *Options) { o.AppPassword = "" }, "app password"},
		{"missing migrate role", func(o *Options) { o.MigrateRole = " " }, "migrate role"},
		{"missing migrate password", func(o *Options) { o.MigratePassword = "" }, "migrate password"},
		{"missing database", func(o *Options) { o.Database = "" }, "database"},
		{"same role twice", func(o *Options) { o.MigrateRole = o.AppRole }, "must differ"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			opts := testOptions()
			tc.mutate(&opts)
			err := opts.Validate()
			if err == nil {
				t.Fatalf("expected an error")
			}
			if !strings.Contains(err.Error(), tc.want) {
				t.Fatalf("error %q does not mention %q", err, tc.want)
			}
		})
	}
}

// TestValidateRolesAllowsMissingDatabase pins the split used by cmd/db-roles:
// role credentials are validated before connecting, the database name only
// after (it is read from the connection).
func TestValidateRolesAllowsMissingDatabase(t *testing.T) {
	opts := testOptions()
	opts.Database = ""
	if err := opts.ValidateRoles(); err != nil {
		t.Fatalf("ValidateRoles rejected valid credentials: %v", err)
	}
	if err := opts.Validate(); err == nil {
		t.Fatalf("Validate accepted a missing database name")
	}

	opts = testOptions()
	opts.AppPassword = ""
	if err := opts.ValidateRoles(); err == nil {
		t.Fatalf("ValidateRoles accepted a missing app password")
	}
}

// TestPlanTransfersOwnershipOfEveryRelkind guards the fix for objects left
// owned by postgres: views, materialized views, standalone sequences, foreign
// tables and types would otherwise block future migrations with
// "must be owner of ...".
func TestPlanTransfersOwnershipOfEveryRelkind(t *testing.T) {
	plan, err := Plan(testOptions())
	if err != nil {
		t.Fatalf("Plan: %v", err)
	}
	joined := strings.Join(plan, "\n")

	for _, want := range []string{
		`c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')`,
		`WHEN 'v' THEN 'VIEW'`,
		`WHEN 'm' THEN 'MATERIALIZED VIEW'`,
		`WHEN 'S' THEN 'SEQUENCE'`,
		`WHEN 'f' THEN 'FOREIGN TABLE'`,
		`t.typtype IN ('e', 'c', 'd')`,
		`p.prokind IN ('f', 'p')`,
	} {
		if !strings.Contains(joined, want) {
			t.Errorf("ownership transfer is missing %q", want)
		}
	}

	// A plain `pg_sequences` loop misses orphan sequences; the fix must query
	// pg_class so every sequence in the schema is handled.
	if strings.Contains(joined, "FROM pg_sequences") {
		t.Errorf("ownership transfer still relies on pg_sequences")
	}
}

func TestPlanGrants(t *testing.T) {
	plan, err := Plan(testOptions())
	if err != nil {
		t.Fatalf("Plan: %v", err)
	}
	joined := strings.Join(plan, "\n")

	mustContain := []string{
		`ALTER SCHEMA public OWNER TO "gymtrack_migrate";`,
		`REVOKE CREATE ON SCHEMA public FROM PUBLIC;`,
		`GRANT USAGE ON SCHEMA public TO "gymtrack_app";`,
		`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "gymtrack_app";`,
		`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "gymtrack_app";`,
		`ALTER DEFAULT PRIVILEGES FOR ROLE "gymtrack_migrate" IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "gymtrack_app";`,
	}
	for _, want := range mustContain {
		if !strings.Contains(joined, want) {
			t.Errorf("plan is missing statement %q", want)
		}
	}

	// The app role must never receive DDL rights.
	for _, forbidden := range []string{
		`GRANT CREATE ON SCHEMA public TO "gymtrack_app"`,
		`GRANT ALL`,
		`SUPERUSER`,
	} {
		if strings.Contains(joined, forbidden) {
			t.Errorf("plan must not contain %q", forbidden)
		}
	}
}

func TestPlanQuotesIdentifiersAndPasswords(t *testing.T) {
	opts := testOptions()
	opts.AppRole = `app"; DROP TABLE users; --`
	opts.AppPassword = `pa'ss\word`

	plan, err := Plan(opts)
	if err != nil {
		t.Fatalf("Plan: %v", err)
	}
	joined := strings.Join(plan, "\n")

	quotedRole := pgx.Identifier{opts.AppRole}.Sanitize()
	if quotedRole != `"app""; DROP TABLE users; --"` {
		t.Fatalf("unexpected identifier quoting: %s", quotedRole)
	}
	if !strings.Contains(joined, quotedRole) {
		t.Fatalf("plan does not use the quoted identifier")
	}
	// Single quotes are doubled; the backslash stays literal because
	// standard_conforming_strings is on.
	if !strings.Contains(joined, `PASSWORD 'pa''ss\word'`) {
		t.Fatalf("password literal was not escaped correctly")
	}
}
