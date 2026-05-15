export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string;
          user_id: string;
          uuid: string;
          title: string;
          content: string;
          version: number;
          is_published: boolean;
          metadata: Json;
          folder_id: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
          last_synced_at: string;
        };
        Insert: {
          id?: string;
          uuid?: string;
          title?: string;
          content?: string;
          version?: number;
          is_published?: boolean;
          metadata?: Json;
          folder_id?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          last_synced_at?: string;
        };
        Update: {
          uuid?: string;
          title?: string;
          content?: string;
          version?: number;
          is_published?: boolean;
          metadata?: Json;
          folder_id?: string | null;
          sort_order?: number;
          updated_at?: string;
          last_synced_at?: string;
        };
        Relationships: [];
      };
      document_versions: {
        Row: {
          id: string;
          document_id: string;
          user_id: string;
          version: number;
          title: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          version: number;
          title: string;
          content: string;
          created_at?: string;
        };
        Update: {
          version?: number;
          title?: string;
          content?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      user_workspace_state: {
        Row: {
          user_id: string;
          file_system: Json;
          document_tabs: Json;
          active_document_id: string | null;
          preferences: Json;
          updated_at: string;
        };
        Insert: {
          file_system?: Json;
          document_tabs?: Json;
          active_document_id?: string | null;
          preferences?: Json;
          updated_at?: string;
        };
        Update: {
          file_system?: Json;
          document_tabs?: Json;
          active_document_id?: string | null;
          preferences?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
