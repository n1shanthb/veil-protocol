#!/bin/sh
set -e
if [ -n "$VEIL_RELAYER_MNEMONIC" ] && [ -n "$VEIL_RELAYER_PASSPHRASE" ]; then
  if ! gnokey list | grep -q "$VEIL_RELAYER_KEY"; then
    printf "%s\n%s\n%s\n" "$VEIL_RELAYER_PASSPHRASE" "$VEIL_RELAYER_PASSPHRASE" "$VEIL_RELAYER_MNEMONIC" | gnokey add "$VEIL_RELAYER_KEY" -recover -insecure-password-stdin >/dev/null 2>&1 || true
  fi
fi
exec node /app/server.js
