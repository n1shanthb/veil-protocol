---
name: use-veil
description: Build, verify, and deploy Groth16 BN254 zero-knowledge verifiers on Gno.land (onyx-1) using Veil CLI, SDK, and MCP tools.
---

# Using Veil Protocol

Use this skill when a user wants to add zero-knowledge proof verification, Semaphore v4 membership, or custom Circom Groth16 verifiers to a Gno.land project.

## Rules
1. Always inspect the existing project (`veil doctor --json`) before modifying files.
2. Never invent Gno package paths or reimplement BN254 EIP-197 encodings. Use `veil` CLI or `@veil-gno/sdk`.
3. Never log or commit private keys, mnemonics, identity secrets, or witnesses.
4. Default to `--dry-run` / deployment plans for on-chain transactions unless the user explicitly authorizes broadcasting.

## Core Workflow
```bash
# 1. Check environment
veil doctor --json

# 2. Inspect a snarkjs verification key
veil inspect verification_key.json --json

# 3. Generate a Gno verifier realm importing groth16/v2
veil generate verification_key.json --out ./my_verifier --pkgpath gno.land/r/<namespace>/my_verifier

# 4. Prepare Onyx deployment plan
veil deploy ./my_verifier --pkgpath gno.land/r/<namespace>/my_verifier --dry-run --json
```
