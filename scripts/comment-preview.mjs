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
  "The preview is ready.",
  "",
  previewUrl ? `Review it here: ${previewUrl}` : "I finished the preview workflow, but the deploy adapter did not return a URL.",
  neon.enabled
    ? `I used Neon branch \`${neon.branchName}\` (${neon.branchId}).`
    : "No Neon branch was configured for this run.",
  neon.enabled && neon.expiresAt ? `That branch expires at ${neon.expiresAt}.` : "",
  "",
  "Use this environment for review only. I did not write database credentials into comments or commits."
]
  .filter(Boolean)
  .join("\n");

await createIssueComment(prNumber, body);
