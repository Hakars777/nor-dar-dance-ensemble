import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "../../package/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { StdioClientTransport } from "../../package/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const cursorRoot = path.resolve(projectRoot, "..");
const packageServer = path.join(cursorRoot, "package", "server.js");
const configPaths = [
  "C:/Users/onair-am/.cursor/mcp.json",
  path.join(cursorRoot, "mcp.json")
];

const [toolName, rawArgs = "", ...rawPairs] = process.argv.slice(2);

if (!toolName) {
  console.error("Usage: node scripts/hostinger-call.mjs <toolName> '<jsonArgs>'");
  process.exit(1);
}

const configPath = configPaths.find((candidate) => fs.existsSync(candidate));
if (!configPath) {
  console.error("Hostinger MCP config was not found.");
  process.exit(1);
}

const cfg = JSON.parse(fs.readFileSync(configPath, "utf8").replace(/^\uFEFF/, ""));
const token = cfg.mcpServers?.["hostinger-mcp"]?.env?.API_TOKEN;
if (!token) {
  console.error("Hostinger API token was not found in MCP config.");
  process.exit(1);
}

function parseValue(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  return value;
}

function parseArgs(raw, pairs) {
  if (!raw) return {};
  if (raw.trim().startsWith("{")) return JSON.parse(raw);
  const allPairs = [raw, ...pairs];
  return Object.fromEntries(
    allPairs.map((pair) => {
      const separator = pair.indexOf("=");
      if (separator === -1) {
        throw new Error(`Invalid argument "${pair}". Use key=value.`);
      }
      const key = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      return [key, parseValue(value)];
    })
  );
}

const args = parseArgs(rawArgs, rawPairs);
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [packageServer],
  env: {
    ...process.env,
    API_TOKEN: token,
    DEBUG: "false"
  }
});

const client = new Client(
  { name: "nor-dar-hostinger-deployer", version: "1.0.0" },
  { capabilities: {} }
);

try {
  await client.connect(transport);
  const result = await client.callTool({
    name: toolName,
    arguments: args
  });
  const text = result.content?.map((item) => item.text).filter(Boolean).join("\n") || "";
  if (!text) {
    console.log("{}");
  } else {
    console.log(text);
  }
} finally {
  await client.close();
}
