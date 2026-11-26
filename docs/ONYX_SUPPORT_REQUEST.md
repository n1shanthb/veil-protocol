# Onyx Technical Support Request — Veil Protocol

**Project:** Veil Protocol — Zero-Knowledge Developer Infrastructure for Gno.land  
**Network:** `onyx-1` (`v1.8.0-rc.1`, commit `fc79041f4cd1a7b3ed4b316dc5ac14162eb78730`)  
**Deployer:** `g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04`  
**GPAS Portal:** `https://gpas.latest.testnets.gno.land`

## Intended Release Candidate (Enable in Dependency Order)

1. `gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/groth16/v2`
   - Height: `1426060` | Tx: `U61xv6bC85z9VopmocG5DV7iumLhEOEtCLC8TEESZPU=`
   - GPAS Status: `review` (`in review queue`, `first_seen: 2026-11-26T12:13:05Z`)
2. `gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/semaphore/v2`
   - Height: `1426645` | Tx: `yhsY8yPnhZMsWQXr2sDO1GHuLxQr/XzZi9KLr8KZ9ME=`
   - GPAS Status: `review` (`in review queue`)
3. `gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_vote/v2`
   - Height: `1426647` | Tx: `e2LV8InVSEcbDamHF3eZFYO7icsuDbeIThy4w+j/TTw=`
   - GPAS Status: `review` (`in review queue`)

*(Obsolete earlier submissions `groth16`, `veil_verifier`, `semaphore/v1`, and `veil_vote/v1` can be ignored.)*

## Local Verification Summary
All packages compile and pass `gno test` on `v1.8.0-rc.1` as well as full end-to-end `gnoland` + Playwright Chromium/Firefox verification using `crypto/bn254` and `crypto/keccak256`.
