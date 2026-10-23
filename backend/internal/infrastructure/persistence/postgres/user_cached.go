package postgres

import (
	"context"
	"strconv"
	"strings"
	"time"

	"golang.org/x/sync/singleflight"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/infrastructure/cache"
)

// CachedUserRepository wraps UserRepository with in-process caching.
// Compile-time interface check.
var _ repositories.UserRepository = (*CachedUserRepository)(nil)

type CachedUserRepository struct {
	inner repositories.UserRepository
	cache cache.Cache[*models.User]
	sf    singleflight.Group
	bus   *CacheInvalidationBus
}

// NewCachedUserRepository creates a CachedUserRepository.
//
// bus may be nil, in which case cross-decorator invalidation is disabled.
func NewCachedUserRepository(inner repositories.UserRepository, cache cache.Cache[*models.User], bus *CacheInvalidationBus) *CachedUserRepository {
	r := &CachedUserRepository{inner: inner, cache: cache, bus: bus}
	bus.subscribe(func(userID int) {
		// A write to the users row from any repository (notably the trainer
		// profile writer, which also updates users.profile) must drop this
		// decorator's entry for that row. The email/username keys are left
		// alone: they are populated by the auth login path, which needs the
		// row's credentials rather than its profile, and a profile edit does
		// not invalidate them.
		r.cache.Invalidate("user:id:" + strconv.Itoa(userID))
	})
	return r
}

func (r *CachedUserRepository) CreateUser(ctx context.Context, user *models.User) error {
	return r.inner.CreateUser(ctx, user)
}

func (r *CachedUserRepository) GetUserByID(ctx context.Context, userID int) (*models.User, error) {
	if isWithinTransaction(ctx) {
		return r.inner.GetUserByID(ctx, userID)
	}

	key := "user:id:" + strconv.Itoa(userID)

	val, err, _ := r.sf.Do(key, func() (interface{}, error) {
		if v, ok := r.cache.Get(key); ok {
			return v, nil
		}
		loadCtx, cancel := cacheLoadContext(ctx)
		defer cancel()
		v, err := r.inner.GetUserByID(loadCtx, userID)
		if err != nil {
			return nil, err
		}
		r.cache.Set(key, v)
		return v, nil
	})
	if err != nil {
		return nil, err
	}
	return val.(*models.User), nil
}

func (r *CachedUserRepository) GetUsersByIDs(ctx context.Context, userIDs []int) (map[int]*models.User, error) {
	if isWithinTransaction(ctx) {
		return r.inner.GetUsersByIDs(ctx, userIDs)
	}

	users, err := r.inner.GetUsersByIDs(ctx, userIDs)
	if err != nil {
		return nil, err
	}
	for userID, user := range users {
		r.cache.Set("user:id:"+strconv.Itoa(userID), user)
	}
	return users, nil
}

func (r *CachedUserRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	if isWithinTransaction(ctx) {
		return r.inner.GetUserByEmail(ctx, email)
	}

	key := "user:email:" + strings.ToLower(email)

	val, err, _ := r.sf.Do(key, func() (interface{}, error) {
		if v, ok := r.cache.Get(key); ok {
			return v, nil
		}
		loadCtx, cancel := cacheLoadContext(ctx)
		defer cancel()
		v, err := r.inner.GetUserByEmail(loadCtx, email)
		if err != nil {
			return nil, err
		}
		r.cache.Set(key, v)
		return v, nil
	})
	if err != nil {
		return nil, err
	}
	return val.(*models.User), nil
}

func (r *CachedUserRepository) GetUserByUsername(ctx context.Context, username string) (*models.User, error) {
	if isWithinTransaction(ctx) {
		return r.inner.GetUserByUsername(ctx, username)
	}

	key := "user:username:" + strings.ToLower(username)

	val, err, _ := r.sf.Do(key, func() (interface{}, error) {
		if v, ok := r.cache.Get(key); ok {
			return v, nil
		}
		loadCtx, cancel := cacheLoadContext(ctx)
		defer cancel()
		v, err := r.inner.GetUserByUsername(loadCtx, username)
		if err != nil {
			return nil, err
		}
		r.cache.Set(key, v)
		return v, nil
	})
	if err != nil {
		return nil, err
	}
	return val.(*models.User), nil
}

func (r *CachedUserRepository) GetAllUsers(ctx context.Context) ([]*models.User, error) {
	return r.inner.GetAllUsers(ctx)
}

func (r *CachedUserRepository) UpdateUser(ctx context.Context, user *models.User) error {
	err := r.inner.UpdateUser(ctx, user)
	if err != nil {
		return err
	}
	// Invalidation is deferred until the surrounding transaction commits:
	// dropping a key mid-transaction would let another reader repopulate it
	// from the pre-commit state and serve that for the whole TTL.
	afterTransaction(ctx, func() {
		r.cache.Invalidate("user:id:" + strconv.Itoa(user.UserID))
		r.cache.Invalidate("user:email:" + strings.ToLower(user.Email))
		r.cache.Invalidate("user:username:" + strings.ToLower(user.Username))
		// UpdateUser can change any column of the users row, including the
		// profile the trainer catalog renders, so the trainer namespaces must
		// go too.
		r.bus.notify(user.UserID)
	})
	return nil
}

func (r *CachedUserRepository) SetTrainerAssignment(ctx context.Context, athleteID int, trainerID int) error {
	if err := r.inner.SetTrainerAssignment(ctx, athleteID, trainerID); err != nil {
		return err
	}
	r.invalidateUserProfile(ctx, athleteID)
	return nil
}

func (r *CachedUserRepository) ClearTrainerAssignment(ctx context.Context, athleteID int, trainerID int) error {
	if err := r.inner.ClearTrainerAssignment(ctx, athleteID, trainerID); err != nil {
		return err
	}
	r.invalidateUserProfile(ctx, athleteID)
	return nil
}

// invalidateUserProfile drops the cached row after a targeted profile write.
// Email and username keys are left alone for the same reason as UpdateUser: a
// profile edit does not change the credentials those keys exist to serve.
func (r *CachedUserRepository) invalidateUserProfile(ctx context.Context, userID int) {
	afterTransaction(ctx, func() {
		r.cache.Invalidate("user:id:" + strconv.Itoa(userID))
		r.bus.notify(userID)
	})
}

func (r *CachedUserRepository) GetAllUsersFiltered(ctx context.Context, role string, search string, limit, offset int) ([]*models.User, error) {
	return r.inner.GetAllUsersFiltered(ctx, role, search, limit, offset)
}

func (r *CachedUserRepository) CountUsers(ctx context.Context, role string, search string) (int, error) {
	return r.inner.CountUsers(ctx, role, search)
}

func (r *CachedUserRepository) BumpTokenVersion(ctx context.Context, userID int) (int, error) {
	// The cached rows carry TokenVersion and the auth paths read from them
	// (login mints tokens from the email/username keys, the middleware reads
	// the id key), so a stale cached copy would keep accepting revoked tokens
	// or mint new tokens with the wrong version. Drop every key for the row.
	user, err := r.inner.GetUserByID(ctx, userID)
	if err != nil {
		return 0, err
	}
	newVersion, err := r.inner.BumpTokenVersion(ctx, userID)
	if err != nil {
		return 0, err
	}
	r.cache.Invalidate("user:id:" + strconv.Itoa(userID))
	r.cache.Invalidate("user:email:" + strings.ToLower(user.Email))
	r.cache.Invalidate("user:username:" + strings.ToLower(user.Username))
	return newVersion, nil
}

func (r *CachedUserRepository) SoftDeleteUser(ctx context.Context, userID int) error {
	user, err := r.inner.GetUserByID(ctx, userID)
	if err != nil {
		return err
	}
	err = r.inner.SoftDeleteUser(ctx, userID)
	if err != nil {
		return err
	}
	r.cache.Invalidate("user:id:" + strconv.Itoa(userID))
	r.cache.Invalidate("user:email:" + strings.ToLower(user.Email))
	r.cache.Invalidate("user:username:" + strings.ToLower(user.Username))
	return nil
}

func (r *CachedUserRepository) RestoreUser(ctx context.Context, userID int) error {
	user, err := r.inner.GetUserByID(ctx, userID)
	if err != nil {
		return err
	}
	err = r.inner.RestoreUser(ctx, userID)
	if err != nil {
		return err
	}
	r.cache.Invalidate("user:id:" + strconv.Itoa(userID))
	r.cache.Invalidate("user:email:" + strings.ToLower(user.Email))
	r.cache.Invalidate("user:username:" + strings.ToLower(user.Username))
	return nil
}

func (r *CachedUserRepository) GetUsersReadyForHardDelete(ctx context.Context, before time.Time) ([]int, error) {
	return r.inner.GetUsersReadyForHardDelete(ctx, before)
}

func (r *CachedUserRepository) HardDeleteUser(ctx context.Context, userID int) error {
	user, err := r.inner.GetUserByID(ctx, userID)
	if err != nil {
		return err
	}
	err = r.inner.HardDeleteUser(ctx, userID)
	if err != nil {
		return err
	}
	r.cache.Invalidate("user:id:" + strconv.Itoa(userID))
	r.cache.Invalidate("user:email:" + strings.ToLower(user.Email))
	r.cache.Invalidate("user:username:" + strings.ToLower(user.Username))
	return nil
}
