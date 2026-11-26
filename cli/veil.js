#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const BN254_P = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;
const BN254_R = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const MAX_PUBLIC_INPUTS = 64;

const DEFAULT_CORE_PKG = "gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/groth16/v2";
const NETWORKS = {
  onyx: {
    chainid: "onyx-1",
    remote: "https://rpc.onyx.testnets.gno.land:443",
  },
  local: {
    chainid: "dev",
    remote: "127.0.0.1:26657",
  },
};

function fail(msg) {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

function parseFieldDec(decStr, modulus, label) {
  let s;
  if (typeof decStr === "string") {
    s = decStr;
  } else if (typeof decStr === "number" && Number.isSafeInteger(decStr) && decStr >= 0) {
    s = String(decStr);
  } else {
    fail(`${label}: expected canonical decimal string or non-negative integer`);
  }
  if (!/^(0|[1-9][0-9]*)$/.test(s)) {
    fail(`${label}: invalid canonical decimal integer "${decStr}"`);
  }
  const n = BigInt(s);
  if (n < 0n || n >= modulus) {
    fail(`${label}: non-canonical field element (${decStr} not in [0, modulus))`);
  }
  return n.toString(16).padStart(64, "0");
}

function encodeG1(pt, label) {
  if (!Array.isArray(pt) || pt.length < 2) {
    fail(`${label}: expected G1 point array [x, y, ...]`);
  }
  return parseFieldDec(pt[0], BN254_P, `${label}.x`) + parseFieldDec(pt[1], BN254_P, `${label}.y`);
}

function encodeG2EIP197(pt, label) {
  if (!Array.isArray(pt) || pt.length < 2 || !Array.isArray(pt[0]) || !Array.isArray(pt[1])) {
    fail(`${label}: expected G2 point [[x_real, x_imag], [y_real, y_imag], ...]`);
  }
  if (pt[0].length < 2 || pt[1].length < 2) {
    fail(`${label}: malformed G2 Fp2 coordinates`);
  }
  // snarkjs uses [real, imag]; Gno crypto/bn254 (EIP-197) requires x_imag|x_real|y_imag|y_real.
  return (
    parseFieldDec(pt[0][1], BN254_P, `${label}.x_imag`) +
    parseFieldDec(pt[0][0], BN254_P, `${label}.x_real`) +
    parseFieldDec(pt[1][1], BN254_P, `${label}.y_imag`) +
    parseFieldDec(pt[1][0], BN254_P, `${label}.y_real`)
  );
}

function readJson(filePath, label) {
  if (!filePath) fail(`missing ${label} path`);
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) fail(`${label} not found: ${abs}`);
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch (e) {
    fail(`invalid JSON in ${abs}: ${e.message}`);
  }
}

function validateAndConvertVK(vk) {
  if (vk.protocol !== "groth16") {
    fail(`unsupported protocol "${vk.protocol}" (expected "groth16")`);
  }
  if (vk.curve !== "bn128" && vk.curve !== "bn254") {
    fail(`unsupported curve "${vk.curve}" (expected "bn128" / "bn254")`);
  }
  if (!Array.isArray(vk.IC) || vk.IC.length === 0) {
    fail("verification key IC array is missing or empty");
  }
  const nPublic = vk.IC.length - 1;
  if (typeof vk.nPublic === "number" && vk.nPublic !== nPublic) {
    fail(`nPublic (${vk.nPublic}) does not match IC.length - 1 (${nPublic})`);
  }
  if (nPublic > MAX_PUBLIC_INPUTS) {
    fail(`public input count ${nPublic} exceeds Veil Core limit (${MAX_PUBLIC_INPUTS})`);
  }

  return {
    protocol: vk.protocol,
    curve: "bn254",
    nPublic,
    alpha: encodeG1(vk.vk_alpha_1, "vk_alpha_1"),
    beta: encodeG2EIP197(vk.vk_beta_2, "vk_beta_2"),
    gamma: encodeG2EIP197(vk.vk_gamma_2, "vk_gamma_2"),
    delta: encodeG2EIP197(vk.vk_delta_2, "vk_delta_2"),
    ic: vk.IC.map((pt, i) => encodeG1(pt, `IC[${i}]`)),
  };
}

function validateAndConvertProof(proof) {
  if (proof.protocol && proof.protocol !== "groth16") {
    fail(`unsupported proof protocol "${proof.protocol}"`);
  }
  if (proof.curve && proof.curve !== "bn128" && proof.curve !== "bn254") {
    fail(`unsupported proof curve "${proof.curve}"`);
  }
  return {
    a: encodeG1(proof.pi_a, "pi_a"),
    b: encodeG2EIP197(proof.pi_b, "pi_b"),
    c: encodeG1(proof.pi_c, "pi_c"),
  };
}

function validateAndConvertPublic(pub) {
  if (!Array.isArray(pub)) fail("public.json must be a JSON array");
  if (pub.length > MAX_PUBLIC_INPUTS) {
    fail(`public input count ${pub.length} exceeds limit (${MAX_PUBLIC_INPUTS})`);
  }
  return pub.map((v, i) => parseFieldDec(v, BN254_R, `public[${i}]`));
}

function parseFlags(args) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (!next || next.startsWith("--")) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i++;
      }
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

function cmdInspect(args) {
  const { positional } = parseFlags(args);
  const vk = readJson(positional[0], "verification_key.json");
  const conv = validateAndConvertVK(vk);
  console.log("Veil Forge — Verification Key Inspection");
  console.log(`  Protocol      : ${conv.protocol}`);
  console.log(`  Curve         : ${conv.curve} (snarkjs "${vk.curve}")`);
  console.log(`  Public Inputs : ${conv.nPublic}`);
  console.log(`  IC Points     : ${conv.ic.length}`);
  console.log(`  G2 Encoding   : converted to EIP-197 (x_imag|x_real|y_imag|y_real)`);
  console.log(`  Alpha (G1)    : ${conv.alpha.slice(0, 16)}...`);
  console.log("  Status        : VALID (compatible with Veil Core)");
}

function cmdGenerate(args) {
  const { flags, positional } = parseFlags(args);
  const vk = readJson(positional[0], "verification_key.json");
  const conv = validateAndConvertVK(vk);
  const outDir = path.resolve(flags.out || "./verifier");
  const pkgPath = flags.pkgpath || "gno.land/r/veil/generated_verifier";
  const corePkg = flags.core || DEFAULT_CORE_PKG;
  const pkgName = path.basename(pkgPath).replace(/[^a-zA-Z0-9_]/g, "_");

  fs.mkdirSync(outDir, { recursive: true });

  const gnomod = `module = "${pkgPath}"\ngno = "0.9"\n`;
  const icSlice = conv.ic.map((h) => `\t\t"${h}",`).join("\n");

  const verifierGno = `// Code generated by Veil Forge CLI. DO NOT EDIT.
package ${pkgName}

import (
	"strings"

	"${corePkg}"
)

var (
	vk            groth16.VerifyingKey
	verifiedCount uint64
)

func init() {
	parsed, err := groth16.ParseVerifyingKeyHex(
		"${conv.alpha}",
		"${conv.beta}",
		"${conv.gamma}",
		"${conv.delta}",
		[]string{
${icSlice}
		},
	)
	if err != nil {
		panic(err.Error())
	}
	vk = parsed
}

// ExpectedPublicInputs returns the number of public inputs required by this circuit.
func ExpectedPublicInputs() int {
	return ${conv.nPublic}
}

// Verify checks a Groth16 proof and comma-separated hex public inputs against
// the embedded circuit verification key. Panics on invalid proof.
func Verify(cur realm, aHex, bHex, cHex, inputsCSV string) string {
	proof, err := groth16.ParseProofHex(aHex, bHex, cHex)
	if err != nil {
		panic(err.Error())
	}
	inputs, err := groth16.ParsePublicInputsHex(splitCSV(inputsCSV))
	if err != nil {
		panic(err.Error())
	}
	if err := groth16.Verify(vk, proof, inputs); err != nil {
		panic(err.Error())
	}
	verifiedCount++
	return "VALID"
}

// VerifiedCount returns the number of valid proofs verified by this realm.
func VerifiedCount() uint64 {
	return verifiedCount
}

// Render returns a human-readable summary of the verifier realm.
func Render(_ string) string {
	return "Veil Generated Groth16 Verifier (${pkgName})\\n\\nExpected public inputs: ${conv.nPublic}\\n"
}

func splitCSV(s string) []string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	for i := 0; i < len(parts); i++ {
		parts[i] = strings.TrimSpace(parts[i])
	}
	return parts
}
`;

  const testGno = `package ${pkgName}

import "testing"

func TestGeneratedVKInitialized(t *testing.T) {
	if ExpectedPublicInputs() != ${conv.nPublic} {
		t.Fatalf("expected ${conv.nPublic} public inputs, got %d", ExpectedPublicInputs())
	}
	if len(vk.IC) != ${conv.ic.length} {
		t.Fatalf("expected ${conv.ic.length} IC points, got %d", len(vk.IC))
	}
}
`;

  const deployMd = `# Deployment Instructions (${pkgPath})

1. Ensure Veil Core is deployed at \`${corePkg}\`.
2. Run local tests:
   \`\`\`bash
   gno test -v .
   \`\`\`
3. Deploy to Onyx (\`onyx-1\`):
   \`\`\`bash
   gnokey maketx addpkg \\
     -pkgdir "${outDir}" \\
     -pkgpath "${pkgPath}" \\
     -gas-fee 1000000ugnot -gas-wanted 20000000 -max-deposit 50000000ugnot \\
     -chainid onyx-1 -remote https://rpc.onyx.testnets.gno.land:443 <key-name>
   \`\`\`
`;

  fs.writeFileSync(path.join(outDir, "gnomod.toml"), gnomod);
  fs.writeFileSync(path.join(outDir, "verifier.gno"), verifierGno);
  fs.writeFileSync(path.join(outDir, "verifier_test.gno"), testGno);
  fs.writeFileSync(path.join(outDir, "DEPLOY.md"), deployMd);

  console.log(`Generated Gno verifier package in ${outDir}`);
  console.log(`  Package Path   : ${pkgPath}`);
  console.log(`  Veil Core      : ${corePkg}`);
  console.log(`  Public Inputs  : ${conv.nPublic}`);
}

function resolveGnoBin(name) {
  const envBin = process.env[name.toUpperCase() + "_BIN"];
  if (envBin && fs.existsSync(envBin)) return envBin;
  const localToolchain = path.join("E:\\toolchains\\bin", `${name}.exe`);
  if (fs.existsSync(localToolchain)) return localToolchain;
  return name;
}

function cmdTest(args) {
  const { flags } = parseFlags(args);
  const dir = path.resolve(flags.dir || ".");
  const proof = validateAndConvertProof(readJson(flags.proof, "proof.json"));
  const pubHex = validateAndConvertPublic(readJson(flags.public, "public.json"));

  const verifierPath = path.join(dir, "verifier.gno");
  if (!fs.existsSync(verifierPath)) {
    fail(`verifier.gno not found in ${dir} (run 'veil generate' first or pass --dir)`);
  }
  const src = fs.readFileSync(verifierPath, "utf8");
  const pkgMatch = src.match(/^package\s+(\w+)/m);
  if (!pkgMatch) fail("could not parse package name from verifier.gno");
  const pkgName = pkgMatch[1];

  const tmpTest = path.join(dir, "veil_cli_proof_test.gno");
  const csv = pubHex.join(",");
  const testSrc = `package ${pkgName}

import "testing"

func TestVeilCLIProof(cur realm, t *testing.T) {
	res := Verify(
		cross(cur),
		"${proof.a}",
		"${proof.b}",
		"${proof.c}",
		"${csv}",
	)
	if res != "VALID" {
		t.Fatalf("expected VALID, got %s", res)
	}
}
`;
  fs.writeFileSync(tmpTest, testSrc);

  const gnoBin = resolveGnoBin("gno");
  const rootArgs = process.env.GNO_ROOT
    ? ["-root-dir", process.env.GNO_ROOT]
    : fs.existsSync("E:\\toolchains\\gno")
      ? ["-root-dir", "E:\\toolchains\\gno"]
      : [];

  try {
    execFileSync(gnoBin, ["test", "-v", ...rootArgs, "."], {
      cwd: dir,
      stdio: "inherit",
    });
  } finally {
    if (fs.existsSync(tmpTest)) fs.unlinkSync(tmpTest);
  }
}

function cmdDeploy(args) {
  const { flags } = parseFlags(args);
  const dir = path.resolve(flags.dir || ".");
  const net = NETWORKS[flags.network || "onyx"];
  if (!net) fail(`unknown network "${flags.network}"`);
  const gnomodPath = path.join(dir, "gnomod.toml");
  let pkgPath = flags.pkgpath;
  if (!pkgPath && fs.existsSync(gnomodPath)) {
    const m = fs.readFileSync(gnomodPath, "utf8").match(/module\s*=\s*"([^"]+)"/);
    if (m) pkgPath = m[1];
  }
  if (!pkgPath) fail("missing --pkgpath (and not found in gnomod.toml)");
  const keyName = flags.key || "veil-dev";
  const gnokeyBin = resolveGnoBin("gnokey");

  execFileSync(
    gnokeyBin,
    [
      "maketx",
      "addpkg",
      "-pkgdir",
      dir,
      "-pkgpath",
      pkgPath,
      "-gas-fee",
      flags["gas-fee"] || "1000000ugnot",
      "-gas-wanted",
      flags["gas-wanted"] || "20000000",
      "-max-deposit",
      flags["max-deposit"] || "50000000ugnot",
      "-chainid",
      flags.chainid || net.chainid,
      "-remote",
      flags.remote || net.remote,
      "-broadcast",
      keyName,
    ],
    { stdio: "inherit" }
  );
}

function cmdVerify(args) {
  const { flags } = parseFlags(args);
  const net = NETWORKS[flags.network || "onyx"];
  if (!net) fail(`unknown network "${flags.network}"`);
  if (!flags.pkgpath) fail("missing --pkgpath");
  const proof = validateAndConvertProof(readJson(flags.proof, "proof.json"));
  const pubHex = validateAndConvertPublic(readJson(flags.public, "public.json"));
  const keyName = flags.key || "veil-dev";
  const gnokeyBin = resolveGnoBin("gnokey");

  execFileSync(
    gnokeyBin,
    [
      "maketx",
      "call",
      "-pkgpath",
      flags.pkgpath,
      "-func",
      flags.func || "Verify",
      "-args",
      proof.a,
      "-args",
      proof.b,
      "-args",
      proof.c,
      "-args",
      pubHex.join(","),
      "-gas-fee",
      flags["gas-fee"] || "1000000ugnot",
      "-gas-wanted",
      flags["gas-wanted"] || "15000000",
      "-chainid",
      flags.chainid || net.chainid,
      "-remote",
      flags.remote || net.remote,
      "-broadcast",
      keyName,
    ],
    { stdio: "inherit" }
  );
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  switch (cmd) {
    case "inspect":
      return cmdInspect(rest);
    case "generate":
      return cmdGenerate(rest);
    case "test":
      return cmdTest(rest);
    case "deploy":
      return cmdDeploy(rest);
    case "verify":
      return cmdVerify(rest);
    default:
      console.log(`Veil Forge CLI — Zero-Knowledge Developer Infrastructure for Gno.land

Usage:
  veil inspect <verification_key.json>
  veil generate <verification_key.json> --out <dir> [--pkgpath <path>] [--core <groth16_path>]
  veil test --dir <dir> --proof <proof.json> --public <public.json>
  veil deploy --dir <dir> --pkgpath <path> --key <key> [--network onyx]
  veil verify --pkgpath <path> --proof <proof.json> --public <public.json> --key <key> [--network onyx]`);
      process.exit(cmd ? 1 : 0);
  }
}

main();
