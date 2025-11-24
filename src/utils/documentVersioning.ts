import type {
  DocumentRecord,
  DocumentVersion,
  RestoredDocumentPayload,
} from "../types/documents.ts";

type VersionStore = Record<string, DocumentVersion[]>;

const VERSION_STORAGE_KEY = "document_versions";

export const saveDocumentVersion = (
  document: DocumentRecord,
): DocumentRecord => {
  if (!document?.id) {
    console.error("Invalid document provided to saveDocumentVersion");
    return document;
  }

  try {
    const versionsString = localStorage.getItem(VERSION_STORAGE_KEY);
    const versions: VersionStore = versionsString
      ? JSON.parse(versionsString)
      : {};

    if (!versions[document.id]) {
      versions[document.id] = [];
    }

    const versionId = `${Date.now()}-${
      Math.random().toString(36).substring(2, 9)
    }`;

    const newVersion: DocumentVersion = {
      id: versionId,
      version: document.version,
      title: document.title,
      content: document.content,
      timestamp: new Date().toISOString(),
    };

    versions[document.id].push(newVersion);
    localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(versions));

    return {
      ...document,
      version: document.version + 1,
      updated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error saving document version:", error);
    return document;
  }
};

export const getDocumentVersions = (
  documentId?: string | null,
): DocumentVersion[] => {
  if (!documentId) return [];

  try {
    const versionsString = localStorage.getItem(VERSION_STORAGE_KEY);
    if (!versionsString) return [];

    const versions = JSON.parse(versionsString) as VersionStore;
    return versions[documentId] || [];
  } catch (error) {
    console.error("Error getting document versions:", error);
    return [];
  }
};

export const restoreDocumentVersion = (
  documentId: string,
  versionId: string,
): RestoredDocumentPayload | null => {
  if (!documentId || !versionId) return null;

  try {
    const allVersions = getDocumentVersions(documentId);
    const versionToRestore = allVersions.find((v) => v.id === versionId);

    if (!versionToRestore) return null;

    return {
      title: versionToRestore.title,
      content: versionToRestore.content,
      version: versionToRestore.version,
      restored_from: versionId,
      restored_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error restoring document version:", error);
    return null;
  }
};
