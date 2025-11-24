export interface DocumentRecord {
  id: string;
  user_id: string;
  uuid: string;
  title: string;
  content: string;
  version: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  last_synced_at: string;
  metadata: Record<string, unknown>;
  folder_id: string;
}

export interface DocumentTab {
  id: string;
  title: string;
}

export interface DocumentVersion {
  id: string;
  version: number;
  title: string;
  content: string;
  timestamp: string;
}

export interface RestoredDocumentPayload {
  title: string;
  content: string;
  version: number;
  restored_from: string;
  restored_at: string;
}
