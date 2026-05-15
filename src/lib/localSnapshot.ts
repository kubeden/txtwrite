import type {
  DocumentRecord,
  DocumentTab,
  DocumentVersion,
  FileSystemItem,
} from "../types/documents.ts";

export const STORAGE_KEYS = {
  documents: "documents",
  versions: "document_versions",
  fileSystem: "txtwFileSystem",
  documentTabs: "documentTabs",
  activeDocument: "lastActiveDocument",
} as const;

const PREFERENCE_KEYS = [
  "theme",
  "previewVisible",
  "toolbarCollapsed",
  "lastCursorPosition",
] as const;

export const AUTH_STORAGE_KEYS = {
  currentUserId: "txtwriteCloudCurrentUserId",
} as const;

const SNAPSHOT_STORAGE_KEYS = [
  STORAGE_KEYS.documents,
  STORAGE_KEYS.versions,
  STORAGE_KEYS.fileSystem,
  STORAGE_KEYS.documentTabs,
  STORAGE_KEYS.activeDocument,
] as const;

export type VersionStore = Record<string, DocumentVersion[]>;

export type WorkspacePreferences = Record<string, string>;

export interface LocalSnapshot {
  documents: DocumentRecord[];
  versions: VersionStore;
  fileSystem: FileSystemItem[];
  documentTabs: DocumentTab[];
  activeDocumentId: string | null;
  preferences: WorkspacePreferences;
}

const defaultDocumentContent =
  "# New Document\n\nStart typing here...\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n";

const parseJSON = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error("Failed to parse stored TXTWrite state", error);
    return fallback;
  }
};

export const createDefaultSnapshot = (): LocalSnapshot => {
  const now = new Date().toISOString();
  const documentId = crypto.randomUUID();
  const document: DocumentRecord = {
    id: documentId,
    user_id: "current-user",
    uuid: crypto.randomUUID(),
    title: "New Document",
    content: defaultDocumentContent,
    version: 1,
    is_published: false,
    created_at: now,
    updated_at: now,
    last_synced_at: now,
    metadata: {},
    folder_id: "folder-1",
    sort_order: 0,
  };

  return {
    documents: [document],
    versions: {},
    fileSystem: [
      {
        id: "folder-1",
        name: "My Documents",
        type: "folder",
        children: [
          {
            id: documentId,
            name: "New Document.md",
            type: "markdown",
            documentRef: documentId,
          },
        ],
      },
    ],
    documentTabs: [{ id: documentId, title: document.title }],
    activeDocumentId: documentId,
    preferences: {},
  };
};

const readPreferences = (): WorkspacePreferences => {
  return PREFERENCE_KEYS.reduce<WorkspacePreferences>((preferences, key) => {
    const value = localStorage.getItem(key);
    if (value !== null) {
      preferences[key] = value;
    }
    return preferences;
  }, {});
};

const writePreferences = (preferences: WorkspacePreferences) => {
  for (const key of PREFERENCE_KEYS) {
    const value = preferences[key];
    if (value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  }
};

export const readLocalSnapshot = (): LocalSnapshot => {
  const documents = parseJSON<DocumentRecord[]>(
    localStorage.getItem(STORAGE_KEYS.documents),
    [],
  );

  const documentTabs = parseJSON<DocumentTab[]>(
    localStorage.getItem(STORAGE_KEYS.documentTabs),
    documents[0] ? [{ id: documents[0].id, title: documents[0].title }] : [],
  ).filter((tab) => documents.some((document) => document.id === tab.id));

  const activeDocumentId = localStorage.getItem(STORAGE_KEYS.activeDocument) ??
    documentTabs[0]?.id ??
    documents[0]?.id ??
    null;

  return {
    documents,
    versions: parseJSON<VersionStore>(
      localStorage.getItem(STORAGE_KEYS.versions),
      {},
    ),
    fileSystem: parseJSON<FileSystemItem[]>(
      localStorage.getItem(STORAGE_KEYS.fileSystem),
      [],
    ),
    documentTabs,
    activeDocumentId,
    preferences: readPreferences(),
  };
};

export const writeLocalSnapshot = (snapshot: LocalSnapshot) => {
  localStorage.setItem(
    STORAGE_KEYS.documents,
    JSON.stringify(snapshot.documents),
  );
  localStorage.setItem(
    STORAGE_KEYS.versions,
    JSON.stringify(snapshot.versions),
  );
  localStorage.setItem(
    STORAGE_KEYS.fileSystem,
    JSON.stringify(snapshot.fileSystem),
  );
  localStorage.setItem(
    STORAGE_KEYS.documentTabs,
    JSON.stringify(snapshot.documentTabs),
  );

  if (snapshot.activeDocumentId) {
    localStorage.setItem(
      STORAGE_KEYS.activeDocument,
      snapshot.activeDocumentId,
    );
  } else {
    localStorage.removeItem(STORAGE_KEYS.activeDocument);
  }

  writePreferences(snapshot.preferences);
};

export const clearLocalSnapshot = () => {
  for (const key of SNAPSHOT_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }

  for (const key of PREFERENCE_KEYS) {
    localStorage.removeItem(key);
  }
};

export const hasLocalDocuments = () => readLocalSnapshot().documents.length > 0;
