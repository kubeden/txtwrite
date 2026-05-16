#!/usr/bin/env node
import { parseArgs } from "./lib/args.mjs";
import { loadConfig } from "./lib/config.mjs";
import { readJson } from "./lib/files.mjs";
import { statusList, updateAgentProgressComment } from "./lib/status-comment.mjs";

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

const agentStages = [
  { stage: "pickedUp", label: "Agent accepted the request" },
  { stage: "neonReady", label: "Preview database branch is ready" },
  { stage: "runningAgent", label: "Codex is making changes" },
  { stage: "checksPassed", label: "Configured checks passed" },
  { stage: "prReady", label: "Draft PR is ready" }
];

const previewStages = [
  { stage: "previewStarted", label: "Preview workflow started" },
  { stage: "previewReady", label: "Preview environment is ready" }
];

const releaseStages = [
  { stage: "productionStarted", label: "Production deploy started" },
  { stage: "previewCleanup", label: "Preview cleanup started" },
  { stage: "releaseDone", label: "Release and cleanup completed" }
];

const messages = {
  pickedUp: [
    "Status: agent running",
    "",
    ...statusList(agentStages, stage),
    "",
    `Working from \`${baseBranch}\`${branch ? ` on \`${branch}\`` : ""}.`,
    runUrl ? `Run: ${runUrl}` : "",
  ],
  neonReady: [
    "Status: database setup is ready",
    "",
    ...statusList(agentStages, stage),
    "",
    neonLine(),
    "I will use that branch for migrations and checks; I will not print credentials."
  ],
  runningAgent: [
    "Status: Codex is making the code changes now",
    "",
    ...statusList(agentStages, stage),
    "",
    "After it finishes, I will run the configured checks and open a draft PR if there is a diff."
  ],
  checksPassed: [
    "Status: configured checks passed",
    "",
    ...statusList(agentStages, stage),
    "",
    "I am committing the changes and opening the draft PR next."
  ],
  noChanges: [
    "Status: no source changes",
    "",
    ...statusList(agentStages, stage, "runningAgent"),
    "",
    "I ran the task, but there was no source diff to turn into a PR.",
    "That usually means the requested change was already present or Codex decided not to edit anything."
  ],
  failed: [
    "Status: failed",
    "",
    ...statusList(agentStages, stage, "runningAgent"),
    "",
    "I hit a failure before I could finish.",
    runUrl ? `The Actions run has the details: ${runUrl}` : "The Actions run has the details.",
    "Once the underlying problem is fixed, rerun the command and I will try again."
  ],
  previewStarted: [
    "Status: preview workflow running",
    "",
    ...statusList(previewStages, stage),
    "",
    neonLine(),
    "I will build the image, push it to the registry, update the GitOps preview branch, and wait for Argo CD to make the preview URL reachable."
  ],
  previewCleanup: [
    "Status: preview cleanup running",
    "",
    ...statusList(releaseStages, stage),
    "",
    "I will remove the GitOps manifests and delete the Neon preview branch if it still exists."
  ],
  productionStarted: [
    "Status: production deploy running",
    "",
    ...statusList(releaseStages, stage),
    "",
    "This PR was merged, so I am deploying it to the main md app now.",
    "I will run the production migration, publish the production image, update GitOps, and then clean up the preview resources."
  ]
};

const body = (messages[stage] ?? [String(args.message || stage)])
  .filter((line) => line !== undefined && line !== null && line !== false)
  .join("\n");

await updateAgentProgressComment(issueNumber, body);
