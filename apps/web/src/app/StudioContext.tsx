import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ONYX_RPC, fetchOnyxPollState, fetchOnyxRegistryRecords, formatFriendlyError } from "../veil-browser";
import { fetchRelayerHealth, RelayerHealth } from "../services/relayer";

export interface RegistryRecord {
  id: number;
  pkgPath: string;
  vkFingerprint: string;
  proofSystem: string;
  publicInputs: number;
  version: string;
  status: string;
  raw: string;
}

export function parseRegistryLine(line: string): RegistryRecord {
  const m = line.match(/^#(\d+):\s*(.+)$/);
  const id = m ? Number(m[1]) : 0;
  const rest = m ? m[2] : line;
  const parts = rest.split("|");
  return {
    id,
    pkgPath: parts[0] || "",
    vkFingerprint: parts[1] || "",
    proofSystem: parts[2] || "",
    publicInputs: Number(parts[3] || 0),
    version: parts[4] || "",
    status: parts[5] || "unknown",
    raw: line,
  };
}

interface StudioContextValue {
  onyxStatus: "idle" | "loading" | "ready" | "unavailable";
  onyxNetwork: string;
  onyxHeight: number | null;
  onyxBuild: string;
  onyxError: string;
  registryRecords: RegistryRecord[];
  poll1: {
    tallies: [number, number];
    commitments: string[];
    rootHex: string;
  } | null;
  relayerHealth: RelayerHealth | null;
  relayerError: string;
  refreshAll: () => Promise<void>;
  // In-memory workflow handoffs (no secrets)
  forgeDraftVk: string;
  setForgeDraftVk: (vk: string) => void;
  playgroundDraft: { vk: string; proof: string; pub: string };
  setPlaygroundDraft: (d: { vk: string; proof: string; pub: string }) => void;
}

const StudioContext = createContext<StudioContextValue | null>(null);

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [onyxStatus, setOnyxStatus] = useState<"idle" | "loading" | "ready" | "unavailable">("idle");
  const [onyxNetwork, setOnyxNetwork] = useState("onyx-1");
  const [onyxHeight, setOnyxHeight] = useState<number | null>(null);
  const [onyxBuild, setOnyxBuild] = useState("");
  const [onyxError, setOnyxError] = useState("");
  const [registryRecords, setRegistryRecords] = useState<RegistryRecord[]>([]);
  const [poll1, setPoll1] = useState<StudioContextValue["poll1"]>(null);
  const [relayerHealth, setRelayerHealth] = useState<RelayerHealth | null>(null);
  const [relayerError, setRelayerError] = useState("");

  const [forgeDraftVk, setForgeDraftVk] = useState("");
  const [playgroundDraft, setPlaygroundDraft] = useState({ vk: "", proof: "", pub: "" });

  const refreshAll = useCallback(async () => {
    setOnyxStatus("loading");
    setOnyxError("");
    try {
      const res = await fetch(`${ONYX_RPC.replace(":443", "")}/status`);
      if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
      const j = await res.json();
      setOnyxNetwork(j.result.node_info.network);
      setOnyxHeight(Number(j.result.sync_info.latest_block_height));
      setOnyxBuild(j.result.build_version);

      const [regLines, p1] = await Promise.all([
        fetchOnyxRegistryRecords(ONYX_RPC),
        fetchOnyxPollState(1, ONYX_RPC),
      ]);
      setRegistryRecords(regLines.map(parseRegistryLine));
      setPoll1({
        tallies: [p1.tallies[0], p1.tallies[1]],
        commitments: p1.commitments,
        rootHex: p1.rootHex,
      });
      setOnyxStatus("ready");
    } catch (e) {
      setOnyxStatus("unavailable");
      setOnyxError(formatFriendlyError(e));
    }

    try {
      const rh = await fetchRelayerHealth();
      setRelayerHealth(rh);
      setRelayerError("");
    } catch (e) {
      setRelayerHealth(null);
      setRelayerError(formatFriendlyError(e));
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return (
    <StudioContext.Provider
      value={{
        onyxStatus,
        onyxNetwork,
        onyxHeight,
        onyxBuild,
        onyxError,
        registryRecords,
        poll1,
        relayerHealth,
        relayerError,
        refreshAll,
        forgeDraftVk,
        setForgeDraftVk,
        playgroundDraft,
        setPlaygroundDraft,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
}

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio must be used inside StudioProvider");
  return ctx;
}
