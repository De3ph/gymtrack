package postgres

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/services"
	"gymtrack-backend/internal/utils"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresCodeBasedInvitation implements services.InvitationMethod using PostgreSQL.
type PostgresCodeBasedInvitation struct {
	pool  *pgxpool.Pool
	clock utils.Clock
}

// NewPostgresCodeBasedInvitation creates a new PostgreSQL-backed invitation service.
func NewPostgresCodeBasedInvitation(pool *pgxpool.Pool, clock utils.Clock) *PostgresCodeBasedInvitation {
	if clock == nil {
		clock = utils.RealClock{}
	}
	return &PostgresCodeBasedInvitation{pool: pool, clock: clock}
}

// GenerateInvitation creates a new invitation with a random 8-hex-char code.
func (p *PostgresCodeBasedInvitation) GenerateInvitation(ctx context.Context, trainerID int, athleteID int) (*models.Invitation, error) {
	code, err := generateRandomHex(ctx, 8)
	if err != nil {
		return nil, fmt.Errorf("failed to generate invitation code: %w", err)
	}

	now := p.clock.Now()
	expiresAt := now.Add(7 * 24 * time.Hour)

	var invitationID int
	query := `
		INSERT INTO invitations (trainer_id, code, status, created_at, expires_at)
		VALUES ($1, $2, 'pending', $3, $4)
		RETURNING id`

	err = p.pool.QueryRow(ctx, query, trainerID, code, now, expiresAt).Scan(&invitationID)
	if err != nil {
		return nil, fmt.Errorf("failed to create invitation: %w", err)
	}

	return &models.Invitation{
		Type:         "invitation",
		InvitationID: invitationID,
		TrainerID:    trainerID,
		Code:         code,
		Status:       "pending",
		CreatedAt:    now,
		ExpiresAt:    expiresAt,
	}, nil
}

// ValidateInvitation finds an invitation by code and checks it is still valid.
func (p *PostgresCodeBasedInvitation) ValidateInvitation(ctx context.Context, code string) (*models.Invitation, error) {
	if code == "" {
		return nil, fmt.Errorf("code cannot be empty")
	}

	query := `
		SELECT id, trainer_id, code, status, created_at, expires_at, used_at
		FROM invitations
		WHERE code = $1
		LIMIT 1`

	inv := &models.Invitation{}
	var usedAt *time.Time

	err := p.pool.QueryRow(ctx, query, code).Scan(
		&inv.InvitationID,
		&inv.TrainerID,
		&inv.Code,
		&inv.Status,
		&inv.CreatedAt,
		&inv.ExpiresAt,
		&usedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("invalid invitation code")
		}
		return nil, fmt.Errorf("failed to query invitation: %w", err)
	}

	if usedAt != nil {
		inv.UsedAt = *usedAt
	}

	inv.Type = "invitation"

	if inv.Status != "pending" {
		return nil, fmt.Errorf("invitation has already been used")
	}

	if p.clock.Now().After(inv.ExpiresAt) {
		return nil, fmt.Errorf("invitation has expired")
	}

	return inv, nil
}

// MarkInvitationUsed marks an invitation as used with a concurrency-safe update.
func (p *PostgresCodeBasedInvitation) MarkInvitationUsed(ctx context.Context, invitationID int) error {
	now := p.clock.Now()
	query := `
		UPDATE invitations
		SET status = 'used', used_at = $1
		WHERE id = $2 AND status = 'pending'`

	tag, err := p.pool.Exec(ctx, query, now, invitationID)
	if err != nil {
		return fmt.Errorf("failed to mark invitation as used: %w", err)
	}

	if tag.RowsAffected() == 0 {
		return fmt.Errorf("invitation not found or already used")
	}

	return nil
}

// generateRandomHex produces a hex string of the given byte length.
var generateRandomHex = func(ctx context.Context, byteLen int) (string, error) {
	select {
	case <-ctx.Done():
		return "", ctx.Err()
	default:
	}

	b := make([]byte, byteLen)
	n, err := rand.Read(b)
	if err != nil {
		return "", fmt.Errorf("failed to read random bytes: %w", err)
	}
	if n == 0 {
		return "", fmt.Errorf("no random bytes read")
	}
	return hex.EncodeToString(b), nil
}

// Compile-time check that PostgresCodeBasedInvitation implements InvitationMethod.
var _ services.InvitationMethod = (*PostgresCodeBasedInvitation)(nil)
