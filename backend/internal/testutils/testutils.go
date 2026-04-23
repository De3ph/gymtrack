package testutils

import (
    "bytes"
    "context"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/stretchr/testify/mock"

    "gymtrack-backend/internal/domain/models"
)

// MockCommentRepository implements CommentRepository for tests.
type MockCommentRepository struct { mock.Mock }
func (m *MockCommentRepository) Create(comment *models.Comment) error { return m.Called(comment).Error(0) }
func (m *MockCommentRepository) GetByID(id string) (*models.Comment, error) {
    args := m.Called(id)
    if args.Get(0) == nil { return nil, args.Error(1) }
    return args.Get(0).(*models.Comment), args.Error(1)
}
func (m *MockCommentRepository) GetByTarget(t models.TargetType, id string) ([]*models.Comment, error) {
    args := m.Called(t, id)
    if args.Get(0) == nil { return nil, args.Error(1) }
    return args.Get(0).([]*models.Comment), args.Error(1)
}
func (m *MockCommentRepository) Update(comment *models.Comment) error { return m.Called(comment).Error(0) }
func (m *MockCommentRepository) Delete(id string) error { return m.Called(id).Error(0) }

func (m *MockCommentRepository) GetByAuthor(authorID string) ([]*models.Comment, error) {
    args := m.Called(authorID)
    if args.Get(0) == nil { return nil, args.Error(1) }
    return args.Get(0).([]*models.Comment), args.Error(1)
}

func (m *MockCommentRepository) GetReplies(parentCommentID string) ([]*models.Comment, error) {
    args := m.Called(parentCommentID)
    if args.Get(0) == nil { return nil, args.Error(1) }
    return args.Get(0).([]*models.Comment), args.Error(1)
}

// MockCommentService implements CommentService for tests.
type MockCommentService struct { mock.Mock }
func (m *MockCommentService) CanCreateComment(userID string, userRole models.UserRole, targetType models.TargetType, targetID string, parentCommentID *string) error {
    return m.Called(userID, userRole, targetType, targetID, parentCommentID).Error(0)
}
func (m *MockCommentService) CanAccessComments(userID string, userRole models.UserRole, targetType models.TargetType, targetID string) error {
    return m.Called(userID, userRole, targetType, targetID).Error(0)
}
func (m *MockCommentService) CanEditOrDeleteComment(userID string, commentID string) error {
    return m.Called(userID, commentID).Error(0)
}

// MockAvailabilityService implements AvailabilityService for tests.
type MockAvailabilityService struct { mock.Mock }
func (m *MockAvailabilityService) GetAvailability(ctx context.Context, trainerID string) ([]models.TrainerAvailability, error) {
    args := m.Called(ctx, trainerID)
    if args.Get(0) == nil { return nil, args.Error(1) }
    return args.Get(0).([]models.TrainerAvailability), args.Error(1)
}
func (m *MockAvailabilityService) SetAvailability(ctx context.Context, trainerID string, slots []models.TrainerAvailability) error {
    return m.Called(ctx, trainerID, slots).Error(0)
}
func (m *MockAvailabilityService) DeleteSlot(ctx context.Context, slotID string) error {
    return m.Called(ctx, slotID).Error(0)
}

// Test data factories
func CreateTestComment(id string, targetType models.TargetType, targetID, authorID string, authorRole models.AuthorRole, content string) *models.Comment {
    c := models.NewComment(targetType, targetID, authorID, authorRole, content, nil)
    c.CommentID = id
    c.CreatedAt = time.Now().UTC()
    return c
}
func CreateTestCommentWithParent(id string, targetType models.TargetType, targetID, authorID string, authorRole models.AuthorRole, content string, parentID *string) *models.Comment {
    c := models.NewComment(targetType, targetID, authorID, authorRole, content, parentID)
    c.CommentID = id
    c.CreatedAt = time.Now().UTC()
    return c
}
func CreateTestAvailabilitySlot(id, trainerID string, day int, start, end string) models.TrainerAvailability {
    return models.TrainerAvailability{AvailabilityID: id, TrainerID: trainerID, DayOfWeek: day, StartTime: start, EndTime: end, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()}
}

// CreateTestContext returns a Gin context and recorder for tests.
func CreateTestContext(method, path string, body interface{}, userID string, userRole models.UserRole) (*gin.Context, *httptest.ResponseRecorder) {
    gin.SetMode(gin.TestMode)
    var req *http.Request
    if body != nil {
        b, _ := json.Marshal(body)
        req = httptest.NewRequest(method, path, bytes.NewBuffer(b))
        req.Header.Set("Content-Type", "application/json")
    } else { req = httptest.NewRequest(method, path, nil) }
    w := httptest.NewRecorder()
    c, _ := gin.CreateTestContext(w)
    c.Request = req
    c.Set("userID", userID)
    c.Set("userRole", userRole)
    return c, w
}
