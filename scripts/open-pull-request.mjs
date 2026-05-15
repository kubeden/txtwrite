#!/usr/bin/env node
import { loadConfig } from "./lib/config.mjs";
import { readJson } from "./lib/files.mjs";
import {
  addIssueLabels,
  createIssueComment,
  createPullRequest,
  findOpenPullByHead
} from "./lib/github.mjs";
import { setOutput } from "./lib/output.mjs";

const context = await readJson(".agent/runtime/issue-context.json");
const neon = await readJson(".agent/runtime/neon.json", { enabled: false });
const config = await loadConfig();

const existing = await findOpenPullByHead(context.headBranch);
const body = [
  `Implements #${context.issue.number}.`,
  "",
  "## Agent Run",
  `- Provider: ${context.provider}`,
  `- Source issue: #${context.issue.number}`,
  neon.enabled
    ? `- Neon branch: ${neon.branchName} (${neon.branchId}), expires ${neon.expiresAt || "not set"}`
    : "- Neon branch: not configured",
  "",
  "## Reviewer Notes",
  "- Check the preview deployment before merging.",
  "- Confirm migrations and data changes are expected.",
  "- This PR was generated from an issue comment trigger."
].join("\n");

const pull =
  existing ??
  (await createPullRequest({
    title: context.prTitle,
    body,
    head: context.headBranch,
    base: context.baseBranch,
    draft: true
  }));

await addIssueLabels(pull.number, [config.labels.agentPr].filter(Boolean));

const comment = [
  `Created agent PR: ${pull.html_url}`,
  "",
  neon.enabled
    ? `Neon preview branch: \`${neon.branchName}\` (${neon.databaseUrlRedacted})`
    : "Neon preview branch: not configured.",
  "",
  "The PR is a draft until a human reviews the diff and preview."
].join("\n");

await createIssueComment(context.issue.number, comment);

setOutput("pr_number", pull.number);
setOutput("pr_url", pull.html_url);
