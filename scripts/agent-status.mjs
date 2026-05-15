#!/usr/bin/env node
import { parseArgs } from "./lib/args.mjs";
import { loadConfig } from "./lib/config.mjs";
import { readJson } from "./lib/files.mjs";
import { createIssueComment } from "./lib/github.mjs";

const args = parseArgs();
const stage = args.stage || args._?.[0];
if (!stage) throw new Error("Usage: node scripts/agent-status.mjs --stage <stage>");

const config = await loadConfig();
const context = await readJson(".agent/runtime/issue-context.json", {});
const neon = await readJson(".agent/runtime/neon.json", { enabled: false });
const issueNumber = Number(
  args.issueNumber ||
    process.env.ISSUE_NUMBER ||
    process.env.PR_NUMBER ||
    context.issue?.number ||
    0
);

if (!issueNumber) throw new Error("ISSUE_NUMBER or PR_NUMBER is required.");

const branch = context.headBranch || process.env.HEAD_BRANCH || "";
const baseBranch = context.baseBranch || config.baseBranch;
const runUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : "";

function neonLine() {
  if (!neon.enabled) return "I could not create a Neon preview branch for this run.";
  const expiry = neon.expiresAt ? ` It expires at ${neon.expiresAt}.` : "";
  return `I have a Neon branch ready: \`${neon.branchName}\`.${expiry}`;
}

const messages = {
  pickedUp: [
    "I picked this up.",
    `I am going to work from \`${baseBranch}\`${branch ? ` and push \`${branch}\`` : ""}.`,
    runUrl ? `Run: ${runUrl}` : ""
  ],
  neonReady: [
    "Database setup is ready.",
    neonLine(),
    "I will use that branch for migrations and checks; I will not print credentials."
  ],
  runningAgent: [
    "I have enough context and I am handing the task to Codex now.",
    "After it finishes, I will run the configured checks and open a draft PR if there is a diff."
  ],
  checksPassed: [
    "Codex finished and the configured checks passed.",
    "I am committing the changes and opening the draft PR next."
  ],
  noChanges: [
    "I ran the task, but there was no source diff to turn into a PR.",
    "That usually means the requested change was already present or Codex decided not to edit anything."
  ],
  failed: [
    "I hit a failure before I could finish.",
    runUrl ? `The Actions run has the details: ${runUrl}` : "The Actions run has the details.",
    "Once the underlying problem is fixed, rerun the command and I will try again."
  ],
  previewStarted: [
    "I am building the PR preview now.",
    neonLine(),
    "Next I will build the image, push it to the registry, and update the GitOps preview branch."
  ],
  previewCleanup: [
    "I am cleaning up this preview now.",
    "I will remove the GitOps manifests and delete the Neon preview branch if it still exists."
  ],
  productionStarted: [
    "This PR was merged, so I am deploying it to the main md app now.",
    "I will run the production migration, publish the production image, update GitOps, and then clean up the preview resources."
  ]
};

const body = (messages[stage] ?? [String(args.message || stage)])
  .filter(Boolean)
  .join("\n\n");

await createIssueComment(issueNumber, body);
