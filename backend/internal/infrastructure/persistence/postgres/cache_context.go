package postgres

import (
	"context"
	"time"
)

// cacheLoadTimeout bounds a cache-miss database read.
//
// The loader must be bounded even though it runs detached from the request
// context, so a slow query cannot pin the shared singleflight key forever and
// stall every subsequent caller waiting on it.
const cacheLoadTimeout = 5 * time.Second

// cacheLoadContext derives the context used for a cache-miss load inside a
// cached repository decorator.
//
// The load runs under singleflight, so its context is captured from whichever
// caller wins the race and is then shared with every caller that joins the
// in-flight call. Using the request context directly would let one client
// disconnecting mid-query abort the database call and hand context.Canceled to
// all the other waiters, turning a single dropped connection into a burst of
// spurious 500s on a warm cache key.
//
// Detaching with context.WithoutCancel keeps the request's values (trace span,
// logger) while severing its cancellation, so one caller going away cannot
// fail the others. A fresh timeout replaces the deadline the request carried,
// since that request may be finished or about to be.
func cacheLoadContext(ctx context.Context) (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.WithoutCancel(ctx), cacheLoadTimeout)
}
