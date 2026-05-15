#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
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

function runQuiet(command, args, options = {}) {
  return execFileSync(command, args, { encoding: "utf8", ...options }).trim();
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

function quote(value) {
  return JSON.stringify(String(value));
}

const prNumber = requiredEnv("PR_NUMBER");
const authUrl = requiredEnv("VITE_NEON_AUTH_URL");
const dataApiUrl = requiredEnv("VITE_NEON_DATA_API_URL");
const imageRepository = process.env.PREVIEW_IMAGE_REPOSITORY ||
  gitops.imageRepository ||
  "registry.k6nis.dev/txtwrite/neon";
const imagePlatform = process.env.PREVIEW_IMAGE_PLATFORM ||
  gitops.imagePlatform ||
  "linux/amd64";
const registryHost = imageRepository.split("/")[0];
const shortSha = (process.env.PR_HEAD_SHA || process.env.GITHUB_SHA || "local")
  .slice(0, 7);
const image = `${imageRepository}:pr-${prNumber}-${shortSha}`;
const appPrefix = gitops.appPrefix || "md-pr";
const appName = `${appPrefix}-${prNumber}`;
const host = `${appName}.${gitops.hostSuffix || "k6nis.dev"}`;
const previewUrl = `https://${host}`;
const gitopsPath = gitops.checkoutPath || ".agent/runtime/gitops";
const gitopsBranch = process.env.GITOPS_BRANCH || gitops.branch || "txtwrite-previews";
const gitopsBaseBranch = process.env.GITOPS_BASE_BRANCH || gitops.baseBranch || "main";
const previewRoot = gitops.previewRoot ||
  "k8s-cluster-configuration/applications/md/previews";
const relativePreviewDir = `${previewRoot}/${appName}`;
const previewDir = join(gitopsPath, relativePreviewDir);
const serviceName = `${appName}-service`;
const gatewayName = `${appName}-gateway`;
const tlsName = `${appName}-tls`;
const containerPort = Number(gitops.containerPort || 4173);
const servicePort = Number(gitops.servicePort || 80);
const gatewayClassName = gitops.gatewayClassName || "traefik";
const clusterIssuer = gitops.clusterIssuer || "letsencrypt-prod";

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
  git(["config", "user.name", "txtwrite-preview-bot"]);
  git(["config", "user.email", "txtwrite-preview-bot@users.noreply.github.com"]);

  if (tryGit(["fetch", "origin", gitopsBranch])) {
    git(["checkout", "-B", gitopsBranch, `origin/${gitopsBranch}`]);
    return;
  }

  git(["fetch", "origin", gitopsBaseBranch]);
  git(["checkout", "-B", gitopsBranch, `origin/${gitopsBaseBranch}`]);
}

async function writePreviewManifests() {
  await rm(previewDir, { recursive: true, force: true });
  await mkdir(previewDir, { recursive: true });

  await writeFile(
    join(previewDir, "kustomization.yml"),
    `apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yml
  - service.yml
  - gateway.yml
`
  );

  await writeFile(
    join(previewDir, "deployment.yml"),
    `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${appName}
  labels:
    app: ${appName}
    app.kubernetes.io/name: md
    app.kubernetes.io/instance: ${appName}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${appName}
  template:
    metadata:
      labels:
        app: ${appName}
        app.kubernetes.io/name: md
        app.kubernetes.io/instance: ${appName}
    spec:
      containers:
        - name: md
          image: ${image}
          imagePullPolicy: Always
          ports:
            - containerPort: ${containerPort}
`
  );

  await writeFile(
    join(previewDir, "service.yml"),
    `apiVersion: v1
kind: Service
metadata:
  name: ${serviceName}
  labels:
    app: ${appName}
    app.kubernetes.io/name: md
    app.kubernetes.io/instance: ${appName}
spec:
  selector:
    app: ${appName}
  ports:
    - protocol: TCP
      port: ${servicePort}
      targetPort: ${containerPort}
`
  );

  await writeFile(
    join(previewDir, "gateway.yml"),
    `---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: ${tlsName}
  namespace: ${appName}
spec:
  secretName: ${tlsName}
  issuerRef:
    name: ${clusterIssuer}
    kind: ClusterIssuer
  dnsNames:
    - ${quote(host)}
---
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: ${gatewayName}
  namespace: ${appName}
  annotations:
    external-dns.alpha.kubernetes.io/hostname: ${quote(host)}
    external-dns.alpha.kubernetes.io/cloudflare-proxied: "true"
spec:
  gatewayClassName: ${gatewayClassName}
  listeners:
    - name: https
      protocol: HTTPS
      port: 8443
      hostname: ${quote(host)}
      tls:
        mode: Terminate
        certificateRefs:
          - group: ''
            kind: Secret
            name: ${tlsName}
      allowedRoutes:
        namespaces:
          from: Same
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: ${appName}
  namespace: ${appName}
spec:
  parentRefs:
    - group: gateway.networking.k8s.io
      kind: Gateway
      name: ${gatewayName}
      namespace: ${appName}
  hostnames:
    - ${quote(host)}
  rules:
    - backendRefs:
        - group: ''
          kind: Service
          name: ${serviceName}
          port: ${servicePort}
          weight: 1
      matches:
        - path:
            type: PathPrefix
            value: /
`
  );
}

function commitGitopsChanges() {
  git(["add", relativePreviewDir]);

  const diff = spawnSync("git", ["diff", "--cached", "--quiet"], {
    cwd: gitopsPath
  });
  if (diff.status === 0) {
    console.log("GitOps preview manifests are already current.");
    return;
  }
  if (diff.status !== 1) {
    throw new Error(`git diff failed with status ${diff.status}.`);
  }

  git(["commit", "-m", `Deploy txtwrite preview for PR #${prNumber}`]);
  git(["push", "origin", `HEAD:${gitopsBranch}`]);
  console.log(runQuiet("git", ["rev-parse", "--short", "HEAD"], { cwd: gitopsPath }));
}

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
  "--push",
  "."
]);

checkoutGitopsBranch();
await writePreviewManifests();
commitGitopsChanges();

await mkdir(dirname(config.preview.urlFile), { recursive: true });
await writeFile(config.preview.urlFile, `${previewUrl}\n`);
console.log(`Preview URL: ${previewUrl}`);
