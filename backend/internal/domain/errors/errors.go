package errors

import "errors"

// Common domain errors
var (
	// ErrNotFound is returned when a resource is not found
	ErrNotFound = errors.New("the requested item was not found. It may have been deleted or the ID is incorrect")

	// ErrUnauthorized is returned when access is unauthorized
	ErrUnauthorized = errors.New("you need to log in to access this resource")

	// ErrForbidden is returned when access is forbidden
	ErrForbidden = errors.New("you don't have permission to perform this action")

	// ErrConflict is returned when a conflict occurs
	ErrConflict = errors.New("this action conflicts with existing data. Please refresh and try again")

	// ErrInvalidInput is returned when input is invalid
	ErrInvalidInput = errors.New("the provided data is invalid. Please check the fields and try again")

	// ErrInternal is returned when an internal error occurs
	ErrInternal = errors.New("something went wrong on our side. Please try again later")
)
