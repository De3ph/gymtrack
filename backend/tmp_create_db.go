package main

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, "postgres://postgres:123456@localhost:5432/postgres?sslmode=disable")
	if err != nil {
		panic(err)
	}
	defer pool.Close()
	_, err = pool.Exec(ctx, "DROP DATABASE IF EXISTS gymtrack_verify")
	if err != nil {
		panic(err)
	}
	_, err = pool.Exec(ctx, "CREATE DATABASE gymtrack_verify")
	if err != nil {
		panic(err)
	}
	fmt.Println("created gymtrack_verify")
}
