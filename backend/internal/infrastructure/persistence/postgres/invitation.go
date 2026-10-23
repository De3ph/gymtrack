package postgres

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	domainerrors "gymtrack-backend/internal/domain/errors"
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
	code, err := generateRandomHex(ctx, 4)
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

	err = querierFor(ctx, p.pool).QueryRow(ctx, query, trainerID, code, now, expiresAt).Scan(&invitationID)
	if err != nil {
		return nil, mapWriteError(err, "failed to create invitation")
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

// ClaimInvitation validates a code and consumes it in one statement.
//
// The UPDATE ... RETURNING is the serialization point: only the first
// transaction to match a pending, unexpired row gets a row back. Every later
// caller matching the same code matches zero rows and is told the code is
// already used. Reading the code first and marking it used afterwards — two
// separate statements — would let concurrent accepts both observe "pending".
func (p *PostgresCodeBasedInvitation) ClaimInvitation(ctx context.Context, code string) (*models.Invitation, error) {
	if code == "" {
		return nil, domainerrors.ErrInvitationCodeEmpty
	}

	now := p.clock.Now()
	query := `
		UPDATE invitations
		SET status = 'used', used_at = $1
		WHERE code = $2 AND status = 'pending' AND expires_at > $1
		RETURNING id, trainer_id, code, status, created_at, expires_at, used_at`

	inv := &models.Invitation{}
	var usedAt *time.Time
	err := querierFor(ctx, p.pool).QueryRow(ctx, query, now, code).Scan(
		&inv.InvitationID,
		&inv.TrainerID,
		&inv.Code,
		&inv.Status,
		&inv.CreatedAt,
		&inv.ExpiresAt,
		&usedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// The claim lost the race, or the code is invalid/expired. One
			// follow-up read distinguishes them so the client gets an accurate
			// reason rather than a blanket "already used".
			return nil, p.explainUnclaimable(ctx, code, now)
		}
		return nil, fmt.Errorf("failed to claim invitation: %w", err)
	}

	if usedAt != nil {
		inv.UsedAt = *usedAt
	}
	inv.Type = "invitation"

	return inv, nil
}

// explainUnclaimable reports why a claim matched no row.
func (p *PostgresCodeBasedInvitation) explainUnclaimable(ctx context.Context, code string, now time.Time) error {
	var status string
	var expiresAt time.Time
	err := querierFor(ctx, p.pool).QueryRow(ctx,
		`SELECT status, expires_at FROM invitations WHERE code = $1 LIMIT 1`, code,
	).Scan(&status, &expiresAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domainerrors.ErrInvalidInvitationCode
		}
		return fmt.Errorf("failed to inspect invitation after failed claim: %w", err)
	}

	if status != "pending" {
		return domainerrors.ErrInvitationAlreadyUsed
	}
	if !now.Before(expiresAt) {
		return domainerrors.ErrInvitationExpired
	}
	// Pending and unexpired but the claim still matched nothing: another
	// transaction claimed it between the UPDATE and this read.
	return domainerrors.ErrInvitationAlreadyUsed
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
