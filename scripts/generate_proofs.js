const { execFileSync, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CIRCUITS_DIR = path.join(ROOT, "circuits");
const BUILD_DIR = path.join(CIRCUITS_DIR, "build");
const CIRCOM_BIN = process.env.CIRCOM_BIN || "E:\\toolchains\\circom\\circom.exe";
const SNARKJS_CMD = process.platform === "win32" ? "snarkjs.cmd" : "snarkjs";

fs.mkdirSync(BUILD_DIR, { recursive: true });

function run(cmd, args, cwd = BUILD_DIR) {
  console.log(`> ${cmd} ${args.join(" ")}`);
  const quoted = args.map((a) => (a.includes(" ") ? `"${a}"` : a));
  execSync(`"${cmd}" ${quoted.join(" ")}`, { cwd, stdio: "inherit" });
}

function decTo32ByteHex(decStr) {
  const n = BigInt(decStr);
  if (n < 0n) throw new Error(`Negative field element: ${decStr}`);
  const hex = n.toString(16).padStart(64, "0");
  if (hex.length > 64) throw new Error(`Overflow 32 bytes: ${decStr}`);
  return hex;
}

function g1ToHex(pt) {
  // snarkjs G1: [x, y, "1"]
  return decTo32ByteHex(pt[0]) + decTo32ByteHex(pt[1]);
}

function g2ToHexEIP197(pt) {
  // snarkjs G2: [[x_real, x_imag], [y_real, y_imag], ["1", "0"]]
  // EIP-197 / crypto/bn254 expects: x_imag | x_real | y_imag | y_real
  return (
    decTo32ByteHex(pt[0][1]) +
    decTo32ByteHex(pt[0][0]) +
    decTo32ByteHex(pt[1][1]) +
    decTo32ByteHex(pt[1][0])
  );
}

function encodeVK(vk) {
  return {
    alpha: g1ToHex(vk.vk_alpha_1),
    beta: g2ToHexEIP197(vk.vk_beta_2),
    gamma: g2ToHexEIP197(vk.vk_gamma_2),
    delta: g2ToHexEIP197(vk.vk_delta_2),
    ic: vk.IC.map(g1ToHex),
  };
}

function encodeProof(proof) {
  return {
    a: g1ToHex(proof.pi_a),
    b: g2ToHexEIP197(proof.pi_b),
    c: g1ToHex(proof.pi_c),
    packedHex: g1ToHex(proof.pi_a) + g2ToHexEIP197(proof.pi_b) + g1ToHex(proof.pi_c),
  };
}

function setupPtau() {
  const ptauFinal = path.join(BUILD_DIR, "pot12_final.ptau");
  if (fs.existsSync(ptauFinal)) return ptauFinal;

  const ptau0 = path.join(BUILD_DIR, "pot12_0000.ptau");
  const ptau1 = path.join(BUILD_DIR, "pot12_0001.ptau");
  run(SNARKJS_CMD, ["powersoftau", "new", "bn128", "12", ptau0, "-v"]);
  run(SNARKJS_CMD, [
    "powersoftau",
    "contribute",
    ptau0,
    ptau1,
    "--name=Veil Phase 0 Dev-Only Contribution",
    "-e=veil-phase0-dev-entropy-not-for-production",
  ]);
  run(SNARKJS_CMD, ["powersoftau", "prepare", "phase2", ptau1, ptauFinal, "-v"]);
  return ptauFinal;
}

function buildCircuit(name, inputObj, ptauPath) {
  const cDir = path.join(BUILD_DIR, name);
  fs.mkdirSync(cDir, { recursive: true });
  const circomFile = path.join(CIRCUITS_DIR, `${name}.circom`);

  run(CIRCOM_BIN, [circomFile, "--r1cs", "--wasm", "--sym", "-o", cDir], cDir);

  const r1cs = path.join(cDir, `${name}.r1cs`);
  const wasm = path.join(cDir, `${name}_js`, `${name}.wasm`);
  const zkey0 = path.join(cDir, `${name}_0000.zkey`);
  const zkeyFinal = path.join(cDir, `${name}_final.zkey`);
  const vkeyJson = path.join(cDir, "verification_key.json");
  const inputJson = path.join(cDir, "input.json");
  const proofJson = path.join(cDir, "proof.json");
  const publicJson = path.join(cDir, "public.json");

  fs.writeFileSync(inputJson, JSON.stringify(inputObj, null, 2));

  run(SNARKJS_CMD, ["groth16", "setup", r1cs, ptauPath, zkey0], cDir);
  run(
    SNARKJS_CMD,
    [
      "zkey",
      "contribute",
      zkey0,
      zkeyFinal,
      "--name=Veil Phase 0 Dev-Only Phase2",
      "-e=veil-phase0-dev-phase2-entropy",
    ],
    cDir
  );
  run(SNARKJS_CMD, ["zkey", "export", "verificationkey", zkeyFinal, vkeyJson], cDir);
  run(SNARKJS_CMD, ["groth16", "fullprove", inputJson, wasm, zkeyFinal, proofJson, publicJson], cDir);
  run(SNARKJS_CMD, ["groth16", "verify", vkeyJson, publicJson, proofJson], cDir);

  const vk = JSON.parse(fs.readFileSync(vkeyJson, "utf8"));
  const proof = JSON.parse(fs.readFileSync(proofJson, "utf8"));
  const pub = JSON.parse(fs.readFileSync(publicJson, "utf8"));

  return {
    name,
    input: inputObj,
    publicSignalsDecimal: pub,
    publicSignalsHex: pub.map(decTo32ByteHex),
    vk: encodeVK(vk),
    proof: encodeProof(proof),
  };
}

function main() {
  const ptau = setupPtau();
  const multiplier = buildCircuit("multiplier", { a: "7", b: "13" }, ptau);
  const sumOfSquares = buildCircuit("sum_of_squares", { x: "3", y: "4", target: "25" }, ptau);

  const vectors = {
    warning: "DEVELOPMENT-ONLY TEST ARTIFACTS. NOT CEREMONY-BACKED. DO NOT USE IN PRODUCTION.",
    curve: "bn254",
    g2Order: "x_imag|x_real|y_imag|y_real (EIP-197)",
    circuits: {
      multiplier,
      sum_of_squares: sumOfSquares,
    },
  };

  const outPath = path.join(BUILD_DIR, "vectors.json");
  fs.writeFileSync(outPath, JSON.stringify(vectors, null, 2));
  console.log(`\nWrote test vectors to ${outPath}`);
}

main();
