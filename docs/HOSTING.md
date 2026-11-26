# Veil Protocol — Public Hosting & Production Deployment Guide

## 1. Web Platform (`apps/web/`)
- Build static production assets:
  ```bash
  cd apps/web && npm ci && npm run build
  ```
- Deploy `apps/web/dist/` behind HTTPS (Cloudflare Pages, Vercel, or Nginx with TLS).
- No secrets or private keys are bundled or stored server-side.

## 2. Sponsored Transaction Relayer (`relayer/server.js`)
- Configure environment variables:
  - `PORT=8787`
  - `VEIL_CHAIN_ID=onyx-1`
  - `VEIL_RPC_URL=https://rpc.onyx.testnets.gno.land:443`
  - `VEIL_VOTE_REALM=gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_vote/v2`
  - `VEIL_ALLOWED_ORIGINS=https://veil.example.com` (restricts CORS; never use `*` in production)
  - `VEIL_RELAYER_STATE_FILE=/var/lib/veil/relayer-state.json` (persistent atomic JSON store)
  - `VEIL_DAILY_BUDGET_UGNOT=50000000`
  - `VEIL_RELAYER_KEY` / `VEIL_RELAYER_PASSPHRASE` (injected via secret manager, never committed)
- Health & Readiness:
  - `GET /health` -> `200` process alive + budget metrics
  - `GET /ready` -> `200` iff signing credentials are configured (`503` otherwise)
