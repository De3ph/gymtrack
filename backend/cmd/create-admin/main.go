// Command create-admin provisions (or re-provisions) the first administrator
// account. The public registration endpoint only accepts the trainer and athlete
// roles, so the initial admin has to be created out of band; this command is
// that out-of-band path and is meant to be run once per deployment, right after
// cmd/migrate.
//
// Configuration comes from ADMIN_EMAIL / ADMIN_PASSWORD (plus the optional
// ADMIN_USERNAME) or from the equivalent command-line flags. Flags win over
// the environment. ADMIN_PASSWORD_FILE points at a mounted secret file and is
// preferred over ADMIN_PASSWORD, so deploy pipelines need not put the password
// in an env var.
//
//	go run cmd/create-admin/main.go -email admin@example.com -password 'secret'
//
// The command is idempotent and safe to run on every deploy. When the email
// already exists the account is promoted to admin and reactivated; the password
// is only reset when one is supplied, so a redeploy does not silently invalidate
// the admin's password or their sessions. When a password is reset (or the role
// actually changes) token_version is bumped, which invalidates tokens issued
// before the promotion.
package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/joho/godotenv"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	logger "gymtrack-backend/internal/infrastructure/log"
)

const connectTimeout = 30 * time.Second

type options struct {
	Email    string
	Username string
	Password string
	DSN      string

	// passwordHash is the bcrypt digest of Password, or empty when no password
	// was supplied. It is passed to SQL as a nullable parameter so a redeploy can
	// promote an account without touching its stored password.
	passwordHash *string
}

func main() {
	logger.InitConsole()
	defer logger.Sync()

	if err := run(); err != nil {
		zap.L().Fatal("create-admin failed", zap.Error(err))
	}
}

func run() error {
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")
	_ = godotenv.Load("../../.env")

	opts := parseFlags()

	if err := opts.validate(); err != nil {
		return err
	}
	if err := opts.hashPassword(); err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), connectTimeout)
	defer cancel()

	conn, err := pgx.Connect(ctx, opts.DSN)
	if err != nil {
		return fmt.Errorf("connect: %w", err)
	}
	defer func() { _ = conn.Close(context.Background()) }()

	userID, created, err := upsertAdmin(ctx, conn, opts)
	if err != nil {
		return err
	}

	if opts.Password == "" {
		zap.L().Info("no admin password supplied; keeping the stored one")
	}

	action := "promoted"
	if created {
		action = "created"
	}
	fmt.Printf("admin %s: %s (user_id=%d)\n", opts.Email, action, userID)
	return nil
}

func parseFlags() options {
	var opts options

	flag.StringVar(&opts.Email, "email", "", "admin email address (falls back to ADMIN_EMAIL)")
	flag.StringVar(&opts.Username, "username", "", "admin username (falls back to ADMIN_USERNAME, then the email local part)")
	flag.StringVar(&opts.Password, "password", "", "admin password (falls back to ADMIN_PASSWORD_FILE, then ADMIN_PASSWORD)")
	flag.StringVar(&opts.DSN, "dsn", "", "PostgreSQL DSN (falls back to POSTGRES_ADMIN_DSN, then POSTGRES_DSN)")
	flag.Parse()

	if opts.Email == "" {
		opts.Email = os.Getenv("ADMIN_EMAIL")
	}
	if opts.Username == "" {
		opts.Username = os.Getenv("ADMIN_USERNAME")
	}
	if opts.Password == "" {
		opts.Password = readSecret(os.Getenv("ADMIN_PASSWORD_FILE"))
	}
	if opts.Password == "" {
		opts.Password = os.Getenv("ADMIN_PASSWORD")
	}
	if opts.DSN == "" {
		opts.DSN = firstNonEmpty(os.Getenv("POSTGRES_ADMIN_DSN"), os.Getenv("POSTGRES_DSN"))
	}
	if opts.Username == "" {
		opts.Username = defaultUsername(opts.Email)
	}

	return opts
}

// readSecret reads a password from a file, preferring it over ADMIN_PASSWORD so
// deploy pipelines can use a mounted secret file instead of an env var.
func readSecret(path string) string {
	if path == "" {
		return ""
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		zap.L().Warn("cannot read ADMIN_PASSWORD_FILE, falling back", zap.String("path", path), zap.Error(err))
		return ""
	}
	return strings.TrimRight(string(raw), "\r\n")
}

// validate rejects incomplete or unsafe input before any connection is opened,
// so a misconfigured deployment fails fast without touching the database.
//
// A password is not required here: it is only needed to create a missing
// account. upsertAdmin rejects it at that point, when it knows the account does
// not exist yet.
func (o options) validate() error {
	if o.Email == "" {
		return fmt.Errorf("admin email is required: pass -email or set ADMIN_EMAIL")
	}
	if o.DSN == "" {
		return fmt.Errorf("no DSN available: set POSTGRES_ADMIN_DSN or POSTGRES_DSN")
	}
	if o.Username == "" {
		return fmt.Errorf("admin username is required: pass -username or set ADMIN_USERNAME")
	}
	if len(o.Username) > 30 {
		return fmt.Errorf("username %q exceeds the 30 character limit of users.username", o.Username)
	}
	return nil
}

// hashPassword digests the supplied password once, up front, so the slow bcrypt
// cost is not paid inside the database round trip. A nil result means "keep the
// stored password".
func (o *options) hashPassword() error {
	if o.Password == "" {
		return nil
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(o.Password), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}
	digest := string(hash)
	o.passwordHash = &digest
	return nil
}

// defaultUsername derives a fallback username from the email local part. Callers
// apply it only after the email is known.
func defaultUsername(email string) string {
	for i := 0; i < len(email); i++ {
		if email[i] == '@' {
			if i == 0 {
				return "admin"
			}
			return email[:i]
		}
	}
	return "admin"
}

// upsertAdmin inserts the admin when the email is unknown, otherwise promotes
// the existing account. The password is only applied when one was supplied,
// which keeps a redeploy from resetting it. Returning created lets the caller
// report which path ran.
func upsertAdmin(ctx context.Context, conn *pgx.Conn, opts options) (userID int, created bool, err error) {
	var existingID int
	var existingRole, existingStatus string
	var deleted bool

	lookupErr := conn.QueryRow(ctx,
		`SELECT user_id, role, status, deleted_at IS NOT NULL
		 FROM users WHERE email = $1`, opts.Email).
		Scan(&existingID, &existingRole, &existingStatus, &deleted)

	switch {
	case lookupErr == nil:
		// Existing account: force it into a usable admin state. token_version is
		// bumped only when something actually changed, so a no-op redeploy does
		// not log the admin out.
		needsUpdate := existingRole != "admin" || existingStatus != "active" || deleted
		if opts.Password != "" {
			needsUpdate = true
		}
		if !needsUpdate {
			return existingID, false, nil
		}

		if _, err := conn.Exec(ctx,
			`UPDATE users
			 SET role = 'admin',
			     status = 'active',
			     deleted_at = NULL,
			     password_hash = COALESCE($1, password_hash),
			     token_version = token_version + 1,
			     updated_at = NOW()
			 WHERE user_id = $2`,
			opts.passwordHash, existingID); err != nil {
			return 0, false, fmt.Errorf("promote user: %w", err)
		}
		return existingID, false, nil

	case lookupErr != pgx.ErrNoRows:
		return 0, false, fmt.Errorf("lookup user: %w", lookupErr)
	}

	if opts.Password == "" {
		return 0, false, fmt.Errorf("user %s does not exist and no password was supplied: pass -password or set ADMIN_PASSWORD", opts.Email)
	}

	if err := conn.QueryRow(ctx,
		`INSERT INTO users (username, email, password_hash, role, profile)
		 VALUES ($1, $2, $3, 'admin', '{}'::jsonb)
		 RETURNING user_id`,
		opts.Username, opts.Email, *opts.passwordHash).Scan(&userID); err != nil {
		return 0, false, fmt.Errorf("create user: %w", err)
	}
	return userID, true, nil
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}
