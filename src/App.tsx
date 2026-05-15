import { useCallback, useEffect, useRef, useState } from "react";
import DashboardLayout from "./components/layout/DashboardLayout.tsx";
import DocumentTabs from "./components/documents/DocumentTabs.tsx";
import CodeMirrorEditor from "./components/editor/CodeMirrorEditor.tsx";
import MobileFormatToolbar from "./components/editor/MobileFormatToolbar.tsx";
import MarkdownPreview from "./components/preview/MarkdownPreview.tsx";
import StatusBar from "./components/editor/StatusBar.tsx";
import useDocuments from "./hooks/useDocuments.ts";
import { useTheme } from "./contexts/useTheme.ts";
import type { ScrollableEditorView } from "./types/editor.ts";

export default function App() {
  const [markdownText, setMarkdownText] = useState("# Loading...");
  const [editStatus, setEditStatus] = useState<"editing" | "saved">("saved");
  const [activeView, setActiveView] = useState<"editor" | "preview">("editor");
  const [isMobile, setIsMobile] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(() => {
    const savedPreference = localStorage.getItem("previewVisible");
    return savedPreference === null ? true : savedPreference === "true";
  });

  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  const previewRef = useRef<HTMLDivElement | null>(null);
  const editorViewRef = useRef<ScrollableEditorView | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isEditorScrolling, setIsEditorScrolling] = useState(false);
  const [isPreviewScrolling, setIsPreviewScrolling] = useState(false);

  const {
    documents,
    activeDocumentId,
    documentTabs,
    createNewDocument,
    handleDocumentChange,
    closeDocumentTab,
    startEditingTitle,
    saveEditedTitle,
    editingTitleId,
    editingTitleValue,
    setEditingTitleValue,
    titleInputRef,
    handleTitleKeyDown,
    saveDocumentToLocalStorage,
    saveNewDocumentVersion,
    getVersions,
    restoreVersion,
  } = useDocuments(markdownText, setMarkdownText);

  const togglePreview = useCallback(() => {
    setIsPreviewVisible((prev) => {
      const nextValue = !prev;
      localStorage.setItem("previewVisible", nextValue.toString());
      return nextValue;
    });
  }, []);

  const getEditorWidth = () => {
    if (isMobile) return "w-full";
    return isPreviewVisible ? "w-1/2" : "w-full";
  };

  useEffect(() => {
    const updateViewportSize = () => {
      const viewport = globalThis.visualViewport;
      const height = viewport?.height ?? globalThis.innerHeight;
      document.documentElement.style.setProperty(
        "--app-viewport-height",
        `${height}px`,
      );
    };

    updateViewportSize();
    globalThis.addEventListener("resize", updateViewportSize);
    globalThis.addEventListener("orientationchange", updateViewportSize);
    globalThis.visualViewport?.addEventListener("resize", updateViewportSize);
    globalThis.visualViewport?.addEventListener("scroll", updateViewportSize);

    return () => {
      globalThis.removeEventListener("resize", updateViewportSize);
      globalThis.removeEventListener("orientationchange", updateViewportSize);
      globalThis.visualViewport?.removeEventListener(
        "resize",
        updateViewportSize,
      );
      globalThis.visualViewport?.removeEventListener(
        "scroll",
        updateViewportSize,
      );
    };
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileView = globalThis.innerWidth < 768;
      setIsMobile(isMobileView);
      if (isMobileView) {
        setActiveView("editor");
      }
    };

    checkMobile();
    globalThis.addEventListener("resize", checkMobile);
    return () => globalThis.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (activeDocumentId) {
      globalThis.dispatchEvent(
        new CustomEvent("version-functions-ready", {
          detail: { getVersions, restoreVersion },
        }),
      );
    }
  }, [documents, activeDocumentId, getVersions, restoreVersion]);

  useEffect(() => {
    const handleSaveVersion = () => {
      if (saveDocumentToLocalStorage && saveNewDocumentVersion) {
        saveDocumentToLocalStorage(markdownText);
        saveNewDocumentVersion();
      }
    };

    const handleNotification = (event: Event) => {
      const customEvent = event as CustomEvent<{ message: string }>;
      setNotification(customEvent.detail.message);
      setTimeout(() => setNotification(null), 3000);
    };

    globalThis.addEventListener("save-document-version", handleSaveVersion);
    globalThis.addEventListener(
      "show-notification",
      handleNotification as EventListener,
    );

    return () => {
      globalThis.removeEventListener(
        "save-document-version",
        handleSaveVersion,
      );
      globalThis.removeEventListener(
        "show-notification",
        handleNotification as EventListener,
      );
    };
  }, [markdownText, saveDocumentToLocalStorage, saveNewDocumentVersion]);

  const handleEditorScroll = useCallback((percentage: number) => {
    if (!previewRef.current || isPreviewScrolling) return;
    setIsEditorScrolling(true);
    const previewElement = previewRef.current;
    const previewScrollHeight = previewElement.scrollHeight -
      previewElement.clientHeight;
    previewElement.scrollTop = previewScrollHeight * percentage;
    setTimeout(() => setIsEditorScrolling(false), 20);
  }, [isPreviewScrolling]);

  const handlePreviewScroll = useCallback(() => {
    if (!previewRef.current || isEditorScrolling) return;
    setIsPreviewScrolling(true);
    const { scrollTop, scrollHeight, clientHeight } = previewRef.current;
    const percentage = scrollTop / (scrollHeight - clientHeight || 1);
    if (
      editorViewRef.current &&
      typeof editorViewRef.current.scrollToPercentage === "function"
    ) {
      editorViewRef.current.scrollToPercentage(percentage);
    }
    setTimeout(() => setIsPreviewScrolling(false), 20);
  }, [isEditorScrolling]);

  const handleTextChange = useCallback((newText: string) => {
    if (newText === markdownText) return;
    setMarkdownText(newText);
    setEditStatus("editing");
    saveDocumentToLocalStorage(newText);

    if (isMobile && activeView === "editor") {
      setTimeout(() => {
        if (activeView === "editor") {
          setActiveView("preview");
        }
      }, 800);
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      setEditStatus("saved");
    }, 500);
  }, [markdownText, isMobile, activeView, saveDocumentToLocalStorage]);

  const getLineAndColumn = useCallback(() => {
    if (!editorViewRef.current) return { line: 1, column: 1 };
    try {
      const state = editorViewRef.current.state;
      const pos = state.selection.main.head;
      const line = state.doc.lineAt(pos);
      return {
        line: line.number,
        column: pos - line.from + 1,
      };
    } catch (error) {
      console.error("Error getting cursor position:", error);
      return { line: 1, column: 1 };
    }
  }, []);

  useEffect(() => {
    const handleSidebarDocumentChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ documentId: string }>;
      const { documentId } = customEvent.detail || {};
      if (documentId && documentId !== activeDocumentId) {
        handleDocumentChange(documentId);
      }
    };

    globalThis.addEventListener(
      "sidebar-document-changed",
      handleSidebarDocumentChange,
    );
    return () => {
      globalThis.removeEventListener(
        "sidebar-document-changed",
        handleSidebarDocumentChange,
      );
    };
  }, [activeDocumentId, handleDocumentChange]);

  useEffect(() => {
    const handleFileTitleChanged = (event: Event) => {
      const customEvent = event as CustomEvent<
        { documentId: string; title: string }
      >;
      const { documentId, title } = customEvent.detail || {};
      if (documentId && documentId === activeDocumentId) {
        globalThis.dispatchEvent(
          new CustomEvent("update-document-title", {
            detail: { documentId, title },
          }),
        );
      }
    };

    globalThis.addEventListener("file-title-changed", handleFileTitleChanged);
    return () =>
      globalThis.removeEventListener(
        "file-title-changed",
        handleFileTitleChanged,
      );
  }, [activeDocumentId]);

  useEffect(() => {
    const handleToggleMobilePreview = () => {
      if (isMobile) {
        setIsPreviewVisible(true);
        setActiveView((current) => current === "editor" ? "preview" : "editor");
      } else {
        togglePreview();
      }
    };

    globalThis.addEventListener(
      "toggle-mobile-preview",
      handleToggleMobilePreview,
    );

    return () => {
      globalThis.removeEventListener(
        "toggle-mobile-preview",
        handleToggleMobilePreview,
      );
    };
  }, [isMobile, togglePreview]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="h-full min-h-0 flex flex-col overflow-hidden">
        <div className="flex h-full min-h-0 flex-col bg-neutral-100 dark:bg-neutral-900">
          <div className="w-full hidden md:flex">
            <DocumentTabs
              documentTabs={documentTabs}
              activeDocumentId={activeDocumentId}
              handleDocumentChange={handleDocumentChange}
              closeDocumentTab={closeDocumentTab}
              createNewDocument={createNewDocument}
              editingTitleId={editingTitleId}
              editingTitleValue={editingTitleValue}
              setEditingTitleValue={setEditingTitleValue}
              startEditingTitle={startEditingTitle}
              saveEditedTitle={saveEditedTitle}
              titleInputRef={titleInputRef}
              handleTitleKeyDown={handleTitleKeyDown}
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-neutral-100 dark:bg-neutral-900 md:flex-row">
            <div
              className={`${
                activeView === "editor" || !isMobile ? "flex" : "hidden"
              } 
                ${getEditorWidth()} h-full relative overflow-hidden`}
            >
              <CodeMirrorEditor
                markdownText={markdownText}
                onTextChange={handleTextChange}
                onScroll={handleEditorScroll}
                saveDocumentToLocalStorage={saveDocumentToLocalStorage}
                setEditStatus={setEditStatus}
                isDarkMode={isDarkMode}
                editorViewRef={editorViewRef}
                isMobile={isMobile}
                isPreviewVisible={isPreviewVisible}
                togglePreview={togglePreview}
              />
            </div>

            {(isPreviewVisible || (isMobile && activeView === "preview")) && (
              <div
                className={`${
                  activeView === "preview" || !isMobile ? "flex" : "hidden"
                } 
                  w-full md:w-1/2 h-full relative overflow-hidden`}
              >
                <MarkdownPreview
                  markdownText={markdownText}
                  previewRef={previewRef}
                  handlePreviewScroll={handlePreviewScroll}
                />
              </div>
            )}
          </div>

          <MobileFormatToolbar
            editorViewRef={editorViewRef}
            visible={isMobile && activeView === "editor"}
          />

          <StatusBar
            markdownText={markdownText}
            editStatus={editStatus}
            documentCount={documents.length}
            getLineAndColumn={getLineAndColumn}
          />
        </div>
      </div>

      {notification && (
        <div className="fixed bottom-4 right-4 bg-green-100 dark:bg-neutral-900 text-green-800 dark:text-green-600 px-8 py-4 rounded shadow-md z-50 transition-opacity duration-300 border border-neutral-800">
          {notification}
        </div>
      )}
    </DashboardLayout>
  );
}
