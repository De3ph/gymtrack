package repositories

import "context"

// TransactionManager runs a unit of work inside a single database transaction.
//
// Implementations must join a transaction already carried by ctx instead of
// starting a nested one. That is what lets a service compose aggregate writes
// (establish a relationship, project it onto the athlete's profile, and update
// the request that caused it) without needing to know whether its caller is
// already inside a transaction.
type TransactionManager interface {
	WithinTransaction(ctx context.Context, fn func(ctx context.Context) error) error
}
