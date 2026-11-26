// Package veil_registry provides a minimal on-chain discovery registry for
// Groth16/BN254 verifier packages on Gno.land.
//
// SECURITY NOTICE: Registration in this registry does NOT imply that a circuit
// or verifying key is trustworthy, audited, or backed by a trusted-setup
// ceremony. Consumers must independently verify provenance and VK fingerprints.
package veil_registry

import (
	"chain/runtime"
	"strconv"
	"strings"
)

type VerifierRecord struct {
	ID              uint64
	PkgPath         string
	VKFingerprint   string
	ProofSystem     string
	Curve           string
	PublicInputs    int
	Publisher       address
	Metadata        string
	Version         string
	PublishedHeight int64
	Deprecated      bool
}

var (
	nextID  uint64 = 1
	records        = make(map[uint64]*VerifierRecord)
	byPath         = make(map[string]uint64)
)

// RegisterVerifier publishes a verifier package entry. Only the original
// publisher can later deprecate or update it.
func RegisterVerifier(
	cur realm,
	pkgPath string,
	vkFingerprint string,
	proofSystem string,
	curve string,
	publicInputs int,
	metadata string,
	version string,
) uint64 {
	if pkgPath == "" || vkFingerprint == "" || proofSystem != "groth16" || curve != "bn254" || publicInputs < 0 {
		panic("veil_registry: invalid verifier metadata or unsupported proof system/curve")
	}
	if _, exists := byPath[pkgPath]; exists {
		panic("veil_registry: package path already registered")
	}
	publisher := cur.Previous().Address()
	id := nextID
	nextID++
	records[id] = &VerifierRecord{
		ID:              id,
		PkgPath:         pkgPath,
		VKFingerprint:   vkFingerprint,
		ProofSystem:     proofSystem,
		Curve:           curve,
		PublicInputs:    publicInputs,
		Publisher:       publisher,
		Metadata:        metadata,
		Version:         version,
		PublishedHeight: runtime.ChainHeight(),
		Deprecated:      false,
	}
	byPath[pkgPath] = id
	return id
}

// DeprecateVerifier marks a registered verifier as deprecated. Only the
// original publisher may deprecate it.
func DeprecateVerifier(cur realm, id uint64) {
	rec, ok := records[id]
	if !ok {
		panic("veil_registry: record not found")
	}
	if cur.Previous().Address() != rec.Publisher {
		panic("veil_registry: only publisher can deprecate")
	}
	rec.Deprecated = true
}

// GetVerifier returns a formatted summary of a verifier record.
func GetVerifier(id uint64) string {
	rec, ok := records[id]
	if !ok {
		return ""
	}
	dep := "active"
	if rec.Deprecated {
		dep = "deprecated"
	}
	return rec.PkgPath + "|" + rec.VKFingerprint + "|" + rec.ProofSystem + "/" + rec.Curve + "|" + strconv.Itoa(rec.PublicInputs) + "|" + rec.Version + "|" + dep
}

// Render displays the registry disclaimer and all registered verifiers.
func Render(_ string) string {
	var b strings.Builder
	b.WriteString("# Veil Verifier Registry\n\n")
	b.WriteString("> Disclaimer: Registration does NOT imply that a circuit is trustworthy, audited, or ceremony-backed.\n\n")
	for id := uint64(1); id < nextID; id++ {
		b.WriteString("- #")
		b.WriteString(strconv.FormatUint(id, 10))
		b.WriteString(": ")
		b.WriteString(GetVerifier(id))
		b.WriteByte('\n')
	}
	return b.String()
}
