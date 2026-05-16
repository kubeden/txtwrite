import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

export async function readTextIfExists(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}

function truncate(value, maxLength = 180) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}...`;
}

function redact(text) {
  return String(text || "")
    .replace(/DATABASE_URL=\S+/g, "DATABASE_URL=[redacted]")
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted database url]")
    .replace(/\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi, "references #$1");
}

export function bulletize(text, fallback, maxItems = 5) {
  const lines = redact(text)
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^#{1,6}\s+/, "")
        .replace(/^[-*]\s+/, "")
        .replace(/^\d+\.\s+/, "")
        .trim()
    )
    .filter(Boolean)
    .filter((line) => !line.startsWith("```"))
    .filter((line) => !/^(summary|tests?|changes?|what changed|verification)$/i.test(line));

  const unique = [];
  for (const line of lines) {
    const item = truncate(line);
    if (item && !unique.includes(item)) unique.push(item);
    if (unique.length >= maxItems) break;
  }

  const bullets = unique.length ? unique : [fallback];
  return bullets.map((line) => `- ${line}`);
}

export async function codexSummary(path = ".agent/runtime/codex-final.md") {
  const text = await readTextIfExists(path);
  return bulletize(text, "Implemented the requested issue changes.");
}

export function changedFilesSummary(maxItems = 8) {
  let output = "";
  try {
    output = execFileSync("git", ["show", "--name-status", "--format=", "HEAD"], {
      encoding: "utf8"
    });
  } catch {
    return ["- Changed files were not available from git."];
  }

  const labels = {
    A: "Added",
    C: "Copied",
    D: "Deleted",
    M: "Modified",
    R: "Renamed",
    T: "Changed type",
    U: "Updated",
    X: "Changed"
  };

  const files = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [status, ...paths] = line.split(/\t+/);
      const path = paths.at(-1);
      if (!path) return "";
      return `- ${labels[status[0]] || "Changed"}: \`${path}\``;
    })
    .filter(Boolean);

  if (!files.length) return ["- No committed file list was available."];
  return files.slice(0, maxItems);
}

export function configuredCheckSummary(commands = {}) {
  const checks = ["migrate", "lint", "test", "build"]
    .map((name) => [name, commands[name]])
    .filter(([, command]) => command)
    .map(([name, command]) => `- ${name}: \`${command}\``);

  return checks.length ? checks : ["- No checks were configured."];
}

export function sourceIssueNumberFromText(text) {
  const patterns = [
    /Related issue:\s*#(\d+)/i,
    /Source issue:\s*#(\d+)/i,
    /Implements\s+#(\d+)/i,
    /Addresses\s+#(\d+)/i
  ];

  for (const pattern of patterns) {
    const match = String(text || "").match(pattern);
    if (match) return Number(match[1]);
  }

  return 0;
}

export function extractSummaryFromPullBody(body) {
  const text = String(body || "");
  const match = text.match(/## Summary\s+([\s\S]*?)(?:\n##\s+|$)/i);
  if (!match) return ["- See the PR description for the change summary."];
  return bulletize(match[1], "See the PR description for the change summary.");
}

export function cleanupLine({ deleted, branchName, reason }) {
  if (deleted === "true") {
    return branchName
      ? `Preview cleanup: deleted Neon branch \`${branchName}\` and removed the GitOps preview manifests.`
      : "Preview cleanup: deleted the Neon preview branch and removed the GitOps preview manifests.";
  }

  return reason
    ? `Preview cleanup: removed the GitOps preview manifests. Neon branch cleanup reported: ${reason}`
    : "Preview cleanup: removed the GitOps preview manifests.";
}
