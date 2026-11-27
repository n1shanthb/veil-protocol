export const RELAYER_URL =
  (import.meta as any).env?.VITE_RELAYER_URL || "https://veil-relayer-production.up.railway.app";

export interface RelayerHealth {
  status: string;
  ready: boolean;
  chainId: string;
  rpc: string;
  voteRealm: string;
  dailyBudgetUgnot: number;
  spentUgnotToday: number;
  pendingReconciliations: number;
}

export async function fetchRelayerHealth(): Promise<RelayerHealth> {
  const res = await fetch(`${RELAYER_URL}/ready`);
  if (!res.ok) {
    throw new Error(`Relayer HTTP ${res.status}`);
  }
  return res.json();
}

export async function submitRelayedVote(payload: {
  pollId: number;
  depth: number;
  optionIndex: number;
  rootHex: string;
  nullifierHex: string;
  a: string;
  b: string;
  c: string;
}) {
  const res = await fetch(`${RELAYER_URL}/api/relay/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return { status: res.status, data };
}
