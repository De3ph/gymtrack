package postgres

import (
	"encoding/json"
	"fmt"
)

// MarshalToJSONB converts a Go value into a JSONB-compatible []byte payload.
// It returns an error wrapped with context when marshalling fails so callers
// can attribute the failure to the originating struct.
func MarshalToJSONB(v any) ([]byte, error) {
	data, err := json.Marshal(v)
	if err != nil {
		return nil, fmt.Errorf("marshal to jsonb: %w", err)
	}
	return data, nil
}

// UnmarshalFromJSONB populates the target value from a JSONB []byte payload.
// Caller passes a pointer; nil/empty payloads are treated as a no-op so that
// NULL JSONB columns do not blow up deserialization.
func UnmarshalFromJSONB(data []byte, v any) error {
	if len(data) == 0 {
		return nil
	}
	if err := json.Unmarshal(data, v); err != nil {
		return fmt.Errorf("unmarshal from jsonb: %w", err)
	}
	return nil
}
