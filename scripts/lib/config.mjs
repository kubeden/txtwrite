import { readJson } from "./files.mjs";

const DEFAULT_CONFIG = {
  baseBranch: "main",
  allowedAuthorAssociations: ["OWNER", "MEMBER", "COLLABORATOR"],
  labels: {
    agentPr: "agent",
    preview: "preview"
  },
  commands: {},
  preview: {
    enabled: false,
    deployCommand: "",
    urlFile: ".agent/runtime/preview-url.txt"
  },
  neon: {
    databaseName: "neondb",
    roleName: "neondb_owner",
    pooled: true,
    ttlHours: 48,
    deleteOnPrClose: true,
    publicUrls: {
      auth: false,
      dataApi: false,
      required: false,
      provisionAuth: false,
      provisionDataApi: false,
      authProvider: "",
      dataApiAuthProvider: "neon_auth"
    }
  }
};

export async function loadConfig() {
  const config = await readJson("agent.config.json", {});
  return {
    ...DEFAULT_CONFIG,
    ...config,
    labels: { ...DEFAULT_CONFIG.labels, ...(config.labels ?? {}) },
    commands: { ...DEFAULT_CONFIG.commands, ...(config.commands ?? {}) },
    preview: { ...DEFAULT_CONFIG.preview, ...(config.preview ?? {}) },
    neon: {
      ...DEFAULT_CONFIG.neon,
      ...(config.neon ?? {}),
      publicUrls: {
        ...DEFAULT_CONFIG.neon.publicUrls,
        ...(config.neon?.publicUrls ?? {})
      }
    }
  };
}
