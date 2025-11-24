"use client";

import { useState } from "react";
import { History, Save } from "lucide-react";
import DocumentVersions from "./DocumentVersions.tsx";
import VersionHistoryModal from "../modals/VersionHistoryModal.tsx";
import type { DocumentRecord } from "../../types/documents.ts";

interface VersionControlsProps {
  document: DocumentRecord | null;
  getVersions: (documentId: string) => DocumentVersion[];
  restoreVersion: (versionId: string) => boolean | void;
}

import type { DocumentVersion } from "../../types/documents.ts";

export default function VersionControls({
  document,
  getVersions,
  restoreVersion,
}: VersionControlsProps) {
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  if (!document) return null;

  return (
    <>
      <div className="flex flex-row items-center gap-x-1">
        <DocumentVersions
          documentId={document.id}
          currentVersion={document.version}
          getVersions={getVersions}
          restoreVersion={restoreVersion}
        />
        <button
          type="button"
          onClick={() => setShowVersionHistory(true)}
          className="hover:bg-neutral-200 dark:hover:bg-neutral-800 p-1 rounded"
          title="View Version History"
        >
          <History className="w-4 text-neutral-400 dark:text-neutral-700 hover:text-neutral-500" />
        </button>
        <button
          type="button"
          onClick={() => {
            globalThis.dispatchEvent(new CustomEvent("save-document-version"));
          }}
          className="hover:bg-neutral-200 dark:hover:bg-neutral-800 p-1 rounded"
          title="Save new version (Cmd+S / Ctrl+S)"
        >
          <Save className="w-4 text-neutral-400 dark:text-neutral-700 hover:text-neutral-500" />
        </button>
      </div>

      {showVersionHistory && (
        <VersionHistoryModal
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          documentId={document.id}
          currentVersion={document.version}
          getVersions={getVersions}
          restoreVersion={restoreVersion}
        />
      )}
    </>
  );
}
