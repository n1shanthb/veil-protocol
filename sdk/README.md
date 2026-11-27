# @veil-zk/sdk

TypeScript SDK for Veil Protocol zero-knowledge verification on Gno.land (`onyx-1`).

## Features
- Groth16 / BN254 verification key & proof validation (`validateAndConvertVK`, `validateAndConvertProof`)
- Canonical scalar encoding (`encodePublicInputs`)
- Semaphore v4 identity, LeanIMT group, and proof generation
- Onyx RPC (`queryOnyxEval`, `fetchOnyxPollState`, `fetchOnyxRegistryRecords`)

## Requirements
- Node.js `>= 20.0.0`
