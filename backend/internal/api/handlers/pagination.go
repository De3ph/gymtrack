package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

// listPagination reads the `limit`/`offset` query parameters for a paginated
// list endpoint. A missing limit falls back to defaultLimit; any given limit
// is clamped to maxLimit so a caller cannot request an unbounded read. Backward
// compatible for clients that send no parameters: they get defaultLimit rows
// plus the total count.
func listPagination(c *gin.Context, defaultLimit, maxLimit int) (limit int, offset int) {
	limit = defaultLimit
	if raw := c.Query("limit"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed >= 0 {
			limit = parsed
		}
	}
	if limit > maxLimit {
		limit = maxLimit
	}
	if limit <= 0 {
		limit = defaultLimit
	}

	offset = 0
	if raw := c.Query("offset"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			offset = parsed
		}
	}
	return limit, offset
}
