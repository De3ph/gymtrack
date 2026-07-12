package errors

import "errors"

// Common domain errors
var (
	// ErrNotFound is returned when a resource is not found
	ErrNotFound = errors.New("resource not found")

	// ErrUnauthorized is returned when access is unauthorized
	ErrUnauthorized = errors.New("unauthorized access")

	// ErrForbidden is returned when access is forbidden
	ErrForbidden = errors.New("forbidden access")

	// ErrConflict is returned when a conflict occurs
	ErrConflict = errors.New("resource conflict")

	// ErrInvalidInput is returned when input is invalid
	ErrInvalidInput = errors.New("invalid input")

	// ErrInternal is returned when an internal error occurs
	ErrInternal = errors.New("internal server error")
)
