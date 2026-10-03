package services

import "time"

// parseRFC3339 parses a single RFC3339 date value.
func parseRFC3339(value string) (time.Time, error) {
	t, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return time.Time{}, NewServiceError("Invalid date format. Please use RFC3339 format, e.g. 2026-09-06T00:00:00Z", "INVALID_DATE")
	}
	return t, nil
}

// parseRFC3339Range parses an RFC3339 start/end date pair.
func parseRFC3339Range(startStr, endStr string) (*time.Time, *time.Time, error) {
	start, err1 := parseRFC3339(startStr)
	end, err2 := parseRFC3339(endStr)
	if err1 != nil || err2 != nil {
		return nil, nil, NewServiceError("Invalid date format. Please use RFC3339 format, e.g. 2026-09-06T00:00:00Z", "INVALID_DATE")
	}
	return &start, &end, nil
}
