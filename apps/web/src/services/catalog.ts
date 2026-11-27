import { CORE_PKG_PATH, REGISTRY_REALM_PATH, VOTE_REALM_PATH } from "../veil-browser";

export interface CircuitSpec {
  id: string;
  name: string;
  sourcePath: string;
  protocol: "groth16";
  curve: "bn254";
  publicInputsCount: number;
  publicSignals: string[];
  setupProvenance: string;
  ceremonyBacked: boolean;
  localVerifyGas: string;
  onChainRealm?: string;
  description: string;
  artifactsNote: string;
  sampleVk?: Record<string, unknown>;
  sampleProof?: Record<string, unknown>;
  samplePublic?: string[];
}

export const CIRCUIT_CATALOG: CircuitSpec[] = [
  {
    id: "multiplier",
    name: "multiplier.circom",
    sourcePath: "circuits/multiplier.circom",
    protocol: "groth16",
    curve: "bn254",
    publicInputsCount: 1,
    publicSignals: ["c"],
    setupProvenance: "Dev-Only (pot12)",
    ceremonyBacked: false,
    localVerifyGas: "2,888,411 (net Verify)",
    description: "Minimal arithmetic circuit proving knowledge of factors a * b = c without revealing a or b.",
    artifactsNote: "WASM, zkey, and VK present in repository circuits/build/multiplier/.",
    samplePublic: ["91"],
  },
  {
    id: "sum_of_squares",
    name: "sum_of_squares.circom",
    sourcePath: "circuits/sum_of_squares.circom",
    protocol: "groth16",
    curve: "bn254",
    publicInputsCount: 2,
    publicSignals: ["ok", "target"],
    setupProvenance: "Dev-Only (pot12)",
    ceremonyBacked: false,
    localVerifyGas: "3,029,774 (net Verify)",
    description: "Proves knowledge of two private values whose squares sum to a public target.",
    artifactsNote: "WASM, zkey, and VK present in repository circuits/build/sum_of_squares/.",
  },
  {
    id: "semaphore-10",
    name: "semaphore-10 (v4.13.0)",
    sourcePath: "External (PSE Semaphore v4.13.0)",
    protocol: "groth16",
    curve: "bn254",
    publicInputsCount: 4,
    publicSignals: ["merkleTreeRoot", "nullifier", "hash(message)", "hash(scope)"],
    setupProvenance: "Ceremony-Backed (PSE)",
    ceremonyBacked: true,
    localVerifyGas: "3,320,996 (net Verify)",
    onChainRealm: VOTE_REALM_PATH,
    description: "Zero-knowledge group membership and nullifier circuit used by Veil Vote and Veil Primitives.",
    artifactsNote: "vk_depth10.json in repo; WASM and zkey fetched from PSE CDN at proof time.",
  },
  {
    id: "cubic_check",
    name: "external/cubic_check.circom",
    sourcePath: "circuits/external/cubic_check.circom",
    protocol: "groth16",
    curve: "bn254",
    publicInputsCount: 1,
    publicSignals: ["out"],
    setupProvenance: "Dev-Only (pot12)",
    ceremonyBacked: false,
    localVerifyGas: "~2,890,000 (net Verify)",
    onChainRealm: "gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/cubic_check_verifier",
    description: "External onboarding circuit proving x^3 + x + 5 = out. Deployed and verified on Onyx.",
    artifactsNote: "WASM, zkey, and VK present in repository circuits/build/cubic_check/.",
  },
  {
    id: "square_diff",
    name: "square_diff.circom",
    sourcePath: "examples/square_diff_verifier",
    protocol: "groth16",
    curve: "bn254",
    publicInputsCount: 3,
    publicSignals: ["out", "a_pub", "b_pub"],
    setupProvenance: "Dev-Only (pot12)",
    ceremonyBacked: false,
    localVerifyGas: "~2,950,000 (net Verify)",
    onChainRealm: "gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/square_diff_verifier",
    description: "Onboarding verification circuit deployed at height 1450416 and registered as #2 in veil_registry/v1.",
    artifactsNote: "Verified on Onyx at height 1450637 (VerifiedCount=1).",
  },
];

export interface DeployedPackage {
  pkgPath: string;
  shortName: string;
  role: string;
  height: number;
  txHash: string;
  gasUsed: string;
  explorerUrl: string;
}

export const DEPLOYED_PACKAGES: DeployedPackage[] = [
  {
    pkgPath: CORE_PKG_PATH,
    shortName: "groth16/v2",
    role: "Core Verifier",
    height: 1426060,
    txHash: "U61xv6bC85z9VopmocG5DV7iumLhEOEtCLC8TEESZPU=",
    gasUsed: "59,348,160",
    explorerUrl: `https://onyx.gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/groth16/v2`,
  },
  {
    pkgPath: "gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/semaphore/v2",
    shortName: "semaphore/v2",
    role: "Primitives",
    height: 1426645,
    txHash: "yhsY8yPnhZMsWQXr2sDO1GHuLxQr/XzZi9KLr8KZ9ME=",
    gasUsed: "24,166,378",
    explorerUrl: `https://onyx.gno.land/p/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/semaphore/v2`,
  },
  {
    pkgPath: VOTE_REALM_PATH,
    shortName: "veil_vote/v3",
    role: "Vote Realm",
    height: 1445403,
    txHash: "n8gsscfoGHMyEy5p0yj9cDlg/M9Io5gWcH9Numi5cOw=",
    gasUsed: "47,790,095",
    explorerUrl: `https://onyx.gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_vote/v3`,
  },
  {
    pkgPath: REGISTRY_REALM_PATH,
    shortName: "veil_registry/v1",
    role: "Registry Realm",
    height: 1445405,
    txHash: "Z3nPuj8AoPVXdPOuWx3czo+Bk9dJQPhbVpNRsbJzJkw=",
    gasUsed: "17,058,134",
    explorerUrl: `https://onyx.gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/veil_registry/v1`,
  },
  {
    pkgPath: "gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/cubic_check_verifier",
    shortName: "cubic_check_verifier",
    role: "Forge Verifier",
    height: 1445406,
    txHash: "2UQcV5zMkm+5F7RzJ2qzRtdvuaRzpkSkvP7icJPS3FQ=",
    gasUsed: "6,480,793",
    explorerUrl: `https://onyx.gno.land/r/g1c3m9uesphlhmj6fkx6nsh3fvhw8apqyjwyhe04/cubic_check_verifier`,
  },
];
