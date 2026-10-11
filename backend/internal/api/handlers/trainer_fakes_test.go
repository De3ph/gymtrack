package handlers

import (
	"context"
	"time"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
)

// testClockNow pins "now" so timestamp assertions do not drift between runs.
var testClockNow = time.Date(2026, 4, 10, 9, 0, 0, 0, time.UTC)

// Fakes for the repositories behind the trainer-catalog, availability and
// review services. Handlers hold concrete *services values, so the only seam
// that needs no production change is the repository boundary: each fake
// records its call arguments and returns a canned result or error.

type fakeTrainerProfileRepo struct {
	publicTrainers []models.TrainerWithProfile
	publicErr      error

	byID       map[int]*models.TrainerWithProfile
	getByIDErr error
	getByIDHit bool

	count     int
	countErr  error
	countSeen *repositories.TrainerFilters

	updateErr    error
	updateSeenID int
	updateSeen   *models.TrainerProfile
}

func (f *fakeTrainerProfileRepo) GetPublicTrainers(ctx context.Context, filters *repositories.TrainerFilters, limit, offset int) ([]models.TrainerWithProfile, error) {
	if f.publicErr != nil {
		return nil, f.publicErr
	}
	return f.publicTrainers, nil
}

func (f *fakeTrainerProfileRepo) GetTrainerByID(ctx context.Context, trainerID int) (*models.TrainerWithProfile, error) {
	f.getByIDHit = true
	if f.getByIDErr != nil {
		return nil, f.getByIDErr
	}
	trainer, ok := f.byID[trainerID]
	if !ok {
		return nil, domainerrors.ErrNotFound
	}
	return trainer, nil
}

func (f *fakeTrainerProfileRepo) UpdateTrainerProfile(ctx context.Context, trainerID int, profile *models.TrainerProfile) error {
	f.updateSeenID = trainerID
	f.updateSeen = profile
	return f.updateErr
}

func (f *fakeTrainerProfileRepo) SearchTrainers(ctx context.Context, query string, filters *repositories.TrainerFilters, limit, offset int) ([]models.TrainerWithProfile, error) {
	return f.publicTrainers, f.publicErr
}

func (f *fakeTrainerProfileRepo) CountTrainers(ctx context.Context, filters *repositories.TrainerFilters) (int, error) {
	if filters != nil {
		f.countSeen = filters
	}
	return f.count, f.countErr
}

type fakeReviewRepo struct {
	byTrainer []models.TrainerReview
	byID      map[int]*models.TrainerReview

	created *models.TrainerReview
	deleted []int
	updated *models.TrainerReview

	listErr error
}

func (f *fakeReviewRepo) GetByTrainerID(ctx context.Context, trainerID int) ([]models.TrainerReview, error) {
	if f.listErr != nil {
		return nil, f.listErr
	}
	return f.byTrainer, nil
}

func (f *fakeReviewRepo) CreateReview(ctx context.Context, review *models.TrainerReview) error {
	f.created = review
	return nil
}

func (f *fakeReviewRepo) UpdateReview(ctx context.Context, review *models.TrainerReview) error {
	f.updated = review
	return nil
}

func (f *fakeReviewRepo) DeleteReview(ctx context.Context, reviewID int) error {
	f.deleted = append(f.deleted, reviewID)
	return nil
}

type fakeAvailabilityRepo struct {
	slots     map[int][]models.TrainerAvailability
	listErr   error
	upserted  []models.TrainerAvailability
	deleted   []int
	deleteErr error
}

func (f *fakeAvailabilityRepo) GetByTrainerID(ctx context.Context, trainerID int) ([]models.TrainerAvailability, error) {
	if f.listErr != nil {
		return nil, f.listErr
	}
	return f.slots[trainerID], nil
}

func (f *fakeAvailabilityRepo) GetBySlotID(ctx context.Context, slotID int) (*models.TrainerAvailability, error) {
	for _, slots := range f.slots {
		for i := range slots {
			if slots[i].AvailabilityID == slotID {
				slot := slots[i]
				return &slot, nil
			}
		}
	}
	return nil, nil
}

func (f *fakeAvailabilityRepo) UpsertAvailability(ctx context.Context, slot *models.TrainerAvailability) error {
	f.upserted = append(f.upserted, *slot)
	return nil
}

func (f *fakeAvailabilityRepo) DeleteAvailability(ctx context.Context, slotID int) error {
	f.deleted = append(f.deleted, slotID)
	return f.deleteErr
}

func (f *fakeAvailabilityRepo) GetAvailableSlots(ctx context.Context, trainerID int, dayOfWeek int) ([]models.TrainerAvailability, error) {
	return nil, nil
}

func (f *fakeAvailabilityRepo) BookSlotAtomic(ctx context.Context, slotID int) error {
	return nil
}

func (f *fakeAvailabilityRepo) CleanupExpiredSlots(ctx context.Context, retentionDays int) error {
	return nil
}

type fakeRelationshipRepo struct {
	active bool
	err    error
}

func (f *fakeRelationshipRepo) Create(ctx context.Context, relationship *models.Relationship) error {
	return nil
}

func (f *fakeRelationshipRepo) GetByID(ctx context.Context, relationshipID int) (*models.Relationship, error) {
	return nil, domainerrors.ErrNotFound
}

func (f *fakeRelationshipRepo) GetByTrainerID(ctx context.Context, trainerID int) ([]*models.Relationship, error) {
	return nil, nil
}

func (f *fakeRelationshipRepo) GetByAthleteID(ctx context.Context, athleteID int) (*models.Relationship, error) {
	return nil, nil
}

func (f *fakeRelationshipRepo) GetPendingByAthleteID(ctx context.Context, athleteID int) ([]*models.Relationship, error) {
	return nil, nil
}

func (f *fakeRelationshipRepo) HasActiveRelationship(ctx context.Context, trainerID int, athleteID int) (bool, error) {
	if f.err != nil {
		return false, f.err
	}
	return f.active, nil
}

func (f *fakeRelationshipRepo) Update(ctx context.Context, relationship *models.Relationship) error {
	return nil
}

func (f *fakeRelationshipRepo) Delete(ctx context.Context, relationshipID int) error {
	return nil
}

// GetByTrainerAndAthlete mirrors the PostgreSQL repository: it reports "this
// athlete has not reviewed this trainer" as ErrNotFound — the normal path for a
// first review, not a failure. The pair must both match, because an athlete may
// review several trainers.
func (f *fakeReviewRepo) GetByTrainerAndAthlete(ctx context.Context, trainerID int, athleteID int) (*models.TrainerReview, error) {
	for i := range f.byTrainer {
		if f.byTrainer[i].TrainerID == trainerID && f.byTrainer[i].AthleteID == athleteID {
			review := f.byTrainer[i]
			return &review, nil
		}
	}
	return nil, domainerrors.ErrNotFound
}

func (f *fakeReviewRepo) GetAverageRating(ctx context.Context, trainerID int) (float64, int, error) {
	var sum float64
	var count int
	for _, review := range f.byTrainer {
		if review.TrainerID == trainerID {
			sum += float64(review.Rating)
			count++
		}
	}
	if count == 0 {
		return 0, 0, nil
	}
	return sum / float64(count), count, nil
}

func (f *fakeReviewRepo) GetReviewByID(ctx context.Context, reviewID int) (*models.TrainerReview, error) {
	review, ok := f.byID[reviewID]
	if !ok {
		return nil, domainerrors.ErrNotFound
	}
	return review, nil
}

func (f *fakeReviewRepo) GetRatingsForTrainers(ctx context.Context, trainerIDs []int) (map[int]struct {
	Avg   float64
	Count int
}, error) {
	return nil, nil
}
