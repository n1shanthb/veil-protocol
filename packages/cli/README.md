# @veil-gno/cli

Command-line interface (`veil`) for Veil Protocol on Gno.land (`onyx-1`).

## Commands
- `veil doctor [--json]` — Check Node, `gno`, `gnokey`, and Onyx RPC
- `veil init <dir> [--pkgpath <path>]` — Initialize a Gno verifier project
- `veil circuits [--json]` — List supported BN254 Groth16 circuits
- `veil inspect <vk.json> [--json]` — Validate snarkjs Groth16/BN254 verification key
- `veil generate <vk.json> --out <dir> --pkgpath <path>` — Generate Gno verifier realm
- `veil network [--json]` — Query live Onyx RPC `/status`
- `veil registry [--json]` — Query live `veil_registry/v1` records
- `veil deploy <dir> --pkgpath <path> [--dry-run]` — Prepare `gnokey maketx addpkg` plan
- `veil skills install|list|update|remove` — Manage the `use-veil` Agent Skill
- `veil setup agent --client <claude|cursor|codex|gemini|antigravity>` — Configure coding agent
