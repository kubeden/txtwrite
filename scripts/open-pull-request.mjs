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
  "## What I Did",
  `- Provider: ${context.provider}`,
  `- Source issue: #${context.issue.number}`,
  neon.enabled
    ? `- Neon branch: ${neon.branchName} (${neon.branchId}), expires ${neon.expiresAt || "not set"}`
    : "- Neon branch: not configured",
  "",
  "## Reviewer Notes",
  "- Check the preview deployment before merging.",
  "- Confirm migrations and data changes are expected.",
  "- This PR was generated after I was tagged in the issue."
].join("\n");

if (context.target?.kind === "pull_request") {
  const prNumber = context.target.number;
  await addIssueLabels(prNumber, [config.labels.agentPr].filter(Boolean));
  await createIssueComment(
    prNumber,
    [
      "I pushed another update to this PR.",
      "",
      neon.enabled
        ? `I used Neon preview branch \`${neon.branchName}\` (${neon.databaseUrlRedacted}).`
        : "No Neon preview branch was configured.",
      "",
      "The PR preview workflow should rebuild from the new commit."
    ].join("\n")
  );
  setOutput("pr_number", prNumber);
  setOutput("pr_url", context.target.htmlUrl);
  process.exit(0);
}

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
  `I opened a draft PR for this: ${pull.html_url}`,
  "",
  neon.enabled
    ? `I used Neon preview branch \`${neon.branchName}\` (${neon.databaseUrlRedacted}).`
    : "No Neon preview branch was configured.",
  "",
  "I left it as a draft so the diff, migration behavior, and preview can be reviewed before merge."
].join("\n");

await createIssueComment(context.issue.number, comment);

setOutput("pr_number", pull.number);
setOutput("pr_url", pull.html_url);
