package handlers

import (
	"errors"
	"net/http"

	"go.uber.org/zap"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/services"

	"github.com/gin-gonic/gin"
)

func handleServiceError(c *gin.Context, err error) bool {
	svcErr, ok := err.(*services.ServiceError)
	if !ok {
		return false
	}
	switch svcErr.Code {
	case "FORBIDDEN", "ACCOUNT_DELETED", "ADMIN_DELETE_FORBIDDEN", "ACCOUNT_INACTIVE",
		"ACCOUNT_NOT_DELETED", "RESTORE_EXPIRED":
		c.JSON(http.StatusForbidden, gin.H{"error": svcErr.Message})
	case "INVALID_CREDENTIALS", "INVALID_TOKEN", "TOKEN_EXPIRED", "INVALID_TOKEN_TYPE":
		c.JSON(http.StatusUnauthorized, gin.H{"error": svcErr.Message})
	case "VALIDATION", "INVALID_DATE", "INVALID_PASSWORD",
		"SELF_ROLE_CHANGE", "LAST_ADMIN", "INVALID_RESET_TOKEN",
		"USER_EXISTS", "USERNAME_EXISTS":
		if svcErr.Code == "USER_EXISTS" || svcErr.Code == "USERNAME_EXISTS" {
			c.JSON(http.StatusConflict, gin.H{"error": svcErr.Message})
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": svcErr.Message})
		}
	case "WORKOUT_NOT_FOUND", "MEAL_NOT_FOUND", "WORKOUT_PLAN_NOT_FOUND",
		"BODY_MEASUREMENT_NOT_FOUND", "USER_NOT_FOUND",
		"COMMENT_NOT_FOUND", "EXERCISE_NOT_FOUND":
		c.JSON(http.StatusNotFound, gin.H{"error": svcErr.Message})
	case "HAS_ASSIGNMENTS", "PLAN_LIMIT_REACHED":
		c.JSON(http.StatusConflict, gin.H{"error": svcErr.Message})
	default:
		return false
	}
	return true
}

func handleCommentServiceError(c *gin.Context, err error) bool {
	switch {
	case errors.Is(err, services.ErrTargetNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrNotAuthor):
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrAccessDenied):
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
	default:
		return false
	}
	return true
}

// businessRule pairs a business-rule sentinel with its HTTP status, so status
// selection stays tied to the sentinel rather than to message wording.
type businessRule struct {
	sentinel error
	status   int
}

// writeViolationSentinels are raised by postgres.mapWriteError when PostgreSQL
// rejects a write with a constraint violation: a duplicate key, a failed CHECK,
// or a missing foreign-key target.
//
// They are kept as a separate list because they are the only sentinels that can
// surface from *any* handler — including the ~60 that report failures through
// handleInternalError rather than handleBusinessError. The repository decides
// the classification, so the handler must honour it wherever the error arrives;
// otherwise a duplicate username rejected by CreateUser would still be rendered
// as an internal fault.
//
// Restricting handleInternalError to this list leaves its behaviour unchanged
// for every other sentinel: a GET whose lookup returns ErrNotFound continues to
// be reported as a 500, exactly as before.
var writeViolationSentinels = []businessRule{
	{domainerrors.ErrConflict, http.StatusConflict},
	{domainerrors.ErrInvalidInput, http.StatusBadRequest},
}

// businessErrorCatalog pairs each business-rule sentinel with its HTTP status,
// so status selection stays tied to the sentinel rather than to message wording.
var businessErrorCatalog = append([]businessRule{
	{domainerrors.ErrNotFound, http.StatusNotFound},
	{services.ErrCoachTargetNotFound, http.StatusNotFound},
	{services.ErrCoachingRequestNotFound, http.StatusNotFound},
	{services.ErrReviewNotFound, http.StatusNotFound},
	{domainerrors.ErrInvalidInvitationCode, http.StatusNotFound},

	{services.ErrNotCoachingRequestOwner, http.StatusForbidden},
	{services.ErrReviewRequiresActiveRelationship, http.StatusForbidden},
	{services.ErrCannotEditReview, http.StatusForbidden},
	{services.ErrCannotDeleteReview, http.StatusForbidden},

	{services.ErrAlreadyHasActiveTrainer, http.StatusConflict},
	{services.ErrPendingCoachingRequestExists, http.StatusConflict},
	{services.ErrAthleteAlreadyHasActiveTrainer, http.StatusConflict},
	{services.ErrAlreadyReviewedTrainer, http.StatusConflict},
	{services.ErrCoachingRequestAlreadyResolved, http.StatusConflict},
	{domainerrors.ErrInvitationAlreadyUsed, http.StatusConflict},

	{services.ErrCoachTargetNotTrainer, http.StatusBadRequest},
	{domainerrors.ErrInvitationCodeEmpty, http.StatusBadRequest},
	{domainerrors.ErrInvitationExpired, http.StatusBadRequest},
}, writeViolationSentinels...)

// classifyBusinessError resolves a domain-rule violation to a status and a
// client-safe message. The message is the matched sentinel's own text, never
// err.Error(), so a wrap cannot contribute internal context to the response.
func classifyBusinessError(err error) (status int, msg string, ok bool) {
	var resolved *services.CoachingRequestResolvedError
	if errors.As(err, &resolved) {
		return http.StatusConflict, resolved.Error(), true
	}
	return matchBusinessRules(businessErrorCatalog, err)
}

// matchBusinessRules resolves err against a catalog, returning the first
// sentinel in it that err satisfies.
func matchBusinessRules(catalog []businessRule, err error) (status int, msg string, ok bool) {
	for _, entry := range catalog {
		if errors.Is(err, entry.sentinel) {
			return entry.status, entry.sentinel.Error(), true
		}
	}
	return 0, "", false
}

// handleBusinessError maps a domain-rule violation onto an HTTP response.
//
// Errors are matched with errors.Is against declared sentinels, never by
// inspecting error text: text matching couples the status code to message
// wording, and cannot tell a rule violation apart from a wrapped
// infrastructure failure that happens to read similarly.
//
// Anything unrecognised is treated as an internal fault — it is logged with
// full context and reported as a generic 500, so internal details are neither
// leaked to the client nor lost from the logs.
func handleBusinessError(c *gin.Context, err error) {
	status, msg, ok := classifyBusinessError(err)
	if !ok {
		handleInternalError(c, err, "unexpected failure while applying business rules")
		return
	}
	c.JSON(status, gin.H{"error": msg})
}

// handleInternalError reports a failure from a handler that has no more
// specific classification to offer.
//
// Most handlers call this directly for any error their service or repository
// returned. Those repositories do classify: postgres.mapWriteError turns a
// constraint violation into ErrConflict or ErrInvalidInput. Without consulting
// that classification here, a duplicate username rejected by CreateUser, an
// over-long comment rejected by a CHECK, or a malformed availability slot would
// all be reported as internal faults even though the client caused them.
//
// Only write-violation sentinels are honoured, which keeps the behaviour of
// every other sentinel exactly as it was. Anything still unclassified is logged
// in full and answered with a generic 500.
func handleInternalError(c *gin.Context, err error, msg string) {
	fields := []zap.Field{
		zap.String("path", c.Request.URL.Path),
		zap.String("method", c.Request.Method),
		zap.Error(err),
	}

	if status, safeMsg, ok := matchBusinessRules(writeViolationSentinels, err); ok {
		// Still logged: the wrapped *pgconn.PgError carries the constraint name
		// and SQLSTATE, which are the useful part. Warn rather than Error
		// because a rejected request is not a fault of this service.
		zap.L().Warn(msg, append(fields, zap.Int("status", status))...)
		c.JSON(status, gin.H{"error": safeMsg})
		return
	}

	zap.L().Error(msg, fields...)
	c.JSON(http.StatusInternalServerError, gin.H{"error": "Something went wrong while processing your request. Please try again later"})
}
