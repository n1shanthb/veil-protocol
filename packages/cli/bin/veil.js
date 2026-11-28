#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

function loadSdk() {
  try {
    return require("@veil-zk/sdk");
  } catch {
    return require(path.resolve(__dirname, "..", "..", "..", "sdk", "dist", "index.js"));
  }
}
const sdk = loadSdk();

const CORE_PKG = "gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/groth16/v2";
const REGISTRY_REALM = "gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_registry/v1";
const ONYX_RPC = "https://rpc.onyx.testnets.gno.land:443";
const BN254_P = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;
const MAX_PUBLIC_INPUTS = 64;

const args = process.argv.slice(2);
const jsonFlag = args.includes("--json");
const dryRun = args.includes("--dry-run");
const cmd = args.find((a) => !a.startsWith("-")) || "help";

function out(data, text) {
  if (jsonFlag) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(text);
  }
}

function fail(code, message, hint) {
  if (jsonFlag) {
    console.error(JSON.stringify({ ok: false, error: { code, message, hint } }, null, 2));
  } else {
    console.error(`Error [${code}]: ${message}${hint ? `\nHint: ${hint}` : ""}`);
  }
  process.exit(1);
}

function getArg(flag, fallback) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

function parseFieldDec(decStr, modulus, label) {
  const s = typeof decStr === "number" ? String(decStr) : String(decStr);
  if (!/^(0|[1-9][0-9]*)$/.test(s)) {
    throw new Error(`${label}: invalid canonical decimal integer "${decStr}"`);
  }
  const n = BigInt(s);
  if (n < 0n || n >= modulus) {
    throw new Error(`${label}: non-canonical field element`);
  }
  return n.toString(16).padStart(64, "0");
}

function validateVK(vk) {
  if (!vk || vk.protocol !== "groth16") throw new Error(`Unsupported protocol: ${vk?.protocol}`);
  if (vk.curve !== "bn128" && vk.curve !== "bn254") throw new Error(`Unsupported curve: ${vk?.curve}`);
  if (!Array.isArray(vk.IC) || vk.IC.length === 0) throw new Error("Missing IC array");
  const nPublic = vk.IC.length - 1;
  if (typeof vk.nPublic === "number" && vk.nPublic !== nPublic) {
    throw new Error(`nPublic (${vk.nPublic}) != IC.length - 1 (${nPublic})`);
  }
  if (nPublic > MAX_PUBLIC_INPUTS) throw new Error(`nPublic ${nPublic} > ${MAX_PUBLIC_INPUTS}`);
  const encG1 = (pt, lbl) => parseFieldDec(pt[0], BN254_P, `${lbl}.x`) + parseFieldDec(pt[1], BN254_P, `${lbl}.y`);
  const encG2 = (pt, lbl) =>
    parseFieldDec(pt[0][1], BN254_P, `${lbl}.x_imag`) +
    parseFieldDec(pt[0][0], BN254_P, `${lbl}.x_real`) +
    parseFieldDec(pt[1][1], BN254_P, `${lbl}.y_imag`) +
    parseFieldDec(pt[1][0], BN254_P, `${lbl}.y_real`);
  return {
    protocol: "groth16",
    curve: "bn254",
    nPublic,
    alpha: encG1(vk.vk_alpha_1, "vk_alpha_1"),
    beta: encG2(vk.vk_beta_2, "vk_beta_2"),
    gamma: encG2(vk.vk_gamma_2, "vk_gamma_2"),
    delta: encG2(vk.vk_delta_2, "vk_delta_2"),
    ic: vk.IC.map((pt, i) => encG1(pt, `IC[${i}]`)),
  };
}

function whichBin(name) {
  try {
    const cmdName = process.platform === "win32" ? "where" : "which";
    return execFileSync(cmdName, [name], { encoding: "utf8" }).trim().split(/\r?\n/)[0];
  } catch {
    return null;
  }
}

async function main() {
  if (cmd === "help" || args.includes("--help") || args.includes("-h")) {
    out(
      { ok: true, commands: ["doctor", "init", "circuits", "inspect", "generate", "network", "registry", "deploy", "skills", "setup"] },
      `veil — Veil Protocol CLI\n\nCommands:\n  doctor     Check Node, gno, gnokey, and Onyx RPC\n  init       Initialize a Gno verifier project\n  circuits   List supported BN254 Groth16 circuits\n  inspect    Validate a snarkjs verification_key.json\n  generate   Generate verifier.gno + gnomod.toml\n  network    Query live Onyx RPC /status\n  registry   Query live veil_registry/v1 records\n  deploy     Prepare gnokey maketx addpkg plan\n  skills     Manage use-veil Agent Skill (install|list|update|remove)\n  setup      Configure coding agent (--client claude|cursor|codex|gemini|antigravity)`
    );
    return;
  }

  if (cmd === "doctor") {
    const nodeVer = process.version;
    const gno = whichBin("gno");
    const gnokey = whichBin("gnokey");
    let rpcOk = false;
    let height = null;
    try {
      const r = await fetch(`${ONYX_RPC.replace(":443", "")}/status`);
      const j = await r.json();
      rpcOk = true;
      height = Number(j.result.sync_info.latest_block_height);
    } catch {
      rpcOk = false;
    }
    out(
      { ok: true, node: nodeVer, gno: gno || null, gnokey: gnokey || null, onyxRpc: { reachable: rpcOk, height } },
      `Node: ${nodeVer}\ngno: ${gno || "not found"}\ngnokey: ${gnokey || "not found"}\nOnyx RPC: ${rpcOk ? `reachable (#${height})` : "unreachable"}`
    );
    return;
  }

  if (cmd === "circuits") {
    const sub = args[1];
    if (sub === "pull") {
      const id = args[2] || "multiplier";
      const outDir = getArg("--out", `./${id}`);
      const srcDir = path.resolve(__dirname, "..", "artifacts", id);
      if (!fs.existsSync(srcDir)) fail("ENOENT", `Bundled artifacts not found for circuit "${id}"`);
      fs.mkdirSync(outDir, { recursive: true });
      const files = fs.readdirSync(srcDir);
      for (const f of files) {
        fs.copyFileSync(path.join(srcDir, f), path.join(outDir, f));
      }
      out({ ok: true, circuit: id, outDir: path.resolve(outDir), files }, `Pulled ${files.length} artifact(s) for ${id} to ${outDir}`);
      return;
    }
    const list = [
      { id: "multiplier", protocol: "groth16", curve: "bn254", publicInputs: 1, provenance: "Dev-Only (pot12)" },
      { id: "sum_of_squares", protocol: "groth16", curve: "bn254", publicInputs: 2, provenance: "Dev-Only (pot12)" },
      { id: "semaphore-10", protocol: "groth16", curve: "bn254", publicInputs: 4, provenance: "Ceremony-Backed (PSE)" },
      { id: "cubic_check", protocol: "groth16", curve: "bn254", publicInputs: 1, provenance: "Dev-Only (pot12)" },
      { id: "square_diff", protocol: "groth16", curve: "bn254", publicInputs: 3, provenance: "Dev-Only (pot12)" },
    ];
    out({ ok: true, circuits: list }, list.map((c) => `${c.id} (${c.protocol}/${c.curve}, ${c.publicInputs} pub, ${c.provenance})`).join("\n"));
    return;
  }

  if (cmd === "inspect") {
    const vkPath = args[1];
    if (!vkPath || !fs.existsSync(vkPath)) fail("ENOENT", `Verification key not found: ${vkPath || "(missing)"}`);
    try {
      const vk = JSON.parse(fs.readFileSync(vkPath, "utf8"));
      const conv = validateVK(vk);
      out({ ok: true, protocol: conv.protocol, curve: conv.curve, nPublic: conv.nPublic }, `VALID Groth16/BN254 VK (${conv.nPublic} public inputs)`);
    } catch (e) {
      fail("INVALID_VK", e.message);
    }
    return;
  }

  if (cmd === "generate") {
    const vkPath = args[1];
    const outDir = getArg("--out", "./veil_verifier");
    const pkgPath = getArg("--pkgpath", "gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/custom_verifier");
    if (!vkPath || !fs.existsSync(vkPath)) fail("ENOENT", `Verification key not found: ${vkPath || "(missing)"}`);
    try {
      const vk = JSON.parse(fs.readFileSync(vkPath, "utf8"));
      const conv = validateVK(vk);
      const pkgName = pkgPath.split("/").pop().replace(/[^a-zA-Z0-9_]/g, "_") || "verifier";
      const icLines = conv.ic.map((h) => `\t\t"${h}",`).join("\n");
      const src = `// Code generated by Veil CLI. DO NOT EDIT.\npackage ${pkgName}\n\nimport (\n\t"strings"\n\n\t"${CORE_PKG}"\n)\n\nvar (\n\tvk            groth16.VerifyingKey\n\tverifiedCount uint64\n)\n\nfunc init() {\n\tparsed, err := groth16.ParseVerifyingKeyHex(\n\t\t"${conv.alpha}",\n\t\t"${conv.beta}",\n\t\t"${conv.gamma}",\n\t\t"${conv.delta}",\n\t\t[]string{\n${icLines}\n\t\t},\n\t)\n\tif err != nil {\n\t\tpanic(err.Error())\n\t}\n\tvk = parsed\n}\n\nfunc Verify(cur realm, aHex, bHex, cHex, inputsCSV string) string {\n\tproof, err := groth16.ParseProofHex(aHex, bHex, cHex)\n\tif err != nil {\n\t\tpanic(err.Error())\n\t}\n\tinputs, err := groth16.ParsePublicInputsHex(splitCSV(inputsCSV))\n\tif err != nil {\n\t\tpanic(err.Error())\n\t}\n\tif err := groth16.Verify(vk, proof, inputs); err != nil {\n\t\tpanic(err.Error())\n\t}\n\tverifiedCount++\n\treturn "VALID"\n}\n\nfunc splitCSV(s string) []string {\n\ts = strings.TrimSpace(s)\n\tif s == "" {\n\t\treturn nil\n\t}\n\tparts := strings.Split(s, ",")\n\tfor i := 0; i < len(parts); i++ {\n\t\tparts[i] = strings.TrimSpace(parts[i])\n\t}\n\treturn parts\n}\n`;
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, "gnomod.toml"), `module = "${pkgPath}"\ngno = "0.9"\n`);
      fs.writeFileSync(path.join(outDir, "verifier.gno"), src);
      out({ ok: true, outDir: path.resolve(outDir), pkgPath, nPublic: conv.nPublic }, `Generated ${path.join(outDir, "verifier.gno")} and gnomod.toml`);
    } catch (e) {
      fail("GENERATE_FAILED", e.message);
    }
    return;
  }

  if (cmd === "init") {
    const dir = args[1] || "./veil-project";
    const pkgPath = getArg("--pkgpath", "gno.land/r/<your-namespace>/my_verifier");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "gnomod.toml"), `module = "${pkgPath}"\ngno = "0.9"\n`);
    out({ ok: true, dir: path.resolve(dir), pkgPath }, `Initialized Gno project in ${dir}`);
    return;
  }

  if (cmd === "network") {
    try {
      const r = await fetch(`${ONYX_RPC.replace(":443", "")}/status`);
      const j = await r.json();
      const info = { network: j.result.node_info.network, height: Number(j.result.sync_info.latest_block_height), build: j.result.build_version };
      out({ ok: true, ...info }, `${info.network} @ #${info.height} (${info.build})`);
    } catch (e) {
      fail("RPC_UNAVAILABLE", e.message);
    }
    return;
  }

  if (cmd === "registry") {
    try {
      const expr = `${REGISTRY_REALM}.ListVerifiersPaged(0, 20)`;
      const r = await fetch(ONYX_RPC.replace(":443", ""), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "abci_query", params: { path: "vm/qeval", data: Buffer.from(expr).toString("base64") } }),
      });
      const j = await r.json();
      const raw = Buffer.from(j.result.response.ResponseBase.Data, "base64").toString("utf8");
      const m = raw.match(/^\("([\s\S]*)"\s+string\)$/);
      const records = (m ? m[1].replace(/\\n/g, "\n") : raw).split("\n").map((s) => s.trim()).filter(Boolean);
      out({ ok: true, records }, records.join("\n"));
    } catch (e) {
      fail("REGISTRY_ERROR", e.message);
    }
    return;
  }

  if (cmd === "deploy") {
    const dir = args[1] || ".";
    const pkgPath = getArg("--pkgpath", "gno.land/r/<namespace>/custom_verifier");
    const command = `gnokey maketx addpkg -pkgpath "${pkgPath}" -pkgdir "${dir}" -gas-fee 1000000ugnot -gas-wanted 10000000 -chainid onyx-1 -remote ${ONYX_RPC} <key>`;
    out({ ok: true, dryRun: true, pkgPath, dir, command }, `Deployment Plan (dry-run=${dryRun || true}):\n${command}`);
    return;
  }

  if (cmd === "skills") {
    const sub = args[1] || "list";
    const targetDir = path.join(os.homedir(), ".gemini", "antigravity", "skills", "use-veil");
    const srcSkill = path.resolve(__dirname, "..", "skills", "use-veil", "SKILL.md");
    if (sub === "install" || sub === "update") {
      if (!fs.existsSync(srcSkill)) fail("ENOENT", `Skill source not found: ${srcSkill}`);
      fs.mkdirSync(targetDir, { recursive: true });
      fs.copyFileSync(srcSkill, path.join(targetDir, "SKILL.md"));
      out({ ok: true, action: sub, path: targetDir }, `Installed use-veil skill to ${targetDir}`);
    } else if (sub === "remove") {
      fs.rmSync(targetDir, { recursive: true, force: true });
      out({ ok: true, action: "remove", path: targetDir }, `Removed use-veil skill from ${targetDir}`);
    } else {
      const installed = fs.existsSync(path.join(targetDir, "SKILL.md"));
      out({ ok: true, installed, path: targetDir }, `use-veil: ${installed ? `installed at ${targetDir}` : "not installed"}`);
    }
    return;
  }

  if (cmd === "setup") {
    const client = getArg("--client", "antigravity");
    const mcpConfig = { mcpServers: { veil: { command: "npx", args: ["-y", "@veil-zk/mcp"] } } };
    out({ ok: true, client, mcpConfig }, `Agent setup for ${client}:\n${JSON.stringify(mcpConfig, null, 2)}`);
    return;
  }

  if (cmd === "encode") {
    const vkPath = getArg("--vk", args[1]);
    const proofPath = getArg("--proof", args[2]);
    const pubPath = getArg("--public", args[3]);
    if (!vkPath || !proofPath || !pubPath) {
      fail("USAGE", "Usage: veil encode --vk <vk.json> --proof <proof.json> --public <public.json>");
    }
    try {
      const vk = JSON.parse(fs.readFileSync(vkPath, "utf8"));
      const proof = JSON.parse(fs.readFileSync(proofPath, "utf8"));
      const pub = JSON.parse(fs.readFileSync(pubPath, "utf8"));
      const conv = sdk.validateAndConvertVK(vk);
      const encProof = sdk.validateAndConvertProof(proof);
      const inputs = sdk.encodePublicInputs(pub);
      if (inputs.length !== conv.nPublic) {
        throw new Error(`Public input count (${inputs.length}) != expected ${conv.nPublic}`);
      }
      out({ ok: true, ...encProof, inputs }, `Encoded proof (${inputs.length} public inputs)`);
    } catch (e) {
      fail("ENCODE_FAILED", e.message);
    }
    return;
  }

  if (cmd === "verify") {
    const vkPath = getArg("--vk", args[1]);
    const proofPath = getArg("--proof", args[2]);
    const pubPath = getArg("--public", args[3]);
    if (!vkPath || !proofPath || !pubPath) {
      fail("USAGE", "Usage: veil verify [--local] --vk <vk.json> --proof <proof.json> --public <public.json>");
    }
    try {
      const vk = JSON.parse(fs.readFileSync(vkPath, "utf8"));
      const proof = JSON.parse(fs.readFileSync(proofPath, "utf8"));
      const pub = JSON.parse(fs.readFileSync(pubPath, "utf8"));
      const res = await sdk.verifyProofLocal(vk, proof, pub);
      if (!res.valid) {
        fail("INVALID_PROOF", "Groth16 cryptographic verification returned false");
      }
      out(
        { ok: true, valid: true, a: res.encodedProof.a, b: res.encodedProof.b, c: res.encodedProof.c, inputs: res.encodedInputs },
        `VALID Groth16 proof (${res.encodedInputs.length} public inputs)`
      );
      process.exit(0);
    } catch (e) {
      fail("INVALID_PROOF", e.message);
    }
    return;
  }

  if (cmd === "test") {
    const dir = getArg("--dir", ".");
    const gnoBin = whichBin("gno");
    if (!gnoBin) {
      fail("GNO_NOT_FOUND", "gno binary not found in PATH", "Install gno v1.8.0-rc.1 to run local GnoVM tests.");
    }
    const coreSrc = path.resolve(__dirname, "..", "gno", "groth16_v2");
    const tmpCore = path.join(dir, ".veil_core_tmp", "groth16_v2");
    fs.mkdirSync(tmpCore, { recursive: true });
    for (const f of fs.readdirSync(coreSrc)) {
      fs.copyFileSync(path.join(coreSrc, f), path.join(tmpCore, f));
    }
    try {
      const testOut = execFileSync(gnoBin, ["test", "-v", dir], { encoding: "utf8" });
      out({ ok: true, dir, output: testOut }, testOut);
    } catch (e) {
      fail("GNO_TEST_FAILED", e.message);
    }
    return;
  }

  fail("UNKNOWN_COMMAND", `Unknown command "${cmd}"`, "Run `veil --help` for usage.");
}

main();
