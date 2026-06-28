package repositories

import (
	"context"
	"fmt"
	"time"

	"gymtrack-backend/internal/config"
	"gymtrack-backend/internal/domain/models"

	"github.com/couchbase/gocb/v2"
)

type UserRepository interface {
	CreateUser(ctx context.Context, user *models.User) error
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)
	GetUserByUsername(ctx context.Context, username string) (*models.User, error)
	GetUserByID(ctx context.Context, userID string) (*models.User, error)
	GetAllUsers(ctx context.Context) ([]*models.User, error)
	UpdateUser(ctx context.Context, user *models.User) error
}

type CouchbaseUserRepository struct {
	cluster *gocb.Cluster
	bucket  *gocb.Bucket
}

func NewCouchbaseUserRepository(cluster *gocb.Cluster, bucket *gocb.Bucket) *CouchbaseUserRepository {
	return &CouchbaseUserRepository{
		cluster: cluster,
		bucket:  bucket,
	}
}

func (r *CouchbaseUserRepository) CreateUser(ctx context.Context, user *models.User) error {
	user.Type = "user"
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	_, err := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionUsers).Insert(user.UserID, user, &gocb.InsertOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}
	return nil
}

func (r *CouchbaseUserRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	query := fmt.Sprintf("SELECT u.* FROM `%s`.`%s`.`%s` u WHERE u.type = 'user' AND u.email = $1",
		r.bucket.Name(), config.ScopeDefault, config.CollectionUsers)

	rows, err := r.cluster.Query(query, &gocb.QueryOptions{
		Context:              ctx,
		PositionalParameters: []interface{}{email},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query user by email: %w", err)
	}
	defer rows.Close()

	var user models.User
	if rows.Next() {
		err := rows.Row(&user)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal user from query result: %w", err)
		}
	} else if rows.Err() != nil {
		return nil, fmt.Errorf("error during query iteration: %w", rows.Err())
	} else {
		return nil, nil // User not found
	}

	return &user, nil
}

func (r *CouchbaseUserRepository) GetUserByUsername(ctx context.Context, username string) (*models.User, error) {
	query := fmt.Sprintf("SELECT u.* FROM `%s`.`%s`.`%s` u WHERE u.type = 'user' AND LOWER(u.username) = LOWER($1)",
		r.bucket.Name(), config.ScopeDefault, config.CollectionUsers)

	rows, err := r.cluster.Query(query, &gocb.QueryOptions{
		Context:              ctx,
		PositionalParameters: []interface{}{username},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query user by username: %w", err)
	}
	defer rows.Close()

	var user models.User
	if rows.Next() {
		err := rows.Row(&user)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal user from query result: %w", err)
		}
	} else if rows.Err() != nil {
		return nil, fmt.Errorf("error during query iteration: %w", rows.Err())
	} else {
		return nil, nil // User not found
	}

	return &user, nil
}

func (r *CouchbaseUserRepository) GetUserByID(ctx context.Context, userID string) (*models.User, error) {
	var user models.User
	getResult, err := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionUsers).Get(userID, &gocb.GetOptions{
		Context: ctx,
	})
	if err != nil {
		if err == gocb.ErrDocumentNotFound {
			return nil, nil // User not found
		}
		return nil, fmt.Errorf("failed to get user by ID: %w", err)
	}

	err = getResult.Content(&user)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal user content: %w", err)
	}

	return &user, nil
}

func (r *CouchbaseUserRepository) GetAllUsers(ctx context.Context) ([]*models.User, error) {
	query := fmt.Sprintf("SELECT u.* FROM `%s`.`%s`.`%s` u WHERE u.type = 'user' ORDER BY u.createdAt DESC",
		r.bucket.Name(), config.ScopeDefault, config.CollectionUsers)

	rows, err := r.cluster.Query(query, &gocb.QueryOptions{
		Context: ctx,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query all users: %w", err)
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		var user models.User
		err := rows.Row(&user)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal user from query result: %w", err)
		}
		users = append(users, &user)
	}
	if rows.Err() != nil {
		return nil, fmt.Errorf("error during query iteration: %w", rows.Err())
	}

	return users, nil
}

func (r *CouchbaseUserRepository) UpdateUser(ctx context.Context, user *models.User) error {
	user.UpdatedAt = time.Now()

	_, err := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionUsers).Replace(user.UserID, user, &gocb.ReplaceOptions{
		Context: ctx,
	})
	if err != nil {
		if err == gocb.ErrDocumentNotFound {
			return fmt.Errorf("user not found")
		}
		return fmt.Errorf("failed to update user: %w", err)
	}
	return nil
}
