// @ts-check
"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import WelcomeModal from "../modals/WelcomeModal.tsx";
import VersionControls from "../documents/VersionControls.tsx";
import ThemeToggle from "../ui/ThemeToggle.tsx";
import FileSidebar from "../sidebar/FileSidebar.tsx";

export default function DashboardLayout({ children }) {
  const [contentVisible, setContentVisible] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDocument, setActiveDocument] = useState(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documents, setDocuments] = useState([]);

  // Add these state hooks
  const [getVersionsFn, setGetVersionsFn] = useState(null);
  const [restoreVersionFn, setRestoreVersionFn] = useState(null);

  // Load active document from localStorage
  useEffect(() => {
    loadDocumentsFromLocalStorage();
  }, []);

  const loadDocumentsFromLocalStorage = () => {
    try {
      const docsString = localStorage.getItem("documents");
      if (docsString) {
        const docs = JSON.parse(docsString);
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
  };

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
  }, []);

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
    const handleVersionFunctions = (event) => {
      const { getVersions, restoreVersion } = event.detail;
      setGetVersionsFn(() => getVersions);
      setRestoreVersionFn(() => restoreVersion);
    };

    globalThis.addEventListener(
      "version-functions-ready",
      handleVersionFunctions,
    );

    return () => {
      globalThis.removeEventListener(
        "version-functions-ready",
        handleVersionFunctions,
      );
    };
  }, []);

  // Update document title in localStorage
  const handleTitleChange = (e) => {
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
          const docs = JSON.parse(docsString);
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
  const handleDocumentChange = (documentId) => {
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
  };

  // Listen for document changes from DashboardContent
  useEffect(() => {
    const handleDocumentChange = (event) => {
      const { document } = event.detail;
      setActiveDocument(document);
      setDocumentTitle(document.title);
    };

    globalThis.addEventListener(
      "active-document-changed",
      handleDocumentChange,
    );

    return () => {
      globalThis.removeEventListener(
        "active-document-changed",
        handleDocumentChange,
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

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if the click was outside the sidebar
      if (mobileMenuOpen && !event.target.closest(".mobile-sidebar")) {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mobileMenuOpen]);

  return (
    <div className="flex flex-col h-full bg-brand-light dark:bg-brand-dark max-h-screen">
      {/* Welcome Modal */}
      <WelcomeModal />

      {/* Mobile Header - Only visible on small screens */}
      <div className="md:hidden flex items-center justify-between bg-white dark:bg-neutral-900 px-4 py-2 border-b border-neutral-200 dark:border-neutral-800">
        {
          /* <button
                    onClick={() => setMobileMenuOpen(true)}
                    className="text-neutral-700 dark:text-neutral-400"
                    aria-label="Open menu"
                >
                    <Menu size={24} />
                </button> */
        }
        {/* Document Title and Controls - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between w-full sm:pb-0 gap-x-6">
            <div className="flex flex-row items-center gap-x-2 w-full sm:w-lg">
              <input
                className="text-neutral-700 placeholder-neutral-500 w-full text-lg sm:text-xl p-1 focus:outline-none bg-transparent py-1 truncate"
                placeholder="Document Title"
                value={documentTitle}
                onChange={handleTitleChange}
                disabled={!activeDocument}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <ThemeToggle />
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Sidebar - Off-canvas menu for mobile */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden">
            <div className="mobile-sidebar absolute top-0 left-0 h-full w-3/4 max-w-xs bg-neutral-100 dark:bg-neutral-900 z-50 flex flex-col overflow-y-auto animate-slide-right">
              <div className="flex md:hidden items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-sm bg-neutral-900 flex items-center justify-center text-white font-medium gap-x-1 text-sm border border-neutral-800 mr-3">
                    T
                  </div>
                  <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                    TXTWrite
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-neutral-700 dark:text-neutral-400"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 h-full">
                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-400 mb-2">
                  Documents
                </h3>
                <FileSidebar
                  activeDocumentId={activeDocument?.id}
                  handleDocumentChange={handleDocumentChange}
                  documents={documents}
                  expanded
                />
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area - Now full width */}
        <main className="flex-1 overflow-hidden w-full ms-14">
          <div className="top-0 z-10 bg-brand-light dark:bg-neutral-900 py-0 rounded-lg rounded-bl-none pt-2">
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
            className={`h-full transition-opacity duration-300 ${
              contentVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {children}
          </div>
        </main>

        {/* Desktop Sidebar - hidden on mobile, visible on larger screens */}
        <div
          className={`absolute top-0 left-0 h-full bg-neutral-100 dark:bg-neutral-900 hidden md:flex flex-col border-r-4 border-brand-gray dark:border-brand-dark transition-[width] duration-200 ease-in-out z-20 ${
            sidebarExpanded ? "w-64" : "w-14"
          }`}
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
        >
          <div className="flex items-center justify-between pt-4 px-3">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center justify-end sm:pb-0">
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

              {sidebarExpanded && (
                <div className="flex flex-row items-center justify-between w-full">
                  <span
                    className={`ml-3 text-neutral-700 dark:text-neutral-300 font-medium ${
                      sidebarExpanded ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    TXTWrite
                  </span>
                  <ThemeToggle />
                </div>
              )}
            </div>
          </div>

          {sidebarExpanded && (
            <FileSidebar
              activeDocumentId={activeDocument?.id}
              handleDocumentChange={handleDocumentChange}
              documents={documents}
              expanded
            />
          )}
        </div>
      </div>
    </div>
  );
}
