"use client";

import {
  type ChangeEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Eye,
  FilePlus,
  History,
  Menu,
  Moon,
  MoreVertical,
  Save,
  Sun,
  X,
} from "lucide-react";
import WelcomeModal from "../modals/WelcomeModal.tsx";
import VersionControls from "../documents/VersionControls.tsx";
import ThemeToggle from "../ui/ThemeToggle.tsx";
import FileSidebar from "../sidebar/FileSidebar.tsx";
import { useCloud } from "../../contexts/useCloud.ts";
import VersionHistoryModal from "../modals/VersionHistoryModal.tsx";
import { useTheme } from "../../contexts/useTheme.ts";
import type { DocumentRecord, DocumentVersion } from "../../types/documents.ts";

type MobileAction =
  | "new-document"
  | "save-version"
  | "version-history"
  | "preview"
  | "theme";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [contentVisible, setContentVisible] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMenuClosing, setMobileMenuClosing] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [showMobileVersionHistory, setShowMobileVersionHistory] = useState(
    false,
  );
  const [activeDocument, setActiveDocument] = useState<DocumentRecord | null>(
    null,
  );
  const [documentTitle, setDocumentTitle] = useState("");
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const { userEmail } = useCloud();
  const { resolvedTheme, toggleTheme } = useTheme();
  const mobileActionsRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isDarkMode = resolvedTheme === "dark";

  // Add these state hooks
  const [getVersionsFn, setGetVersionsFn] = useState<
    ((documentId: string) => DocumentVersion[]) | null
  >(null);
  const [restoreVersionFn, setRestoreVersionFn] = useState<
    ((versionId: string) => boolean | void) | null
  >(null);

  const loadDocumentsFromLocalStorage = useCallback(() => {
    try {
      const docsString = localStorage.getItem("documents");
      if (docsString) {
        const docs = JSON.parse(docsString) as DocumentRecord[];
        setDocuments(docs);

        const lastActiveId = localStorage.getItem("lastActiveDocument");
        if (lastActiveId) {
          const activeDoc = docs.find((doc) => doc.id === lastActiveId);
          if (activeDoc) {
            setActiveDocument(activeDoc);
            setDocumentTitle(activeDoc.title);
          }
        }
      }
    } catch (error) {
      console.error("Error loading documents:", error);
    }
  }, []);

  // Load active document from localStorage
  useEffect(() => {
    const timer = setTimeout(loadDocumentsFromLocalStorage, 0);
    return () => clearTimeout(timer);
  }, [loadDocumentsFromLocalStorage]);

  // Listen for document updates from the sidebar
  useEffect(() => {
    const handleDocumentsUpdated = () => {
      loadDocumentsFromLocalStorage();
    };

    globalThis.addEventListener("documents-updated", handleDocumentsUpdated);
    return () => {
      globalThis.removeEventListener(
        "documents-updated",
        handleDocumentsUpdated,
      );
    };
  }, [loadDocumentsFromLocalStorage]);

  // Listen for document creation requests
  useEffect(() => {
    const handleCreateNewDocument = () => {
      globalThis.dispatchEvent(new CustomEvent("sidebar-create-document"));
    };

    globalThis.addEventListener("create-new-document", handleCreateNewDocument);
    return () => {
      globalThis.removeEventListener(
        "create-new-document",
        handleCreateNewDocument,
      );
    };
  }, []);

  // Add this effect to listen for the document's version functions
  useEffect(() => {
    const handleVersionFunctions = (event: Event) => {
      const { getVersions, restoreVersion } = (event as CustomEvent<{
        getVersions: (documentId: string) => DocumentVersion[];
        restoreVersion: (versionId: string) => boolean | void;
      }>).detail;
      setGetVersionsFn(() => getVersions);
      setRestoreVersionFn(() => restoreVersion);
    };

    globalThis.addEventListener(
      "version-functions-ready",
      handleVersionFunctions as EventListener,
    );

    return () => {
      globalThis.removeEventListener(
        "version-functions-ready",
        handleVersionFunctions as EventListener,
      );
    };
  }, []);

  // Update document title in localStorage
  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setDocumentTitle(newTitle);

    // Send immediate notification to update the file name in the sidebar
    if (activeDocument) {
      globalThis.dispatchEvent(
        new CustomEvent("file-title-changed", {
          detail: { documentId: activeDocument.id, title: newTitle },
        }),
      );

      // Update title in localStorage
      try {
        const docsString = localStorage.getItem("documents");
        if (docsString) {
          const docs = JSON.parse(docsString) as DocumentRecord[];
          const updatedDocs = docs.map((doc) => {
            if (doc.id === activeDocument.id) {
              return {
                ...doc,
                title: newTitle,
                updated_at: new Date().toISOString(),
              };
            }
            return doc;
          });

          localStorage.setItem("documents", JSON.stringify(updatedDocs));

          // Update local state
          setActiveDocument({
            ...activeDocument,
            title: newTitle,
          });
          setDocuments(updatedDocs);
        }
      } catch (error) {
        console.error("Error updating document title:", error);
      }
    }
  };

  // Handle document change from the sidebar
  const handleDocumentChange = useCallback((documentId: string) => {
    if (!documentId || documentId === activeDocument?.id) return;

    // Find the document
    const doc = documents.find((d) => d.id === documentId);
    if (doc) {
      // Update active document
      setActiveDocument(doc);
      setDocumentTitle(doc.title);

      // Save as last active document
      localStorage.setItem("lastActiveDocument", documentId);

      // Notify the app of document change
      globalThis.dispatchEvent(
        new CustomEvent("active-document-changed", {
          detail: { document: doc },
        }),
      );
    }
  }, [activeDocument?.id, documents]);

  // Listen for document changes from DashboardContent
  useEffect(() => {
    const handleDocumentChange = (event: Event) => {
      const { document } = (event as CustomEvent<{
        document: DocumentRecord;
      }>).detail;
      setActiveDocument(document);
      setDocumentTitle(document.title);
    };

    globalThis.addEventListener(
      "active-document-changed",
      handleDocumentChange as EventListener,
    );

    return () => {
      globalThis.removeEventListener(
        "active-document-changed",
        handleDocumentChange as EventListener,
      );
    };
  }, []);

  // Animate content in after initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      setContentVisible(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (mobileMenuCloseTimerRef.current) {
        clearTimeout(mobileMenuCloseTimerRef.current);
      }
    };
  }, []);

  const openMobileMenu = () => {
    if (mobileMenuCloseTimerRef.current) {
      clearTimeout(mobileMenuCloseTimerRef.current);
    }

    setMobileMenuClosing(false);
    setMobileMenuOpen(true);
  };

  const closeMobileMenu = useCallback(() => {
    if (!mobileMenuOpen || mobileMenuClosing) return;

    setMobileMenuClosing(true);
    if (mobileMenuCloseTimerRef.current) {
      clearTimeout(mobileMenuCloseTimerRef.current);
    }

    mobileMenuCloseTimerRef.current = setTimeout(() => {
      setMobileMenuOpen(false);
      setMobileMenuClosing(false);
    }, 300);
  }, [mobileMenuClosing, mobileMenuOpen]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click was outside the sidebar
      if (
        mobileMenuOpen &&
        event.target instanceof Element &&
        !event.target.closest(".mobile-sidebar")
      ) {
        closeMobileMenu();
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [closeMobileMenu, mobileMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileActionsOpen &&
        mobileActionsRef.current &&
        event.target instanceof Node &&
        !mobileActionsRef.current.contains(event.target)
      ) {
        setMobileActionsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileActionsOpen]);

  const runMobileAction = (action: MobileAction) => {
    setMobileActionsOpen(false);

    if (action === "new-document") {
      globalThis.dispatchEvent(new CustomEvent("create-new-document"));
      return;
    }

    if (action === "save-version") {
      globalThis.dispatchEvent(new CustomEvent("save-document-version"));
      return;
    }

    if (action === "version-history") {
      if (activeDocument && getVersionsFn && restoreVersionFn) {
        setShowMobileVersionHistory(true);
      }
      return;
    }

    if (action === "preview") {
      globalThis.dispatchEvent(new CustomEvent("toggle-mobile-preview"));
      return;
    }

    if (action === "theme") {
      toggleTheme();
    }
  };

  return (
    <div className="flex h-full max-h-full flex-col bg-brand-light dark:bg-brand-dark">
      {/* Welcome Modal */}
      <WelcomeModal />

      {/* Mobile Header - Only visible on small screens */}
      <div className="md:hidden flex items-center justify-between gap-2 bg-white dark:bg-neutral-900 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
        <button
          type="button"
          onClick={openMobileMenu}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          aria-label="Open files"
          title="Files"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0 flex-1">
          <input
            className="w-full truncate bg-transparent p-1 text-base font-semibold text-neutral-700 placeholder-neutral-500 focus:outline-none dark:text-neutral-300"
            placeholder="Document Title"
            value={documentTitle}
            onChange={handleTitleChange}
            disabled={!activeDocument}
          />
        </div>

        <div className="relative shrink-0" ref={mobileActionsRef}>
          <button
            type="button"
            onClick={() => setMobileActionsOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            aria-label="Open actions"
            title="Actions"
          >
            <MoreVertical size={20} />
          </button>

          {mobileActionsOpen && (
            <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-md border border-neutral-200 bg-white py-1 text-sm shadow-lg dark:border-neutral-800 dark:bg-neutral-950">
              <button
                type="button"
                onClick={() => runMobileAction("new-document")}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <FilePlus size={16} />
                <span>New document</span>
              </button>
              <button
                type="button"
                onClick={() => runMobileAction("save-version")}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <Save size={16} />
                <span>Save version</span>
              </button>
              <button
                type="button"
                onClick={() => runMobileAction("version-history")}
                disabled={!activeDocument || !getVersionsFn ||
                  !restoreVersionFn}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <History size={16} />
                <span>Version history</span>
              </button>
              <button
                type="button"
                onClick={() => runMobileAction("preview")}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <Eye size={16} />
                <span>Switch editor / preview</span>
              </button>
              <button
                type="button"
                onClick={() => runMobileAction("theme")}
                className="flex w-full items-center gap-2 border-t border-neutral-100 px-3 py-2 text-left text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                <span>{isDarkMode ? "Light theme" : "Dark theme"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {showMobileVersionHistory && activeDocument && getVersionsFn &&
        restoreVersionFn && (
        <VersionHistoryModal
          isOpen={showMobileVersionHistory}
          onClose={() => setShowMobileVersionHistory(false)}
          documentId={activeDocument.id}
          currentVersion={activeDocument.version}
          getVersions={getVersionsFn}
          restoreVersion={restoreVersionFn}
        />
      )}

      {/* Main Content with Sidebar */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Sidebar - Off-canvas menu for mobile */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className={`mobile-sidebar absolute top-0 left-0 z-50 flex h-full w-screen flex-col overflow-hidden bg-neutral-100 dark:bg-neutral-900 ${
                mobileMenuClosing ? "animate-slide-left" : "animate-slide-right"
              }`}
            >
              <div className="flex md:hidden items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex min-w-0 items-start">
                  <div className="mr-3 flex h-8 w-8 shrink-0 items-center justify-center">
                    <img
                      src="/logo/logo.png"
                      className="h-7 w-7 flex dark:hidden"
                      alt="Logo"
                    />
                    <img
                      src="/logo/logo-dark.png"
                      className="h-7 w-7 hidden dark:flex"
                      alt="Logo"
                    />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <div className="truncate text-sm font-medium leading-tight text-neutral-700 dark:text-neutral-300">
                      TXTWrite
                    </div>
                    <div
                      className="mt-0.5 max-w-[68vw] truncate text-xs leading-tight text-neutral-500 dark:text-neutral-500"
                      title={userEmail}
                    >
                      {userEmail}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeMobileMenu}
                  className="text-neutral-700 dark:text-neutral-400"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="h-full min-h-0 px-3 pb-3">
                <FileSidebar
                  activeDocumentId={activeDocument?.id}
                  handleDocumentChange={(documentId: string) => {
                    handleDocumentChange(documentId);
                    closeMobileMenu();
                  }}
                  documents={documents}
                  expanded
                />
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area - Now full width */}
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden w-full ms-0 md:ms-14 lg:ms-14 xl:ms-14">
          <div className="shrink-0 top-0 z-10 bg-brand-light dark:bg-neutral-900 py-0 rounded-lg rounded-bl-none pt-2">
            <div className="max-w-full mx-auto px-2">
              {/* Desktop Menu Bar - Hidden on mobile */}
              {
                /* <div className="hidden md:flex flex-row gap-x-4 text-neutral-400 dark:text-neutral-700 px-1 text-sm w-full justify-between">
                                <div className="flex flex-row gap-x-4 items-center justify-center">
                                    <MenuButton
                                        label="File"
                                        menuItems={fileMenuItems}
                                        position="top-left"
                                        className="hover:text-neutral-500 focus:outline-none"
                                    />
                                </div>
                                <div className="flex flex-row gap-x-4 items-center justify-center">
                                    <ThemeToggle />
                                </div>
                            </div> */
              }
              {/* Document Title and Controls - Responsive */}
              <div className="hidden md:flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center justify-between w-full sm:pb-0 px-2 gap-x-6 mt-2">
                  <div className="flex flex-row items-center gap-x-2 w-full sm:w-lg">
                    <input
                      className="text-neutral-700 dark:text-neutral-400 placeholder-neutral-500 w-full text-lg sm:text-xl p-1 focus:outline-none bg-transparent py-1 truncate font-black"
                      placeholder="Document Title"
                      value={documentTitle}
                      onChange={handleTitleChange}
                      disabled={!activeDocument}
                    />
                  </div>

                  <div className="flex flex-row items-center">
                    <span className="py-1 text-neutral-700 flex flex-row items-center gap-x-2">
                      {activeDocument && getVersionsFn && restoreVersionFn && (
                        <VersionControls
                          document={activeDocument}
                          getVersions={getVersionsFn}
                          restoreVersion={restoreVersionFn}
                        />
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            className={`min-h-0 flex-1 overflow-hidden transition-opacity duration-300 ${
              contentVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {children}
          </div>
        </main>

        {/* Desktop Sidebar - hidden on mobile, visible on larger screens */}
        <div
          className={`absolute top-0 left-0 h-full overflow-hidden bg-neutral-100 dark:bg-neutral-900 hidden md:flex flex-col border-r-4 border-brand-gray dark:border-brand-dark transition-[width] duration-200 ease-in-out z-20 ${
            sidebarExpanded ? "w-64" : "w-14"
          }`}
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
        >
          <div className="flex items-start justify-between pt-4 px-3">
            <div className="flex min-w-0 items-start">
              <div className="flex shrink-0 items-center justify-end sm:pb-0">
                <div>
                  <img
                    src="/logo/logo.png"
                    className="w-6 h-6 flex dark:hidden"
                    alt="Logo"
                  />
                  <img
                    src="/logo/logo-dark.png"
                    className="w-6 h-6 hidden dark:flex"
                    alt="Logo"
                  />
                </div>
              </div>

              <div
                className={`ml-3 min-w-0 transition-[opacity,transform] duration-150 ${
                  sidebarExpanded
                    ? "translate-x-0 opacity-100 delay-150"
                    : "-translate-x-1 opacity-0 delay-0"
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium leading-tight text-neutral-700 dark:text-neutral-300">
                    TXTWrite
                  </div>
                  <div
                    className="mt-0.5 max-w-40 truncate text-xs leading-tight text-neutral-500 dark:text-neutral-500"
                    title={userEmail}
                  >
                    {userEmail}
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`shrink-0 transition-opacity duration-150 ${
                sidebarExpanded
                  ? "opacity-100 delay-150"
                  : "pointer-events-none opacity-0 delay-0"
              }`}
            >
              <ThemeToggle />
            </div>
          </div>

          <div
            className={`flex min-h-0 flex-1 flex-col transition-opacity duration-150 ${
              sidebarExpanded
                ? "pointer-events-auto opacity-100 delay-150"
                : "pointer-events-none opacity-0 delay-0"
            }`}
          >
            <div className="min-h-0 flex-1 overflow-hidden">
              <FileSidebar
                activeDocumentId={activeDocument?.id}
                handleDocumentChange={handleDocumentChange}
                documents={documents}
                expanded
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
