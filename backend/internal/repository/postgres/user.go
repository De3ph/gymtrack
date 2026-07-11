package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresUserRepository implements the UserRepository interface using PostgreSQL.
type PostgresUserRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresUserRepository creates a new PostgreSQL-backed user repository.
func NewPostgresUserRepository(pool *pgxpool.Pool) *PostgresUserRepository {
	return &PostgresUserRepository{pool: pool}
}

func (r *PostgresUserRepository) CreateUser(ctx context.Context, user *models.User) error {
	now := time.Now()
	user.CreatedAt = now
	user.UpdatedAt = now

	profileJSON, err := json.Marshal(user.Profile)
	if err != nil {
		return fmt.Errorf("failed to marshal user profile: %w", err)
	}

	query := `
		INSERT INTO users (username, email, password_hash, role, profile, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING user_id`

	err = r.pool.QueryRow(ctx, query,
		user.Username,
		user.Email,
		user.PasswordHash,
		string(user.Role),
		profileJSON,
		user.CreatedAt,
		user.UpdatedAt,
	).Scan(&user.UserID)
	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}

	user.Type = "user"
	return nil
}

func (r *PostgresUserRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `
		SELECT user_id, username, email, password_hash, role, profile, created_at, updated_at
		FROM users
		WHERE email = $1`

	user := &models.User{}
	var profileRaw []byte

	err := r.pool.QueryRow(ctx, query, email).Scan(
		&user.UserID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.Role,
		&profileRaw,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}

	if profileRaw != nil {
		if err := json.Unmarshal(profileRaw, &user.Profile); err != nil {
			return nil, fmt.Errorf("failed to unmarshal user profile: %w", err)
		}
	}

	user.Type = "user"
	return user, nil
}

func (r *PostgresUserRepository) GetUserByUsername(ctx context.Context, username string) (*models.User, error) {
	query := `
		SELECT user_id, username, email, password_hash, role, profile, created_at, updated_at
		FROM users
		WHERE LOWER(username) = LOWER($1)`

	user := &models.User{}
	var profileRaw []byte

	err := r.pool.QueryRow(ctx, query, username).Scan(
		&user.UserID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.Role,
		&profileRaw,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get user by username: %w", err)
	}

	if profileRaw != nil {
		if err := json.Unmarshal(profileRaw, &user.Profile); err != nil {
			return nil, fmt.Errorf("failed to unmarshal user profile: %w", err)
		}
	}

	user.Type = "user"
	return user, nil
}

func (r *PostgresUserRepository) GetUserByID(ctx context.Context, userID int) (*models.User, error) {
	query := `
		SELECT user_id, username, email, password_hash, role, profile, created_at, updated_at
		FROM users
		WHERE user_id = $1`

	user := &models.User{}
	var profileRaw []byte

	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&user.UserID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.Role,
		&profileRaw,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get user by ID: %w", err)
	}

	if profileRaw != nil {
		if err := json.Unmarshal(profileRaw, &user.Profile); err != nil {
			return nil, fmt.Errorf("failed to unmarshal user profile: %w", err)
		}
	}

	user.Type = "user"
	return user, nil
}

func (r *PostgresUserRepository) GetAllUsers(ctx context.Context) ([]*models.User, error) {
	query := `
		SELECT user_id, username, email, password_hash, role, profile, created_at, updated_at
		FROM users
		ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query all users: %w", err)
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		user := &models.User{}
		var profileRaw []byte

		if err := rows.Scan(
			&user.UserID,
			&user.Username,
			&user.Email,
			&user.PasswordHash,
			&user.Role,
			&profileRaw,
			&user.CreatedAt,
			&user.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan user row: %w", err)
		}

		if profileRaw != nil {
			if err := json.Unmarshal(profileRaw, &user.Profile); err != nil {
				return nil, fmt.Errorf("failed to unmarshal user profile: %w", err)
			}
		}

		user.Type = "user"
		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return users, nil
}

func (r *PostgresUserRepository) UpdateUser(ctx context.Context, user *models.User) error {
	user.UpdatedAt = time.Now()

	profileJSON, err := json.Marshal(user.Profile)
	if err != nil {
		return fmt.Errorf("failed to marshal user profile: %w", err)
	}

	query := `
		UPDATE users
		SET username = $1, email = $2, password_hash = $3, role = $4, profile = $5, updated_at = $6
		WHERE user_id = $7`

	tag, err := r.pool.Exec(ctx, query,
		user.Username,
		user.Email,
		user.PasswordHash,
		string(user.Role),
		profileJSON,
		user.UpdatedAt,
		user.UserID,
	)
	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}

	return nil
}

// Compile-time check that PostgresUserRepository implements UserRepository.
var _ interface {
	CreateUser(ctx context.Context, user *models.User) error
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)
	GetUserByUsername(ctx context.Context, username string) (*models.User, error)
	GetUserByID(ctx context.Context, userID int) (*models.User, error)
	GetAllUsers(ctx context.Context) ([]*models.User, error)
	UpdateUser(ctx context.Context, user *models.User) error
} = (*PostgresUserRepository)(nil)
