#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { loadConfig } from "./lib/config.mjs";

const config = await loadConfig();

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

async function checkUrl(url) {
  try {
    const response = await fetch(url, { redirect: "follow" });
    return {
      ok: response.ok,
      status: response.status,
      detail: `${response.status} ${response.statusText}`.trim()
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      detail: error.message
    };
  }
}

const timeoutSeconds = secondsFromEnv("PREVIEW_WAIT_TIMEOUT_SECONDS", 600);
const intervalSeconds = secondsFromEnv("PREVIEW_WAIT_INTERVAL_SECONDS", 10);
const previewUrl = (process.env.PREVIEW_URL ||
  (await readFile(config.preview.urlFile, "utf8"))).trim();

if (!previewUrl) {
  throw new Error(`No preview URL found in ${config.preview.urlFile}.`);
}

const deadline = Date.now() + timeoutSeconds * 1000;
let attempt = 0;
let lastDetail = "";

console.log(`Waiting up to ${timeoutSeconds}s for ${previewUrl}`);

while (Date.now() <= deadline) {
  attempt += 1;
  const result = await checkUrl(previewUrl);
  lastDetail = result.detail;

  if (result.ok) {
    console.log(`Preview URL is reachable after ${attempt} attempt(s): ${lastDetail}`);
    process.exit(0);
  }

  console.log(`Preview URL is not ready yet: ${lastDetail}`);
  await sleep(intervalSeconds * 1000);
}

throw new Error(`Preview URL did not become reachable within ${timeoutSeconds}s. Last result: ${lastDetail}`);
