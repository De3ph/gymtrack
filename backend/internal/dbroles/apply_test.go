package dbroles

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"
)

// fakeExecer records statements and fails the n-th one.
type fakeExecer struct {
	failOn int
	calls  int
}

func (f *fakeExecer) Exec(_ context.Context, sql string, _ ...any) (pgconn.CommandTag, error) {
	f.calls++
	if f.calls == f.failOn {
		return pgconn.CommandTag{}, errors.New("syntax error")
	}
	return pgconn.CommandTag{}, nil
}

// TestApplyRedactsPasswordsInErrors pins that a failing password statement
// never leaks its SQL: the error is logged by cmd/db-roles.
func TestApplyRedactsPasswordsInErrors(t *testing.T) {
	opts := testOptions()
	plan, err := Plan(opts)
	if err != nil {
		t.Fatalf("Plan: %v", err)
	}

	for i, stmt := range plan {
		if !strings.Contains(stmt, secretMarker) {
			continue
		}
		execer := &fakeExecer{failOn: i + 1}
		err := Apply(context.Background(), execer, opts)
		if err == nil {
			t.Fatalf("Apply succeeded despite a failing statement")
		}
		msg := err.Error()
		if !strings.Contains(msg, "redacted") {
			t.Errorf("password statement error is not flagged as redacted: %q", msg)
		}
		if strings.Contains(msg, opts.AppPassword) || strings.Contains(msg, opts.MigratePassword) {
			t.Fatalf("error leaked the role password: %q", msg)
		}
	}
}

// TestApplyIncludesStatementLineForNonSecrets keeps non-secret failures
// diagnosable.
func TestApplyIncludesStatementLineForNonSecrets(t *testing.T) {
	opts := testOptions()
	plan, err := Plan(opts)
	if err != nil {
		t.Fatalf("Plan: %v", err)
	}

	for i, stmt := range plan {
		if strings.Contains(stmt, secretMarker) {
			continue
		}
		execer := &fakeExecer{failOn: i + 1}
		err := Apply(context.Background(), execer, opts)
		if err == nil {
			t.Fatalf("Apply succeeded despite a failing statement")
		}
		if !strings.Contains(err.Error(), firstLine(stmt)) {
			t.Errorf("error %q does not mention the failing statement %q", err, firstLine(stmt))
		}
		return // one non-secret statement is enough
	}
	t.Fatal("plan has no non-secret statement")
}

func TestFirstLine(t *testing.T) {
	tests := map[string]string{
		"GRANT SELECT ON x TO y;":               "GRANT SELECT ON x TO y;",
		"DO $$\nBEGIN\nEND $$;":                 "DO $$",
		"\n  ALTER SCHEMA public OWNER TO x;\n": "ALTER SCHEMA public OWNER TO x;",
	}
	for in, want := range tests {
		if got := firstLine(in); got != want {
			t.Errorf("firstLine(%q) = %q, want %q", in, got, want)
		}
	}
}

// TestPlanStatementCount guards the ordered statement list; changes here are
// deployment-relevant and must be reviewed deliberately.
func TestPlanStatementCount(t *testing.T) {
	plan, err := Plan(testOptions())
	if err != nil {
		t.Fatalf("Plan: %v", err)
	}
	if len(plan) != 14 {
		for _, stmt := range plan {
			t.Logf("%s", firstLine(stmt))
		}
		t.Fatalf("plan has %d statements, want 14", len(plan))
	}
	if got := firstLine(plan[0]); got != "DO $$" {
		t.Fatalf("first statement should create the app role, got %q", got)
	}
	if !strings.Contains(plan[0], testOptions().AppRole) {
		t.Fatalf("first statement does not target the app role")
	}
}
