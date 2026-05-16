#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { loadConfig } from "./lib/config.mjs";
import { readJson } from "./lib/files.mjs";
import { fetchPullRequest } from "./lib/github.mjs";
import { sourceIssueNumberFromText } from "./lib/summaries.mjs";
import { statusList, updateAgentProgressComment } from "./lib/status-comment.mjs";

const config = await loadConfig();
const gitops = config.gitops ?? {};
const argocd = config.argocd ?? {};

function secondsFromEnv(name, fallback) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }
  return value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function truncate(value, maxLength = 220) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}...`;
}

async function checkUrl(url) {
  try {
    const response = await fetch(url, { redirect: "follow" });
    return {
      ok: response.ok,
      detail: `${response.status} ${response.statusText}`.trim()
    };
  } catch (error) {
    return {
      ok: false,
      detail: error.message
    };
  }
}

async function fetchArgoApplication({ server, token, appName, appNamespace }) {
  const url = new URL(`/api/v1/applications/${encodeURIComponent(appName)}`, server);
  if (appNamespace) url.searchParams.set("appNamespace", appNamespace);

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`
    }
  });

  const text = await response.text();
  if (response.status === 404) {
    return { exists: false, detail: "application has not been created yet" };
  }

  if (!response.ok) {
    const detail = (() => {
      try {
        return JSON.parse(text)?.message || text;
      } catch {
        return text;
      }
    })();
    const message = `Argo CD API ${response.status}: ${truncate(detail)}`;
    if (response.status === 401 || response.status === 403) throw new Error(message);
    return { exists: false, transient: true, detail: message };
  }

  return { exists: true, app: text ? JSON.parse(text) : {} };
}

const previewStages = [
  { stage: "gitopsPushed", label: "GitOps manifests pushed" },
  { stage: "appCreated", label: "Argo CD application created" },
  { stage: "appSynced", label: "Argo CD sync completed" },
  { stage: "appHealthy", label: "Argo CD reports healthy" },
  { stage: "urlReady", label: "Preview URL is reachable" }
];

const prNumber = Number(process.env.PR_NUMBER || 0);
if (!prNumber) throw new Error("PR_NUMBER is required.");

const appPrefix = gitops.appPrefix || "md-pr";
const appName = `${appPrefix}-${prNumber}`;
const appNamespace = process.env.ARGOCD_APPLICATION_NAMESPACE ||
  argocd.applicationNamespace ||
  "argocd";
const argoServer = (process.env.ARGOCD_SERVER || argocd.server || "").replace(/\/+$/, "");
const argoToken = process.env.ARGOCD_AUTH_TOKEN || "";
const timeoutSeconds = secondsFromEnv("PREVIEW_WAIT_TIMEOUT_SECONDS", 600);
const argoIntervalSeconds = secondsFromEnv("PREVIEW_WAIT_INTERVAL_SECONDS", 5);
const urlTimeoutSeconds = secondsFromEnv(
  "PREVIEW_URL_WAIT_TIMEOUT_SECONDS",
  argoToken ? 300 : timeoutSeconds
);
const urlIntervalSeconds = secondsFromEnv("PREVIEW_URL_WAIT_INTERVAL_SECONDS", 5);
const previewUrl = (process.env.PREVIEW_URL ||
  (await readFile(config.preview.urlFile, "utf8"))).trim();
const neon = await readJson(".agent/runtime/neon.json", { enabled: false });

if (!previewUrl) throw new Error(`No preview URL found in ${config.preview.urlFile}.`);

let sourceIssueNumber = 0;
let pull = null;
const canUpdateProgress = Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY);
try {
  if (canUpdateProgress) {
    pull = await fetchPullRequest(prNumber);
    sourceIssueNumber = sourceIssueNumberFromText(pull.body);
  }
} catch (error) {
  console.warn(`Could not read pull request metadata: ${error.message}`);
}

async function updateProgress(stage, detailLines = []) {
  if (!canUpdateProgress) {
    console.log(`Progress update skipped because GITHUB_TOKEN or GITHUB_REPOSITORY is not set: ${stage}`);
    return;
  }

  const lines = [
    stage === "urlReady" ? "Status: preview URL is reachable" : "Status: waiting for preview environment",
    "",
    ...statusList(previewStages, stage),
    "",
    `Argo CD app: \`${appName}\` in \`${appNamespace}\`.`,
    `URL: ${previewUrl}`,
    neon.enabled ? `Neon branch: \`${neon.branchName}\`.` : "",
    "",
    ...detailLines
  ];

  await updateAgentProgressComment(prNumber, lines);
  if (sourceIssueNumber && sourceIssueNumber !== prNumber) {
    await updateAgentProgressComment(sourceIssueNumber, [
      stage === "urlReady" ? "Status: preview URL is reachable" : "Status: waiting for preview environment",
      "",
      ...statusList(previewStages, stage),
      "",
      `Preview for PR #${prNumber}: ${previewUrl}`,
      `Argo CD app: \`${appName}\`.`,
      pull?.html_url ? `PR: ${pull.html_url}` : "",
      "",
      ...detailLines
    ]);
  }
}

function stageForApplication(app) {
  const syncStatus = app?.status?.sync?.status || "Unknown";
  const healthStatus = app?.status?.health?.status || "Unknown";

  if (syncStatus === "Synced" && healthStatus === "Healthy") return "appHealthy";
  if (syncStatus === "Synced") return "appSynced";
  return "appCreated";
}

function appDetailLines(app) {
  const syncStatus = app?.status?.sync?.status || "Unknown";
  const healthStatus = app?.status?.health?.status || "Unknown";
  const operationPhase = app?.status?.operationState?.phase || "";
  const message = app?.status?.operationState?.message || "";
  return [
    `Argo CD sync: \`${syncStatus}\`.`,
    `Argo CD health: \`${healthStatus}\`.`,
    operationPhase ? `Operation: \`${operationPhase}\`.` : "",
    message ? `Message: ${truncate(message)}` : ""
  ];
}

const deadline = Date.now() + timeoutSeconds * 1000;
let lastStage = "";

console.log(`Waiting up to ${timeoutSeconds}s for preview app ${appName} and ${previewUrl}`);
await updateProgress("gitopsPushed", [
  "The preview manifests were pushed to the GitOps branch.",
  argoToken ? "Waiting for Argo CD to create and sync the preview app." : "ARGOCD_AUTH_TOKEN is not configured; falling back to URL-only polling."
]);

if (argoToken && argoServer) {
  while (Date.now() <= deadline) {
    const result = await fetchArgoApplication({
      server: argoServer,
      token: argoToken,
      appName,
      appNamespace
    });

    if (result.exists) {
      const stage = stageForApplication(result.app);
      const detailLines = appDetailLines(result.app);
      console.log(`${appName}: ${detailLines.filter(Boolean).join(" ")}`);
      if (stage !== lastStage) {
        await updateProgress(stage, detailLines);
        lastStage = stage;
      }
      if (stage === "appHealthy") break;
    } else if (result.transient) {
      console.log(`${appName}: ${result.detail}`);
      if (!lastStage) {
        await updateProgress("gitopsPushed", [result.detail]);
        lastStage = "gitopsPushed";
      }
    } else {
      console.log(`${appName}: ${result.detail}`);
      if (lastStage !== "gitopsPushed") {
        await updateProgress("gitopsPushed", [result.detail]);
        lastStage = "gitopsPushed";
      }
    }

    await sleep(argoIntervalSeconds * 1000);
  }

  if (lastStage !== "appHealthy") {
    throw new Error(`Argo CD app ${appName} did not become Synced and Healthy within ${timeoutSeconds}s.`);
  }
} else if (argoToken && !argoServer) {
  console.warn("ARGOCD_AUTH_TOKEN is configured, but ARGOCD_SERVER/config.argocd.server is empty.");
}

let lastUrlDetail = "";
const urlDeadline = Date.now() + urlTimeoutSeconds * 1000;
if (lastStage !== "urlWaiting") {
  await updateProgress(lastStage === "appHealthy" ? "appHealthy" : "gitopsPushed", [
    "Waiting for the public preview URL to pass its first HTTP check."
  ]);
}

while (Date.now() <= urlDeadline) {
  const result = await checkUrl(previewUrl);
  lastUrlDetail = result.detail;
  if (result.ok) {
    console.log(`Preview URL is reachable: ${lastUrlDetail}`);
    await updateProgress("urlReady", [`HTTP check: \`${lastUrlDetail}\`.`]);
    process.exit(0);
  }

  console.log(`Preview URL is not ready yet: ${lastUrlDetail}`);
  await sleep(urlIntervalSeconds * 1000);
}

throw new Error(`Preview URL did not become reachable within ${urlTimeoutSeconds}s. Last result: ${lastUrlDetail}`);
