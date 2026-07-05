package main

import (
	"flag"
	"fmt"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "Usage: %s <command> [options]\n\n", os.Args[0])
		fmt.Fprintln(os.Stderr, "Commands:")
		fmt.Fprintln(os.Stderr, "  export    Export data from Couchbase to JSONL files")
		fmt.Fprintln(os.Stderr, "  load      Load data from JSONL files into PostgreSQL")
		fmt.Fprintln(os.Stderr, "  verify    Verify migration integrity between Couchbase and PostgreSQL")
		flag.PrintDefaults()
	}

	if len(os.Args) < 2 {
		flag.Usage()
		os.Exit(1)
	}

	cmd := os.Args[1]

	// Graceful shutdown on SIGINT/SIGTERM
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
	pgDSN := loadCmd.String("pg-dsn", "postgres://postgres:password@localhost:5432/gymtrack?sslmode=disable", "PostgreSQL connection string")
	inputDir := loadCmd.String("input", "migrations/data", "Input directory for JSONL files")

	loadCmd.Parse(os.Args[2:])

	_ = pgDSN
	_ = inputDir

	fmt.Println("load: not implemented")
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
