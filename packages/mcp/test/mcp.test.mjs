import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MCP = path.resolve(__dirname, "..", "bin", "veil-mcp.js");

test("MCP tools/list and tools/call veil_inspect_vk", () => {
  const listOut = execFileSync("node", [MCP], {
    input: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }) + "\n",
    encoding: "utf8",
  });
  const listJson = JSON.parse(listOut.trim());
  assert.ok(listJson.result.tools.some((t) => t.name === "veil_inspect_vk"));
  assert.ok(listJson.result.tools.some((t) => t.name === "veil_encode_gno"));

  const callOut = execFileSync("node", [MCP], {
    input:
      JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "veil_inspect_vk",
          arguments: { vk: { protocol: "groth16", curve: "bn128", IC: [["1", "2"], ["3", "4"]] } },
        },
      }) + "\n",
    encoding: "utf8",
  });
  const callJson = JSON.parse(callOut.trim());
  const parsed = JSON.parse(callJson.result.content[0].text);
  assert.equal(parsed.valid, true);
  assert.equal(parsed.nPublic, 1);
});
