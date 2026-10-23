package services

import (
	"context"

	"gymtrack-backend/internal/domain/repositories"
)

// directTransactions runs a unit of work without opening a transaction.
//
// It is only used when a service is constructed without a TransactionManager,
// which happens in unit tests that exercise business rules in isolation. The
// application always wires the PostgreSQL manager.
type directTransactions struct{}

func (directTransactions) WithinTransaction(ctx context.Context, fn func(context.Context) error) error {
	return fn(ctx)
}

func transactionManagerOrDefault(transactions repositories.TransactionManager) repositories.TransactionManager {
	if transactions == nil {
		return directTransactions{}
	}
	return transactions
}
