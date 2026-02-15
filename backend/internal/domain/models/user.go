package models

import (
	"time"
)

type UserRole string

const (
	RoleTrainer UserRole = "trainer"
	RoleAthlete UserRole = "athlete"
)

type UserProfile struct {
	Name            string `json:"name"`
	Age             int    `json:"age,omitempty"`
	Weight          int    `json:"weight,omitempty"`
	Height          int    `json:"height,omitempty"`
	FitnessGoals    string `json:"fitnessGoals,omitempty"`
	TrainerAssignment string `json:"trainerAssignment,omitempty"` // Athlete's trainer ID

	// Trainer specific fields
	Certifications  string `json:"certifications,omitempty"`
	Specializations string `json:"specializations,omitempty"`
	ClientList      []string `json:"clientList,omitempty"` // List of athlete IDs
}

type User struct {
	Type         string      `json:"type"` // Always "user"
	UserID       string      `json:"userId"`
	Email        string      `json:"email" validate:"required,email"`
	PasswordHash string      `json:"passwordHash"`
	Role         UserRole    `json:"role" validate:"required,oneof=trainer athlete"`
	Profile      UserProfile `json:"profile"`
	CreatedAt    time.Time   `json:"createdAt"`
	UpdatedAt    time.Time   `json:"updatedAt"`
}
