"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  X,
} from "lucide-react";
import type { DocumentVersion } from "../../types/documents.ts";

interface DocumentVersionsProps {
  documentId: string | null;
  currentVersion: number;
  getVersions: (documentId: string) => DocumentVersion[];
  restoreVersion: (versionId: string) => boolean | void;
}

export default function DocumentVersions({
  documentId,
  currentVersion,
  getVersions,
  restoreVersion,
}: DocumentVersionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [confirmingVersion, setConfirmingVersion] = useState<
    DocumentVersion | null
  >(null);

  useEffect(() => {
    if (documentId && isOpen) {
      const docVersions = getVersions(documentId);
      setVersions(docVersions);
    }
  }, [documentId, isOpen, getVersions]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(date);
  };

  const handleRestore = (version: DocumentVersion) => {
    setConfirmingVersion(version);
  };

  const confirmRestore = (version: DocumentVersion) => {
    restoreVersion(version.id);
    setConfirmingVersion(null);
    setIsOpen(false);
  };

  const cancelRestore = () => {
    setConfirmingVersion(null);
  };

  if (!documentId) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 text-sm text-neutral-400 dark:text-neutral-600 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded"
      >
        v{currentVersion}
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-neutral-900 shadow-lg rounded-md border border-neutral-200 dark:border-neutral-800 z-20">
          <div className="p-2 border-b border-neutral-200 dark:border-neutral-800">
            <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-300">
              Document History
            </h3>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {versions.length === 0
              ? (
                <div className="p-3 text-sm text-neutral-500 dark:text-neutral-500 text-center">
                  No saved versions yet
                </div>
              )
              : (
                <ul className="py-1">
                  {versions.map((version) => (
                    <li
                      key={version.id}
                      className="px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm relative"
                    >
                      {confirmingVersion && confirmingVersion.id === version.id
                        ? (
                          <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded border border-amber-200 dark:border-amber-800">
                            <div className="flex items-start gap-1.5">
                              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                              <div>
                                <div className="font-medium text-amber-800 dark:text-amber-300 text-xs">
                                  Restore version {version.version}?
                                </div>
                                <div className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                                  This will replace current content.
                                </div>
                                <div className="flex gap-1 mt-1.5">
                                  <button
                                    type="button"
                                    onClick={() => confirmRestore(version)}
                                    className="px-2 py-0.5 text-xs rounded bg-amber-600 hover:bg-amber-700 text-white flex items-center"
                                  >
                                    <Check size={10} className="mr-1" />
                                    Restore
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelRestore}
                                    className="px-2 py-0.5 text-xs rounded bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-300 flex items-center"
                                  >
                                    <X size={10} className="mr-1" />
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                        : (
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-neutral-700 dark:text-neutral-400">
                                Version {version.version}
                              </div>
                              <div className="text-xs text-neutral-500">
                                {formatDate(version.timestamp)}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRestore(version)}
                              className="p-1 text-neutral-700 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300"
                              title="Restore this version"
                            >
                              <RotateCcw size={14} />
                            </button>
                          </div>
                        )}
                    </li>
                  ))}
                </ul>
              )}
          </div>

          <div className="p-2 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-600">
            Save a new version with Cmd+S / Ctrl+S
          </div>
        </div>
      )}
    </div>
  );
}
