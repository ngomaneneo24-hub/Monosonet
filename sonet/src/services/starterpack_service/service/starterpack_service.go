package service

import (
	pb "sonet/src/services/starterpack_service/proto"
	"sonet/src/services/starterpack_service/repository"
)

// StarterpackService implements the gRPC StarterpackService
type StarterpackService struct {
	pb.UnimplementedStarterpackServiceServer
	repo repository.StarterpackRepository
}

// NewStarterpackService creates a new starterpack service
func NewStarterpackService(repo repository.StarterpackRepository) *StarterpackService {
	return &StarterpackService{repo: repo}
}