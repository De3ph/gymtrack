package config

import "time"

// DefaultQueryTimeout is the default server-side timeout applied to all N1QL queries.
const DefaultQueryTimeout = 30 * time.Second
