package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"gymtrack-backend/internal/config"

	"github.com/couchbase/gocb/v2"
)

func main() {
	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "Usage: %s <command> [options]\n\n", os.Args[0])
		fmt.Fprintln(os.Stderr, "Migrate GymTrack data from Couchbase to PostgreSQL.")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "Commands:")
		fmt.Fprintln(os.Stderr, "  export    Export data from Couchbase to JSONL files")
		fmt.Fprintln(os.Stderr, "  load      Load data from Couchbase into PostgreSQL")
		fmt.Fprintln(os.Stderr, "  verify    Verify migration integrity between Couchbase and PostgreSQL")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "Options:")
		flag.PrintDefaults()
	}

	if len(os.Args) < 2 {
		flag.Usage()
		os.Exit(1)
	}

	cmd := os.Args[1]

	if cmd == "--help" || cmd == "-h" || cmd == "help" {
		flag.Usage()
		os.Exit(0)
	}

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		fmt.Println("\nShutting down...")
		os.Exit(0)
	}()

	switch cmd {
	case "export":
		cmdExport()
	case "load":
		cmdLoad()
	case "verify":
		cmdVerify()
	default:
		fmt.Fprintf(os.Stderr, "Unknown command: %s\n\n", cmd)
		flag.Usage()
		os.Exit(1)
	}
}

func cmdExport() {
	exportCmd := flag.NewFlagSet("export", flag.ExitOnError)
	couchbaseConn := exportCmd.String("couchbase-connection-string", "couchbase://localhost", "Couchbase connection string")
	couchbaseUser := exportCmd.String("couchbase-username", "Administrator", "Couchbase username")
	couchbasePass := exportCmd.String("couchbase-password", "password", "Couchbase password")
	couchbaseBucket := exportCmd.String("couchbase-bucket", "gymtrack", "Couchbase bucket name")
	outputDir := exportCmd.String("output", "migrations/data", "Output directory for JSONL files")

	exportCmd.Parse(os.Args[2:])

	_ = couchbaseConn
	_ = couchbaseUser
	_ = couchbasePass
	_ = couchbaseBucket
	_ = outputDir

	fmt.Println("export: not implemented")
}

func cmdLoad() {
	loadCmd := flag.NewFlagSet("load", flag.ExitOnError)
	couchbaseURL := loadCmd.String("couchbase-url", "couchbase://localhost", "Couchbase URL")
	couchbaseUser := loadCmd.String("couchbase-user", "Administrator", "Couchbase username")
	couchbasePass := loadCmd.String("couchbase-pass", "password", "Couchbase password")
	couchbaseBucket := loadCmd.String("couchbase-bucket", "gymtrack", "Couchbase bucket name")
	pgDSN := loadCmd.String("pg-dsn", "postgres://postgres:password@localhost:5432/gymtrack?sslmode=disable", "PostgreSQL connection string")

	loadCmd.Parse(os.Args[2:])

	if err := os.Setenv("COUCHBASE_BUCKET", *couchbaseBucket); err != nil {
		fmt.Fprintf(os.Stderr, "set bucket env: %v\n", err)
		os.Exit(1)
	}

	cluster, err := gocb.Connect(*couchbaseURL, gocb.ClusterOptions{
		Authenticator: gocb.PasswordAuthenticator{
			Username: *couchbaseUser,
			Password: *couchbasePass,
		},
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "connect to Couchbase: %v\n", err)
		os.Exit(1)
	}
	defer cluster.Close(nil)

	bucket := cluster.Bucket(*couchbaseBucket)
	if err := bucket.WaitUntilReady(10*time.Second, nil); err != nil {
		fmt.Fprintf(os.Stderr, "wait for bucket: %v\n", err)
		os.Exit(1)
	}

	pool, err := config.ProvidePostgresPool(&config.PostgresConfig{DSN: *pgDSN})
	if err != nil {
		fmt.Fprintf(os.Stderr, "connect to PostgreSQL: %v\n", err)
		os.Exit(1)
	}
	defer pool.Close()

	ctx := context.Background()
	if err := RunMigration(ctx, cluster, pool); err != nil {
		fmt.Fprintf(os.Stderr, "migration failed: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("migration completed")
}

func cmdVerify() {
	verifyCmd := flag.NewFlagSet("verify", flag.ExitOnError)
	couchbaseConn := verifyCmd.String("couchbase-connection-string", "couchbase://localhost", "Couchbase connection string")
	couchbaseUser := verifyCmd.String("couchbase-username", "Administrator", "Couchbase username")
	couchbasePass := verifyCmd.String("couchbase-password", "password", "Couchbase password")
	couchbaseBucket := verifyCmd.String("couchbase-bucket", "gymtrack", "Couchbase bucket name")
	pgDSN := verifyCmd.String("pg-dsn", "postgres://postgres:password@localhost:5432/gymtrack?sslmode=disable", "PostgreSQL connection string")

	verifyCmd.Parse(os.Args[2:])

	_ = couchbaseConn
	_ = couchbaseUser
	_ = couchbasePass
	_ = couchbaseBucket
	_ = pgDSN

	fmt.Println("verify: not implemented")
}
