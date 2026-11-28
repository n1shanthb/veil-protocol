#!/usr/bin/env node
"use strict";

const readline = require("readline");
const path = require("path");

function loadSdk() {
  try {
    return require("@veil-zk/sdk");
  } catch {
    return require(path.resolve(__dirname, "..", "..", "..", "sdk", "dist", "index.js"));
  }
}
const sdk = loadSdk();

const ONYX_RPC = "https://rpc.onyx.testnets.gno.land:443";
const REGISTRY_REALM = "gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_registry/v1";

const TOOLS = [
  {
    name: "veil_capabilities",
    description: "Return Veil Protocol capabilities, supported proof systems, and security boundaries.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "veil_circuits",
    description: "List supported BN254 Groth16 circuits and their setup provenance.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "veil_network_status",
    description: "Query live Onyx testnet (onyx-1) block height and node version.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "veil_registry_list",
    description: "Query live verifier records from veil_registry/v1 on Onyx.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "veil_deploy_plan",
    description: "Generate a dry-run gnokey deployment command for a Gno verifier realm.",
    inputSchema: {
      type: "object",
      properties: { pkgPath: { type: "string" }, dir: { type: "string" } },
      required: ["pkgPath", "dir"],
      additionalProperties: false,
    },
  },
  {
    name: "veil_deployment_status",
    description: "Check whether a Gno package path is active on Onyx (vm/qfile).",
    inputSchema: {
      type: "object",
      properties: { pkgPath: { type: "string" } },
      required: ["pkgPath"],
      additionalProperties: false,
    },
  },
  {
    name: "veil_inspect_vk",
    description: "Validate a snarkjs Groth16/BN254 verification_key.json using @veil-zk/sdk.",
    inputSchema: {
      type: "object",
      properties: { vk: { type: "object" } },
      required: ["vk"],
      additionalProperties: false,
    },
  },
  {
    name: "veil_generate_verifier",
    description: "Generate Gno verifier realm source code from a snarkjs verification key.",
    inputSchema: {
      type: "object",
      properties: { pkgPath: { type: "string" }, vk: { type: "object" } },
      required: ["pkgPath", "vk"],
      additionalProperties: false,
    },
  },
  {
    name: "veil_encode_gno",
    description: "Validate and encode proof.json and public.json into EIP-197 Gno hex.",
    inputSchema: {
      type: "object",
      properties: { proof: { type: "object" }, publicInputs: { type: "array" } },
      required: ["proof", "publicInputs"],
      additionalProperties: false,
    },
  },
  {
    name: "veil_verify_proof",
    description: "Cryptographically verify a Groth16 proof locally using snarkjs via @veil-zk/sdk.",
    inputSchema: {
      type: "object",
      properties: { vk: { type: "object" }, proof: { type: "object" }, publicInputs: { type: "array" } },
      required: ["vk", "proof", "publicInputs"],
      additionalProperties: false,
    },
  },
];

async function handleTool(name, args) {
  if (name === "veil_capabilities") {
    return {
      protocol: "groth16",
      curve: "bn254",
      maxPublicInputs: sdk.MAX_PUBLIC_INPUTS,
      corePackage: sdk.CORE_PKG_PATH,
      semaphorePackage: "gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/semaphore/v2",
    };
  }
  if (name === "veil_circuits") {
    return [
      { id: "multiplier", publicInputs: 1, provenance: "Dev-Only (pot12)" },
      { id: "sum_of_squares", publicInputs: 2, provenance: "Dev-Only (pot12)" },
      { id: "semaphore-10", publicInputs: 4, provenance: "Ceremony-Backed (PSE)" },
      { id: "cubic_check", publicInputs: 1, provenance: "Dev-Only (pot12)" },
      { id: "square_diff", publicInputs: 3, provenance: "Dev-Only (pot12)" },
    ];
  }
  if (name === "veil_network_status") {
    const r = await fetch(`${ONYX_RPC.replace(":443", "")}/status`);
    const j = await r.json();
    return {
      network: j.result.node_info.network,
      height: Number(j.result.sync_info.latest_block_height),
      build: j.result.build_version,
    };
  }
  if (name === "veil_registry_list") {
    const expr = `${REGISTRY_REALM}.ListVerifiersPaged(0, 20)`;
    const r = await fetch(ONYX_RPC.replace(":443", ""), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "abci_query", params: { path: "vm/qeval", data: Buffer.from(expr).toString("base64") } }),
    });
    const j = await r.json();
    const raw = Buffer.from(j.result.response.ResponseBase.Data, "base64").toString("utf8");
    const m = raw.match(/^\("([\s\S]*)"\s+string\)$/);
    return (m ? m[1].replace(/\\n/g, "\n") : raw).split("\n").map((s) => s.trim()).filter(Boolean);
  }
  if (name === "veil_deploy_plan") {
    const pkgPath = String(args?.pkgPath || "").trim();
    const dir = String(args?.dir || "").trim();
    if (!/^gno\.land\/[pr]\/[a-zA-Z0-9_/-]+$/.test(pkgPath)) {
      throw new Error("Invalid Gno package path");
    }
    return {
      dryRun: true,
      command: `gnokey maketx addpkg -pkgpath "${pkgPath}" -pkgdir "${dir}" -gas-fee 1000000ugnot -gas-wanted 10000000 -chainid onyx-1 -remote ${ONYX_RPC} <key>`,
    };
  }
  if (name === "veil_deployment_status") {
    return sdk.checkPackageActivation(String(args?.pkgPath || "").trim(), ONYX_RPC);
  }
  if (name === "veil_inspect_vk") {
    const conv = sdk.validateAndConvertVK(args?.vk);
    return { valid: true, ...conv };
  }
  if (name === "veil_generate_verifier") {
    const pkgPath = String(args?.pkgPath || "").trim();
    const conv = sdk.validateAndConvertVK(args?.vk);
    const source = sdk.generateGnoVerifierSource(pkgPath, conv);
    return { pkgPath, nPublic: conv.nPublic, source };
  }
  if (name === "veil_encode_gno") {
    const encodedProof = sdk.validateAndConvertProof(args?.proof);
    const inputs = sdk.encodePublicInputs(args?.publicInputs);
    return { ...encodedProof, inputs };
  }
  if (name === "veil_verify_proof") {
    return sdk.verifyProofLocal(args?.vk, args?.proof, args?.publicInputs);
  }
  throw new Error(`Unknown tool: ${name}`);
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });
let pending = 0;
let closed = false;
const maybeExit = () => { if (closed && pending === 0) process.exit(0); };

rl.on("line", async (line) => {
  if (!line.trim()) return;
  let req;
  try {
    req = JSON.parse(line);
  } catch {
    return;
  }
  pending++;
  const send = (res) => process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: req.id, ...res }) + "\n");
  try {
    if (req.method === "initialize") {
      send({ result: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "veil-mcp", version: "0.1.0" } } });
    } else if (req.method === "tools/list") {
      send({ result: { tools: TOOLS } });
    } else if (req.method === "tools/call") {
      const data = await handleTool(req.params?.name, req.params?.arguments || {});
      send({ result: { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] } });
    } else if (req.id !== undefined) {
      send({ error: { code: -32601, message: `Method not found: ${req.method}` } });
    }
  } catch (e) {
    if (req.id !== undefined) send({ error: { code: -32000, message: e.message } });
  } finally {
    pending--;
    maybeExit();
  }
});
rl.on("close", () => { closed = true; maybeExit(); });
