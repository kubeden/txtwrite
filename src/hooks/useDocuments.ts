// @ts-check
import {
  type MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  getDocumentVersions,
  restoreDocumentVersion,
  saveDocumentVersion,
} from "../utils/documentVersioning.ts";
import type {
  DocumentRecord,
  DocumentTab,
  FileSystemItem,
} from "../types/documents.ts";

// File system constants
const FILE_SYSTEM_KEY = "txtwFileSystem";
const DOCUMENT_TABS_KEY = "documentTabs";

const parseJSON = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error("Failed to parse JSON from localStorage", error);
    return fallback;
  }
};

// Document structure
const createEmptyDocument = (id?: string): DocumentRecord => {
  const now = new Date().toISOString();
  return {
    id: id || crypto.randomUUID(),
    user_id: "current-user",
    uuid: crypto.randomUUID(),
    title: "New Document",
    content:
      "# New Document\n\nStart typing here...\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n",
    version: 1,
    is_published: false,
    created_at: now,
    updated_at: now,
    last_synced_at: now,
    metadata: {},
    folder_id: "default",
  };
};

export default function useDocuments(
  markdownText: string,
  setMarkdownText: (content: string) => void,
) {
  // Primary state
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState("");
  const [fileSystem, setFileSystem] = useState<FileSystemItem[]>([]);
  const [documentTabs, setDocumentTabs] = useState<DocumentTab[]>([]);

  // Refs for stable references across renders
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const currentContentRef = useRef<string>("");
  const documentsRef: MutableRefObject<DocumentRecord[]> = useRef([]);
  const activeDocumentIdRef = useRef<string | null>(null);
  const fileSystemRef = useRef<FileSystemItem[]>([]);
  const documentTabsRef = useRef<DocumentTab[]>([]);
  const skipContentUpdateRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleOperationInProgress = useRef(false);
  const documentOperationInProgress = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  useEffect(() => {
    activeDocumentIdRef.current = activeDocumentId;
  }, [activeDocumentId]);

  useEffect(() => {
    fileSystemRef.current = fileSystem;
  }, [fileSystem]);

  useEffect(() => {
    documentTabsRef.current = documentTabs;
  }, [documentTabs]);

  // Add a useEffect to save document tabs whenever they change
  useEffect(() => {
    if (documentTabs.length > 0) {
      localStorage.setItem(DOCUMENT_TABS_KEY, JSON.stringify(documentTabs));
    }
  }, [documentTabs]);

  // Load documents and file system from localStorage on initial render
  useEffect(() => {
    loadDocuments();
  }, []);

  // Track current content for saving - optimized with debouncing
  useEffect(() => {
    if (skipContentUpdateRef.current) {
      skipContentUpdateRef.current = false;
      return;
    }

    // Only update the current content if we have an active document
    if (activeDocumentId) {
      currentContentRef.current = markdownText;

      // Clear any existing save timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Auto-save when content changes (debounced)
      saveTimeoutRef.current = setTimeout(() => {
        // Do an immediate save if we're not editing the title
        if (!titleOperationInProgress.current) {
          saveDocumentToLocalStorageSync(markdownText);
        }
      }, 300);

      return () => {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
      };
    }
  }, [markdownText, activeDocumentId]);

  // Synchronous save function
  const saveDocumentToLocalStorageSync = (text: string): boolean => {
    if (!activeDocumentIdRef.current) return false;

    try {
      const docsString = localStorage.getItem("documents");
      const currentDocs = docsString
        ? parseJSON<DocumentRecord[]>(docsString, documentsRef.current)
        : documentsRef.current;

      const updatedDocs = currentDocs.map((doc) => {
        if (doc.id === activeDocumentIdRef.current) {
          return {
            ...doc,
            content: text,
            updated_at: new Date().toISOString(),
          };
        }
        return doc;
      });

      // Save all documents to localStorage
      localStorage.setItem("documents", JSON.stringify(updatedDocs));

      // Use a functional update to avoid closure issues
      setDocuments(updatedDocs);
      documentsRef.current = updatedDocs;

      return true;
    } catch (error) {
      console.error("Error in synchronous save:", error);
      return false;
    }
  };

  // Load document content when active document changes
  useEffect(() => {
    if (activeDocumentId && documents.length > 0) {
      const doc = documents.find((d) => d.id === activeDocumentId);
      if (doc) {
        // Immediately update the editor content
        setMarkdownText(doc.content);
        currentContentRef.current = doc.content;

        // Notify layout component about the document change
        globalThis.dispatchEvent(
          new CustomEvent("active-document-changed", {
            detail: { document: doc },
          }),
        );

        // Save as last active document
        localStorage.setItem("lastActiveDocument", activeDocumentId);

        // Add to document tabs if not already there
        if (!documentTabs.some((tab) => tab.id === activeDocumentId)) {
          const updatedTabs = [...documentTabs, {
            id: activeDocumentId,
            title: doc.title,
          }];
          setDocumentTabs(updatedTabs);
          documentTabsRef.current = updatedTabs;
          localStorage.setItem(DOCUMENT_TABS_KEY, JSON.stringify(updatedTabs));
        }

        // Reset title editing state
        setEditingTitleId(null);
      }
    }
  }, [activeDocumentId, documents, setMarkdownText, documentTabs]);

  // Listen for document updates from the sidebar
  useEffect(() => {
    const handleDocumentsUpdated = () => {
      loadDocuments();
    };

    globalThis.addEventListener("documents-updated", handleDocumentsUpdated);
    return () => {
      globalThis.removeEventListener(
        "documents-updated",
        handleDocumentsUpdated,
      );
    };
  }, []);

  // Listen for document creation requests from the sidebar
  useEffect(() => {
    const handleSidebarCreateDocument = () => {
      createNewDocument();
    };

    globalThis.addEventListener(
      "sidebar-create-document",
      handleSidebarCreateDocument,
    );
    return () => {
      globalThis.removeEventListener(
        "sidebar-create-document",
        handleSidebarCreateDocument,
      );
    };
  }, []);

  // Listen for sidebar document selection
  useEffect(() => {
    const handleSidebarDocumentChanged = (event) => {
      const { documentId } = event.detail;
      if (documentId && documentId !== activeDocumentId) {
        handleDocumentChange(documentId);
      }
    };

    globalThis.addEventListener(
      "sidebar-document-changed",
      handleSidebarDocumentChanged,
    );
    return () => {
      globalThis.removeEventListener(
        "sidebar-document-changed",
        handleSidebarDocumentChanged,
      );
    };
  }, [activeDocumentId]);

  // Listen for title changes from layout component
  useEffect(() => {
    const handleTitleChange = (event) => {
      const { documentId, title } = event.detail;

      // Update our documents array with the new title
      if (documentId && documents.length > 0) {
        try {
          // Get documents directly from localStorage for the most up-to-date state
          const docsString = localStorage.getItem("documents");
          let currentDocs = [];
          if (docsString) {
            currentDocs = JSON.parse(docsString);
          } else {
            currentDocs = documentsRef.current;
          }

          const updatedDocs = currentDocs.map((doc) => {
            if (doc.id === documentId) {
              return { ...doc, title };
            }
            return doc;
          });

          setDocuments(updatedDocs);
          documentsRef.current = updatedDocs;
          localStorage.setItem("documents", JSON.stringify(updatedDocs));

          // Update document tabs
          const updatedTabs = documentTabsRef.current.map((tab) => {
            if (tab.id === documentId) {
              return { ...tab, title };
            }
            return tab;
          });
          setDocumentTabs(updatedTabs);
          documentTabsRef.current = updatedTabs;
          localStorage.setItem(DOCUMENT_TABS_KEY, JSON.stringify(updatedTabs));
        } catch (error) {
          console.error("Error handling title change event:", error);
        }
      }
    };

    globalThis.addEventListener("document-title-changed", handleTitleChange);
    globalThis.addEventListener("file-title-changed", handleTitleChange);

    return () => {
      globalThis.removeEventListener(
        "document-title-changed",
        handleTitleChange,
      );
      globalThis.removeEventListener("file-title-changed", handleTitleChange);
    };
  }, [documents]);

  // Load documents and file system from localStorage
  const loadDocuments = useCallback(() => {
    try {
      documentOperationInProgress.current = true;

      // Load documents
      const docsString = localStorage.getItem("documents");
      let docs = [];

      if (docsString) {
        docs = JSON.parse(docsString);
      } else {
        // If no documents exist, create a default one
        const defaultDoc = createEmptyDocument();
        docs = [defaultDoc];
        localStorage.setItem("documents", JSON.stringify(docs));
      }

      setDocuments(docs);
      documentsRef.current = docs;

      // Load file system
      const fileSystemString = localStorage.getItem(FILE_SYSTEM_KEY);
      let fs = [];

      if (fileSystemString) {
        fs = JSON.parse(fileSystemString);
      } else {
        // Initialize with default structure
        fs = [
          {
            id: "folder-1",
            name: "My Documents",
            type: "folder",
            children: [],
          },
        ];
        localStorage.setItem(FILE_SYSTEM_KEY, JSON.stringify(fs));
      }

      setFileSystem(fs);
      fileSystemRef.current = fs;

      // Ensure all documents exist in the file system
      syncDocumentsWithFileSystem(docs, fs);

      // Get last active document from localStorage
      const lastActiveId = localStorage.getItem("lastActiveDocument");

      // Load saved document tabs from localStorage
      let savedTabs = [];
      try {
        const tabsString = localStorage.getItem(DOCUMENT_TABS_KEY);
        if (tabsString) {
          savedTabs = JSON.parse(tabsString);

          // Ensure the tabs reference valid documents
          savedTabs = savedTabs.filter((tab) =>
            docs.some((doc) => doc.id === tab.id)
          );
        }
      } catch (error) {
        console.error("Error loading saved tabs", error);
        savedTabs = [];
      }

      // If no tabs were saved or the filter removed all tabs, create a default tab
      if (savedTabs.length === 0 && docs.length > 0) {
        const docToUse = lastActiveId && docs.some((doc) =>
            doc.id === lastActiveId
          )
          ? docs.find((doc) => doc.id === lastActiveId)
          : docs[0];

        savedTabs = [{ id: docToUse.id, title: docToUse.title }];
      }

      // Set the tabs
      setDocumentTabs(savedTabs);
      documentTabsRef.current = savedTabs;

      // Set active document
      if (lastActiveId && docs.some((doc) => doc.id === lastActiveId)) {
        setActiveDocumentId(lastActiveId);
        activeDocumentIdRef.current = lastActiveId;
      } else if (savedTabs.length > 0) {
        // If no last active document or it doesn't exist, use first tab
        setActiveDocumentId(savedTabs[0].id);
        activeDocumentIdRef.current = savedTabs[0].id;
      } else if (docs.length > 0) {
        // If no tabs, use first document
        setActiveDocumentId(docs[0].id);
        activeDocumentIdRef.current = docs[0].id;
      }

      setTimeout(() => {
        documentOperationInProgress.current = false;
      }, 50);
    } catch (error) {
      console.error("Error loading documents from localStorage:", error);

      // Create a default document if we encounter an error
      const defaultDoc = createEmptyDocument();
      setDocuments([defaultDoc]);
      documentsRef.current = [defaultDoc];
      setActiveDocumentId(defaultDoc.id);
      activeDocumentIdRef.current = defaultDoc.id;
      localStorage.setItem("documents", JSON.stringify([defaultDoc]));

      // Initialize file system
      const defaultFs = [
        {
          id: "folder-1",
          name: "My Documents",
          type: "folder",
          children: [{
            id: defaultDoc.id,
            name: "New Document.md",
            type: "markdown",
            documentRef: defaultDoc.id,
          }],
        },
      ];

      setFileSystem(defaultFs);
      fileSystemRef.current = defaultFs;
      localStorage.setItem(FILE_SYSTEM_KEY, JSON.stringify(defaultFs));

      // Add to document tabs
      const defaultTabs = [{ id: defaultDoc.id, title: defaultDoc.title }];
      setDocumentTabs(defaultTabs);
      documentTabsRef.current = defaultTabs;
      localStorage.setItem(DOCUMENT_TABS_KEY, JSON.stringify(defaultTabs));

      documentOperationInProgress.current = false;
    }
  }, []);

  // Sync documents with file system
  const syncDocumentsWithFileSystem = (docs, fs) => {
    // Collect all file references in the file system
    const fileIds = new Set();

    const collectIds = (items) => {
      items.forEach((item) => {
        if (item.type !== "folder" && item.documentRef) {
          fileIds.add(item.documentRef);
        }
        if (item.children) {
          collectIds(item.children);
        }
      });
    };

    collectIds(fs);

    // Find documents missing from the file system
    const missingDocs = docs.filter((doc) => !fileIds.has(doc.id));

    if (missingDocs.length > 0) {
      // Update the file system by adding missing documents
      let updatedFs = [...fs];

      // Add missing documents to the first folder
      const firstFolder = updatedFs.find((item) => item.type === "folder");

      if (firstFolder) {
        const updatedFolder = {
          ...firstFolder,
          children: [
            ...(firstFolder.children || []),
            ...missingDocs.map((doc) => ({
              id: doc.id,
              name: `${doc.title}.md`,
              type: "markdown",
              documentRef: doc.id,
            })),
          ],
        };

        updatedFs = updatedFs.map((item) =>
          item.id === firstFolder.id ? updatedFolder : item
        );
      } else {
        // If no folder exists, add documents to root
        updatedFs = [
          ...updatedFs,
          ...missingDocs.map((doc) => ({
            id: doc.id,
            name: `${doc.title}.md`,
            type: "markdown",
            documentRef: doc.id,
          })),
        ];
      }

      // Update file system state and localStorage
      setFileSystem(updatedFs);
      fileSystemRef.current = updatedFs;
      localStorage.setItem(FILE_SYSTEM_KEY, JSON.stringify(updatedFs));
    }
  };

  // Save current document to localStorage - memoized with useCallback
  const saveDocumentToLocalStorage = useCallback((text) => {
    if (!activeDocumentIdRef.current) return false;

    try {
      // Get documents directly from localStorage for the most up-to-date state
      const docsString = localStorage.getItem("documents");
      let currentDocs = [];
      if (docsString) {
        currentDocs = JSON.parse(docsString);
      } else {
        currentDocs = documentsRef.current;
      }

      // Update the document in our state
      const updatedDocs = currentDocs.map((doc) => {
        if (doc.id === activeDocumentIdRef.current) {
          return {
            ...doc,
            content: text,
            updated_at: new Date().toISOString(),
          };
        }
        return doc;
      });

      // Save all documents to localStorage immediately
      localStorage.setItem("documents", JSON.stringify(updatedDocs));

      // Update state with the latest documents
      setDocuments(updatedDocs);
      documentsRef.current = updatedDocs;

      return true;
    } catch (error) {
      console.error("Error in synchronous save:", error);
      return false;
    }
  }, [setDocuments]);

  // Save a new version of the current document - memoized with useCallback
  const saveNewDocumentVersion = useCallback(() => {
    if (!activeDocumentIdRef.current) return;

    try {
      // First get the current document
      const currentDoc = documentsRef.current.find((doc) =>
        doc.id === activeDocumentIdRef.current
      );
      if (!currentDoc) return;

      // Make sure we're saving the latest content from the editor
      const currentDocWithLatestContent = {
        ...currentDoc,
        content: currentContentRef.current, // Use the latest content from the editor
      };

      // Save the current version before incrementing it
      const updatedDoc = saveDocumentVersion(currentDocWithLatestContent);

      // Get latest documents from localStorage
      const docsString = localStorage.getItem("documents");
      let currentDocs = [];
      if (docsString) {
        currentDocs = JSON.parse(docsString);
      } else {
        currentDocs = documentsRef.current;
      }

      // Update document with new version number in our documents array
      const updatedDocs = currentDocs.map((doc) => {
        if (doc.id === activeDocumentIdRef.current) {
          return updatedDoc;
        }
        return doc;
      });

      // Update state and localStorage
      setDocuments(updatedDocs);
      documentsRef.current = updatedDocs;
      localStorage.setItem("documents", JSON.stringify(updatedDocs));

      // Show a notification to the user
      const notificationEvent = new CustomEvent("show-notification", {
        detail: {
          message: `Document saved as version ${updatedDoc.version - 1}`,
        },
      });
      globalThis.dispatchEvent(notificationEvent);

      // Update layout component about the document change
      globalThis.dispatchEvent(
        new CustomEvent("active-document-changed", {
          detail: { document: updatedDoc },
        }),
      );

      return updatedDoc;
    } catch (error) {
      console.error("Error saving document version:", error);
      return null;
    }
  }, []);

  // Get document versions - memoized with useCallback
  const getVersions = useCallback((documentId) => {
    return getDocumentVersions(documentId || activeDocumentIdRef.current);
  }, []);

  // Restore a document version - memoized with useCallback
  const restoreVersion = useCallback((versionId) => {
    if (!activeDocumentIdRef.current) return false;

    try {
      const versionData = restoreDocumentVersion(
        activeDocumentIdRef.current,
        versionId,
      );
      if (!versionData) return false;

      // Get latest documents from localStorage
      const docsString = localStorage.getItem("documents");
      let currentDocs = [];
      if (docsString) {
        currentDocs = JSON.parse(docsString);
      } else {
        currentDocs = documentsRef.current;
      }

      // Update document with restored content
      const updatedDocs = currentDocs.map((doc) => {
        if (doc.id === activeDocumentIdRef.current) {
          return {
            ...doc,
            title: versionData.title,
            content: versionData.content,
            // Keep the version number the same when restoring
            updated_at: new Date().toISOString(),
            metadata: {
              ...doc.metadata,
              restored_from: versionId,
              restored_at: new Date().toISOString(),
            },
          };
        }
        return doc;
      });

      // Update state and localStorage
      setDocuments(updatedDocs);
      documentsRef.current = updatedDocs;
      localStorage.setItem("documents", JSON.stringify(updatedDocs));

      // Update the editor content with the restored content
      skipContentUpdateRef.current = true;
      setMarkdownText(versionData.content);
      currentContentRef.current = versionData.content;

      // Sync title changes with the file system
      globalThis.dispatchEvent(
        new CustomEvent("document-title-changed", {
          detail: { id: activeDocumentIdRef.current, title: versionData.title },
        }),
      );

      // Show a notification to the user
      const notificationEvent = new CustomEvent("show-notification", {
        detail: {
          message: `Restored document to version ${versionData.version}`,
        },
      });
      globalThis.dispatchEvent(notificationEvent);

      // Update document tabs
      const updatedTabs = documentTabsRef.current.map((tab) => {
        if (tab.id === activeDocumentIdRef.current) {
          return { ...tab, title: versionData.title };
        }
        return tab;
      });
      setDocumentTabs(updatedTabs);
      documentTabsRef.current = updatedTabs;
      localStorage.setItem(DOCUMENT_TABS_KEY, JSON.stringify(updatedTabs));

      return true;
    } catch (error) {
      console.error("Error restoring document version:", error);
      return false;
    }
  }, [setMarkdownText]);

  // Create a new document - memoized with useCallback
  const createNewDocument = useCallback(() => {
    try {
      // Set flag to prevent concurrent operations
      documentOperationInProgress.current = true;

      // First, save current document if there is one
      if (activeDocumentIdRef.current) {
        saveDocumentToLocalStorageSync(currentContentRef.current);
      }

      // Create new document
      const newDocId = crypto.randomUUID();
      const now = new Date().toISOString();

      const newDoc = {
        id: newDocId,
        user_id: "current-user",
        uuid: crypto.randomUUID(),
        title: "New Document",
        content:
          "# New Document\n\nStart typing here...\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n",
        version: 1,
        is_published: false,
        created_at: now,
        updated_at: now,
        last_synced_at: now,
        metadata: {},
        folder_id: "root",
      };

      // Get the current state of documents directly from localStorage
      const docsString = localStorage.getItem("documents");
      let currentDocs = [];

      if (docsString) {
        try {
          currentDocs = JSON.parse(docsString);
        } catch (e) {
          console.error("Error parsing documents from localStorage:", e);
          currentDocs = documentsRef.current;
        }
      } else {
        currentDocs = documentsRef.current;
      }

      // Add the new document to the list
      const updatedDocs = [...currentDocs, newDoc];

      // Save the new document list first
      localStorage.setItem("documents", JSON.stringify(updatedDocs));

      // Update localStorage before state changes
      localStorage.setItem("lastActiveDocument", newDocId);

      // Update state
      setDocuments(updatedDocs);
      documentsRef.current = updatedDocs;
      setActiveDocumentId(newDocId);
      activeDocumentIdRef.current = newDocId;

      // Reset content
      skipContentUpdateRef.current = true;
      setMarkdownText(newDoc.content);
      currentContentRef.current = newDoc.content;

      // Reset editing state
      setEditingTitleId(null);

      // Add to document tabs - IMPORTANT: properly preserve existing tabs
      const currentTabs = [...documentTabsRef.current]; // Make a copy of the current tabs
      const newTab = { id: newDocId, title: newDoc.title };
      const updatedTabs = [...currentTabs, newTab];

      setDocumentTabs(updatedTabs);
      documentTabsRef.current = updatedTabs;

      // Save tabs to localStorage
      localStorage.setItem(DOCUMENT_TABS_KEY, JSON.stringify(updatedTabs));

      // Add to file system
      const fileObj = {
        id: newDocId,
        name: "New Document.md",
        type: "markdown",
        documentRef: newDocId,
      };

      // Get current file system
      const fsString = localStorage.getItem(FILE_SYSTEM_KEY);
      let currentFs = [];
      if (fsString) {
        try {
          currentFs = JSON.parse(fsString);
        } catch (e) {
          console.error("Error parsing file system from localStorage:", e);
          currentFs = fileSystemRef.current;
        }
      } else {
        currentFs = fileSystemRef.current;
      }

      // Find first folder to add the document to
      const firstFolder = currentFs.find((item) => item.type === "folder");

      let updatedFs;
      if (firstFolder) {
        updatedFs = currentFs.map((item) => {
          if (item.id === firstFolder.id) {
            return {
              ...item,
              children: [...(item.children || []), fileObj],
            };
          }
          return item;
        });
      } else {
        // If no folder exists, add to root
        updatedFs = [...currentFs, fileObj];
      }

      // Update file system
      setFileSystem(updatedFs);
      fileSystemRef.current = updatedFs;
      localStorage.setItem(FILE_SYSTEM_KEY, JSON.stringify(updatedFs));

      // Notify file system to update
      globalThis.dispatchEvent(new CustomEvent("documents-updated"));

      // Clear the operation flag with a delay to ensure state updates complete
      setTimeout(() => {
        documentOperationInProgress.current = false;
      }, 100);

      return newDoc;
    } catch (error) {
      console.error("Error creating new document:", error);
      documentOperationInProgress.current = false;
      return null;
    }
  }, [saveDocumentToLocalStorageSync, setMarkdownText]);

  // Handle document tab changes - memoized with useCallback
  const handleDocumentChange = useCallback((documentId) => {
    // Don't do anything if we're already on this document or if an operation is in progress
    if (
      documentId === activeDocumentIdRef.current ||
      documentOperationInProgress.current
    ) return;

    try {
      // Set flag to prevent concurrent operations
      documentOperationInProgress.current = true;

      // Save current document before switching
      if (activeDocumentIdRef.current) {
        saveDocumentToLocalStorageSync(currentContentRef.current);
      }

      // Find the document content to load
      const doc = documentsRef.current.find((d) => d.id === documentId);
      if (doc) {
        // Important: Update the markdownText state with new content BEFORE changing active document
        skipContentUpdateRef.current = true;
        setMarkdownText(doc.content);
        currentContentRef.current = doc.content;

        // Notify layout component about the document change
        globalThis.dispatchEvent(
          new CustomEvent("active-document-changed", {
            detail: { document: doc },
          }),
        );
      }

      // Update localStorage first for safety
      localStorage.setItem("lastActiveDocument", documentId);

      // Then, update state
      setActiveDocumentId(documentId);
      activeDocumentIdRef.current = documentId;

      // Add to document tabs if not already there
      if (!documentTabsRef.current.some((tab) => tab.id === documentId)) {
        const docForTab = documentsRef.current.find((d) => d.id === documentId);
        if (docForTab) {
          const updatedTabs = [...documentTabsRef.current, {
            id: documentId,
            title: docForTab.title,
          }];
          setDocumentTabs(updatedTabs);
          documentTabsRef.current = updatedTabs;
          localStorage.setItem(DOCUMENT_TABS_KEY, JSON.stringify(updatedTabs));
        }
      }

      // Reset title editing state
      setEditingTitleId(null);

      // Clear the operation flag with a small delay to ensure state updates complete
      setTimeout(() => {
        documentOperationInProgress.current = false;
      }, 100);
    } catch (error) {
      console.error("Error changing document:", error);
      documentOperationInProgress.current = false;
    }
  }, [saveDocumentToLocalStorageSync, setMarkdownText]);

  // Close a document tab (but don't delete the document)
  const closeDocumentTab = useCallback((e, documentId) => {
    e.stopPropagation(); // Prevent triggering the parent click event

    // Remove document from tabs
    const updatedTabs = documentTabsRef.current.filter((tab) =>
      tab.id !== documentId
    );
    setDocumentTabs(updatedTabs);
    documentTabsRef.current = updatedTabs;

    // Save updated tabs to localStorage
    localStorage.setItem(DOCUMENT_TABS_KEY, JSON.stringify(updatedTabs));

    // If this was the active document, switch to another document
    if (activeDocumentIdRef.current === documentId && updatedTabs.length > 0) {
      handleDocumentChange(updatedTabs[0].id);
    }
  }, [handleDocumentChange]);

  // Delete a document (only called from the sidebar)
  const deleteDocument = useCallback((e, documentId) => {
    e.stopPropagation(); // Prevent triggering the parent click event

    if (documentOperationInProgress.current) return;

    try {
      // Set flag to prevent concurrent operations
      documentOperationInProgress.current = true;

      // Get the latest documents from localStorage
      const docsString = localStorage.getItem("documents");
      let currentDocs = [];

      if (docsString) {
        try {
          currentDocs = JSON.parse(docsString);
        } catch (e) {
          console.error("Error parsing documents from localStorage:", e);
          currentDocs = documentsRef.current;
        }
      } else {
        currentDocs = documentsRef.current;
      }

      // Filter out the document to be deleted
      const updatedDocs = currentDocs.filter((doc) => doc.id !== documentId);

      // Update localStorage first
      localStorage.setItem("documents", JSON.stringify(updatedDocs));

      // Update state
      setDocuments(updatedDocs);
      documentsRef.current = updatedDocs;

      // Remove from tabs
      const updatedTabs = documentTabsRef.current.filter((tab) =>
        tab.id !== documentId
      );
      setDocumentTabs(updatedTabs);
      documentTabsRef.current = updatedTabs;
      localStorage.setItem(DOCUMENT_TABS_KEY, JSON.stringify(updatedTabs));

      // If we're deleting the active document, switch to another document
      if (activeDocumentIdRef.current === documentId) {
        if (updatedTabs.length > 0) {
          // Switch to first remaining tab
          handleDocumentChange(updatedTabs[0].id);
        } else if (updatedDocs.length > 0) {
          // No tabs left but we have documents
          const newActiveId = updatedDocs[0].id;
          const newTabs = [{ id: newActiveId, title: updatedDocs[0].title }];

          setDocumentTabs(newTabs);
          documentTabsRef.current = newTabs;
          localStorage.setItem(DOCUMENT_TABS_KEY, JSON.stringify(newTabs));

          handleDocumentChange(newActiveId);
        } else {
          // No documents left, create a new one
          const newDoc = createEmptyDocument();
          const docsWithNew = [newDoc];
          localStorage.setItem("documents", JSON.stringify(docsWithNew));
          localStorage.setItem("lastActiveDocument", newDoc.id);

          setDocuments(docsWithNew);
          documentsRef.current = docsWithNew;
          setActiveDocumentId(newDoc.id);
          activeDocumentIdRef.current = newDoc.id;

          // Add to tabs
          const newTabs = [{ id: newDoc.id, title: newDoc.title }];
          setDocumentTabs(newTabs);
          documentTabsRef.current = newTabs;
          localStorage.setItem(DOCUMENT_TABS_KEY, JSON.stringify(newTabs));
        }
      }

      // Clear the operation flag with a delay
      setTimeout(() => {
        documentOperationInProgress.current = false;
      }, 100);
    } catch (error) {
      console.error("Error deleting document:", error);
      documentOperationInProgress.current = false;
    }
  }, [handleDocumentChange]);

  // Edit document title - memoized with useCallback
  const startEditingTitle = useCallback((e, documentId, currentTitle) => {
    e.stopPropagation(); // Prevent triggering the document change

    // If title editing is already active or an operation is in progress, ignore
    if (editingTitleId || titleOperationInProgress.current) return;

    titleOperationInProgress.current = true;
    setEditingTitleId(documentId);
    setEditingTitleValue(currentTitle);

    // Focus the input field after it's rendered
    setTimeout(() => {
      if (titleInputRef.current) {
        titleInputRef.current.focus();
        titleInputRef.current.select();
      }
      // Clear the flag after a short delay
      setTimeout(() => {
        titleOperationInProgress.current = false;
      }, 50);
    }, 50);
  }, [editingTitleId]);

  // Handle title input changes
  const handleTitleChange = useCallback((e) => {
    setEditingTitleValue(e.target.value);
  }, []);

  // Save the edited title - memoized with useCallback
  const saveEditedTitle = useCallback(() => {
    if (!editingTitleId || titleOperationInProgress.current) return;

    try {
      titleOperationInProgress.current = true;

      if (!editingTitleValue.trim()) {
        setEditingTitleId(null);
        titleOperationInProgress.current = false;
        return;
      }

      // Get latest documents from localStorage
      const docsString = localStorage.getItem("documents");
      let currentDocs = [];

      if (docsString) {
        try {
          currentDocs = JSON.parse(docsString);
        } catch (e) {
          console.error("Error parsing documents from localStorage:", e);
          currentDocs = documentsRef.current;
        }
      } else {
        currentDocs = documentsRef.current;
      }

      // Update documents with new title
      const updatedDocs = currentDocs.map((doc) => {
        if (doc.id === editingTitleId) {
          const updatedDoc = {
            ...doc,
            title: editingTitleValue.trim(),
            updated_at: new Date().toISOString(),
          };

          // If this is the active document, notify layout of title change
          if (doc.id === activeDocumentIdRef.current) {
            // Dispatch title change event for immediate UI update
            globalThis.dispatchEvent(
              new CustomEvent("file-title-changed", {
                detail: { documentId: doc.id, title: editingTitleValue.trim() },
              }),
            );

            // Keep the existing document-title-changed event for compatibility
            globalThis.dispatchEvent(
              new CustomEvent("document-title-changed", {
                detail: { id: doc.id, title: editingTitleValue.trim() },
              }),
            );
          }

          return updatedDoc;
        }
        return doc;
      });

      // Update state and localStorage
      localStorage.setItem("documents", JSON.stringify(updatedDocs));
      setDocuments(updatedDocs);
      documentsRef.current = updatedDocs;

      // Update document tabs
      const updatedTabs = documentTabsRef.current.map((tab) => {
        if (tab.id === editingTitleId) {
          return { ...tab, title: editingTitleValue.trim() };
        }
        return tab;
      });
      setDocumentTabs(updatedTabs);
      documentTabsRef.current = updatedTabs;
      localStorage.setItem(DOCUMENT_TABS_KEY, JSON.stringify(updatedTabs));

      setEditingTitleId(null);

      // Update file system with new title
      const fileSystemString = localStorage.getItem(FILE_SYSTEM_KEY);
      if (fileSystemString) {
        try {
          const fs = JSON.parse(fileSystemString);

          // Helper function to update file name in file system
          const updateFileName = (items) => {
            return items.map((item) => {
              if (item.documentRef === editingTitleId) {
                // Ensure markdown files have .md extension
                const fileName = editingTitleValue.trim().endsWith(".md")
                  ? editingTitleValue.trim()
                  : `${editingTitleValue.trim()}.md`;

                return { ...item, name: fileName };
              }

              if (item.children && item.children.length > 0) {
                return { ...item, children: updateFileName(item.children) };
              }

              return item;
            });
          };

          const updatedFileSystem = updateFileName(fs);
          localStorage.setItem(
            FILE_SYSTEM_KEY,
            JSON.stringify(updatedFileSystem),
          );
          setFileSystem(updatedFileSystem);
          fileSystemRef.current = updatedFileSystem;
        } catch (error) {
          console.error("Error updating file system:", error);
        }
      }

      // Notify file system to update
      globalThis.dispatchEvent(new CustomEvent("documents-updated"));

      // Clear title operation flag with a delay
      setTimeout(() => {
        titleOperationInProgress.current = false;
      }, 50);
    } catch (error) {
      console.error("Error saving edited title:", error);
      titleOperationInProgress.current = false;
      setEditingTitleId(null);
    }
  }, [editingTitleId, editingTitleValue, activeDocumentIdRef]);

  // Handle title input key events - memoized with useCallback
  const handleTitleKeyDown = useCallback((e) => {
    if (e.key === "Enter") {
      saveEditedTitle();
    } else if (e.key === "Escape") {
      setEditingTitleId(null);
      titleOperationInProgress.current = false;
    }
  }, [saveEditedTitle]);

  return {
    documents,
    activeDocumentId,
    editingTitleId,
    editingTitleValue,
    documentTabs,
    setEditingTitleValue: handleTitleChange,
    titleInputRef,
    createNewDocument,
    handleDocumentChange,
    deleteDocument,
    closeDocumentTab, // New function to close tabs without deleting
    startEditingTitle,
    saveEditedTitle,
    handleTitleKeyDown,
    saveDocumentToLocalStorage,
    saveNewDocumentVersion,
    getVersions,
    restoreVersion,
  };
}
