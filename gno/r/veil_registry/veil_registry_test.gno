package veil_registry

import (
	"strings"
	"testing"
)

func TestRegistryLifecycleAndAuthorization(cur realm, t *testing.T) {
	pub := address("g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04")
	attacker := address("g1us8428u2a5satrlxzagqqa5m6vmuze025anjlj")

	testing.SetRealm(testing.NewUserRealm(pub))
	id := RegisterVerifier(
		cross(cur),
		"gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/semaphore_depth10_verifier",
		"a6789bea2b941dbdb86e887cc9f958aa447dcbfa9ff725a886d99db2c2c47c3b",
		"groth16",
		"bn254",
		4,
		"Semaphore v4.13.0 depth-10 (PSE ceremony)",
		"v1.0.0",
	)
	if id != 1 {
		t.Fatalf("expected id 1, got %d", id)
	}
	if !strings.Contains(GetVerifier(1), "|active") {
		t.Fatalf("expected active record, got %s", GetVerifier(1))
	}

	// Duplicate path rejected.
	if r := revive(func() {
		RegisterVerifier(cross(cur), "gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/semaphore_depth10_verifier", "abc", "groth16", "bn254", 4, "dup", "v1")
	}); r == nil {
		t.Fatalf("expected duplicate path panic")
	}

	// Unauthorized deprecation rejected.
	testing.SetRealm(testing.NewUserRealm(attacker))
	if r := revive(func() { DeprecateVerifier(cross(cur), 1) }); r == nil {
		t.Fatalf("expected unauthorized deprecation panic")
	}

	// Publisher deprecation succeeds.
	testing.SetRealm(testing.NewUserRealm(pub))
	DeprecateVerifier(cross(cur), 1)
	if !strings.Contains(GetVerifier(1), "|deprecated") {
		t.Fatalf("expected deprecated record, got %s", GetVerifier(1))
	}
}
