"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  RotateCcw,
  X,
} from "lucide-react";
import type { DocumentVersion } from "../../types/documents.ts";

interface VersionHistoryProps {
  documentId: string | null;
  currentVersion: number;
  getVersions: (documentId: string) => DocumentVersion[];
  restoreVersion: (versionId: string) => boolean | void;
  onClose?: () => void;
}

export default function VersionHistory({
  documentId,
  currentVersion,
  getVersions,
  restoreVersion,
  onClose,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmingVersion, setConfirmingVersion] = useState<
    DocumentVersion | null
  >(null);

  useEffect(() => {
    if (documentId) {
      setIsLoading(true);
      try {
        const docVersions = getVersions(documentId);
        setVersions(docVersions);
      } catch (error) {
        console.error("Error loading versions:", error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [documentId, getVersions]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(date);
  };

  const handleRestore = (version: DocumentVersion) => {
    // Set the version we're confirming
    setConfirmingVersion(version);
  };

  const confirmRestore = (version: DocumentVersion) => {
    // Actually restore the version
    restoreVersion(version.id);
    setConfirmingVersion(null);
    if (onClose) onClose();
  };

  const cancelRestore = () => {
    setConfirmingVersion(null);
  };

  const groupVersionsByDay = () => {
    const groups: Record<string, DocumentVersion[]> = {};

    versions.forEach((version) => {
      const date = new Date(version.timestamp);
      const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        .toISOString();

      if (!groups[day]) {
        groups[day] = [];
      }

      groups[day].push(version);
    });

    return Object.entries(groups).map(([day, dayVersions]) => ({
      day,
      date: new Date(day),
      versions: dayVersions.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
    })).sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const versionGroups = groupVersionsByDay();

  const formatDay = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
    }
  };

  const toggleExpandVersion = (version: DocumentVersion) => {
    if (expandedVersion === version.id) {
      setExpandedVersion(null);
    } else {
      setExpandedVersion(version.id);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <h2 className="text-lg font-medium text-neutral-800 dark:text-neutral-300 flex items-center">
          <Clock className="h-4 w-4 mr-2" /> Version History
        </h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            ×
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading
          ? (
            <div className="p-6 text-center text-neutral-600 dark:text-neutral-400">
              Loading version history...
            </div>
          )
          : versions.length === 0
          ? (
            <div className="p-6 text-center text-neutral-600 dark:text-neutral-400">
              No version history found for this document.
              <div className="mt-2 text-sm">
                Save a new version with Cmd+S / Ctrl+S or click the save button.
              </div>
            </div>
          )
          : (
            <div className="p-4">
              {versionGroups.map((group) => (
                <div key={group.day} className="mb-6">
                  <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-3">
                    {formatDay(group.day)}
                  </h3>
                  <ul className="space-y-2">
                    {group.versions.map((version) => (
                      <li
                        key={version.id}
                        className="border border-neutral-200 dark:border-neutral-800 rounded-md overflow-hidden"
                      >
                        {/* Confirmation UI that appears when restore is clicked */}
                        {confirmingVersion &&
                          confirmingVersion.id === version.id && (
                          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <div className="font-medium text-amber-800 dark:text-amber-300 text-sm">
                                  Restore version {version.version}?
                                </div>
                                <div className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                                  This will replace your current document
                                  content.
                                </div>
                                <div className="flex gap-2 mt-2">
                                  <button
                                    type="button"
                                    onClick={() => confirmRestore(version)}
                                    className="px-2 py-1 text-xs rounded bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1"
                                  >
                                    <Check size={12} /> Restore
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelRestore}
                                    className="px-2 py-1 text-xs rounded bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-300 flex items-center gap-1"
                                  >
                                    <X size={12} /> Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div
                          className="p-3 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800"
                          onClick={() => toggleExpandVersion(version)}
                        >
                          <div>
                            <div className="font-medium text-neutral-800 dark:text-neutral-300">
                              Version {version.version}
                              {version.version === currentVersion && (
                                <span className="ml-2 text-xs font-normal text-blue-500">
                                  Current
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                              {formatDate(version.timestamp)}
                            </div>
                          </div>
                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestore(version);
                              }}
                              className="mr-3 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                              title="Restore this version"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                            {expandedVersion === version.id
                              ? (
                                <ChevronDown className="h-4 w-4 text-neutral-400" />
                              )
                              : (
                                <ChevronRight className="h-4 w-4 text-neutral-400" />
                              )}
                          </div>
                        </div>

                        {expandedVersion === version.id && (
                          <div className="border-t border-neutral-200 dark:border-neutral-800 p-3 bg-neutral-50 dark:bg-neutral-800">
                            <div className="text-sm mb-2 font-medium text-neutral-700 dark:text-neutral-300">
                              Title: {version.title}
                            </div>
                            <div className="text-xs font-mono bg-white dark:bg-neutral-900 p-2 rounded border border-neutral-200 dark:border-neutral-700 max-h-32 overflow-y-auto whitespace-pre-wrap">
                              {version.content.substring(0, 300)}
                              {version.content.length > 300 && "..."}
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
      </div>

      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-sm text-neutral-500 dark:text-neutral-400">
        Save new versions with Cmd+S / Ctrl+S or the save button
      </div>
    </div>
  );
}
