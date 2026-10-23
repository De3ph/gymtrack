package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"

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

	profileJSON, err := MarshalUserProfile(user.Profile)
	if err != nil {
		return fmt.Errorf("failed to marshal user profile: %w", err)
	}

	query := `
		INSERT INTO users (username, email, password_hash, role, status, profile, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING user_id`

	err = r.pool.QueryRow(ctx, query,
		user.Username,
		user.Email,
		user.PasswordHash,
		string(user.Role),
		string(user.Status),
		profileJSON,
		user.CreatedAt,
		user.UpdatedAt,
	).Scan(&user.UserID)
	if err != nil {
		return mapWriteError(err, "failed to create user")
	}

	user.Type = "user"
	return nil
}

func (r *PostgresUserRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `
		SELECT user_id, username, email, password_hash, role, status, profile, token_version, created_at, updated_at, deleted_at
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
		&user.Status,
		&profileRaw,
		&user.TokenVersion,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.DeletedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}

	if err := UnmarshalUserProfile(profileRaw, &user.Profile); err != nil {
		return nil, fmt.Errorf("failed to unmarshal user profile: %w", err)
	}

	user.Type = "user"
	return user, nil
}

func (r *PostgresUserRepository) GetUserByUsername(ctx context.Context, username string) (*models.User, error) {
	query := `
		SELECT user_id, username, email, password_hash, role, status, profile, token_version, created_at, updated_at, deleted_at
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
		&user.Status,
		&profileRaw,
		&user.TokenVersion,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.DeletedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get user by username: %w", err)
	}

	if err := UnmarshalUserProfile(profileRaw, &user.Profile); err != nil {
		return nil, fmt.Errorf("failed to unmarshal user profile: %w", err)
	}

	user.Type = "user"
	return user, nil
}

func (r *PostgresUserRepository) GetUserByID(ctx context.Context, userID int) (*models.User, error) {
	query := `
		SELECT user_id, username, email, password_hash, role, status, profile, token_version, created_at, updated_at, deleted_at
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
		&user.Status,
		&profileRaw,
		&user.TokenVersion,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.DeletedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get user by ID: %w", err)
	}

	if err := UnmarshalUserProfile(profileRaw, &user.Profile); err != nil {
		return nil, fmt.Errorf("failed to unmarshal user profile: %w", err)
	}

	user.Type = "user"
	return user, nil
}

func (r *PostgresUserRepository) GetUsersByIDs(ctx context.Context, userIDs []int) (map[int]*models.User, error) {
	users := make(map[int]*models.User, len(userIDs))
	if len(userIDs) == 0 {
		return users, nil
	}

	query := `
		SELECT user_id, username, email, password_hash, role, status, profile, token_version, created_at, updated_at, deleted_at
		FROM users
		WHERE user_id = ANY($1)`

	rows, err := r.pool.Query(ctx, query, userIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to query users by IDs: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		user := &models.User{}
		var profileRaw []byte
		if err := rows.Scan(
			&user.UserID,
			&user.Username,
			&user.Email,
			&user.PasswordHash,
			&user.Role,
			&user.Status,
			&profileRaw,
			&user.TokenVersion,
			&user.CreatedAt,
			&user.UpdatedAt,
			&user.DeletedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan user row: %w", err)
		}
		if err := UnmarshalUserProfile(profileRaw, &user.Profile); err != nil {
			return nil, fmt.Errorf("failed to unmarshal user profile: %w", err)
		}
		user.Type = "user"
		users[user.UserID] = user
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}
	return users, nil
}

func (r *PostgresUserRepository) GetAllUsers(ctx context.Context) ([]*models.User, error) {
	query := `
		SELECT user_id, username, email, password_hash, role, status, profile, token_version, created_at, updated_at, deleted_at
		FROM users
		ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query all users: %w", err)
	}
	defer rows.Close()

	users := make([]*models.User, 0)
	for rows.Next() {
		user := &models.User{}
		var profileRaw []byte

		if err := rows.Scan(
			&user.UserID,
			&user.Username,
			&user.Email,
			&user.PasswordHash,
			&user.Role,
			&user.Status,
			&profileRaw,
			&user.TokenVersion,
			&user.CreatedAt,
			&user.UpdatedAt,
			&user.DeletedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan user row: %w", err)
		}

		if err := UnmarshalUserProfile(profileRaw, &user.Profile); err != nil {
			return nil, fmt.Errorf("failed to unmarshal user profile: %w", err)
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

	profileJSON, err := MarshalUserProfile(user.Profile)
	if err != nil {
		return fmt.Errorf("failed to marshal user profile: %w", err)
	}

	// token_version is deliberately NOT written here: it is only mutated by
	// BumpTokenVersion. UpdateUser callers work read-modify-write on a
	// possibly stale copy of the row, and persisting a stale token_version
	// would silently undo a concurrent revocation bump.
	query := `
		UPDATE users
		SET username = $1, email = $2, password_hash = $3, role = $4, status = $5, profile = $6, updated_at = $7
		WHERE user_id = $8`

	tag, err := r.pool.Exec(ctx, query,
		user.Username,
		user.Email,
		user.PasswordHash,
		string(user.Role),
		string(user.Status),
		profileJSON,
		user.UpdatedAt,
		user.UserID,
	)
	if err != nil {
		return mapWriteError(err, "failed to update user")
	}

	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}

	return nil
}

func (r *PostgresUserRepository) GetAllUsersFiltered(ctx context.Context, role, search string, limit, offset int) ([]*models.User, error) {
	query := `
		SELECT user_id, username, email, password_hash, role, status, profile, token_version, created_at, updated_at, deleted_at
		FROM users
		WHERE ($1 = '' OR role = $1)
		  AND ($2 = '' OR username ILIKE '%' || $2 || '%' OR email ILIKE '%' || $2 || '%')
		ORDER BY created_at DESC
		LIMIT $3 OFFSET $4`

	rows, err := r.pool.Query(ctx, query, role, search, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query filtered users: %w", err)
	}
	defer rows.Close()

	return r.scanUserRows(rows)
}

func (r *PostgresUserRepository) CountUsers(ctx context.Context, role, search string) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM users
		WHERE ($1 = '' OR role = $1)
		  AND ($2 = '' OR username ILIKE '%' || $2 || '%' OR email ILIKE '%' || $2 || '%')`

	var count int
	err := r.pool.QueryRow(ctx, query, role, search).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count users: %w", err)
	}
	return count, nil
}

func (r *PostgresUserRepository) scanUserRows(rows pgx.Rows) ([]*models.User, error) {
	users := make([]*models.User, 0)
	for rows.Next() {
		user := &models.User{}
		var profileRaw []byte

		if err := rows.Scan(
			&user.UserID,
			&user.Username,
			&user.Email,
			&user.PasswordHash,
			&user.Role,
			&user.Status,
			&profileRaw,
			&user.TokenVersion,
			&user.CreatedAt,
			&user.UpdatedAt,
			&user.DeletedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan user row: %w", err)
		}

		if err := UnmarshalUserProfile(profileRaw, &user.Profile); err != nil {
			return nil, fmt.Errorf("failed to unmarshal user profile: %w", err)
		}

		user.Type = "user"
		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return users, nil
}

// BumpTokenVersion atomically increments users.token_version, immediately
// invalidating every JWT outstanding for the user (see migration 010).
// Returns the new version, or domainerrors.ErrNotFound if the user does not exist.
func (r *PostgresUserRepository) BumpTokenVersion(ctx context.Context, userID int) (int, error) {
	query := `
		UPDATE users
		SET token_version = token_version + 1, updated_at = NOW()
		WHERE user_id = $1
		RETURNING token_version`

	var newVersion int
	err := r.pool.QueryRow(ctx, query, userID).Scan(&newVersion)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, domainerrors.ErrNotFound
		}
		return 0, fmt.Errorf("failed to bump token version: %w", err)
	}
	return newVersion, nil
}

func (r *PostgresUserRepository) SoftDeleteUser(ctx context.Context, userID int) error {
	query := `UPDATE users SET status = 'deleted', deleted_at = NOW(), updated_at = NOW() WHERE user_id = $1`
	tag, err := r.pool.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to soft-delete user: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}

func (r *PostgresUserRepository) RestoreUser(ctx context.Context, userID int) error {
	query := `UPDATE users SET status = 'active', deleted_at = NULL, updated_at = NOW() WHERE user_id = $1`
	tag, err := r.pool.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to restore user: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}

func (r *PostgresUserRepository) GetUsersReadyForHardDelete(ctx context.Context, before time.Time) ([]int, error) {
	query := `SELECT user_id FROM users WHERE deleted_at < $1 ORDER BY deleted_at`
	rows, err := r.pool.Query(ctx, query, before)
	if err != nil {
		return nil, fmt.Errorf("failed to query users for hard delete: %w", err)
	}
	defer rows.Close()
	var ids []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("failed to scan user_id: %w", err)
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}
	return ids, nil
}

func (r *PostgresUserRepository) HardDeleteUser(ctx context.Context, userID int) error {
	query := `DELETE FROM users WHERE user_id = $1`
	tag, err := r.pool.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to hard-delete user: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}

// Compile-time check that PostgresUserRepository implements UserRepository.
var _ repositories.UserRepository = (*PostgresUserRepository)(nil)
