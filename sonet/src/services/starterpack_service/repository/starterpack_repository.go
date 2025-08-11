package repository

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"sonet/src/services/starterpack_service/models"
)

func (r *StarterpackRepositoryImpl) CreateStarterpack(req models.CreateStarterpackRequest) (*models.Starterpack, error) {
	sp := &models.Starterpack{
		StarterpackID: uuid.New().String(),
		CreatorID:     req.CreatorID,
		Name:          req.Name,
		Description:   req.Description,
		AvatarURL:     req.AvatarURL,
		IsPublic:      req.IsPublic,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
		ItemCount:     0,
	}
	// TODO: persist in DB
	return sp, nil
}

func (r *StarterpackRepositoryImpl) GetStarterpack(starterpackID, requesterID string) (*models.Starterpack, error) {
	return nil, fmt.Errorf("not implemented")
}

func (r *StarterpackRepositoryImpl) GetUserStarterpacks(userID, requesterID string, limit int32, cursor string) ([]*models.Starterpack, string, error) {
	return []*models.Starterpack{}, "", nil
}

func (r *StarterpackRepositoryImpl) UpdateStarterpack(req models.UpdateStarterpackRequest) (*models.Starterpack, error) {
	return nil, fmt.Errorf("not implemented")
}

func (r *StarterpackRepositoryImpl) DeleteStarterpack(starterpackID, requesterID string) error {
	return fmt.Errorf("not implemented")
}

func (r *StarterpackRepositoryImpl) AddStarterpackItem(req models.AddStarterpackItemRequest) (*models.StarterpackItem, error) {
	item := &models.StarterpackItem{
		ItemID:        uuid.New().String(),
		StarterpackID: req.StarterpackID,
		ItemType:      req.ItemType,
		ItemURI:       req.ItemURI,
		ItemOrder:     req.ItemOrder,
		CreatedAt:     time.Now(),
	}
	// TODO: persist in DB
	return item, nil
}

func (r *StarterpackRepositoryImpl) RemoveStarterpackItem(starterpackID, itemID, removedBy string) error {
	return fmt.Errorf("not implemented")
}

func (r *StarterpackRepositoryImpl) GetStarterpackItems(starterpackID, requesterID string, limit int32, cursor string) ([]*models.StarterpackItem, string, error) {
	return []*models.StarterpackItem{}, "", nil
}

func (r *StarterpackRepositoryImpl) GetStarterpackItemCount(starterpackID string) (int32, error) {
	return 0, nil
}

func (r *StarterpackRepositoryImpl) CanViewStarterpack(starterpackID, requesterID string) (bool, error) {
	return true, nil
}

func (r *StarterpackRepositoryImpl) CanEditStarterpack(starterpackID, requesterID string) (bool, error) {
	return true, nil
}

func (r *StarterpackRepositoryImpl) CanAddToStarterpack(starterpackID, requesterID string) (bool, error) {
	return true, nil
}

func (r *StarterpackRepositoryImpl) GetSuggestedStarterpacks(userID string, limit int32, cursor string) ([]*models.Starterpack, string, error) {
	return []*models.Starterpack{}, "", nil
}