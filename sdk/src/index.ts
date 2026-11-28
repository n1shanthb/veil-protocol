import { Identity } from "@semaphore-protocol/identity";
import { Group } from "@semaphore-protocol/group";
import { generateProof, unpackGroth16Proof, type SemaphoreProof } from "@semaphore-protocol/proof";
import { keccak256, toBeHex } from "ethers";

export { Identity, Group };

export const BN254_P =
  21888242871839275222246405745257275088696311157297823662689037894645226208583n;
export const BN254_R =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;
export const MAX_PUBLIC_INPUTS = 64;

export type VeilErrorCode =
  | "INVALID_VK"
  | "INVALID_PROOF"
  | "INVALID_PUBLIC_INPUT"
  | "NON_CANONICAL_FIELD"
  | "TOO_MANY_PUBLIC_INPUTS"
  | "RPC_ERROR"
  | "SNAPSHOT_ROOT_MISMATCH";

export class VeilError extends Error {
  public readonly code: VeilErrorCode;
  constructor(code: VeilErrorCode, message: string) {
    super(message);
    this.name = "VeilError";
    this.code = code;
  }
}

export interface SnarkjsVerificationKey {
  protocol: string;
  curve: string;
  nPublic?: number;
  vk_alpha_1: string[];
  vk_beta_2: string[][];
  vk_gamma_2: string[][];
  vk_delta_2: string[][];
  IC: string[][];
}

export interface SnarkjsProof {
  protocol?: string;
  curve?: string;
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
}

export interface EncodedVerifyingKey {
  protocol: "groth16";
  curve: "bn254";
  nPublic: number;
  alpha: string;
  beta: string;
  gamma: string;
  delta: string;
  ic: string[];
}

export interface EncodedProof {
  a: string;
  b: string;
  c: string;
  packedHex: string;
}

export interface GnoCallRequest {
  pkgPath: string;
  func: string;
  args: string[];
}

export function parseFieldDecimal(
  decStr: string | number | bigint,
  modulus: bigint,
  label: string
): string {
  if (
    decStr === null ||
    decStr === undefined ||
    typeof decStr === "boolean" ||
    typeof decStr === "object" ||
    (typeof decStr === "number" && (!Number.isSafeInteger(decStr) || decStr < 0))
  ) {
    throw new VeilError("NON_CANONICAL_FIELD", `${label}: unsupported or unsafe numeric value`);
  }
  if (typeof decStr === "string" && !/^(0|[1-9][0-9]*)$/.test(decStr)) {
    throw new VeilError("NON_CANONICAL_FIELD", `${label}: invalid decimal integer "${decStr}"`);
  }
  let n: bigint;
  try {
    n = BigInt(decStr);
  } catch {
    throw new VeilError("NON_CANONICAL_FIELD", `${label}: invalid integer "${String(decStr)}"`);
  }
  if (n < 0n || n >= modulus) {
    throw new VeilError(
      "NON_CANONICAL_FIELD",
      `${label}: value ${n.toString()} outside [0, modulus)`
    );
  }
  return n.toString(16).padStart(64, "0");
}

export function encodeG1(pt: string[], label: string): string {
  if (!Array.isArray(pt) || pt.length < 2) {
    throw new VeilError("INVALID_VK", `${label}: expected [x, y, ...]`);
  }
  return (
    parseFieldDecimal(pt[0], BN254_P, `${label}.x`) +
    parseFieldDecimal(pt[1], BN254_P, `${label}.y`)
  );
}

/**
 * Converts snarkjs G2 ([x_real, x_imag], [y_real, y_imag]) to Gno crypto/bn254
 * EIP-197 imaginary-first order (x_imag | x_real | y_imag | y_real).
 */
export function encodeG2EIP197(pt: string[][], label: string): string {
  if (!Array.isArray(pt) || pt.length < 2 || !Array.isArray(pt[0]) || !Array.isArray(pt[1])) {
    throw new VeilError("INVALID_VK", `${label}: expected [[x_real, x_imag], [y_real, y_imag], ...]`);
  }
  if (pt[0].length < 2 || pt[1].length < 2) {
    throw new VeilError("INVALID_VK", `${label}: malformed Fp2 coordinates`);
  }
  return (
    parseFieldDecimal(pt[0][1], BN254_P, `${label}.x_imag`) +
    parseFieldDecimal(pt[0][0], BN254_P, `${label}.x_real`) +
    parseFieldDecimal(pt[1][1], BN254_P, `${label}.y_imag`) +
    parseFieldDecimal(pt[1][0], BN254_P, `${label}.y_real`)
  );
}

export function validateAndConvertVK(vk: SnarkjsVerificationKey): EncodedVerifyingKey {
  if (!vk || vk.protocol !== "groth16") {
    throw new VeilError("INVALID_VK", `unsupported protocol "${vk?.protocol}"`);
  }
  if (vk.curve !== "bn128" && vk.curve !== "bn254") {
    throw new VeilError("INVALID_VK", `unsupported curve "${vk.curve}"`);
  }
  if (!Array.isArray(vk.IC) || vk.IC.length === 0) {
    throw new VeilError("INVALID_VK", "IC array is missing or empty");
  }
  const nPublic = vk.IC.length - 1;
  if (typeof vk.nPublic === "number" && vk.nPublic !== nPublic) {
    throw new VeilError("INVALID_VK", `nPublic (${vk.nPublic}) != IC.length - 1 (${nPublic})`);
  }
  if (nPublic > MAX_PUBLIC_INPUTS) {
    throw new VeilError("TOO_MANY_PUBLIC_INPUTS", `nPublic ${nPublic} > ${MAX_PUBLIC_INPUTS}`);
  }
  return {
    protocol: "groth16",
    curve: "bn254",
    nPublic,
    alpha: encodeG1(vk.vk_alpha_1, "vk_alpha_1"),
    beta: encodeG2EIP197(vk.vk_beta_2, "vk_beta_2"),
    gamma: encodeG2EIP197(vk.vk_gamma_2, "vk_gamma_2"),
    delta: encodeG2EIP197(vk.vk_delta_2, "vk_delta_2"),
    ic: vk.IC.map((pt, i) => encodeG1(pt, `IC[${i}]`)),
  };
}

export function validateAndConvertProof(proof: SnarkjsProof): EncodedProof {
  if (!proof) {
    throw new VeilError("INVALID_PROOF", "proof is required");
  }
  if (proof.protocol && proof.protocol !== "groth16") {
    throw new VeilError("INVALID_PROOF", `unsupported protocol "${proof.protocol}"`);
  }
  if (proof.curve && proof.curve !== "bn128" && proof.curve !== "bn254") {
    throw new VeilError("INVALID_PROOF", `unsupported curve "${proof.curve}"`);
  }
  const a = encodeG1(proof.pi_a, "pi_a");
  const b = encodeG2EIP197(proof.pi_b, "pi_b");
  const c = encodeG1(proof.pi_c, "pi_c");
  return { a, b, c, packedHex: a + b + c };
}

export function encodePublicInputs(inputs: Array<string | number | bigint>): string[] {
  if (!Array.isArray(inputs)) {
    throw new VeilError("INVALID_PUBLIC_INPUT", "public inputs must be an array");
  }
  if (inputs.length > MAX_PUBLIC_INPUTS) {
    throw new VeilError("TOO_MANY_PUBLIC_INPUTS", `input count ${inputs.length} > ${MAX_PUBLIC_INPUTS}`);
  }
  return inputs.map((v, i) => parseFieldDecimal(v, BN254_R, `public[${i}]`));
}

/**
 * Matches Semaphore v4's official uint256(keccak256(toBeHex(val, 32))) >> 8.
 */
export function semaphoreHashToField(val: bigint | number | string): string {
  const n = BigInt(val);
  const digest = keccak256(toBeHex(n, 32));
  const shifted = BigInt(digest) >> 8n;
  return shifted.toString(16).padStart(64, "0");
}

/**
 * Matches Gno semaphore.DomainScopeFull(network, appDomain, groupID, pollID) byte-for-byte:
 * keccak256(network || ":" || appDomain || ":" || u64BE(groupID) || ":" || u64BE(pollID)) >> 8.
 */
export function deriveCanonicalScope(
  network: string,
  appDomain: string,
  groupId: number | bigint,
  pollId: number | bigint
): string {
  const u64BE = (v: number | bigint): Buffer => {
    const b = Buffer.alloc(8);
    b.writeBigUInt64BE(BigInt(v));
    return b;
  };
  const payload = Buffer.concat([
    Buffer.from(network, "utf8"),
    Buffer.from(":", "utf8"),
    Buffer.from(appDomain, "utf8"),
    Buffer.from(":", "utf8"),
    u64BE(groupId),
    Buffer.from(":", "utf8"),
    u64BE(pollId),
  ]);
  const digest = keccak256(payload);
  const shifted = BigInt(digest) >> 8n;
  return shifted.toString(16).padStart(64, "0");
}

export function createIdentity(secret?: string): Identity {
  return secret ? new Identity(secret) : new Identity();
}

export function buildGroupFromCommitments(commitments: Array<bigint | string>): {
  group: Group;
  rootHex: string;
} {
  const group = new Group(commitments.map((c) => BigInt(c)));
  return {
    group,
    rootHex: BigInt(group.root).toString(16).padStart(64, "0"),
  };
}

export async function generateSemaphoreVoteProof(params: {
  identity: Identity;
  commitments: Array<bigint | string>;
  pollId: number | bigint;
  optionIndex: number;
  depth?: number;
  network?: string;
  appDomain?: string;
  groupId?: number | bigint;
}): Promise<{
  semaphoreProof: SemaphoreProof;
  encodedProof: EncodedProof;
  rootHex: string;
  nullifierHex: string;
  rawScopeHex: string;
}> {
  const depth = params.depth ?? 10;
  const network = params.network ?? "dev";
  const appDomain =
    params.appDomain ?? "gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_vote/v3";
  const groupId = params.groupId ?? 1;
  const rawScopeHex = deriveCanonicalScope(network, appDomain, groupId, params.pollId);
  const scopeVal = BigInt("0x" + rawScopeHex);

  const group = new Group(params.commitments.map((c) => BigInt(c)));
  const semProof = await generateProof(
    params.identity,
    group,
    BigInt(params.optionIndex),
    scopeVal,
    depth
  );
  const unpacked = unpackGroth16Proof(semProof.points) as unknown as SnarkjsProof;
  const encodedProof = validateAndConvertProof(unpacked);
  return {
    semaphoreProof: semProof,
    encodedProof,
    rootHex: BigInt(semProof.merkleTreeRoot).toString(16).padStart(64, "0"),
    nullifierHex: BigInt(semProof.nullifier).toString(16).padStart(64, "0"),
    rawScopeHex,
  };
}

export function buildVerifyCallArgs(
  pkgPath: string,
  proof: SnarkjsProof,
  publicInputs: Array<string | number | bigint>,
  func = "Verify"
): GnoCallRequest {
  const enc = validateAndConvertProof(proof);
  const pub = encodePublicInputs(publicInputs);
  return {
    pkgPath,
    func,
    args: [enc.a, enc.b, enc.c, pub.join(",")],
  };
}

export function buildVoteCallArgs(params: {
  pkgPath: string;
  pollId: number;
  depth: number;
  rootHex: string;
  nullifierHex: string;
  optionIndex: number;
  proof: EncodedProof;
}): GnoCallRequest {
  return {
    pkgPath: params.pkgPath,
    func: "Vote",
    args: [
      String(params.pollId),
      String(params.depth),
      params.rootHex,
      params.nullifierHex,
      String(params.optionIndex),
      params.proof.a,
      params.proof.b,
      params.proof.c,
    ],
  };
}

export async function queryGnoABCI(
  rpcUrl: string,
  abciPath: string,
  data: string
): Promise<string> {
  const url = `${rpcUrl.replace(/\/$/, "")}/abci_query?path=${encodeURIComponent(
    `"${abciPath}"`
  )}&data=${encodeURIComponent(`"${data}"`)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new VeilError("RPC_ERROR", `HTTP ${res.status} querying ${abciPath}`);
  }
  const json = (await res.json()) as {
    result?: { response?: { ResponseBase?: { Error?: unknown; Data?: string; Log?: string } } };
  };
  const resp = json.result?.response?.ResponseBase;
  if (!resp || resp.Error) {
    throw new VeilError("RPC_ERROR", resp?.Log || "ABCI query failed");
  }
  if (!resp.Data) return "";
  return Buffer.from(resp.Data, "base64").toString("utf8");
}

export async function queryRealmRender(
  rpcUrl: string,
  realmPath: string,
  renderPath = ""
): Promise<string> {
  return queryGnoABCI(rpcUrl, "vm/qrender", `${realmPath}:${renderPath}`);
}

function parseQevalString(raw: string): string {
  const m = raw.match(/^\("((?:[^"\\]|\\.)*)"\s+string\)$/);
  if (!m) return raw.trim();
  return m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

function parseQevalInt(raw: string): number {
  const m = raw.match(/^\((\d+)\s+int\)$/);
  if (!m) {
    throw new VeilError("RPC_ERROR", `Unexpected qeval int response: ${raw}`);
  }
  return Number(m[1]);
}

/**
 * Fetches all frozen poll commitments in bounded pages (<= 100 per page),
 * derives maxPages from GetPollSnapshotCount, validates canonical hex
 * commitments and total count, reconstructs the Semaphore LeanIMT group,
 * and verifies that the computed root matches the poll's published SnapshotRoot.
 */
export async function fetchPaginatedPollCommitmentsAndVerifyRoot(params: {
  rpcUrl: string;
  realmPath: string;
  pollId: number | bigint;
  expectedRootHex: string;
  pageSize?: number;
  snapshotCount?: number;
}): Promise<{ commitmentsHex: string[]; group: Group; rootHex: string }> {
  const pageSize = Math.min(Math.max(params.pageSize ?? 100, 1), 100);
  const snapshotCount =
    params.snapshotCount ??
    parseQevalInt(
      await queryGnoABCI(
        params.rpcUrl,
        "vm/qeval",
        `${params.realmPath}.GetPollSnapshotCount(${params.pollId})`
      )
    );
  if (!Number.isInteger(snapshotCount) || snapshotCount <= 0 || snapshotCount > 1024) {
    throw new VeilError("INVALID_PUBLIC_INPUT", `Invalid snapshotCount ${snapshotCount}`);
  }
  const maxPages = Math.ceil(snapshotCount / pageSize);
  const commitmentsHex: string[] = [];
  let offset = 0;
  for (let page = 0; page < maxPages; page++) {
    const raw = await queryGnoABCI(
      params.rpcUrl,
      "vm/qeval",
      `${params.realmPath}.GetPollCommitmentsPaged(${params.pollId},${offset},${pageSize})`
    );
    const body = parseQevalString(raw).trim();
    if (!body) break;
    const lines = body.split("\n").map((s) => s.trim()).filter(Boolean);
    if (lines.length > pageSize) {
      throw new VeilError("RPC_ERROR", `Page ${page} exceeded requested pageSize ${pageSize}`);
    }
    for (const h of lines) {
      if (!/^[0-9a-f]{64}$/i.test(h)) {
        throw new VeilError("NON_CANONICAL_FIELD", `Invalid commitment hex: ${h}`);
      }
      commitmentsHex.push(h.toLowerCase());
    }
    offset += lines.length;
  }
  if (commitmentsHex.length !== snapshotCount) {
    throw new VeilError(
      "SNAPSHOT_ROOT_MISMATCH",
      `Expected ${snapshotCount} commitments, got ${commitmentsHex.length}`
    );
  }
  const members = commitmentsHex.map((h) => BigInt("0x" + h));
  const group = new Group(members);
  const rootHex = BigInt(group.root).toString(16).padStart(64, "0");
  const expected = params.expectedRootHex.replace(/^0x/i, "").toLowerCase();
  if (rootHex !== expected) {
    throw new VeilError(
      "SNAPSHOT_ROOT_MISMATCH",
      `Reconstructed root ${rootHex} does not match poll snapshot ${expected}`
    );
  }
  return { commitmentsHex, group, rootHex };
}

export const CORE_PKG_PATH = "gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/groth16/v2";

export function generateGnoVerifierSource(pkgPath: string, conv: EncodedVerifyingKey): string {
  if (!/^gno\.land\/[pr]\/[a-zA-Z0-9_/-]+$/.test(pkgPath)) {
    throw new VeilError("INVALID_VK", `Invalid Gno package path: ${pkgPath}`);
  }
  const pkgName = pkgPath.split("/").pop()?.replace(/[^a-zA-Z0-9_]/g, "_") || "verifier";
  const icLines = conv.ic.map((h) => `\t\t"${h}",`).join("\n");
  return `// Code generated by Veil. DO NOT EDIT.
package ${pkgName}

import (
\t"strings"

\t"${CORE_PKG_PATH}"
)

var (
\tvk            groth16.VerifyingKey
\tverifiedCount uint64
)

func init() {
\tparsed, err := groth16.ParseVerifyingKeyHex(
\t\t"${conv.alpha}",
\t\t"${conv.beta}",
\t\t"${conv.gamma}",
\t\t"${conv.delta}",
\t\t[]string{
${icLines}
\t\t},
\t)
\tif err != nil {
\t\tpanic(err.Error())
\t}
\tvk = parsed
}

func Verify(cur realm, aHex, bHex, cHex, inputsCSV string) string {
\tif len(aHex) > 130 || len(bHex) > 258 || len(cHex) > 130 || len(inputsCSV) > 64*67 {
\t\tpanic(groth16.ErrInvalidEncoding.Error())
\t}
\tproof, err := groth16.ParseProofHex(aHex, bHex, cHex)
\tif err != nil {
\t\tpanic(err.Error())
\t}
\tinputs, err := groth16.ParsePublicInputsHex(splitCSV(inputsCSV))
\tif err != nil {
\t\tpanic(err.Error())
\t}
\tif err := groth16.Verify(vk, proof, inputs); err != nil {
\t\tpanic(err.Error())
\t}
\tverifiedCount++
\treturn "VALID"
}

func splitCSV(s string) []string {
\ts = strings.TrimSpace(s)
\tif s == "" {
\t\treturn nil
\t}
\tparts := strings.Split(s, ",")
\tfor i := 0; i < len(parts); i++ {
\t\tparts[i] = strings.TrimSpace(parts[i])
\t}
\treturn parts
}
`;
}

export async function verifyProofLocal(
  vk: SnarkjsVerificationKey,
  proof: SnarkjsProof,
  publicInputs: Array<string | number | bigint>
): Promise<{ valid: boolean; encodedProof: EncodedProof; encodedInputs: string[] }> {
  const conv = validateAndConvertVK(vk);
  const encodedProof = validateAndConvertProof(proof);
  const encodedInputs = encodePublicInputs(publicInputs);
  if (encodedInputs.length !== conv.nPublic) {
    throw new VeilError(
      "INVALID_PUBLIC_INPUT",
      `Public input count (${encodedInputs.length}) != expected ${conv.nPublic}`
    );
  }
  // @ts-ignore snarkjs has no bundled types
  const snarkjs = await import("snarkjs");
  const valid = await snarkjs.groth16.verify(vk, publicInputs.map(String), proof as any);
  return { valid: Boolean(valid), encodedProof, encodedInputs };
}

export type ActivationStatus = "ACTIVE" | "NOT_FOUND" | "UNAVAILABLE" | "UNKNOWN";

export async function checkPackageActivation(
  pkgPath: string,
  rpcUrl = "https://rpc.onyx.testnets.gno.land:443"
): Promise<{ pkgPath: string; status: ActivationStatus; reason?: string }> {
  if (!/^gno\.land\/[pr]\/[a-zA-Z0-9_/-]+$/.test(pkgPath)) {
    return { pkgPath, status: "UNKNOWN", reason: "Invalid Gno package path" };
  }
  try {
    const endpoint = rpcUrl.replace(":443", "");
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "abci_query",
        params: { path: "vm/qfile", data: Buffer.from(pkgPath).toString("base64") },
      }),
    });
    if (!res.ok) {
      return { pkgPath, status: "UNAVAILABLE", reason: `HTTP ${res.status}` };
    }
    const j: any = await res.json();
    if (!j || j.error || !j.result || !j.result.response) {
      return { pkgPath, status: "UNAVAILABLE", reason: j?.error?.message || "Malformed JSON-RPC response" };
    }
    const resp = j.result.response;
    if (resp.ResponseBase?.Error) {
      return { pkgPath, status: "NOT_FOUND", reason: resp.ResponseBase?.Log || "Package not found" };
    }
    const dataB64 = resp.ResponseBase?.Data;
    if (!dataB64) {
      return { pkgPath, status: "NOT_FOUND", reason: "Empty vm/qfile response" };
    }
    const decoded = Buffer.from(dataB64, "base64").toString("utf8").trim();
    if (!decoded) {
      return { pkgPath, status: "NOT_FOUND", reason: "Empty package file list" };
    }
    return { pkgPath, status: "ACTIVE" };
  } catch (e: any) {
    return { pkgPath, status: "UNAVAILABLE", reason: e?.message || String(e) };
  }
}
