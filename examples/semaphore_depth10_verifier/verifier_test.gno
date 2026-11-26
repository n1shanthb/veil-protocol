package semaphore_depth10_verifier

import "testing"

func TestGeneratedVKInitialized(t *testing.T) {
	if ExpectedPublicInputs() != 4 {
		t.Fatalf("expected 4 public inputs, got %d", ExpectedPublicInputs())
	}
	if len(vk.IC) != 5 {
		t.Fatalf("expected 5 IC points, got %d", len(vk.IC))
	}
}
