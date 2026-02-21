package models

type TrainerProfile struct {
	Bio                      string   `json:"bio,omitempty"`
	ProfilePhotoURL          string   `json:"profilePhotoUrl,omitempty"`
	HourlyRate               float64  `json:"hourlyRate,omitempty"`
	YearsOfExperience        int      `json:"yearsOfExperience,omitempty"`
	IsAvailableForNewClients bool     `json:"isAvailableForNewClients,omitempty"`
	Location                 string   `json:"location,omitempty"`
	Languages                []string `json:"languages,omitempty"`
}

type TrainerWithProfile struct {
	User
	Profile       TrainerProfile `json:"profile"`
	AverageRating float64        `json:"averageRating,omitempty"`
	ReviewCount   int            `json:"reviewCount,omitempty"`
}
