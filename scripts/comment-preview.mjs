#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { loadConfig } from "./lib/config.mjs";
import { readJson } from "./lib/files.mjs";
import { fetchPullRequest } from "./lib/github.mjs";
import { statusList, updateAgentProgressComment } from "./lib/status-comment.mjs";
import { sourceIssueNumberFromText } from "./lib/summaries.mjs";

const config = await loadConfig();
const neon = await readJson(".agent/runtime/neon.json", { enabled: false });
const prNumber = Number(process.env.PR_NUMBER || process.env.GITHUB_REF_NAME?.match(/\d+/)?.[0] || 0);
if (!prNumber) throw new Error("PR_NUMBER is required.");
const pull = await fetchPullRequest(prNumber);
const sourceIssueNumber = sourceIssueNumberFromText(pull.body);
const previewStages = [
  { stage: "previewStarted", label: "Preview workflow started" },
  { stage: "previewReady", label: "Preview environment is ready" }
];

let previewUrl = "";
try {
  previewUrl = (await readFile(config.preview.urlFile, "utf8")).trim();
} catch {
  previewUrl = process.env.PREVIEW_URL || "";
}

const previewLines = [
  "Status: preview environment ready",
  "",
  ...statusList(previewStages, "previewReady"),
  "",
  previewUrl ? `URL: ${previewUrl}` : "The deploy adapter did not return a preview URL.",
  neon.enabled
    ? `Neon branch: \`${neon.branchName}\` (${neon.branchId}).`
    : "No Neon branch was configured for this run.",
  neon.enabled && neon.expiresAt ? `That branch expires at ${neon.expiresAt}.` : "",
  "",
  "Use this environment for review only. I did not write database credentials into comments or commits."
];

await updateAgentProgressComment(prNumber, previewLines);

if (sourceIssueNumber && sourceIssueNumber !== prNumber) {
  await updateAgentProgressComment(
    sourceIssueNumber,
    [
      "Status: preview environment ready",
      "",
      ...statusList(previewStages, "previewReady"),
      "",
      `Preview for PR #${prNumber} is ready.`,
      "",
      previewUrl ? `URL: ${previewUrl}` : "The deploy adapter did not return a preview URL.",
      neon.enabled ? `Neon branch: \`${neon.branchName}\`.` : "",
      "",
      `PR: ${pull.html_url}`
    ]
  );
}
