# Veil Protocol

**Zero-Knowledge Developer Infrastructure for Gno.land**

Veil V1 provides general-purpose Groth16/BN254 proof verification, Semaphore v4 identity & group primitives, a Forge code generator, a TypeScript SDK, a hardened Sponsored Relayer, an on-chain Verifier Registry, and Veil Studio.

## Frozen V1 Packages & Network Status

| Component | Package Path | Local `gnoland` | Onyx (`onyx-1`) |
| :--- | :--- | :--- | :--- |
| **Veil Core** (`gno/p/groth16`) | `gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/groth16/v2` | Deployed & Executed | Submitted (`review` queue) |
| **Veil Primitives** (`gno/p/semaphore`) | `gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/semaphore/v2` | Deployed & Executed | Submitted (`review` queue) |
| **Veil Registry** (`gno/r/veil_registry`) | `gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_registry/v1` | Deployed & Executed | Not yet submitted |
| **Veil Vote** (`gno/r/veil_vote`) | `gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_vote/v3` | Deployed & Executed | Not yet submitted |

> **V1 Trust Limitation (Trusted Root Publisher):** Because GnoVM does not provide a native Poseidon precompile (an interpreted Poseidon2 hash costs `~1.78B` gas), `semaphore/v2` relies on an authorized `RootPublisher` to publish LeanIMT roots off-chain rather than recomputing Merkle trees on-chain.

## Documentation

- [Quickstart](docs/QUICKSTART.md)
- [Architecture, Installation & API Reference](docs/ARCHITECTURE_AND_API.md)
- [Security Model, Privacy Limitations & Compatibility](docs/SECURITY_AND_PRIVACY.md)
- [AI-Assisted Adversarial Security Review](docs/SECURITY_AUDIT_REPORT.md)
- [Core Performance & Resource Review](docs/CORE_PERFORMANCE_AND_RESOURCE_REVIEW.md)
- [Semaphore Compatibility](docs/SEMAPHORE_COMPATIBILITY.md)
- [Public Hosting Guide](docs/HOSTING.md)
- [Onyx Support Request](docs/ONYX_SUPPORT_REQUEST.md)

## License

MIT — see [LICENSE](LICENSE).
