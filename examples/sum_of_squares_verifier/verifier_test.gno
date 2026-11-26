package sum_of_squares_verifier

import "testing"

func TestGeneratedVKInitialized(t *testing.T) {
	if ExpectedPublicInputs() != 2 {
		t.Fatalf("expected 2 public inputs, got %d", ExpectedPublicInputs())
	}
	if len(vk.IC) != 3 {
		t.Fatalf("expected 3 IC points, got %d", len(vk.IC))
	}
}
