package services

import (
	"errors"
	"fmt"
)

// Business-rule errors returned by coaching-request, review and invitation
// services.
//
// These are sentinel values rather than inline fmt.Errorf calls so handlers can
// select an HTTP status with errors.Is instead of matching on error text.
// Matching text couples the response code to the wording of the message: a
// reworded message silently changes the status, and a wrapped infrastructure
// failure that happens to contain the same words is misclassified as a client
// error.
//
// Each message doubles as the user-facing response body, so it is written as
// guidance rather than as diagnostic text. Return them unwrapped — wrapping a
// sentinel with operational context makes its text (and therefore the response
// body) leak internals. Infrastructure failures are wrapped with
// fmt.Errorf("...: %w", err) instead, and fall through to the internal-error
// path.
var (
	// ErrAlreadyHasActiveTrainer is returned when an athlete already has an
	// active coaching relationship and tries to take on a second one.
	ErrAlreadyHasActiveTrainer = errors.New("you already have an active trainer. Please end your current coaching relationship first")

	// ErrPendingCoachingRequestExists is returned when a duplicate pending
	// coaching request is submitted to the same trainer.
	ErrPendingCoachingRequestExists = errors.New("you already have a pending request to this trainer. Please wait for them to respond")

	// ErrCoachTargetNotFound is returned when the selected coaching target
	// does not exist.
	ErrCoachTargetNotFound = errors.New("trainer not found. Please check the trainer ID and try again")

	// ErrCoachTargetNotTrainer is returned when the selected coaching target
	// exists but does not hold the trainer role.
	ErrCoachTargetNotTrainer = errors.New("the selected user is not a trainer. Please choose a trainer account")

	// ErrCoachingRequestNotFound is returned when the addressed coaching
	// request does not exist.
	ErrCoachingRequestNotFound = errors.New("coaching request not found. It may have been deleted or the ID is incorrect")

	// ErrNotCoachingRequestOwner is returned when a trainer tries to respond
	// to a request addressed to a different trainer.
	ErrNotCoachingRequestOwner = errors.New("this coaching request was sent to a different trainer. You can only respond to your own requests")

	// ErrAthleteAlreadyHasActiveTrainer is returned when accepting a request
	// would give the athlete a second active trainer.
	ErrAthleteAlreadyHasActiveTrainer = errors.New("this athlete already has an active trainer, so the request can't be accepted")

	// ErrReviewNotFound is returned when the addressed review does not exist.
	ErrReviewNotFound = errors.New("review not found. It may have been deleted or the ID is incorrect")

	// ErrReviewRequiresActiveRelationship is returned when an athlete tries to
	// review a trainer they have no active relationship with.
	ErrReviewRequiresActiveRelationship = errors.New("you can only review a trainer while you have an active coaching relationship with them")

	// ErrAlreadyReviewedTrainer is returned when an athlete submits a second
	// review for a trainer they have already reviewed.
	ErrAlreadyReviewedTrainer = errors.New("you've already reviewed this trainer. You can edit or delete your existing review instead")

	// ErrCannotEditReview is returned when a user tries to edit a review that
	// belongs to someone else.
	ErrCannotEditReview = errors.New("you can only edit your own reviews")

	// ErrCannotDeleteReview is returned when a user tries to delete a review
	// that belongs to someone else.
	ErrCannotDeleteReview = errors.New("you can only delete your own reviews")

	// ErrRelationshipTerminationForbidden is returned when a user who is not a
	// participant in a relationship tries to terminate it.
	ErrRelationshipTerminationForbidden = errors.New("you are not authorized to terminate this relationship")

	// ErrNoActiveCoachingRelationship is returned when a trainer addresses an
	// athlete they do not currently coach.
	ErrNoActiveCoachingRelationship = errors.New("no active coaching relationship with this athlete")
)

// ErrCoachingRequestAlreadyResolved is the match target for
// CoachingRequestResolvedError. It exists only so handlers can select a status
// with a plain errors.Is call; the returned error is always a
// *CoachingRequestResolvedError carrying the current request status.
var ErrCoachingRequestAlreadyResolved = errors.New("coaching request is no longer pending")

// CoachingRequestResolvedError reports an attempt to accept or reject a
// coaching request that is no longer pending. The current status is carried as
// a field rather than interpolated at construction so the message template
// stays stable for log grouping, and so a client cannot influence the text by
// controlling a status value.
type CoachingRequestResolvedError struct {
	Status string
}

func (e *CoachingRequestResolvedError) Error() string {
	return fmt.Sprintf("this request has already been %s and can no longer be changed", e.Status)
}

// Is reports whether the error matches ErrCoachingRequestAlreadyResolved,
// letting handlers match it with errors.Is like any other sentinel.
func (e *CoachingRequestResolvedError) Is(target error) bool {
	return target == ErrCoachingRequestAlreadyResolved
}
