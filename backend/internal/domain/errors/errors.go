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

	// ErrInvalidMedia is returned when an exercise's demonstration asset cannot
	// be rendered: an unsupported media type, or a URL that is not absolute https.
	ErrInvalidMedia = errors.New("the exercise media is invalid. Use an absolute https URL and a media type of gif, video, or image")

	// ErrInternal is returned when an internal error occurs
	ErrInternal = errors.New("something went wrong on our side. Please try again later")

	// Invitation validation failures, raised by the repository layer.

	// ErrInvitationCodeEmpty is returned when no invitation code is supplied
	ErrInvitationCodeEmpty = errors.New("invitation code cannot be empty")

	// ErrInvalidInvitationCode is returned when no invitation matches the code
	ErrInvalidInvitationCode = errors.New("this invitation code is invalid")

	// ErrInvitationAlreadyUsed is returned when the invitation has been
	// redeemed before
	ErrInvitationAlreadyUsed = errors.New("this invitation has already been used")

	// ErrInvitationExpired is returned when the invitation is past its expiry
	ErrInvitationExpired = errors.New("this invitation has expired")
)
