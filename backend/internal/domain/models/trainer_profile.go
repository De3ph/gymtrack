package models

type TrainerProfile struct {
	Bio                      string   `json:"bio"`
	ProfilePhotoURL          string   `json:"profilePhotoUrl"`
	HourlyRate               float64  `json:"hourlyRate"`
	YearsOfExperience        int      `json:"yearsOfExperience"`
	IsAvailableForNewClients bool     `json:"isAvailableForNewClients"`
	Location                 string   `json:"location"`
	Languages                []string `json:"languages"`
}

type TrainerWithProfile struct {
	User
	Profile       TrainerProfile `json:"profile"`
	AverageRating float64        `json:"averageRating,omitempty"`
	ReviewCount   int            `json:"reviewCount,omitempty"`
}
