#!/usr/bin/env node
import { loadConfig } from "./lib/config.mjs";
import { createIssueComment, fetchPullRequest } from "./lib/github.mjs";
import {
  cleanupLine,
  extractSummaryFromPullBody,
  sourceIssueNumberFromText
} from "./lib/summaries.mjs";

const config = await loadConfig();
const prNumber = Number(process.env.PR_NUMBER || 0);
if (!prNumber) throw new Error("PR_NUMBER is required.");

const pull = await fetchPullRequest(prNumber);
const merged = process.env.MERGED === "true";
const sourceIssueNumber = sourceIssueNumberFromText(pull.body);
const summary = extractSummaryFromPullBody(pull.body);
const productionUrl =
  process.env.PRODUCTION_URL ||
  config.production?.url ||
  "";
const cleanup = cleanupLine({
  deleted: process.env.NEON_DELETED,
  branchName: process.env.NEON_BRANCH_NAME,
  reason: process.env.NEON_DELETE_REASON
});

const productionDetails = [
  productionUrl ? `Production: ${productionUrl}` : "",
  process.env.IMAGE ? `Image: \`${process.env.IMAGE}\`` : "",
  process.env.TRACE_IMAGE ? `Trace image: \`${process.env.TRACE_IMAGE}\`` : "",
  process.env.GITOPS_COMMIT ? `GitOps commit: \`${process.env.GITOPS_COMMIT}\`` : ""
].filter(Boolean);

const prBody = merged
  ? [
      "Merged and deployed.",
      "",
      `PR: #${prNumber} ${pull.title}`,
      "",
      "Merged changes:",
      ...summary,
      "",
      ...productionDetails,
      cleanup
    ]
      .filter(Boolean)
      .join("\n")
  : [
      "PR closed without merge.",
      "",
      `PR: #${prNumber} ${pull.title}`,
      cleanup
    ]
      .filter(Boolean)
      .join("\n");

await createIssueComment(prNumber, prBody);

if (sourceIssueNumber && sourceIssueNumber !== prNumber) {
  const issueBody = merged
    ? [
        `PR #${prNumber} was merged and deployed to production.`,
        "",
        "Merged changes:",
        ...summary,
        "",
        productionUrl ? `Production: ${productionUrl}` : "",
        cleanup,
        "",
        "I left this issue open for your review."
      ]
        .filter(Boolean)
        .join("\n")
    : [
        `PR #${prNumber} was closed without merge.`,
        "",
        cleanup,
        "",
        "No production deploy was run."
      ]
        .filter(Boolean)
        .join("\n");

  await createIssueComment(sourceIssueNumber, issueBody);
}
