#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { loadConfig } from "./lib/config.mjs";

const config = await loadConfig();
const gitops = config.gitops ?? {};

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function run(command, args, options = {}) {
  console.log(`+ ${command} ${args.join(" ")}`);
  execFileSync(command, args, { stdio: "inherit", ...options });
}

function tryRun(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  return result.status === 0;
}

function git(args) {
  run("git", args, { cwd: gitopsPath });
}

function tryGit(args) {
  return tryRun("git", args, { cwd: gitopsPath });
}

const prNumber = requiredEnv("PR_NUMBER");
const gitopsPath = gitops.checkoutPath || ".agent/runtime/gitops";
const gitopsBranch = process.env.GITOPS_BRANCH || gitops.branch || "txtwrite-previews";
const previewRoot = gitops.previewRoot ||
  "k8s-cluster-configuration/applications/md/previews";
const appPrefix = gitops.appPrefix || "md-pr";
const appName = `${appPrefix}-${prNumber}`;
const relativePreviewDir = `${previewRoot}/${appName}`;
const previewDir = join(gitopsPath, relativePreviewDir);

git(["config", "user.name", "txtwrite-preview-bot"]);
git(["config", "user.email", "txtwrite-preview-bot@users.noreply.github.com"]);

if (!tryGit(["fetch", "origin", gitopsBranch])) {
  console.log(`GitOps branch ${gitopsBranch} does not exist; no preview manifests to clean.`);
  process.exit(0);
}

git(["checkout", "-B", gitopsBranch, `origin/${gitopsBranch}`]);
tryGit(["rm", "-r", "--ignore-unmatch", relativePreviewDir]);
await rm(previewDir, { recursive: true, force: true });

const diff = spawnSync("git", ["diff", "--cached", "--quiet"], {
  cwd: gitopsPath
});
if (diff.status === 0) {
  console.log(`No GitOps preview manifests found for ${appName}.`);
  process.exit(0);
}
if (diff.status !== 1) {
  throw new Error(`git diff failed with status ${diff.status}.`);
}

git(["commit", "-m", `Remove txtwrite preview for PR #${prNumber}`]);
git(["push", "origin", `HEAD:${gitopsBranch}`]);
