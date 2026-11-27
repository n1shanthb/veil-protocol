#!/usr/bin/env node
"use strict";

const http = require("http");
const crypto = require("crypto");
const { execFile } = require("child_process");
const { promisify } = require("util");
const execFileAsync = promisify(execFile);
const fs = require("fs");
const path = require("path");

const MAX_BODY_BYTES = 16 * 1024;
const ALLOWED_FIELDS = new Set([
  "chainId",
  "pkgPath",
  "func",
  "pollId",
  "depth",
  "optionIndex",
  "rootHex",
  "nullifierHex",
  "a",
  "b",
  "c",
  "simulateOnly",
]);
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQ = 15;
const GAS_FEE_UGNOT = 1_000_000;
const GAS_WANTED_CAP = 25_000_000;
const DAILY_FEE_BUDGET_UGNOT = Number(process.env.VEIL_DAILY_BUDGET_UGNOT || 50_000_000);
const DEFAULT_VOTE_REALM =
  process.env.VEIL_VOTE_REALM ||
  "gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_vote/v3";
const DEFAULT_RPC =
  process.env.VEIL_RPC_URL || "https://rpc.onyx.testnets.gno.land:443";
const DEFAULT_CHAIN_ID = process.env.VEIL_CHAIN_ID || "onyx-1";
const STATE_FILE = process.env.VEIL_RELAYER_STATE_FILE || "";

function isHexOfLen(s, len) {
  return typeof s === "string" && s.length === len && /^[0-9a-fA-F]+$/.test(s);
}

function loadOrInitState(stateFile) {
  const today = new Date().toISOString().slice(0, 10);
  if (stateFile && fs.existsSync(stateFile)) {
    // Fail closed on corrupt state file rather than silently resetting budget to 0.
    const parsed = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    return {
      rateBuckets: new Map(),
      inFlight: new Set(),
      pending: new Map(Object.entries(parsed.pending || {})),
      idempotency: new Map(Object.entries(parsed.idempotency || {})),
      spentUgnotToday: parsed.dayKey === today ? Number(parsed.spentUgnotToday || 0) : 0,
      dayKey: today,
      stateFile,
    };
  }
  return {
    rateBuckets: new Map(),
    inFlight: new Set(),
    pending: new Map(),
    idempotency: new Map(),
    spentUgnotToday: 0,
    dayKey: today,
    stateFile,
  };
}

function persistState(state) {
  if (!state.stateFile) return;
  fs.mkdirSync(path.dirname(state.stateFile), { recursive: true });
  const tmp = `${state.stateFile}.tmp.${process.pid}`;
  fs.writeFileSync(
    tmp,
    JSON.stringify({
      dayKey: state.dayKey,
      spentUgnotToday: state.spentUgnotToday,
      pending: Object.fromEntries(state.pending.entries()),
      idempotency: Object.fromEntries(state.idempotency.entries()),
    })
  );
  fs.renameSync(tmp, state.stateFile);
}

function resetBudgetIfNewDay(state) {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== state.dayKey) {
    state.dayKey = today;
    state.spentUgnotToday = 0;
    persistState(state);
  }
}

function checkRateLimit(state, ip) {
  const now = Date.now();
  if (state.rateBuckets.size > 1000) {
    for (const [k, times] of state.rateBuckets.entries()) {
      if (times.every((t) => now - t >= RATE_WINDOW_MS)) {
        state.rateBuckets.delete(k);
      }
    }
  }
  const arr = (state.rateBuckets.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX_REQ) return false;
  arr.push(now);
  state.rateBuckets.set(ip, arr);
  return true;
}

function validateVoteRelayPayload(body, cfg = {}) {
  const expectedChain = cfg.chainId || DEFAULT_CHAIN_ID;
  const expectedRealm = cfg.voteRealm || DEFAULT_VOTE_REALM;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "request body must be a JSON object";
  }
  for (const key of Object.keys(body)) {
    if (!ALLOWED_FIELDS.has(key)) {
      return `unknown or forbidden field "${key}"`;
    }
  }
  if (body.chainId !== undefined && body.chainId !== expectedChain) {
    return `unauthorized chainId "${body.chainId}" (expected "${expectedChain}")`;
  }
  if (body.pkgPath !== undefined && body.pkgPath !== expectedRealm) {
    return `unauthorized pkgPath "${body.pkgPath}"`;
  }
  const func = body.func || "Vote";
  if (func !== "Vote") {
    return `unauthorized method "${func}" (only Vote allowed)`;
  }
  if (!Number.isInteger(body.pollId) || body.pollId < 0) return "invalid pollId";
  if (body.depth !== 10) return "unsupported depth (only depth 10 enabled)";
  if (!Number.isInteger(body.optionIndex) || body.optionIndex < 0 || body.optionIndex > 64) {
    return "invalid optionIndex";
  }
  if (!isHexOfLen(body.rootHex, 64)) return "rootHex must be 64 hex chars";
  if (!isHexOfLen(body.nullifierHex, 64)) return "nullifierHex must be 64 hex chars";
  if (!isHexOfLen(body.a, 128)) return "proof.a must be 128 hex chars";
  if (!isHexOfLen(body.b, 256)) return "proof.b must be 256 hex chars";
  if (!isHexOfLen(body.c, 128)) return "proof.c must be 128 hex chars";
  return null;
}

function resolveGnokey() {
  if (process.env.GNOKEY_BIN && fs.existsSync(process.env.GNOKEY_BIN)) {
    return process.env.GNOKEY_BIN;
  }
  const local = "E:\\toolchains\\bin\\gnokey.exe";
  return fs.existsSync(local) ? local : "gnokey";
}

async function relayVoteViaGnokey(body, simulateOnly, cfg) {
  const keyName = process.env.VEIL_RELAYER_KEY;
  const passphrase = process.env.VEIL_RELAYER_PASSPHRASE;
  if (!keyName || passphrase === undefined) {
    throw new Error("Server signing key not configured (VEIL_RELAYER_KEY / VEIL_RELAYER_PASSPHRASE unset)");
  }
  const gnokey = resolveGnokey();
  const args = [
    "maketx",
    "call",
    "-pkgpath",
    cfg.voteRealm,
    "-func",
    "Vote",
    "-args",
    String(body.pollId),
    "-args",
    String(body.depth),
    "-args",
    body.rootHex,
    "-args",
    body.nullifierHex,
    "-args",
    String(body.optionIndex),
    "-args",
    body.a,
    "-args",
    body.b,
    "-args",
    body.c,
    "-gas-fee",
    `${GAS_FEE_UGNOT}ugnot`,
    "-gas-wanted",
    String(GAS_WANTED_CAP),
    "-chainid",
    cfg.chainId,
    "-remote",
    cfg.rpc,
    "-simulate",
    simulateOnly ? "only" : "test",
    "-insecure-password-stdin",
    keyName,
  ];
  const { stdout } = await new Promise((resolve, reject) => {
    const child = execFile(gnokey, args, { encoding: "utf8", timeout: 15_000 }, (err, out, stderr) => {
      if (err) {
        err.message = `${err.message}\n${stderr || out}`;
        return reject(err);
      }
      resolve({ stdout: out });
    });
    child.stdin.write(`${passphrase}\r\n`);
    child.stdin.end();
  });
  const txMatch = stdout.match(/TX HASH:\s*([A-Za-z0-9+/=]+)/);
  const gasMatch = stdout.match(/GAS USED:\s*(\d+)/);
  const heightMatch = stdout.match(/HEIGHT:\s*(\d+)/);
  return {
    mode: simulateOnly ? "simulated" : "broadcast",
    relayed: !simulateOnly,
    txHash: txMatch ? txMatch[1] : null,
    gasUsed: gasMatch ? Number(gasMatch[1]) : null,
    height: heightMatch ? Number(heightMatch[1]) : null,
  };
}

const ALLOWED_ORIGINS = (process.env.VEIL_ALLOWED_ORIGINS || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes("*")) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function createServer(opts = {}) {
  const cfg = {
    chainId: opts.chainId || DEFAULT_CHAIN_ID,
    rpc: opts.rpc || DEFAULT_RPC,
    voteRealm: opts.voteRealm || DEFAULT_VOTE_REALM,
    dailyBudgetUgnot: opts.dailyBudgetUgnot ?? DAILY_FEE_BUDGET_UGNOT,
  };
  const state = loadOrInitState(opts.stateFile ?? STATE_FILE);
  const executor = opts.executor || ((b, sim) => relayVoteViaGnokey(b, sim, cfg));

  // Serial signing mutex so concurrent requests never collide on account sequence.
  let queue = Promise.resolve();
  const enqueue = (fn) => {
    const next = queue.then(fn, fn);
    queue = next.catch(() => {});
    return next;
  };

  return http.createServer((req, res) => {
    setCorsHeaders(req, res);
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }

    if (req.method === "GET" && (req.url === "/health" || req.url === "/ready")) {
      resetBudgetIfNewDay(state);
      const ready =
        Boolean(opts.executor) ||
        (Boolean(process.env.VEIL_RELAYER_KEY) && process.env.VEIL_RELAYER_PASSPHRASE !== undefined);
      const statusCode = req.url === "/ready" && !ready ? 503 : 200;
      res.writeHead(statusCode, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          status: ready ? "ok" : "unconfigured",
          ready,
          chainId: cfg.chainId,
          rpc: cfg.rpc,
          voteRealm: cfg.voteRealm,
          dailyBudgetUgnot: cfg.dailyBudgetUgnot,
          spentUgnotToday: state.spentUgnotToday,
          pendingReconciliations: state.pending.size,
        })
      );
    }

    if (req.method !== "POST" || req.url !== "/api/relay/vote") {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "not found" }));
    }

    const ip = req.socket.remoteAddress || "unknown";
    if (!checkRateLimit(state, ip)) {
      res.writeHead(429, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "rate limit exceeded" }));
    }

    let raw = "";
    let tooBig = false;
    req.on("data", (chunk) => {
      raw += chunk;
      if (Buffer.byteLength(raw) > MAX_BODY_BYTES) {
        tooBig = true;
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "payload too large" }));
        req.destroy();
      }
    });
    req.on("end", async () => {
      if (tooBig) return;
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "invalid JSON" }));
      }

      const errMsg = validateVoteRelayPayload(body, cfg);
      if (errMsg) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: errMsg }));
      }

      const idemKey = `${body.pollId}:${body.nullifierHex}`;
      const flightKey = crypto.createHash("sha256").update(raw).digest("hex");
      if (state.idempotency.has(idemKey)) {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ idempotent: true, ...state.idempotency.get(idemKey) }));
      }
      if (state.inFlight.has(flightKey)) {
        res.writeHead(409, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "duplicate request already in flight" }));
      }

      state.inFlight.add(flightKey);
      try {
        const result = await enqueue(async () => {
          if (state.idempotency.has(idemKey)) {
            return { idempotent: true, ...state.idempotency.get(idemKey) };
          }
          resetBudgetIfNewDay(state);
          if (state.spentUgnotToday + GAS_FEE_UGNOT > cfg.dailyBudgetUgnot) {
            const err = new Error("daily relayer fee budget exhausted");
            err.httpStatus = 503;
            throw err;
          }
          if (!Boolean(body.simulateOnly)) {
            state.pending.set(idemKey, { pollId: body.pollId, startedAt: Date.now() });
            persistState(state);
          }
          const out = await executor(body, Boolean(body.simulateOnly));
          state.pending.delete(idemKey);
          if (out.relayed) {
            state.spentUgnotToday += GAS_FEE_UGNOT;
            state.idempotency.set(idemKey, out);
          }
          persistState(state);
          return out;
        });
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify(result));
      } catch (e) {
        state.pending.delete(idemKey);
        persistState(state);
        // Failed transactions are NOT cached in idempotency, allowing safe retry.
        res.writeHead(e.httpStatus || 502, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: e.message }));
      } finally {
        state.inFlight.delete(flightKey);
      }
    });
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 8787);
  const host = process.env.HOST || "0.0.0.0";
  createServer().listen(port, host, () => {
    console.log(`Veil Sponsored Relayer listening on http://${host}:${port}`);
  });
}

module.exports = { createServer, validateVoteRelayPayload };
