package postgres

import (
	"context"
	"strconv"
	"strings"

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
}

// NewCachedUserRepository creates a CachedUserRepository.
func NewCachedUserRepository(inner repositories.UserRepository, cache cache.Cache[*models.User]) *CachedUserRepository {
	return &CachedUserRepository{inner: inner, cache: cache}
}

func (r *CachedUserRepository) CreateUser(ctx context.Context, user *models.User) error {
	return r.inner.CreateUser(ctx, user)
}

func (r *CachedUserRepository) GetUserByID(ctx context.Context, userID int) (*models.User, error) {
	key := "user:id:" + strconv.Itoa(userID)

	val, err, _ := r.sf.Do(key, func() (interface{}, error) {
		if v, ok := r.cache.Get(key); ok {
			return v, nil
		}
		v, err := r.inner.GetUserByID(ctx, userID)
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

func (r *CachedUserRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	key := "user:email:" + strings.ToLower(email)

	val, err, _ := r.sf.Do(key, func() (interface{}, error) {
		if v, ok := r.cache.Get(key); ok {
			return v, nil
		}
		v, err := r.inner.GetUserByEmail(ctx, email)
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
	key := "user:username:" + strings.ToLower(username)

	val, err, _ := r.sf.Do(key, func() (interface{}, error) {
		if v, ok := r.cache.Get(key); ok {
			return v, nil
		}
		v, err := r.inner.GetUserByUsername(ctx, username)
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
	r.cache.Invalidate("user:id:" + strconv.Itoa(user.UserID))
	r.cache.Invalidate("user:email:" + strings.ToLower(user.Email))
	r.cache.Invalidate("user:username:" + strings.ToLower(user.Username))
	return nil
}

func (r *CachedUserRepository) GetAllUsersFiltered(ctx context.Context, role string, search string, limit, offset int) ([]*models.User, error) {
	return r.inner.GetAllUsersFiltered(ctx, role, search, limit, offset)
}

func (r *CachedUserRepository) CountUsers(ctx context.Context, role string, search string) (int, error) {
	return r.inner.CountUsers(ctx, role, search)
}
