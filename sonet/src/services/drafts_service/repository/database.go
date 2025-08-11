package repository

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
	"sonet/src/services/drafts_service/models"
)

// DatabaseConnection represents a database connection
type DatabaseConnection struct {
	*sql.DB
}

// NewDatabaseConnection creates a new database connection
func NewDatabaseConnection() (*DatabaseConnection, error) {
	host := os.Getenv("DB_HOST")
	if host == "" {
		host = "localhost"
	}
	port := os.Getenv("DB_PORT")
	if port == "" {
		port = "5432"
	}
	user := os.Getenv("DB_USER")
	if user == "" {
		user = "postgres"
	}
	password := os.Getenv("DB_PASSWORD")
	if password == "" {
		password = "password"
	}
	dbname := os.Getenv("DB_NAME")
	if dbname == "" {
		dbname = "sonet"
	}

	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("Connected to database successfully")
	return &DatabaseConnection{db}, nil
}

// DraftsRepository defines the interface for draft data operations
type DraftsRepository interface {
	CreateDraft(draft *models.Draft) error
	GetUserDrafts(userID string, limit int32, cursor string, includeAutoSaved bool) ([]*models.Draft, string, error)
	GetDraft(draftID, userID string) (*models.Draft, error)
	UpdateDraft(draft *models.Draft) error
	DeleteDraft(draftID, userID string) error
	AutoSaveDraft(userID string, content string, replyToURI, quoteURI, mentionHandle string, images []models.DraftImage, video *models.DraftVideo, labels []string, threadgate, interactionSettings []byte) (*models.Draft, error)
}

// DraftsRepositoryImpl implements DraftsRepository
type DraftsRepositoryImpl struct {
	db *DatabaseConnection
}

// NewDraftsRepository creates a new drafts repository
func NewDraftsRepository(db *DatabaseConnection) DraftsRepository {
	return &DraftsRepositoryImpl{db: db}
}