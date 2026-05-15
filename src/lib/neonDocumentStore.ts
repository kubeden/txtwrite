import { client } from "./auth.ts";
import { type LocalSnapshot, type VersionStore } from "./localSnapshot.ts";
import type { Database, Json } from "../types/database.ts";
import type { DocumentRecord, DocumentVersion } from "../types/documents.ts";

type Tables = Database["public"]["Tables"];
type DocumentRow = Tables["documents"]["Row"];
type DocumentInsert = Tables["documents"]["Insert"];
type VersionRow = Tables["document_versions"]["Row"];
type VersionInsert = Tables["document_versions"]["Insert"];
type WorkspaceRow = Tables["user_workspace_state"]["Row"];
type WorkspaceInsert = Tables["user_workspace_state"]["Insert"];
type QueryResult<T> = { data: T | null; error: unknown };

const asRecord = (value: Json): Record<string, unknown> => {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
};

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return String(error);
};

const assertOk = (
  result: QueryResult<unknown>,
  action: string,
): void => {
  if (result.error) {
    throw new Error(`${action}: ${toErrorMessage(result.error)}`);
  }
};

const assertRows = <T>(
  result: QueryResult<T[]>,
  action: string,
): T[] => {
  assertOk(result, action);
  return result.data ?? [];
};

const documentFromRow = (row: DocumentRow): DocumentRecord => ({
  id: row.id,
  user_id: row.user_id,
  uuid: row.uuid,
  title: row.title,
  content: row.content,
  version: row.version,
  is_published: row.is_published,
  created_at: row.created_at,
  updated_at: row.updated_at,
  last_synced_at: row.last_synced_at,
  metadata: asRecord(row.metadata),
  folder_id: row.folder_id ?? "root",
  sort_order: row.sort_order,
});

const documentToInsert = (
  document: DocumentRecord,
  sortOrder: number,
): DocumentInsert => ({
  id: document.id,
  uuid: document.uuid,
  title: document.title,
  content: document.content,
  version: document.version,
  is_published: document.is_published,
  metadata: document.metadata as Json,
  folder_id: document.folder_id ?? "root",
  sort_order: document.sort_order ?? sortOrder,
  created_at: document.created_at,
  updated_at: document.updated_at,
  last_synced_at: new Date().toISOString(),
});

const versionFromRow = (row: VersionRow): [string, DocumentVersion] => [
  row.document_id,
  {
    id: row.id,
    version: row.version,
    title: row.title,
    content: row.content,
    timestamp: row.created_at,
  },
];

const versionToInsert = (
  documentId: string,
  version: DocumentVersion,
): VersionInsert => ({
  id: version.id,
  document_id: documentId,
  version: version.version,
  title: version.title,
  content: version.content,
  created_at: version.timestamp,
});

const groupVersions = (rows: VersionRow[]): VersionStore => {
  const grouped: VersionStore = {};

  for (const row of rows) {
    const [documentId, version] = versionFromRow(row);
    grouped[documentId] = [...(grouped[documentId] ?? []), version];
  }

  return grouped;
};

const flattenVersions = (versions: VersionStore): VersionInsert[] => {
  return Object.entries(versions).flatMap(([documentId, documentVersions]) =>
    documentVersions.map((version) => versionToInsert(documentId, version))
  );
};

export const loadCloudSnapshot = async (): Promise<LocalSnapshot> => {
  const documentsResult = await client
    .from("documents")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: true });
  const documentRows = assertRows<DocumentRow>(
    documentsResult as QueryResult<DocumentRow[]>,
    "Load documents",
  );

  if (documentRows.length === 0) {
    return {
      documents: [],
      versions: {},
      fileSystem: [],
      documentTabs: [],
      activeDocumentId: null,
      preferences: {},
    };
  }

  const versionsResult = await client
    .from("document_versions")
    .select("*")
    .order("created_at", { ascending: true });
  const versionRows = assertRows<VersionRow>(
    versionsResult as QueryResult<VersionRow[]>,
    "Load document versions",
  );

  const workspaceResult = await client
    .from("user_workspace_state")
    .select("*")
    .limit(1);
  const workspaceRows = assertRows<WorkspaceRow>(
    workspaceResult as QueryResult<WorkspaceRow[]>,
    "Load workspace state",
  );
  const workspace = workspaceRows[0];
  const documents = documentRows.map(documentFromRow);
  const firstDocument = documents[0];
  const documentTabs = Array.isArray(workspace?.document_tabs)
    ? workspace.document_tabs as unknown as LocalSnapshot["documentTabs"]
    : [{ id: firstDocument.id, title: firstDocument.title }];

  return {
    documents,
    versions: groupVersions(versionRows),
    fileSystem: Array.isArray(workspace?.file_system)
      ? workspace.file_system as unknown as LocalSnapshot["fileSystem"]
      : [],
    documentTabs: documentTabs.filter((tab) =>
      documents.some((document) => document.id === tab.id)
    ),
    activeDocumentId: workspace?.active_document_id ?? firstDocument.id,
    preferences: asRecord(workspace?.preferences ?? {}) as Record<
      string,
      string
    >,
  };
};

export const saveSnapshotToCloud = async (snapshot: LocalSnapshot) => {
  const existingDocumentsResult = await client.from("documents").select("id");
  const existingDocumentRows = assertRows<Pick<DocumentRow, "id">>(
    existingDocumentsResult as QueryResult<Pick<DocumentRow, "id">[]>,
    "Read existing documents",
  );
  const documentIds = new Set(
    snapshot.documents.map((document) => document.id),
  );
  const deletedDocumentIds = existingDocumentRows
    .map((row) => row.id)
    .filter((id) => !documentIds.has(id));

  if (deletedDocumentIds.length > 0) {
    assertOk(
      await client.from("documents").delete().in(
        "id",
        deletedDocumentIds,
      ) as QueryResult<unknown>,
      "Delete removed documents",
    );
  }

  if (snapshot.documents.length > 0) {
    const documents = snapshot.documents.map(documentToInsert);
    assertOk(
      await client.from("documents").upsert(documents, {
        onConflict: "id",
      }) as QueryResult<unknown>,
      "Save documents",
    );
  }

  const versionRows = flattenVersions(snapshot.versions);
  const existingVersionsResult = await client
    .from("document_versions")
    .select("id");
  const existingVersionRows = assertRows<Pick<VersionRow, "id">>(
    existingVersionsResult as QueryResult<Pick<VersionRow, "id">[]>,
    "Read existing document versions",
  );
  const versionIds = new Set(versionRows.map((row) => row.id));
  const deletedVersionIds = existingVersionRows
    .map((row) => row.id)
    .filter((id) => !versionIds.has(id));

  if (deletedVersionIds.length > 0) {
    assertOk(
      await client.from("document_versions").delete().in(
        "id",
        deletedVersionIds,
      ) as QueryResult<unknown>,
      "Delete removed document versions",
    );
  }

  if (versionRows.length > 0) {
    assertOk(
      await client.from("document_versions").upsert(versionRows, {
        onConflict: "id",
      }) as QueryResult<unknown>,
      "Save document versions",
    );
  }

  const workspace: WorkspaceInsert = {
    file_system: snapshot.fileSystem as unknown as Json,
    document_tabs: snapshot.documentTabs as unknown as Json,
    active_document_id: snapshot.activeDocumentId,
    preferences: snapshot.preferences as unknown as Json,
    updated_at: new Date().toISOString(),
  };

  assertOk(
    await client.from("user_workspace_state").upsert(workspace, {
      onConflict: "user_id",
    }) as QueryResult<unknown>,
    "Save workspace state",
  );
};
