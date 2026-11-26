const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const BUILD_DIR = path.join(ROOT, "circuits", "build");
const SNARKJS_CMD = process.platform === "win32" ? "snarkjs.cmd" : "snarkjs";

function decTo32ByteHex(decStr) {
  return BigInt(decStr).toString(16).padStart(64, "0");
}
function g1ToHex(pt) {
  return decTo32ByteHex(pt[0]) + decTo32ByteHex(pt[1]);
}
function g2ToHexEIP197(pt) {
  return (
    decTo32ByteHex(pt[0][1]) +
    decTo32ByteHex(pt[0][0]) +
    decTo32ByteHex(pt[1][1]) +
    decTo32ByteHex(pt[1][0])
  );
}

function proveAndVerify(circuitName, inputObj, idx) {
  const cDir = path.join(BUILD_DIR, circuitName);
  const wasm = path.join(cDir, `${circuitName}_js`, `${circuitName}.wasm`);
  const zkey = path.join(cDir, `${circuitName}_final.zkey`);
  const vkey = path.join(cDir, "verification_key.json");

  const tmpDir = path.join(BUILD_DIR, "diff_tmp");
  fs.mkdirSync(tmpDir, { recursive: true });
  const inFile = path.join(tmpDir, `${circuitName}_${idx}_in.json`);
  const proofFile = path.join(tmpDir, `${circuitName}_${idx}_proof.json`);
  const pubFile = path.join(tmpDir, `${circuitName}_${idx}_pub.json`);

  fs.writeFileSync(inFile, JSON.stringify(inputObj));
  execSync(`"${SNARKJS_CMD}" groth16 fullprove "${inFile}" "${wasm}" "${zkey}" "${proofFile}" "${pubFile}"`, {
    stdio: "pipe",
  });
  execSync(`"${SNARKJS_CMD}" groth16 verify "${vkey}" "${pubFile}" "${proofFile}"`, {
    stdio: "pipe",
  });

  const proof = JSON.parse(fs.readFileSync(proofFile, "utf8"));
  const pub = JSON.parse(fs.readFileSync(pubFile, "utf8"));
  return {
    a: g1ToHex(proof.pi_a),
    b: g2ToHexEIP197(proof.pi_b),
    c: g1ToHex(proof.pi_c),
    inputs: pub.map(decTo32ByteHex),
  };
}

function randU32() {
  return crypto.randomBytes(4).readUInt32BE(0);
}

function main() {
  const cases = [];
  for (let i = 0; i < 4; i++) {
    const a = BigInt(randU32()) + 1n;
    const b = BigInt(randU32()) + 1n;
    cases.push({
      circuit: "multiplier",
      ...proveAndVerify("multiplier", { a: a.toString(), b: b.toString() }, i),
    });

    const x = BigInt(randU32());
    const y = BigInt(randU32());
    const target = x * x + y * y;
    cases.push({
      circuit: "sum_of_squares",
      ...proveAndVerify("sum_of_squares", { x: x.toString(), y: y.toString(), target: target.toString() }, i),
    });
  }

  // Emit Gno differential test file
  const gnoLines = [
    "package groth16",
    "",
    'import "testing"',
    "",
    "func TestDifferentialSnarkjsFixtures(t *testing.T) {",
    "\tvkMult := multiplierVK(t)",
    "\tvkSq := sumOfSquaresVK(t)",
  ];

  cases.forEach((tc, idx) => {
    const vkVar = tc.circuit === "multiplier" ? "vkMult" : "vkSq";
    const inputsGo = tc.inputs.map((h) => `"${h}"`).join(", ");
    gnoLines.push(`\t{`);
    gnoLines.push(`\t\tp, err := ParseProofHex("${tc.a}", "${tc.b}", "${tc.c}")`);
    gnoLines.push(`\t\tif err != nil { t.Fatalf("case ${idx}: %v", err) }`);
    gnoLines.push(`\t\tin, err := ParsePublicInputsHex([]string{${inputsGo}})`);
    gnoLines.push(`\t\tif err != nil { t.Fatalf("case ${idx} inputs: %v", err) }`);
    gnoLines.push(`\t\tif err := Verify(${vkVar}, p, in); err != nil { t.Fatalf("case ${idx} (${tc.circuit}): %v", err) }`);
    gnoLines.push(`\t}`);
  });
  gnoLines.push("}");

  const outGno = path.join(ROOT, "gno", "p", "groth16", "differential_test.gno");
  fs.writeFileSync(outGno, gnoLines.join("\n") + "\n");
  console.log(`Generated ${cases.length} randomized snarkjs-verified differential cases in ${outGno}`);

  // Clean up temp files
  fs.rmSync(path.join(BUILD_DIR, "diff_tmp"), { recursive: true, force: true });
}

main();
