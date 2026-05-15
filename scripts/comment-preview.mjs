#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { loadConfig } from "./lib/config.mjs";
import { readJson } from "./lib/files.mjs";
import { createIssueComment } from "./lib/github.mjs";

const config = await loadConfig();
const neon = await readJson(".agent/runtime/neon.json", { enabled: false });
const prNumber = Number(process.env.PR_NUMBER || process.env.GITHUB_REF_NAME?.match(/\d+/)?.[0] || 0);
if (!prNumber) throw new Error("PR_NUMBER is required.");

let previewUrl = "";
try {
  previewUrl = (await readFile(config.preview.urlFile, "utf8")).trim();
} catch {
  previewUrl = process.env.PREVIEW_URL || "";
}

const body = [
  "## Preview Environment",
  "",
  previewUrl ? `Preview URL: ${previewUrl}` : "Preview URL: not provided by the deployment adapter.",
  neon.enabled
    ? `Neon branch: \`${neon.branchName}\` (${neon.branchId})`
    : "Neon branch: not configured.",
  neon.enabled && neon.expiresAt ? `Expires: ${neon.expiresAt}` : "",
  "",
  "Use this environment for review only. Do not copy credentials into comments or commits."
]
  .filter(Boolean)
  .join("\n");

await createIssueComment(prNumber, body);
