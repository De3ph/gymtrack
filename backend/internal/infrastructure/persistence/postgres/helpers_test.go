package postgres

import (
	"reflect"
	"testing"
)

func TestMarshalToJSONB_RoundTrip(t *testing.T) {
	type sample struct {
		Name  string `json:"name"`
		Count int    `json:"count"`
	}

	original := sample{Name: "bench", Count: 3}

	data, err := MarshalToJSONB(original)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}
	if len(data) == 0 {
		t.Fatal("expected non-empty payload")
	}

	var decoded sample
	if err := UnmarshalFromJSONB(data, &decoded); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}
	if !reflect.DeepEqual(original, decoded) {
		t.Fatalf("round-trip mismatch: got %+v want %+v", decoded, original)
	}
}

func TestMarshalToJSONB_Slice(t *testing.T) {
	original := []string{"alpha", "beta", "gamma"}

	data, err := MarshalToJSONB(original)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	var decoded []string
	if err := UnmarshalFromJSONB(data, &decoded); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}
	if !reflect.DeepEqual(original, decoded) {
		t.Fatalf("round-trip mismatch: got %+v want %+v", decoded, original)
	}
}

func TestUnmarshalFromJSONB_NilInput(t *testing.T) {
	type sample struct {
		Name string `json:"name"`
	}

	target := sample{Name: "preserved"}

	// nil payload: must be a no-op, target keeps its zero-value unchanged
	if err := UnmarshalFromJSONB(nil, &target); err != nil {
		t.Fatalf("nil payload returned error: %v", err)
	}
	if target.Name != "preserved" {
		t.Fatalf("nil payload mutated target: got %+v", target)
	}

	// empty payload: same as nil
	if err := UnmarshalFromJSONB([]byte{}, &target); err != nil {
		t.Fatalf("empty payload returned error: %v", err)
	}
	if target.Name != "preserved" {
		t.Fatalf("empty payload mutated target: got %+v", target)
	}
}

func TestMarshalToJSONB_MarshalError(t *testing.T) {
	// channels cannot be marshalled
	_, err := MarshalToJSONB(make(chan int))
	if err == nil {
		t.Fatal("expected error for unmarshallable type, got nil")
	}
}
