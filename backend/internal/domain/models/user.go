package models

import (
	"time"
)

type UserRole string

const (
	RoleTrainer UserRole = "trainer"
	RoleAthlete UserRole = "athlete"
	RoleAdmin   UserRole = "admin"
)

type UserStatus string

const (
	UserStatusActive    UserStatus = "active"
	UserStatusSuspended UserStatus = "suspended"
	UserStatusBanned    UserStatus = "banned"
)

type UserProfile struct {
	Name              string `json:"name"`
	Age               int    `json:"age,omitempty" example:"25"`
	Weight            int    `json:"weight,omitempty" example:"70"`
	Height            int    `json:"height,omitempty" example:"175"`
	FitnessGoals      string `json:"fitnessGoals,omitempty"`
	TrainerAssignment int    `json:"trainerAssignment,omitempty" example:"1"` // Athlete's trainer ID

	// Trainer specific fields
	Certifications  string `json:"certifications,omitempty"`
	Specializations string `json:"specializations,omitempty"`
	ClientList      []int  `json:"clientList,omitempty"` // List of athlete IDs

	// Trainer profile fields (stored in UserProfile for simplicity)
	Bio                      string   `json:"bio,omitempty"`
	ProfilePhotoURL          string   `json:"profilePhotoUrl,omitempty"`
	HourlyRate               float64  `json:"hourlyRate,omitempty"`
	YearsOfExperience        int      `json:"yearsOfExperience,omitempty" example:"5"`
	Location                 string   `json:"location,omitempty"`
	IsAvailableForNewClients bool     `json:"isAvailableForNewClients,omitempty"`
	Languages                []string `json:"languages,omitempty"`
}

type User struct {
	Type         string      `json:"type"` // Always "user"
	UserID       int         `json:"userId" example:"1"`
	Username     string      `json:"username" validate:"required,min=3,max=30,alphanum"`
	Email        string      `json:"email" validate:"required,email"`
	PasswordHash string      `json:"passwordHash"`
	Role         UserRole    `json:"role" validate:"required,oneof=trainer athlete admin"`
	Status       UserStatus  `json:"status"`
	Profile      UserProfile `json:"profile"`
	CreatedAt    time.Time   `json:"createdAt"`
	UpdatedAt    time.Time   `json:"updatedAt"`
}
