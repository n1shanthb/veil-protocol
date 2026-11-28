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

const PINNED_MULTIPLIER_SHA256 = {
  "multiplier.wasm": "727bb80db099f327bbc2cdcfd59dfd9956743623cdb7bd29f8c83479dad40784",
  "multiplier_final.zkey": "4ec444e2ab0c23fdf33e36a128740060ade74e1afbd6e68ad04403e22cf9acd0",
  "proof.json": "f7f2a23974cf3f67b2304873d1541eb0e7a97e5d22d7c1a6ee94bedef789e1a7",
  "public.json": "b8aa8302d2caaa8621aff7575726eff722d7c15997d8ed59a89bd94e1c757272",
  "verification_key.json": "565bd751471d2d49bcb969dba6dc8fc3e0886e0759313905ffd1f90bbf19fcf8",
};

const args = process.argv.slice(2);
const jsonFlag = args.includes("--json");
const dryRun = args.includes("--dry-run");
const forceFlag = args.includes("--force");
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
  const localWin = `E:\\toolchains\\bin\\${name}.exe`;
  if (process.platform === "win32" && fs.existsSync(localWin)) {
    return localWin;
  }
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
      if (!/^[a-zA-Z0-9_-]+$/.test(id) || id !== "multiplier") {
        fail("UNKNOWN_CIRCUIT", `Unknown or unbundled circuit "${id}". Only "multiplier" is bundled in v0.1.0.`);
      }
      const outDir = getArg("--out", `./${id}`);
      if (outDir.includes("..")) {
        fail("PATH_TRAVERSAL", `Refusing path traversal in --out "${outDir}"`);
      }
      const srcDir = path.resolve(__dirname, "..", "artifacts", id);
      if (!fs.existsSync(srcDir)) fail("ENOENT", `Bundled artifacts not found for circuit "${id}"`);
      fs.mkdirSync(outDir, { recursive: true });
      const files = fs.readdirSync(srcDir);
      for (const f of files) {
        const dest = path.join(outDir, f);
        if (fs.existsSync(dest) && !forceFlag) {
          fail("EEXIST", `Refusing to overwrite existing file "${dest}" without --force`);
        }
        const buf = fs.readFileSync(path.join(srcDir, f));
        const actualHash = crypto.createHash("sha256").update(buf).digest("hex");
        const expectedHash = PINNED_MULTIPLIER_SHA256[f];
        if (!expectedHash || actualHash !== expectedHash) {
          fail("CHECKSUM_MISMATCH", `SHA-256 mismatch for ${f}: expected ${expectedHash}, got ${actualHash}`);
        }
        fs.writeFileSync(dest, buf);
      }
      out({ ok: true, circuit: id, outDir: path.resolve(outDir), files, sha256: PINNED_MULTIPLIER_SHA256 }, `Pulled ${files.length} verified artifact(s) for ${id} to ${outDir}`);
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
      const conv = sdk.validateAndConvertVK(vk);
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
      const conv = sdk.validateAndConvertVK(vk);
      const src = sdk.generateGnoVerifierSource(pkgPath, conv);
      const gnomodDest = path.join(outDir, "gnomod.toml");
      const verifierDest = path.join(outDir, "verifier.gno");
      if ((fs.existsSync(gnomodDest) || fs.existsSync(verifierDest)) && !forceFlag) {
        fail("EEXIST", `Refusing to overwrite existing verifier files in "${outDir}" without --force`);
      }
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(gnomodDest, `module = "${pkgPath}"\ngno = "0.9"\n`);
      fs.writeFileSync(verifierDest, src);
      out({ ok: true, outDir: path.resolve(outDir), pkgPath, nPublic: conv.nPublic }, `Generated ${path.join(outDir, "verifier.gno")} and gnomod.toml`);
    } catch (e) {
      fail("GENERATE_FAILED", e.message);
    }
    return;
  }

  if (cmd === "init") {
    const dir = args[1] || "./veil-project";
    const pkgPath = getArg("--pkgpath", "gno.land/r/<your-namespace>/my_verifier");
    const gnomodDest = path.join(dir, "gnomod.toml");
    if (fs.existsSync(gnomodDest) && !forceFlag) {
      fail("EEXIST", `Refusing to overwrite existing "${gnomodDest}" without --force`);
    }
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(gnomodDest, `module = "${pkgPath}"\ngno = "0.9"\n`);
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
    if (args.includes("--onchain")) {
      fail("UNSUPPORTED_MODE", "--onchain verification is not supported in v0.1.0 CLI; use --local or gnokey maketx call.");
    }
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

  if (cmd === "prove") {
    const wasmPath = getArg("--wasm", null);
    const zkeyPath = getArg("--zkey", null);
    const inputPath = getArg("--input", null);
    const outProof = getArg("--out-proof", "proof.json");
    const outPublic = getArg("--out-public", "public.json");
    if (!wasmPath || !zkeyPath || !inputPath) {
      fail("USAGE", "Usage: veil prove --wasm <circuit.wasm> --zkey <circuit.zkey> --input <input.json> [--out-proof proof.json] [--out-public public.json]");
    }
    if ((fs.existsSync(outProof) || fs.existsSync(outPublic)) && !forceFlag) {
      fail("EEXIST", `Refusing to overwrite existing "${outProof}" or "${outPublic}" without --force`);
    }
    try {
      for (const [label, filePath] of [["wasm", wasmPath], ["zkey", zkeyPath]]) {
        const base = path.basename(filePath);
        if (PINNED_MULTIPLIER_SHA256[base]) {
          const actual = crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
          if (actual !== PINNED_MULTIPLIER_SHA256[base]) {
            throw new Error(`SHA-256 checksum mismatch for ${label} (${base})`);
          }
        }
      }
      const inputObj = JSON.parse(fs.readFileSync(inputPath, "utf8"));
      const snarkjs = require("snarkjs");
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(inputObj, wasmPath, zkeyPath);
      fs.writeFileSync(outProof, JSON.stringify(proof, null, 2));
      fs.writeFileSync(outPublic, JSON.stringify(publicSignals, null, 2));
      out({ ok: true, outProof, outPublic, publicSignals }, `Generated proof (${outProof}) and public signals (${outPublic})`);
      process.exit(0);
    } catch (e) {
      fail("PROVE_FAILED", e.message);
    }
    return;
  }

  if (cmd === "test") {
    const dir = getArg("--dir", ".");
    const proofPath = getArg("--proof", null);
    const pubPath = getArg("--public", null);
    const gnoBin = whichBin("gno");
    if (!gnoBin) {
      fail("GNO_NOT_FOUND", "gno binary not found in PATH or E:\\toolchains\\bin", "Install gno v1.8.0-rc.1 to run local GnoVM tests.");
    }
    const coreSrc = path.resolve(__dirname, "..", "gno", "groth16_v2");
    const isoDir = fs.mkdtempSync(path.join(os.tmpdir(), "veil-gno-test-"));
    const tmpCore = path.join(isoDir, ".veil_core_tmp", "gno.land", "p", "g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04", "groth16", "v2");
    let testOut = "";
    let testErr = null;
    try {
      fs.mkdirSync(tmpCore, { recursive: true });
      for (const f of fs.readdirSync(coreSrc)) {
        fs.copyFileSync(path.join(coreSrc, f), path.join(tmpCore, f));
      }
      for (const f of ["gnomod.toml", "verifier.gno"]) {
        const srcF = path.join(dir, f);
        if (fs.existsSync(srcF)) fs.copyFileSync(srcF, path.join(isoDir, f));
      }
      if (proofPath && pubPath) {
        const proof = JSON.parse(fs.readFileSync(proofPath, "utf8"));
        const pub = JSON.parse(fs.readFileSync(pubPath, "utf8"));
        const encProof = sdk.validateAndConvertProof(proof);
        const inputs = sdk.encodePublicInputs(pub);
        const pkgLine = fs.readFileSync(path.join(isoDir, "verifier.gno"), "utf8").match(/^package\s+(\w+)/m);
        const pkgName = pkgLine ? pkgLine[1] : "verifier";
        const testSrc = `package ${pkgName}\n\nimport (\n\t"testing"\n\n\t"${CORE_PKG}"\n)\n\nfunc TestVerifyGeneratedProof(t *testing.T) {\n\tproof, err := groth16.ParseProofHex("${encProof.a}", "${encProof.b}", "${encProof.c}")\n\tif err != nil {\n\t\tt.Fatalf("parse proof failed: %v", err)\n\t}\n\tinputs, err := groth16.ParsePublicInputsHex(splitCSV("${inputs.join(",")}"))\n\tif err != nil {\n\t\tt.Fatalf("parse inputs failed: %v", err)\n\t}\n\tif err := groth16.Verify(vk, proof, inputs); err != nil {\n\t\tt.Fatalf("verify failed: %v", err)\n\t}\n}\n`;
        fs.writeFileSync(path.join(isoDir, "verifier_test.gno"), testSrc);
      }
      fs.writeFileSync(path.join(isoDir, "gnowork.toml"), `[workspace]\nmembers = [\n  ".",\n  ".veil_core_tmp/gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/groth16/v2",\n]\n`);
      const { spawnSync } = require("child_process");
      const res = spawnSync(gnoBin, ["test", "-v", "."], { cwd: isoDir, encoding: "utf8", timeout: 30000 });
      testOut = (res.stdout || "") + (res.stderr || "");
      if (res.status !== 0) {
        throw new Error(res.error ? res.error.message : `gno test exited with ${res.status}\n${testOut}`);
      }
    } catch (e) {
      testErr = e;
    } finally {
      fs.rmSync(isoDir, { recursive: true, force: true });
    }
    if (testErr) {
      fail("GNO_TEST_FAILED", testErr.message);
    }
    out({ ok: true, dir: path.resolve(dir), output: testOut }, testOut);
    return;
  }

  fail("UNKNOWN_COMMAND", `Unknown command "${cmd}"`, "Run `veil --help` for usage.");
}

main();
