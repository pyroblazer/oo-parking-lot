package services

import (
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// Mock repositories for testing
type MockEntryPointRepository struct {
	mock.Mock
	mu sync.Mutex
}

type MockParkingSlotRepository struct {
	mock.Mock
	mu sync.Mutex
}

type MockParkingSessionRepository struct {
	mock.Mock
	mu sync.Mutex
}

func (m *MockEntryPointRepository) GetByIDentifier(identifier string) (*models.EntryPoint, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	args := m.Called(identifier)
	// Check if there's an error in the second argument
	if len(args) > 1 && args.Error(1) != nil {
		return nil, args.Error(1)
	}
	// Check if the first argument is nil
	if args.Get(0) == nil {
		return nil, nil
	}
	// Return the entry point from the first argument
	return args.Get(0).(*models.EntryPoint), nil
}

func (m *MockEntryPointRepository) GetByID(id int64) (*models.EntryPoint, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	args := m.Called(id)
	// Check if there's an error in the second argument
	if len(args) > 1 && args.Error(1) != nil {
		return nil, args.Error(1)
	}
	// Check if the first argument is nil
	if args.Get(0) == nil {
		return nil, nil
	}
	// Return entry point from the first argument
	return args.Get(0).(*models.EntryPoint), nil
}

func (m *MockEntryPointRepository) List() ([]*models.EntryPoint, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	args := m.Called()
	// Check if there's an error in the second argument
	if len(args) > 1 && args.Error(1) != nil {
		return nil, args.Error(1)
	}
	// Check if the first argument is nil
	if args.Get(0) == nil {
		return nil, nil
	}
	// Return entry points from the first argument
	return args.Get(0).([]*models.EntryPoint), nil
}

func (m *MockEntryPointRepository) Create(ep *models.EntryPoint) (*models.EntryPoint, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	args := m.Called(ep)
	// Check if there's an error in the second argument
	if len(args) > 1 && args.Error(1) != nil {
		return nil, args.Error(1)
	}
	// Check if the first argument is nil
	if args.Get(0) == nil {
		return nil, nil
	}
	// Return the entry point from the first argument
	return args.Get(0).(*models.EntryPoint), nil
}

func (m *MockEntryPointRepository) Update(ep *models.EntryPoint) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	args := m.Called(ep)
	// Check if there's an error in the first argument
	if len(args) > 0 && args.Error(0) != nil {
		return args.Error(0)
	}
	return nil
}

func (m *MockEntryPointRepository) Delete(id int64) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	args := m.Called(id)
	// Check if there's an error in the first argument
	if len(args) > 0 && args.Error(0) != nil {
		return args.Error(0)
	}
	return nil
}

func (m *MockEntryPointRepository) FindOrCreate(identifier, name string) (*models.EntryPoint, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	args := m.Called(identifier, name)
	// Check if there's an error in the second argument
	if len(args) > 1 && args.Error(1) != nil {
		return nil, args.Error(1)
	}
	// Check if the first argument is nil
	if args.Get(0) == nil {
		return nil, nil
	}
	// Return the entry point from the first argument
	return args.Get(0).(*models.EntryPoint), nil
}

func (m *MockParkingSlotRepository) GetByID(id int64) (*models.ParkingSlot, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	args := m.Called(id)
	// Check if there's an error in the second argument
	if len(args) > 1 && args.Error(1) != nil {
		return nil, args.Error(1)
	}
	// Check if the first argument is nil
	if args.Get(0) == nil {
		return nil, nil
	}
	// Return parking slot from the first argument
	return args.Get(0).(*models.ParkingSlot), nil
}

func (m *MockParkingSlotRepository) GetAvailable() ([]*models.ParkingSlot, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	args := m.Called()
	// Check if there's an error in the second argument
	if len(args) > 1 && args.Error(1) != nil {
		return nil, args.Error(1)
	}
	// Check if the first argument is nil
	if args.Get(0) == nil {
		return nil, nil
	}
	// Get slots from the first argument
	slots := args.Get(0).([]*models.ParkingSlot)
	// Return empty slice as-is (not nil)
	return slots, nil
}

func (m *MockParkingSlotRepository) List() ([]*models.ParkingSlot, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	args := m.Called()
	// Check if there's an error in the second argument
	if len(args) > 1 && args.Error(1) != nil {
		return nil, args.Error(1)
	}
	// Check if the first argument is nil
	if args.Get(0) == nil {
		return nil, nil
	}
	// Return parking slots from the first argument
	return args.Get(0).([]*models.ParkingSlot), nil
}

func (m *MockParkingSlotRepository) Create(slot *models.ParkingSlot) (*models.ParkingSlot, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	args := m.Called(slot)
	// Check if there's an error in the second argument
	if len(args) > 1 && args.Error(1) != nil {
		return nil, args.Error(1)
	}
	// Check if the first argument is nil
	if args.Get(0) == nil {
		return nil, nil
	}
	// Return the parking slot from the first argument
	return args.Get(0).(*models.ParkingSlot), nil
}

func (m *MockParkingSlotRepository) Update(slot *models.ParkingSlot) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	args := m.Called(slot)
	// Check if there's an error in the first argument
	if len(args) > 0 && args.Error(0) != nil {
		return args.Error(0)
	}
	return nil
}

func (m *MockParkingSlotRepository) Delete(id int64) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	args := m.Called(id)
	// Check if there's an error in the first argument
	if len(args) > 0 && args.Error(0) != nil {
		return args.Error(0)
	}
	return nil
}

func (m *MockParkingSlotRepository) UpdateAvailability(id int64, available bool) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	args := m.Called(id, available)
	// Check if there's an error in the first argument
	if len(args) > 0 && args.Error(0) != nil {
		return args.Error(0)
	}
	return nil
}

func (m *MockParkingSlotRepository) GetBySlotLabel(slotLabel string) (*models.ParkingSlot, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	args := m.Called(slotLabel)
	// Check if there's an error in the second argument
	if len(args) > 1 && args.Error(1) != nil {
		return nil, args.Error(1)
	}
	// Check if the first argument is nil
	if args.Get(0) == nil {
		return nil, nil
	}
	// Return the parking slot from the first argument
	return args.Get(0).(*models.ParkingSlot), nil
}

func (m *MockParkingSlotRepository) ResetAllSlotsAvailability() error {
	m.mu.Lock()
	defer m.mu.Unlock()
	args := m.Called()
	// Check if there's an error in the first argument
	if len(args) > 0 && args.Error(0) != nil {
		return args.Error(0)
	}
	return nil
}

func (m *MockParkingSessionRepository) Create(session *models.ParkingSession) (*models.ParkingSession, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	args := m.Called(session)
	// Check if there's an error in the second argument
	if len(args) > 1 && args.Error(1) != nil {
		return nil, args.Error(1)
	}
	// Check if the first argument is nil
	if args.Get(0) == nil {
		return nil, nil
	}
	// Return a copy of session to avoid race conditions in concurrent tests
	original := args.Get(0).(*models.ParkingSession)
	return &models.ParkingSession{
		ID:            original.ID,
		VehicleType:   original.VehicleType,
		ParkingSlotID: original.ParkingSlotID,
		EntryPointID:  original.EntryPointID,
		ParkedAt:      original.ParkedAt,
		ExitedAt:      original.ExitedAt,
		TotalFee:      original.TotalFee,
	}, nil
}

func (m *MockParkingSessionRepository) GetByID(id int64) (*models.ParkingSession, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	args := m.Called(id)
	// Check if there's an error in the second argument
	if len(args) > 1 && args.Error(1) != nil {
		return nil, args.Error(1)
	}
	// Check if the first argument is nil
	if args.Get(0) == nil {
		return nil, nil
	}
	// Return a copy of session to avoid race conditions in concurrent tests
	original := args.Get(0).(*models.ParkingSession)
	return &models.ParkingSession{
		ID:            original.ID,
		VehicleType:   original.VehicleType,
		ParkingSlotID: original.ParkingSlotID,
		EntryPointID:  original.EntryPointID,
		ParkedAt:      original.ParkedAt,
		ExitedAt:      original.ExitedAt,
		TotalFee:      original.TotalFee,
	}, nil
}

func (m *MockParkingSessionRepository) Update(session *models.ParkingSession) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	args := m.Called(session)
	// Check if there's an error in the first argument
	if len(args) > 0 && args.Error(0) != nil {
		return args.Error(0)
	}
	return nil
}

func (m *MockParkingSessionRepository) GetPreviousSessions(vehicleType string, since time.Time) ([]*models.ParkingSession, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	args := m.Called(vehicleType, since)
	// Check if there's an error in the second argument
	if len(args) > 1 && args.Error(1) != nil {
		return nil, args.Error(1)
	}
	// Check if the first argument is nil
	if args.Get(0) == nil {
		return nil, nil
	}
	// Return parking sessions from the first argument
	return args.Get(0).([]*models.ParkingSession), nil
}

func (m *MockParkingSessionRepository) List() ([]*models.ParkingSession, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	args := m.Called()
	// Check if there's an error in the second argument
	if len(args) > 1 && args.Error(1) != nil {
		return nil, args.Error(1)
	}
	// Check if the first argument is nil
	if args.Get(0) == nil {
		return nil, nil
	}
	// Return parking sessions from the first argument
	return args.Get(0).([]*models.ParkingSession), nil
}

func (m *MockParkingSessionRepository) Delete(id int64) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	args := m.Called(id)
	// Check if there's an error in the first argument
	if len(args) > 0 && args.Error(0) != nil {
		return args.Error(0)
	}
	return nil
}

func (m *MockParkingSessionRepository) ListPaginated(page, perPage int) ([]*models.ParkingSession, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	args := m.Called(page, perPage)
	// Check if there's an error in the third argument
	if len(args) > 2 && args.Error(2) != nil {
		return nil, args.Error(2)
	}
	// Check if the first argument is nil
	if args.Get(0) == nil {
		return nil, nil
	}
	// Return parking sessions from the first argument
	return args.Get(0).([]*models.ParkingSession), nil
}

func (m *MockParkingSessionRepository) DeleteActiveSessions() error {
	m.mu.Lock()
	defer m.mu.Unlock()
	args := m.Called()
	// Check if there's an error in the first argument
	if len(args) > 0 && args.Error(0) != nil {
		return args.Error(0)
	}
	return nil
}

func TestNewParkingService(t *testing.T) {
	mockEntryPointRepo := new(MockEntryPointRepository)
	mockParkingSlotRepo := new(MockParkingSlotRepository)
	mockSessionRepo := new(MockParkingSessionRepository)

	service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

	assert.NotNil(t, service)
	assert.NotNil(t, service.entryPointRepo)
	assert.NotNil(t, service.parkingSlotRepo)
	assert.NotNil(t, service.sessionRepo)
}

func TestParkingService_ParkVehicle(t *testing.T) {
	t.Run("with valid parameters", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)
		mockParkingSlotRepo := new(MockParkingSlotRepository)
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

		entryPoint := &models.EntryPoint{Identifier: "A"}
		slot := &models.ParkingSlot{ID: 1, SlotType: models.SlotTypeSmall, SlotLabel: "SP-1"}

		mockEntryPointRepo.On("GetByIDentifier", "A").Return(entryPoint, nil)
		mockParkingSlotRepo.On("GetAvailable").Return([]*models.ParkingSlot{slot}, nil)
		mockSessionRepo.On("Create", mock.AnythingOfType("*models.ParkingSession")).Return(&models.ParkingSession{
			ID:            1,
			VehicleType:   "S",
			ParkingSlotID: 1,
			EntryPointID:  1,
			ParkedAt:      time.Now(),
			TotalFee:      0,
		}, nil)
		mockSessionRepo.On("GetPreviousSessions", "S", mock.AnythingOfType("time.Time")).Return([]*models.ParkingSession{}, nil)
		mockParkingSlotRepo.On("Update", mock.AnythingOfType("*models.ParkingSlot")).Return(nil)

		session, err := service.ParkVehicle("S", "A", nil)

		assert.NoError(t, err)
		assert.NotNil(t, session)
		assert.Equal(t, int64(1), session.ID)
		assert.Equal(t, "S", session.VehicleType)
		mockEntryPointRepo.AssertExpectations(t)
		mockParkingSlotRepo.AssertExpectations(t)
		mockSessionRepo.AssertExpectations(t)
	})

	t.Run("with invalid vehicle type", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)
		mockParkingSlotRepo := new(MockParkingSlotRepository)
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

		session, err := service.ParkVehicle("X", "A", nil)

		assert.Nil(t, session)
		assert.Error(t, err)
		assert.Equal(t, ErrInvalidVehicleType, err)
	})

	t.Run("with entry point not found", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)
		mockParkingSlotRepo := new(MockParkingSlotRepository)
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

		mockEntryPointRepo.On("GetByIDentifier", "Z").Return(nil, ErrEntryPointNotFound)

		session, err := service.ParkVehicle("S", "Z", nil)

		assert.Nil(t, session)
		assert.Error(t, err)
		assert.Equal(t, ErrEntryPointNotFound, err)
		mockEntryPointRepo.AssertExpectations(t)
	})

	t.Run("with no available slots", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)
		mockParkingSlotRepo := new(MockParkingSlotRepository)
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

		entryPoint := &models.EntryPoint{Identifier: "A"}

		mockEntryPointRepo.On("GetByIDentifier", "A").Return(entryPoint, nil)
		mockParkingSlotRepo.On("GetAvailable").Return([]*models.ParkingSlot{}, nil)

		session, err := service.ParkVehicle("S", "A", nil)

		assert.Nil(t, session)
		assert.Error(t, err)
		assert.Equal(t, ErrNoAvailableSlot, err)
		mockEntryPointRepo.AssertExpectations(t)
		mockParkingSlotRepo.AssertExpectations(t)
		mockSessionRepo.AssertExpectations(t)
	})

	t.Run("with session creation failure", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)
		mockParkingSlotRepo := new(MockParkingSlotRepository)
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

		entryPoint := &models.EntryPoint{Identifier: "A"}
		slot := &models.ParkingSlot{ID: 1, SlotType: models.SlotTypeSmall, SlotLabel: "SP-1"}

		mockEntryPointRepo.On("GetByIDentifier", "A").Return(entryPoint, nil)
		mockParkingSlotRepo.On("GetAvailable").Return([]*models.ParkingSlot{slot}, nil)
		mockSessionRepo.On("Create", mock.AnythingOfType("*models.ParkingSession")).Return(nil, errors.New("database error"))

		session, err := service.ParkVehicle("S", "A", nil)

		assert.Nil(t, session)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to create parking session")
		mockEntryPointRepo.AssertExpectations(t)
		mockParkingSlotRepo.AssertExpectations(t)
		mockSessionRepo.AssertExpectations(t)
	})
}

func TestParkingService_UnparkVehicle(t *testing.T) {
	t.Run("with valid session", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)
		mockParkingSlotRepo := new(MockParkingSlotRepository)
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

		entryPoint := &models.EntryPoint{Identifier: "A"}
		slot := &models.ParkingSlot{ID: 1, SlotType: models.SlotTypeSmall, SlotLabel: "SP-1"}
		now := time.Now()
		session := &models.ParkingSession{
			ID:            1,
			VehicleType:   "S",
			ParkingSlotID: 1,
			EntryPointID:  1,
			ParkedAt:      now.Add(-2 * time.Hour),
			TotalFee:      0,
		}

		mockSessionRepo.On("GetByID", int64(1)).Return(session, nil)
		mockParkingSlotRepo.On("GetByID", int64(1)).Return(slot, nil)
		mockEntryPointRepo.On("GetByID", int64(1)).Return(entryPoint, nil)
		mockSessionRepo.On("GetPreviousSessions", "S", mock.AnythingOfType("time.Time")).Return([]*models.ParkingSession{}, nil)
		mockSessionRepo.On("Update", mock.AnythingOfType("*models.ParkingSession")).Return(nil)
		mockParkingSlotRepo.On("UpdateAvailability", int64(1), true).Return(nil)

		exitedAt := time.Now()
		response, err := service.UnparkVehicle("1", &exitedAt)

		assert.NoError(t, err)
		assert.NotNil(t, response)
		assert.Equal(t, "1", response.SessionID)
		assert.Equal(t, "S", response.VehicleType)
		assert.True(t, response.DurationHours > 0)
		assert.True(t, response.TotalFee > 0)
		mockSessionRepo.AssertExpectations(t)
		mockParkingSlotRepo.AssertExpectations(t)
		mockEntryPointRepo.AssertExpectations(t)
	})

	t.Run("with session not found", func(t *testing.T) {
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(nil, nil, mockSessionRepo)

		mockSessionRepo.On("GetByID", int64(999999)).Return(nil, ErrSessionNotFound)

		exitedAt := time.Now()
		response, err := service.UnparkVehicle("999999", &exitedAt)

		assert.Nil(t, response)
		assert.Error(t, err)
		assert.Equal(t, ErrSessionNotFound, err)
		mockSessionRepo.AssertExpectations(t)
	})

	t.Run("with vehicle already unparked", func(t *testing.T) {
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(nil, nil, mockSessionRepo)

		now := time.Now()
		exitedAt := now.Add(-1 * time.Hour)
		unparkedSession := &models.ParkingSession{
			ID:            1,
			VehicleType:   "S",
			ParkingSlotID: 1,
			EntryPointID:  1,
			ParkedAt:      now.Add(-2 * time.Hour),
			ExitedAt:      &exitedAt,
			TotalFee:      0,
		}

		mockSessionRepo.On("GetByID", int64(1)).Return(unparkedSession, nil)

		unparkTime := time.Now()
		response, err := service.UnparkVehicle("1", &unparkTime)

		assert.Nil(t, response)
		assert.Error(t, err)
		assert.Equal(t, ErrVehicleAlreadyUnparked, err)
		mockSessionRepo.AssertExpectations(t)
	})

	t.Run("with slot loading failure", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)
		mockParkingSlotRepo := new(MockParkingSlotRepository)
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

		entryPoint := &models.EntryPoint{Identifier: "A"}
		now := time.Now()
		session := &models.ParkingSession{
			ID:            1,
			VehicleType:   "S",
			ParkingSlotID: 1,
			EntryPointID:  1,
			ParkedAt:      now.Add(-2 * time.Hour),
			TotalFee:      0,
		}

		mockSessionRepo.On("GetByID", int64(1)).Return(session, nil)
		mockParkingSlotRepo.On("GetByID", int64(1)).Return(nil, errors.New("slot not found"))
		mockEntryPointRepo.On("GetByID", int64(1)).Return(entryPoint, nil)

		unparkTime := time.Now()
		response, err := service.UnparkVehicle("1", &unparkTime)

		assert.Nil(t, response)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to load parking slot")
		mockSessionRepo.AssertExpectations(t)
		mockParkingSlotRepo.AssertExpectations(t)
	})

	t.Run("with entry point loading failure", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)
		mockParkingSlotRepo := new(MockParkingSlotRepository)
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

		slot := &models.ParkingSlot{ID: 1, SlotType: models.SlotTypeSmall, SlotLabel: "SP-1"}
		now := time.Now()
		session := &models.ParkingSession{
			ID:            1,
			VehicleType:   "S",
			ParkingSlotID: 1,
			EntryPointID:  1,
			ParkedAt:      now.Add(-2 * time.Hour),
			TotalFee:      0,
		}

		mockSessionRepo.On("GetByID", int64(1)).Return(session, nil)
		mockParkingSlotRepo.On("GetByID", int64(1)).Return(slot, nil)
		mockEntryPointRepo.On("GetByID", int64(1)).Return(nil, errors.New("entry point not found"))

		unparkTime := time.Now()
		response, err := service.UnparkVehicle("1", &unparkTime)

		assert.Nil(t, response)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to load entry point")
		mockSessionRepo.AssertExpectations(t)
		mockParkingSlotRepo.AssertExpectations(t)
	})

	t.Run("with continuous parking check failure", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)
		mockParkingSlotRepo := new(MockParkingSlotRepository)
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

		entryPoint := &models.EntryPoint{Identifier: "A"}
		slot := &models.ParkingSlot{ID: 1, SlotType: models.SlotTypeSmall, SlotLabel: "SP-1"}
		now := time.Now()
		session := &models.ParkingSession{
			ID:            1,
			VehicleType:   "S",
			ParkingSlotID: 1,
			EntryPointID:  1,
			ParkedAt:      now.Add(-2 * time.Hour),
			TotalFee:      0,
		}

		mockSessionRepo.On("GetByID", int64(1)).Return(session, nil)
		mockParkingSlotRepo.On("GetByID", int64(1)).Return(slot, nil)
		mockEntryPointRepo.On("GetByID", int64(1)).Return(entryPoint, nil)
		mockSessionRepo.On("GetPreviousSessions", "S", mock.AnythingOfType("time.Time")).Return(nil, errors.New("db error"))

		unparkTime := time.Now()
		response, err := service.UnparkVehicle("1", &unparkTime)

		assert.Nil(t, response)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to check continuous parking")
		mockSessionRepo.AssertExpectations(t)
		mockParkingSlotRepo.AssertExpectations(t)
		mockEntryPointRepo.AssertExpectations(t)
	})

	t.Run("with session update failure", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)
		mockParkingSlotRepo := new(MockParkingSlotRepository)
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

		entryPoint := &models.EntryPoint{Identifier: "A"}
		slot := &models.ParkingSlot{ID: 1, SlotType: models.SlotTypeSmall, SlotLabel: "SP-1"}
		now := time.Now()
		session := &models.ParkingSession{
			ID:            1,
			VehicleType:   "S",
			ParkingSlotID: 1,
			EntryPointID:  1,
			ParkedAt:      now.Add(-2 * time.Hour),
			TotalFee:      0,
		}

		mockSessionRepo.On("GetByID", int64(1)).Return(session, nil)
		mockParkingSlotRepo.On("GetByID", int64(1)).Return(slot, nil)
		mockEntryPointRepo.On("GetByID", int64(1)).Return(entryPoint, nil)
		mockSessionRepo.On("GetPreviousSessions", "S", mock.AnythingOfType("time.Time")).Return([]*models.ParkingSession{}, nil)
		mockSessionRepo.On("Update", mock.AnythingOfType("*models.ParkingSession")).Return(errors.New("update failed"))

		unparkTime := time.Now()
		response, err := service.UnparkVehicle("1", &unparkTime)

		assert.Nil(t, response)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to update parking session")
		mockSessionRepo.AssertExpectations(t)
		mockParkingSlotRepo.AssertExpectations(t)
		mockEntryPointRepo.AssertExpectations(t)
	})
}

func TestParkingService_AvailableSlots(t *testing.T) {
	t.Run("with valid parameters", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)
		mockParkingSlotRepo := new(MockParkingSlotRepository)
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

		entryPoint := &models.EntryPoint{Identifier: "A"}
		spSlot := &models.ParkingSlot{ID: 1, SlotType: models.SlotTypeSmall, SlotLabel: "SP-1", Distances: []int{1}}
		mpSlot := &models.ParkingSlot{ID: 2, SlotType: models.SlotTypeMedium, SlotLabel: "MP-1", Distances: []int{2}}
		lpSlot := &models.ParkingSlot{ID: 3, SlotType: models.SlotTypeLarge, SlotLabel: "LP-1", Distances: []int{3}}

		mockEntryPointRepo.On("GetByIDentifier", "A").Return(entryPoint, nil)
		mockParkingSlotRepo.On("GetAvailable").Return([]*models.ParkingSlot{spSlot, mpSlot, lpSlot}, nil)

		slots, err := service.AvailableSlots("S", "A")

		assert.NoError(t, err)
		assert.Len(t, slots, 3)
		mockEntryPointRepo.AssertExpectations(t)
		mockParkingSlotRepo.AssertExpectations(t)
		mockSessionRepo.AssertExpectations(t)
	})

	t.Run("with invalid vehicle type", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)
		mockParkingSlotRepo := new(MockParkingSlotRepository)
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

		slots, err := service.AvailableSlots("X", "A")

		assert.Nil(t, slots)
		assert.Error(t, err)
		assert.Equal(t, ErrInvalidVehicleType, err)
		mockEntryPointRepo.AssertExpectations(t)
		mockParkingSlotRepo.AssertExpectations(t)
		mockSessionRepo.AssertExpectations(t)
	})

	t.Run("with entry point not found", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)
		mockParkingSlotRepo := new(MockParkingSlotRepository)
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

		mockEntryPointRepo.On("GetByIDentifier", "Z").Return(nil, ErrEntryPointNotFound)

		slots, err := service.AvailableSlots("S", "Z")

		assert.Nil(t, slots)
		assert.Error(t, err)
		assert.Equal(t, ErrEntryPointNotFound, err)
		mockEntryPointRepo.AssertExpectations(t)
		mockParkingSlotRepo.AssertExpectations(t)
		mockSessionRepo.AssertExpectations(t)
	})

	t.Run("with get available slots failure", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)
		mockParkingSlotRepo := new(MockParkingSlotRepository)
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

		entryPoint := &models.EntryPoint{Identifier: "A"}

		mockEntryPointRepo.On("GetByIDentifier", "A").Return(entryPoint, nil)
		mockParkingSlotRepo.On("GetAvailable").Return(nil, errors.New("db error"))

		slots, err := service.AvailableSlots("S", "A")

		assert.Nil(t, slots)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to get available slots")
		mockEntryPointRepo.AssertExpectations(t)
		mockParkingSlotRepo.AssertExpectations(t)
		mockSessionRepo.AssertExpectations(t)
	})

	t.Run("filters by vehicle compatibility", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)
		mockParkingSlotRepo := new(MockParkingSlotRepository)
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

		entryPoint := &models.EntryPoint{Identifier: "A"}
		spSlot := &models.ParkingSlot{ID: 1, SlotType: models.SlotTypeSmall, SlotLabel: "SP-1", Distances: []int{1}}
		mpSlot := &models.ParkingSlot{ID: 2, SlotType: models.SlotTypeMedium, SlotLabel: "MP-1", Distances: []int{2}}

		mockEntryPointRepo.On("GetByIDentifier", "A").Return(entryPoint, nil)
		mockParkingSlotRepo.On("GetAvailable").Return([]*models.ParkingSlot{spSlot, mpSlot}, nil)

		slots, err := service.AvailableSlots("S", "A")

		assert.NoError(t, err)
		assert.Len(t, slots, 2)
		mockEntryPointRepo.AssertExpectations(t)
		mockParkingSlotRepo.AssertExpectations(t)
		mockSessionRepo.AssertExpectations(t)
	})

	t.Run("sorts by distance", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)
		mockParkingSlotRepo := new(MockParkingSlotRepository)
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

		entryPoint := &models.EntryPoint{Identifier: "A"}
		farSlot := &models.ParkingSlot{ID: 1, SlotType: models.SlotTypeSmall, SlotLabel: "SP-2", Distances: []int{10}}
		closeSlot := &models.ParkingSlot{ID: 2, SlotType: models.SlotTypeSmall, SlotLabel: "SP-1", Distances: []int{1}}

		mockEntryPointRepo.On("GetByIDentifier", "A").Return(entryPoint, nil)
		mockParkingSlotRepo.On("GetAvailable").Return([]*models.ParkingSlot{farSlot, closeSlot}, nil)

		slots, err := service.AvailableSlots("S", "A")

		assert.NoError(t, err)
		assert.Len(t, slots, 2)
		assert.Equal(t, int64(2), slots[0].ID) // closeSlot should be first (distance 1)
		assert.Equal(t, int64(1), slots[1].ID) // farSlot should be second (distance 10)
		mockEntryPointRepo.AssertExpectations(t)
		mockParkingSlotRepo.AssertExpectations(t)
	})

	t.Run("with no available slots", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)
		mockParkingSlotRepo := new(MockParkingSlotRepository)
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

		entryPoint := &models.EntryPoint{Identifier: "A"}

		mockEntryPointRepo.On("GetByIDentifier", "A").Return(entryPoint, nil)
		mockParkingSlotRepo.On("GetAvailable").Return([]*models.ParkingSlot{}, nil)

		slots, err := service.AvailableSlots("S", "A")

		assert.NoError(t, err)
		assert.Empty(t, slots)
		mockEntryPointRepo.AssertExpectations(t)
		mockParkingSlotRepo.AssertExpectations(t)
		mockSessionRepo.AssertExpectations(t)
	})
}

func TestParkingService_GetSession(t *testing.T) {
	t.Run("with valid session", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)
		mockParkingSlotRepo := new(MockParkingSlotRepository)
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

		entryPoint := &models.EntryPoint{Identifier: "A"}
		slot := &models.ParkingSlot{ID: 1, SlotType: models.SlotTypeSmall, SlotLabel: "SP-1"}
		now := time.Now()
		session := &models.ParkingSession{
			ID:            1,
			VehicleType:   "S",
			ParkingSlotID: 1,
			EntryPointID:  1,
			ParkedAt:      now.Add(-2 * time.Hour),
			TotalFee:      0,
		}

		mockSessionRepo.On("GetByID", int64(1)).Return(session, nil)
		mockParkingSlotRepo.On("GetByID", int64(1)).Return(slot, nil)
		mockEntryPointRepo.On("GetByID", int64(1)).Return(entryPoint, nil)

		result, err := service.GetSession(int64(1))

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, int64(1), result.ID)
		assert.Equal(t, "S", result.VehicleType)
		assert.Equal(t, "SP-1", result.ParkingSlot.SlotLabel)
		mockSessionRepo.AssertExpectations(t)
		mockParkingSlotRepo.AssertExpectations(t)
		mockEntryPointRepo.AssertExpectations(t)
	})

	t.Run("with session not found", func(t *testing.T) {
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(nil, nil, mockSessionRepo)

		mockSessionRepo.On("GetByID", int64(999999)).Return(nil, ErrSessionNotFound)

		result, err := service.GetSession(int64(999999))

		assert.Nil(t, result)
		assert.Error(t, err)
		assert.Equal(t, ErrSessionNotFound, err)
		mockSessionRepo.AssertExpectations(t)
	})

	t.Run("with slot loading failure", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)
		mockParkingSlotRepo := new(MockParkingSlotRepository)
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

		now := time.Now()
		session := &models.ParkingSession{
			ID:            1,
			VehicleType:   "S",
			ParkingSlotID: 1,
			EntryPointID:  1,
			ParkedAt:      now.Add(-2 * time.Hour),
			TotalFee:      0,
		}

		mockSessionRepo.On("GetByID", int64(1)).Return(session, nil)
		mockParkingSlotRepo.On("GetByID", int64(1)).Return(nil, errors.New("slot not found"))

		result, err := service.GetSession(int64(1))

		assert.Nil(t, result)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to load parking slot")
		mockSessionRepo.AssertExpectations(t)
		mockParkingSlotRepo.AssertExpectations(t)
	})

	t.Run("with entry point loading failure", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)
		mockParkingSlotRepo := new(MockParkingSlotRepository)
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

		slot := &models.ParkingSlot{ID: 1, SlotType: models.SlotTypeSmall, SlotLabel: "SP-1"}
		now := time.Now()
		session := &models.ParkingSession{
			ID:            1,
			VehicleType:   "S",
			ParkingSlotID: 1,
			EntryPointID:  1,
			ParkedAt:      now.Add(-2 * time.Hour),
			TotalFee:      0,
		}

		mockSessionRepo.On("GetByID", int64(1)).Return(session, nil)
		mockParkingSlotRepo.On("GetByID", int64(1)).Return(slot, nil)
		mockEntryPointRepo.On("GetByID", int64(1)).Return(nil, errors.New("entry point not found"))

		result, err := service.GetSession(int64(1))

		assert.Nil(t, result)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to load entry point")
		mockSessionRepo.AssertExpectations(t)
		mockParkingSlotRepo.AssertExpectations(t)
	})
}

func TestParkingService_ListSessions(t *testing.T) {
	t.Run("with valid sessions", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)
		mockParkingSlotRepo := new(MockParkingSlotRepository)
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

		entryPoint := &models.EntryPoint{Identifier: "A"}
		slot := &models.ParkingSlot{ID: 1, SlotType: models.SlotTypeSmall, SlotLabel: "SP-1"}
		sessions := []*models.ParkingSession{
			{
				ID:            1,
				VehicleType:   "S",
				ParkingSlotID: 1,
				EntryPointID:  1,
				ParkedAt:      time.Now().Add(-2 * time.Hour),
				TotalFee:      0,
			},
			{
				ID:            2,
				VehicleType:   "M",
				ParkingSlotID: 2,
				EntryPointID:  1,
				ParkedAt:      time.Now().Add(-3 * time.Hour),
				TotalFee:      0,
			},
		}

		mockSessionRepo.On("List").Return(sessions, nil)
		mockParkingSlotRepo.On("GetByID", int64(1)).Return(slot, nil)
		mockParkingSlotRepo.On("GetByID", int64(2)).Return(slot, nil)
		mockEntryPointRepo.On("GetByID", int64(1)).Return(entryPoint, nil)

		result, err := service.ListSessions()

		assert.NoError(t, err)
		assert.Len(t, result, 2)
		mockSessionRepo.AssertExpectations(t)
		mockParkingSlotRepo.AssertExpectations(t)
		mockEntryPointRepo.AssertExpectations(t)
	})

	t.Run("with list failure", func(t *testing.T) {
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(nil, nil, mockSessionRepo)

		mockSessionRepo.On("List").Return(nil, errors.New("db error"))

		result, err := service.ListSessions()

		assert.Nil(t, result)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "db error")
		mockSessionRepo.AssertExpectations(t)
	})

	t.Run("with partial slot loading failures", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)
		mockParkingSlotRepo := new(MockParkingSlotRepository)
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

		entryPoint := &models.EntryPoint{Identifier: "A"}
		slot := &models.ParkingSlot{ID: 1, SlotType: models.SlotTypeSmall, SlotLabel: "SP-1"}
		sessions := []*models.ParkingSession{
			{
				ID:            1,
				VehicleType:   "S",
				ParkingSlotID: 1,
				EntryPointID:  1,
				ParkedAt:      time.Now().Add(-2 * time.Hour),
				TotalFee:      0,
			},
			{
				ID:            2,
				VehicleType:   "M",
				ParkingSlotID: 2,
				EntryPointID:  1,
				ParkedAt:      time.Now().Add(-3 * time.Hour),
				TotalFee:      0,
			},
		}

		mockSessionRepo.On("List").Return(sessions, nil)
		mockParkingSlotRepo.On("GetByID", int64(1)).Return(slot, nil)
		mockParkingSlotRepo.On("GetByID", int64(2)).Return(nil, errors.New("slot not found"))
		mockEntryPointRepo.On("GetByID", int64(1)).Return(entryPoint, nil)

		result, err := service.ListSessions()

		assert.NoError(t, err)
		assert.Len(t, result, 2)
		mockSessionRepo.AssertExpectations(t)
		mockParkingSlotRepo.AssertExpectations(t)
	})

	t.Run("concurrent park requests", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)
		mockParkingSlotRepo := new(MockParkingSlotRepository)
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

		entryPoint := &models.EntryPoint{Identifier: "A"}
		slots := []*models.ParkingSlot{
			{ID: 1, SlotType: models.SlotTypeSmall, SlotLabel: "SP-1"},
		}

		mockEntryPointRepo.On("GetByIDentifier", "A").Return(entryPoint, nil)
		mockParkingSlotRepo.On("GetAvailable").Return(slots, nil)
		mockSessionRepo.On("Create", mock.AnythingOfType("*models.ParkingSession")).Return(
			&models.ParkingSession{ID: 1, ParkingSlotID: 1, VehicleType: "S"},
			nil,
		).Times(2)
		mockSessionRepo.On("GetPreviousSessions", "S", mock.AnythingOfType("time.Time")).Return([]*models.ParkingSession{}, nil).Maybe()
		mockParkingSlotRepo.On("Update", mock.AnythingOfType("*models.ParkingSlot")).Return(nil).Maybe()

		// Simulate concurrent requests
		done := make(chan bool, 2)
		for i := 0; i < 2; i++ {
			go func() {
				_, _ = service.ParkVehicle("S", "A", nil)
				done <- true
			}()
		}

		<-done
		<-done

		mockSessionRepo.AssertExpectations(t)
		mockParkingSlotRepo.AssertExpectations(t)
		mockEntryPointRepo.AssertExpectations(t)
	})

	t.Run("with zero duration session", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)
		mockParkingSlotRepo := new(MockParkingSlotRepository)
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

		entryPoint := &models.EntryPoint{Identifier: "A"}
		slot := &models.ParkingSlot{ID: 1, SlotType: models.SlotTypeSmall, SlotLabel: "SP-1"}
		now := time.Now()
		session := &models.ParkingSession{
			ID:            1,
			VehicleType:   "S",
			ParkingSlotID: 1,
			EntryPointID:  1,
			ParkedAt:      now,
			TotalFee:      0,
		}

		mockSessionRepo.On("GetByID", int64(1)).Return(session, nil)
		mockParkingSlotRepo.On("GetByID", int64(1)).Return(slot, nil)
		mockEntryPointRepo.On("GetByID", int64(1)).Return(entryPoint, nil)
		mockSessionRepo.On("GetPreviousSessions", "S", mock.AnythingOfType("time.Time")).Return([]*models.ParkingSession{}, nil)
		mockSessionRepo.On("Update", mock.AnythingOfType("*models.ParkingSession")).Return(nil)
		mockParkingSlotRepo.On("UpdateAvailability", int64(1), true).Return(nil)

		exitedAt := time.Now()
		response, err := service.UnparkVehicle("1", &exitedAt)

		assert.NoError(t, err)
		assert.NotNil(t, response)
		assert.GreaterOrEqual(t, response.DurationHours, 0.0) // DurationHours returns float64
		mockSessionRepo.AssertExpectations(t)
		mockParkingSlotRepo.AssertExpectations(t)
		mockEntryPointRepo.AssertExpectations(t)
	})

	t.Run("with very long duration session", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)
		mockParkingSlotRepo := new(MockParkingSlotRepository)
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

		entryPoint := &models.EntryPoint{Identifier: "A"}
		slot := &models.ParkingSlot{ID: 1, SlotType: models.SlotTypeSmall, SlotLabel: "SP-1"}
		now := time.Now()
		session := &models.ParkingSession{
			ID:            1,
			VehicleType:   "S",
			ParkingSlotID: 1,
			EntryPointID:  1,
			ParkedAt:      now.Add(-1000 * time.Hour),
			TotalFee:      0,
		}

		mockSessionRepo.On("GetByID", int64(1)).Return(session, nil)
		mockParkingSlotRepo.On("GetByID", int64(1)).Return(slot, nil)
		mockEntryPointRepo.On("GetByID", int64(1)).Return(entryPoint, nil)
		mockSessionRepo.On("GetPreviousSessions", "S", mock.AnythingOfType("time.Time")).Return([]*models.ParkingSession{}, nil)
		mockSessionRepo.On("Update", mock.AnythingOfType("*models.ParkingSession")).Return(nil)
		mockParkingSlotRepo.On("UpdateAvailability", mock.AnythingOfType("int64"), mock.AnythingOfType("bool")).Return(nil)

unparkTime := time.Now()
		response, err := service.UnparkVehicle("1", &unparkTime)

		assert.NoError(t, err)
		assert.NotNil(t, response)
		assert.True(t, response.DurationHours > 0)
		assert.True(t, response.TotalFee > 0)
		mockSessionRepo.AssertExpectations(t)
		mockEntryPointRepo.AssertExpectations(t)
	})
}

func TestParkingService_ListSlots(t *testing.T) {
	t.Run("with valid slots", func(t *testing.T) {
		mockParkingSlotRepo := new(MockParkingSlotRepository)

		service := NewParkingService(nil, mockParkingSlotRepo, nil)

		slots := []*models.ParkingSlot{
			{ID: 1, SlotType: models.SlotTypeSmall, SlotLabel: "SP-1"},
			{ID: 2, SlotType: models.SlotTypeMedium, SlotLabel: "MP-1"},
			{ID: 3, SlotType: models.SlotTypeLarge, SlotLabel: "LP-1"},
		}

		mockParkingSlotRepo.On("List").Return(slots, nil)

		result, err := service.ListSlots()

		assert.NoError(t, err)
		assert.Len(t, result, 3)
		mockParkingSlotRepo.AssertExpectations(t)
	})

	t.Run("with list failure", func(t *testing.T) {
		mockParkingSlotRepo := new(MockParkingSlotRepository)

		service := NewParkingService(nil, mockParkingSlotRepo, nil)

		mockParkingSlotRepo.On("List").Return(nil, errors.New("db error"))

		result, err := service.ListSlots()

		assert.Nil(t, result)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "db error")
		mockParkingSlotRepo.AssertExpectations(t)
	})
}

func TestParkingService_ListEntryPoints(t *testing.T) {
	t.Run("with valid entry points", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)

		service := NewParkingService(mockEntryPointRepo, nil, nil)

		entryPoints := []*models.EntryPoint{
			{Identifier: "A", ID: 1},
			{Identifier: "B", ID: 2},
			{Identifier: "C", ID: 3},
		}

		mockEntryPointRepo.On("List").Return(entryPoints, nil)

		result, err := service.ListEntryPoints()

		assert.NoError(t, err)
		assert.Len(t, result, 3)
		mockEntryPointRepo.AssertExpectations(t)
	})

	t.Run("with list failure", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)

		service := NewParkingService(mockEntryPointRepo, nil, nil)

		mockEntryPointRepo.On("List").Return(nil, errors.New("db error"))

		result, err := service.ListEntryPoints()

		assert.Nil(t, result)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "db error")
		mockEntryPointRepo.AssertExpectations(t)
	})
}

func TestParkingService_EdgeCases(t *testing.T) {
	t.Run("concurrent park requests", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)
		mockParkingSlotRepo := new(MockParkingSlotRepository)
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

		entryPoint := &models.EntryPoint{Identifier: "A"}
		slots := []*models.ParkingSlot{
			{ID: 1, SlotType: models.SlotTypeSmall, SlotLabel: "SP-1"},
		}

		mockEntryPointRepo.On("GetByIDentifier", "A").Return(entryPoint, nil)
		mockParkingSlotRepo.On("GetAvailable").Return(slots, nil)
		mockSessionRepo.On("Create", mock.AnythingOfType("*models.ParkingSession")).Return(
			&models.ParkingSession{ID: 1, ParkingSlotID: 1, VehicleType: "S"},
			nil,
		).Times(2)
		mockSessionRepo.On("GetPreviousSessions", "S", mock.AnythingOfType("time.Time")).Return([]*models.ParkingSession{}, nil).Maybe()
		mockParkingSlotRepo.On("Update", mock.AnythingOfType("*models.ParkingSlot")).Return(nil).Maybe()

		// Simulate concurrent requests
		done := make(chan bool, 2)
		for i := 0; i < 2; i++ {
			go func() {
				_, _ = service.ParkVehicle("S", "A", nil)
				done <- true
			}()
		}

		<-done
		<-done

		mockSessionRepo.AssertExpectations(t)
		mockParkingSlotRepo.AssertExpectations(t)
		mockEntryPointRepo.AssertExpectations(t)
	})

	t.Run("with zero duration session", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)
		mockParkingSlotRepo := new(MockParkingSlotRepository)
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

		entryPoint := &models.EntryPoint{Identifier: "A"}
		slot := &models.ParkingSlot{ID: 1, SlotType: models.SlotTypeSmall, SlotLabel: "SP-1"}
		now := time.Now()
		session := &models.ParkingSession{
			ID:            1,
			VehicleType:   "S",
			ParkingSlotID: 1,
			EntryPointID:  1,
			ParkedAt:      now,
			TotalFee:      0,
		}

		mockSessionRepo.On("GetByID", int64(1)).Return(session, nil)
		mockParkingSlotRepo.On("GetByID", int64(1)).Return(slot, nil)
		mockEntryPointRepo.On("GetByID", int64(1)).Return(entryPoint, nil)
		mockSessionRepo.On("GetPreviousSessions", "S", mock.AnythingOfType("time.Time")).Return([]*models.ParkingSession{}, nil)
		mockSessionRepo.On("Update", mock.AnythingOfType("*models.ParkingSession")).Return(nil)
		mockParkingSlotRepo.On("UpdateAvailability", int64(1), true).Return(nil)

		exitedAt := time.Now()
		response, err := service.UnparkVehicle("1", &exitedAt)

		assert.NoError(t, err)
		assert.NotNil(t, response)
		assert.GreaterOrEqual(t, response.DurationHours, 0.0) // DurationHours returns float64
		mockSessionRepo.AssertExpectations(t)
		mockParkingSlotRepo.AssertExpectations(t)
		mockEntryPointRepo.AssertExpectations(t)
	})

	t.Run("with very long duration session", func(t *testing.T) {
		mockEntryPointRepo := new(MockEntryPointRepository)
		mockParkingSlotRepo := new(MockParkingSlotRepository)
		mockSessionRepo := new(MockParkingSessionRepository)

		service := NewParkingService(mockEntryPointRepo, mockParkingSlotRepo, mockSessionRepo)

		entryPoint := &models.EntryPoint{Identifier: "A"}
		slot := &models.ParkingSlot{ID: 1, SlotType: models.SlotTypeSmall, SlotLabel: "SP-1"}
		now := time.Now()
		session := &models.ParkingSession{
			ID:            1,
			VehicleType:   "S",
			ParkingSlotID: 1,
			EntryPointID:  1,
			ParkedAt:      now.Add(-1000 * time.Hour),
			TotalFee:      0,
		}

		mockSessionRepo.On("GetByID", int64(1)).Return(session, nil)
		mockParkingSlotRepo.On("GetByID", int64(1)).Return(slot, nil)
		mockEntryPointRepo.On("GetByID", int64(1)).Return(entryPoint, nil)
		mockSessionRepo.On("GetPreviousSessions", "S", mock.AnythingOfType("time.Time")).Return([]*models.ParkingSession{}, nil)
		mockSessionRepo.On("Update", mock.AnythingOfType("*models.ParkingSession")).Return(nil)
		mockParkingSlotRepo.On("UpdateAvailability", mock.AnythingOfType("int64"), mock.AnythingOfType("bool")).Return(nil)

unparkTime := time.Now()
		response, err := service.UnparkVehicle("1", &unparkTime)

		assert.NoError(t, err)
		assert.NotNil(t, response)
		assert.True(t, response.DurationHours > 0)
		assert.True(t, response.TotalFee > 0)
		mockSessionRepo.AssertExpectations(t)
		mockEntryPointRepo.AssertExpectations(t)
	})
}
