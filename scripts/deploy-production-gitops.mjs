#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { loadConfig } from "./lib/config.mjs";
import { setOutput } from "./lib/output.mjs";

const config = await loadConfig();
const gitops = config.gitops ?? {};
const production = config.production ?? {};

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function run(command, args, options = {}) {
  console.log(`+ ${command} ${args.join(" ")}`);
  execFileSync(command, args, { stdio: "inherit", ...options });
}

function runQuiet(command, args, options = {}) {
  return execFileSync(command, args, { encoding: "utf8", ...options }).trim();
}

function git(args) {
  run("git", args, { cwd: gitopsPath });
}

function dockerLogin() {
  const username = requiredEnv("ZOT_REGISTRY_USERNAME");
  const password = requiredEnv("ZOT_REGISTRY_PASSWORD");
  console.log(`+ docker login ${registryHost} --password-stdin`);
  const result = spawnSync(
    "docker",
    ["login", registryHost, "-u", username, "--password-stdin"],
    {
      input: `${password}\n`,
      stdio: ["pipe", "inherit", "inherit"]
    }
  );

  if (result.status !== 0) {
    throw new Error(`docker login failed with status ${result.status}.`);
  }
}

function checkoutGitopsBranch() {
  git(["config", "user.name", "txtwrite-release-bot"]);
  git(["config", "user.email", "txtwrite-release-bot@users.noreply.github.com"]);
  git(["fetch", "origin", gitopsBranch]);
  git(["checkout", "-B", gitopsBranch, `origin/${gitopsBranch}`]);
}

function updateContainerImage(contents) {
  const lines = contents.split("\n");
  const imageIndex = lines.findIndex((line) => /^\s*image:\s*\S+/.test(line));
  if (imageIndex === -1) {
    throw new Error(`Could not find an image field in ${deploymentPath}.`);
  }

  const indent = lines[imageIndex].match(/^(\s*)/)?.[1] ?? "";
  lines[imageIndex] = `${indent}image: ${image}`;

  const policyIndex = imageIndex + 1;
  if (lines[policyIndex]?.trim().startsWith("imagePullPolicy:")) {
    lines[policyIndex] = `${indent}imagePullPolicy: Always`;
  } else {
    lines.splice(policyIndex, 0, `${indent}imagePullPolicy: Always`);
  }

  return lines.join("\n");
}

function upsertPodTemplateAnnotation(contents, key, value) {
  const lines = contents.split("\n");
  const templateIndex = lines.findIndex((line) => /^  template:\s*$/.test(line));
  if (templateIndex === -1) {
    throw new Error(`Could not find spec.template in ${deploymentPath}.`);
  }

  const metadataIndex = lines.findIndex(
    (line, index) => index > templateIndex && /^    metadata:\s*$/.test(line)
  );
  if (metadataIndex === -1) {
    throw new Error(`Could not find spec.template.metadata in ${deploymentPath}.`);
  }

  const metadataEnd = lines.findIndex(
    (line, index) => index > metadataIndex && line.trim() && /^ {0,4}\S/.test(line)
  );
  const metadataEndIndex = metadataEnd === -1 ? lines.length : metadataEnd;
  const annotationsIndex = lines.findIndex(
    (line, index) =>
      index > metadataIndex &&
      index < metadataEndIndex &&
      /^      annotations:\s*$/.test(line)
  );
  const annotationLine = `        ${key}: ${JSON.stringify(value)}`;

  if (annotationsIndex === -1) {
    lines.splice(metadataEndIndex, 0, "      annotations:", annotationLine);
    return lines.join("\n");
  }

  const annotationsEnd = lines.findIndex(
    (line, index) => index > annotationsIndex && line.trim() && /^ {0,6}\S/.test(line)
  );
  const annotationsEndIndex = annotationsEnd === -1 ? lines.length : annotationsEnd;
  const keyPrefix = `        ${key}:`;
  const existingIndex = lines.findIndex(
    (line, index) =>
      index > annotationsIndex &&
      index < annotationsEndIndex &&
      line.startsWith(keyPrefix)
  );

  if (existingIndex === -1) {
    lines.splice(annotationsEndIndex, 0, annotationLine);
  } else {
    lines[existingIndex] = annotationLine;
  }

  return lines.join("\n");
}

async function updateGitopsDeployment() {
  const fullPath = join(gitopsPath, deploymentPath);
  let contents = await readFile(fullPath, "utf8");
  contents = updateContainerImage(contents);
  contents = upsertPodTemplateAnnotation(
    contents,
    production.rolloutAnnotation || "txtwrite.k6nis.dev/image-sha",
    mergeSha
  );
  await writeFile(fullPath, contents.replace(/\n?$/, "\n"));
}

function commitGitopsChanges() {
  git(["add", deploymentPath]);

  const diff = spawnSync("git", ["diff", "--cached", "--quiet"], {
    cwd: gitopsPath
  });
  if (diff.status === 0) {
    console.log("Production GitOps deployment is already current.");
    return false;
  }
  if (diff.status !== 1) {
    throw new Error(`git diff failed with status ${diff.status}.`);
  }

  git(["commit", "-m", `Deploy txtwrite production ${shortSha}`]);
  git(["push", "origin", `HEAD:${gitopsBranch}`]);
  return true;
}

const authUrl = requiredEnv("PROD_VITE_NEON_AUTH_URL");
const dataApiUrl = requiredEnv("PROD_VITE_NEON_DATA_API_URL");
const imageRepository = process.env.PRODUCTION_IMAGE_REPOSITORY ||
  production.imageRepository ||
  gitops.imageRepository ||
  "registry.k6nis.dev/txtwrite/neon";
const imageTag = process.env.PRODUCTION_IMAGE_TAG || production.imageTag || "latest";
const imagePlatform = process.env.PRODUCTION_IMAGE_PLATFORM ||
  production.imagePlatform ||
  gitops.imagePlatform ||
  "linux/amd64";
const registryHost = imageRepository.split("/")[0];
const mergeSha = (
  process.env.PR_MERGE_SHA ||
  process.env.GITHUB_SHA ||
  runQuiet("git", ["rev-parse", "HEAD"])
).trim();
const shortSha = mergeSha.slice(0, 7);
const image = `${imageRepository}:${imageTag}`;
const traceImage = `${imageRepository}:sha-${shortSha}`;
const gitopsPath = gitops.checkoutPath || ".agent/runtime/gitops";
const gitopsBranch = process.env.GITOPS_PRODUCTION_BRANCH ||
  production.gitopsBranch ||
  gitops.baseBranch ||
  "main";
const deploymentPath = production.deploymentPath ||
  "k8s-cluster-configuration/applications/md/base/deployment.yml";
const productionUrl = production.url || process.env.PRODUCTION_URL || "https://md.k6nis.dev";

dockerLogin();
run("docker", [
  "buildx",
  "build",
  "--platform",
  imagePlatform,
  "--build-arg",
  `VITE_NEON_AUTH_URL=${authUrl}`,
  "--build-arg",
  `VITE_NEON_DATA_API_URL=${dataApiUrl}`,
  "-t",
  image,
  "-t",
  traceImage,
  "--push",
  "."
]);

checkoutGitopsBranch();
await updateGitopsDeployment();
const changed = commitGitopsChanges();
const gitopsCommit = runQuiet("git", ["rev-parse", "--short", "HEAD"], {
  cwd: gitopsPath
});

if (production.urlFile) {
  await mkdir(dirname(production.urlFile), { recursive: true });
  await writeFile(production.urlFile, `${productionUrl}\n`);
}

setOutput("image", image);
setOutput("trace_image", traceImage);
setOutput("gitops_commit", gitopsCommit);
setOutput("gitops_changed", changed ? "true" : "false");
setOutput("production_url", productionUrl);
console.log(`Production image: ${image}`);
console.log(`Trace image: ${traceImage}`);
console.log(`GitOps commit: ${gitopsCommit}`);
