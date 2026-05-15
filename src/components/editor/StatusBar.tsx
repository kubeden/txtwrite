"use client";

import { useEffect, useState } from "react";
import { useCloud } from "../../contexts/useCloud.ts";

interface StatusBarProps {
  markdownText: string;
  editStatus: "editing" | "saved";
  documentCount: number;
  getLineAndColumn?: () => { line: number; column: number };
}

interface StatusBarViewProps {
  markdownText: string;
  documentCount: number;
  line: number;
  column: number;
  syncEnabled: boolean;
  syncError: string | null;
  syncLabel: string;
  syncDotClass: string;
}

function MobileStatusBar({
  markdownText,
  documentCount,
  line,
  column,
  syncEnabled,
  syncError,
  syncLabel,
  syncDotClass,
}: StatusBarViewProps) {
  return (
    <div className="w-full border-t border-neutral-200 bg-neutral-100 px-3 pb-[env(safe-area-inset-bottom)] text-xs text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-600">
      <div className="flex h-7 flex-row items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span>
            <span className="text-neutral-800 dark:text-neutral-500">
              {markdownText.split(/\s+/).filter(Boolean).length}
            </span>{" "}
            Words
          </span>
          <span className="hidden sm:inline">/</span>
          <span className="hidden sm:inline">
            <span className="text-neutral-800 dark:text-neutral-500">
              {documentCount}
            </span>{" "}
            Docs
          </span>
          <span className="hidden sm:inline">/</span>
          <span className="hidden sm:inline">
            LN{" "}
            <span className="text-neutral-800 dark:text-neutral-500">
              {line}
            </span>
          </span>
          <span className="hidden sm:inline">
            COL{" "}
            <span className="text-neutral-800 dark:text-neutral-500">
              {column}
            </span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className="max-w-28 truncate text-neutral-800 dark:text-neutral-500"
            title={syncError ?? syncLabel}
          >
            {syncEnabled ? syncLabel.replace(" to Neon", "") : syncLabel}
          </span>
          <span
            className={`h-1.5 w-1.5 rounded-full ${syncDotClass}`}
            title={syncError ?? syncLabel}
          />
        </div>
      </div>
    </div>
  );
}

function DesktopStatusBar({
  markdownText,
  documentCount,
  line,
  column,
  syncError,
  syncLabel,
  syncDotClass,
}: StatusBarViewProps) {
  return (
    <div className="w-full bg-neutral-100 dark:bg-neutral-900 ps-4 pe-1 text-neutral-800 dark:text-neutral-700 text-sm py-1 border-t border-neutral-200 dark:border-neutral-800">
      <div className="flex flex-row items-center justify-between h-full">
        <div className="flex items-center gap-x-2">
          <span>
            <span className="text-neutral-700 dark:text-neutral-600">
              {markdownText.length}
            </span>{" "}
            Characters
          </span>
          <span>/</span>
          <span>
            <span className="text-neutral-700 dark:text-neutral-600">
              {markdownText.split(/\s+/).filter(Boolean).length}
            </span>{" "}
            Words
          </span>
          <span>/</span>
          <span>
            <span className="text-neutral-700 dark:text-neutral-600">
              {documentCount}
            </span>{" "}
            Documents
          </span>
          <span>/</span>
          <span>LN</span>
          <span className="text-neutral-700 dark:text-neutral-600">
            {line}
          </span>
          <span>COL</span>
          <span className="text-neutral-700 dark:text-neutral-600">
            {column}
          </span>
        </div>
        <div className="pe-2 flex flex-row items-center justify-center">
          <div className="flex flex-row items-center justify-center gap-x-2">
            <span
              className="text-neutral-700 dark:text-neutral-600"
              title={syncError ?? syncLabel}
            >
              {syncLabel}
            </span>
            <span
              className={`w-1.5 h-1.5 mt-0.5 rounded-full ${syncDotClass}`}
              title={syncError ?? syncLabel}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StatusBar({
  markdownText,
  editStatus,
  documentCount,
  getLineAndColumn,
}: StatusBarProps) {
  const { line, column } = getLineAndColumn
    ? getLineAndColumn()
    : { line: 1, column: 1 };
  const [isMobile, setIsMobile] = useState(false);
  const { syncEnabled, syncError, syncStatus } = useCloud();

  const syncLabel = syncStatus === "error"
    ? "Neon sync failed"
    : syncStatus === "saving" || editStatus === "editing"
    ? "Saving to Neon"
    : syncEnabled
    ? "Saved to Neon"
    : editStatus === "saved"
    ? "Saved"
    : "Editing";

  const syncDotClass = syncStatus === "error"
    ? "bg-red-500"
    : syncStatus === "saving" || editStatus === "editing"
    ? "bg-amber-500"
    : "bg-green-500";

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(globalThis.innerWidth < 768);
    };

    checkMobile();
    globalThis.addEventListener("resize", checkMobile);
    return () => globalThis.removeEventListener("resize", checkMobile);
  }, []);

  const viewProps: StatusBarViewProps = {
    markdownText,
    documentCount,
    line,
    column,
    syncEnabled,
    syncError,
    syncLabel,
    syncDotClass,
  };

  return isMobile
    ? <MobileStatusBar {...viewProps} />
    : <DesktopStatusBar {...viewProps} />;
}
