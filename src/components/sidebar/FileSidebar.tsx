// @ts-check
"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  File,
  FilePlus,
  FileText,
  Folder,
  FolderPlus,
  MoreVertical,
  Trash2,
} from "lucide-react";

// Local storage key for file system
const FILE_SYSTEM_KEY = "txtwFileSystem";

// FileItem component for rendering files and folders
const FileItem = ({
  item,
  depth,
  expandedFolders,
  toggleFolder,
  onRename,
  onDelete,
  onCreateFile,
  onCreateFolder,
  activeDocumentId,
  handleDocumentChange,
  // Drag and drop props
  draggedItem,
  handleDragStart,
  handleDragEnter,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  dropTarget,
  handleDragEnd,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(item.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef(null);
  const inputRef = useRef(null);
  const deletePromptRef = useRef(null);
  const itemRef = useRef(null);

  // Check if this item is the active drop target
  const isDropTarget = dropTarget?.id === item.id;
  const isExpanded = expandedFolders[item.id];
  const isDragging = draggedItem?.id === item.id;

  const paddingLeft = depth * 12 + 12;

  useEffect(() => {
    // Focus the input when renaming starts
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  useEffect(() => {
    // Close menu when clicking outside
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }

      if (
        deletePromptRef.current &&
        !deletePromptRef.current.contains(event.target)
      ) {
        setConfirmDelete(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // In FileSidebar.js, update the handleRename function
  const handleRename = () => {
    if (newName.trim()) {
      onRename(item.id, newName.trim());

      // Add this line to dispatch an event for title updates
      if (item.documentRef) {
        globalThis.dispatchEvent(
          new CustomEvent("file-title-changed", {
            detail: { documentId: item.documentRef, title: newName.trim() },
          }),
        );
      }

      setIsRenaming(false);
      setIsMenuOpen(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleRename();
    } else if (e.key === "Escape") {
      setIsRenaming(false);
      setNewName(item.name);
    }
  };

  // Determine drop indicator styles based on the drop position
  const getDropIndicatorClasses = () => {
    if (!isDropTarget) return "";

    const { position } = dropTarget;

    switch (position) {
      case "top":
        return "before:absolute before:left-0 before:right-0 before:top-0 before:h-1 before:bg-blue-500 before:z-10";
      case "bottom":
        return "after:absolute after:left-0 after:right-0 after:bottom-0 after:h-1 after:bg-blue-500 after:z-10";
      case "inside":
        return item.type === "folder"
          ? "bg-blue-500/10 outline outline-2 outline-blue-500 outline-dashed"
          : "";
      default:
        return "";
    }
  };

  // Don't allow dragging when renaming or confirming delete
  const draggable = !isRenaming && !confirmDelete && !isMenuOpen;

  // Item click handler - for files
  const handleItemClick = (e) => {
    if (
      item.type !== "folder" && !isRenaming && !confirmDelete && !isMenuOpen
    ) {
      e.stopPropagation();
      if (item.documentRef) {
        // Call the handleDocumentChange function from props
        handleDocumentChange(item.documentRef);

        // Also dispatch an event to ensure the content is updated
        globalThis.dispatchEvent(
          new CustomEvent("sidebar-document-changed", {
            detail: { documentId: item.documentRef },
          }),
        );
      }
    }
  };

  // Folder toggle handler
  const handleFolderToggle = (e) => {
    e.stopPropagation();
    if (
      item.type === "folder" && !isRenaming && !confirmDelete && !isMenuOpen
    ) {
      toggleFolder(item.id);
    }
  };

  // Custom drag-and-drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDragStart = (e) => {
    if (!draggable) {
      e.preventDefault();
      return;
    }

    // Set data transfer properties
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ id: item.id, type: item.type }),
    );

    // Add a class to style the dragged element
    setTimeout(() => {
      e.target.classList.add("opacity-50");
    }, 0);

    // Call the parent handler
    handleDragStart(item);
  };

  const onDragEnd = (e) => {
    e.target.classList.remove("opacity-50");
    handleDragEnd();
  };

  const onDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleDragEnter(item, e);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Calculate drop position
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;

    // Determine drop position
    if (item.type === "folder") {
      // For folders:
      // Top 25% - drop above
      // Middle 50% - drop inside
      // Bottom 25% - drop below
      const height = rect.height;
      if (relativeY < height * 0.25) {
        handleDragOver(item, "top", e);
      } else if (relativeY < height * 0.75) {
        handleDragOver(item, "inside", e);
      } else {
        handleDragOver(item, "bottom", e);
      }
    } else {
      // For files, just top half or bottom half
      const height = rect.height;
      if (relativeY < height * 0.5) {
        handleDragOver(item, "top", e);
      } else {
        handleDragOver(item, "bottom", e);
      }
    }
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleDragLeave(item);
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleDrop(item);
  };

  if (item.type === "folder") {
    return (
      <div
        className={`group ${isDragging ? "opacity-50" : ""}`}
        ref={itemRef}
      >
        <div
          className={`flex items-center py-1 px-2 hover:bg-neutral-200 hover:dark:bg-neutral-800 cursor-pointer text-sm relative ${getDropIndicatorClasses()}`}
          onClick={handleFolderToggle}
          draggable={draggable}
          onDrag={handleDrag}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          data-item-id={item.id}
          data-item-type="folder"
        >
          <div
            className="flex items-center w-full"
            style={{ paddingLeft: `${paddingLeft}px` }}
          >
            {isExpanded
              ? (
                <ChevronDown
                  size={14}
                  className="text-neutral-600 dark:text-neutral-400 mr-1"
                />
              )
              : (
                <ChevronRight
                  size={14}
                  className="text-neutral-600 dark:text-neutral-400 mr-1"
                />
              )}
            <Folder
              size={14}
              className="text-neutral-600 dark:text-neutral-400 mr-2"
            />
            {isRenaming
              ? (
                <input
                  ref={inputRef}
                  type="text"
                  className="bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-1 py-0.5 rounded text-xs w-full outline-none border border-neutral-300 dark:border-neutral-600"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onBlur={handleRename}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                />
              )
              : (
                <span className="text-neutral-600 dark:text-neutral-300 truncate">
                  {item.name}
                </span>
              )}
          </div>

          {/* Actions Menu Toggle */}
          {!isRenaming && !confirmDelete && (
            <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical
                size={14}
                className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
              />
            </div>
          )}

          {isMenuOpen && (
            <div
              ref={menuRef}
              className="absolute right-6 top-0 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded shadow-md z-30 min-w-32"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs flex items-center"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateFile(item.id);
                  setIsMenuOpen(false);
                }}
              >
                <FileText size={12} className="mr-2" />
                New File
              </div>
              <div
                className="px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs flex items-center"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateFolder(item.id);
                  setIsMenuOpen(false);
                }}
              >
                <Folder size={12} className="mr-2" />
                New Folder
              </div>
              <div
                className="px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs flex items-center"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRenaming(true);
                  setIsMenuOpen(false);
                }}
              >
                <Edit2 size={12} className="mr-2" />
                Rename
              </div>
              <div
                className="px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs flex items-center"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(true);
                  setIsMenuOpen(false);
                }}
              >
                <Trash2 size={12} className="mr-2" />
                Delete
              </div>
            </div>
          )}

          {confirmDelete && (
            <div
              ref={deletePromptRef}
              className="absolute right-0 top-0 bg-white dark:bg-neutral-900 border border-red-200 dark:border-red-800 rounded shadow-md z-30 p-2 min-w-48"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-neutral-600 dark:text-neutral-300 text-xs mb-2">
                Delete folder "{item.name}" and all contents?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs rounded hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-2 py-1 bg-red-500 dark:bg-red-800 text-white text-xs rounded hover:bg-red-600 dark:hover:bg-red-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                    setConfirmDelete(false);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          )}

          {isDropTarget && dropTarget.position === "inside" && (
            <div className="absolute inset-0 rounded border-2 border-dashed border-blue-300 dark:border-blue-500 bg-blue-200/30 dark:bg-blue-500/10 z-5 pointer-events-none" />
          )}
        </div>

        {/* Render children if expanded */}
        {isExpanded && item.children && (
          <div
            className={isDropTarget && dropTarget.position === "inside"
              ? "pl-2 border-l-2 border-blue-500 border-dashed"
              : ""}
          >
            {item.children.map((child) => (
              <FileItem
                key={child.id}
                item={child}
                depth={depth + 1}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                onRename={onRename}
                onDelete={onDelete}
                onCreateFile={onCreateFile}
                onCreateFolder={onCreateFolder}
                activeDocumentId={activeDocumentId}
                handleDocumentChange={handleDocumentChange}
                draggedItem={draggedItem}
                handleDragStart={handleDragStart}
                handleDragEnter={handleDragEnter}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                handleDrop={handleDrop}
                dropTarget={dropTarget}
                handleDragEnd={handleDragEnd}
              />
            ))}
          </div>
        )}
      </div>
    );
  } else {
    // File item
    const isActive = item.id === activeDocumentId ||
      item.documentRef === activeDocumentId;

    return (
      <div
        className={`group ${isDragging ? "opacity-50" : ""}`}
        ref={itemRef}
      >
        <div
          className={`flex items-center py-1 px-2 hover:bg-neutral-200 hover:dark:bg-neutral-800 cursor-pointer text-sm relative ${
            isActive ? "bg-neutral-200 dark:bg-neutral-800" : ""
          } ${getDropIndicatorClasses()}`}
          onClick={handleItemClick}
          draggable={draggable}
          onDrag={handleDrag}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          data-item-id={item.id}
          data-item-type="file"
        >
          <div
            className="flex items-center w-full"
            style={{ paddingLeft: `${paddingLeft}px` }}
          >
            {item.type === "markdown"
              ? (
                <FileText
                  size={14}
                  className="text-blue-500 dark:text-blue-400 mr-2"
                />
              )
              : (
                <File
                  size={14}
                  className="text-neutral-600 dark:text-neutral-400 mr-2"
                />
              )}

            {isRenaming
              ? (
                <input
                  ref={inputRef}
                  type="text"
                  className="bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-1 py-0.5 rounded text-xs w-full outline-none border border-neutral-300 dark:border-neutral-600"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onBlur={handleRename}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                />
              )
              : (
                <span className="text-neutral-600 dark:text-neutral-300 truncate">
                  {item.name}
                </span>
              )}
          </div>

          {/* Actions Menu Toggle */}
          {!isRenaming && !confirmDelete && (
            <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical
                size={14}
                className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
              />
            </div>
          )}

          {/* Actions Menu */}
          {isMenuOpen && (
            <div
              ref={menuRef}
              className="absolute right-6 top-0 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded shadow-md z-30 min-w-32"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs flex items-center"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRenaming(true);
                  setIsMenuOpen(false);
                }}
              >
                <Edit2 size={12} className="mr-2" />
                Rename
              </div>
              <div
                className="px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-red-500 dark:text-red-400 text-xs flex items-center"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(true);
                  setIsMenuOpen(false);
                }}
              >
                <Trash2 size={12} className="mr-2" />
                Delete
              </div>
            </div>
          )}

          {/* Delete Confirmation */}
          {confirmDelete && (
            <div
              ref={deletePromptRef}
              className="absolute right-0 top-0 bg-white dark:bg-neutral-900 border border-red-200 dark:border-red-800 rounded shadow-md z-30 p-2 min-w-48"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-neutral-600 dark:text-neutral-300 text-xs mb-2">
                Delete file "{item.name}"?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs rounded hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-2 py-1 bg-red-500 dark:bg-red-800 text-white text-xs rounded hover:bg-red-600 dark:hover:bg-red-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                    setConfirmDelete(false);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
};

export default function FileSidebar({
  activeDocumentId,
  handleDocumentChange,
  documents,
  expanded = false,
}) {
  const [expandedFolders, setExpandedFolders] = useState({});
  const [fileSystem, setFileSystem] = useState([]);
  const [fileMap, setFileMap] = useState({});
  // Custom drag and drop state
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  // Load file system from localStorage on init
  useEffect(() => {
    const savedFileSystem = localStorage.getItem(FILE_SYSTEM_KEY);
    if (savedFileSystem) {
      try {
        const parsedFileSystem = JSON.parse(savedFileSystem);
        setFileSystem(parsedFileSystem);

        // Set all root folders to expanded by default
        const initialExpandedState = {};
        parsedFileSystem.forEach((item) => {
          if (item.type === "folder") {
            initialExpandedState[item.id] = true;
          }
        });
        setExpandedFolders(initialExpandedState);
      } catch (error) {
        console.error("Error loading file system from localStorage:", error);
        initializeFileSystem();
      }
    } else {
      initializeFileSystem();
    }
  }, []);

  // Sync existing documents with file system
  useEffect(() => {
    if (documents.length > 0 && fileSystem.length > 0) {
      syncDocumentsWithFileSystem(documents);
    }
  }, [documents, fileSystem]);

  // Generate a flat map of all files and folders for quick lookup
  useEffect(() => {
    const map = {};

    const addToMap = (items, parentId = null) => {
      items.forEach((item) => {
        map[item.id] = { ...item, parentId };
        if (item.children) {
          addToMap(item.children, item.id);
        }
      });
    };

    addToMap(fileSystem);
    setFileMap(map);
  }, [fileSystem]);

  // Initialize the file system with default structure
  const initializeFileSystem = () => {
    const initialFileSystem = [
      {
        id: "folder-1",
        name: "My Documents",
        type: "folder",
        children: [],
      },
    ];

    setFileSystem(initialFileSystem);
    setExpandedFolders({ "folder-1": true });
    localStorage.setItem(FILE_SYSTEM_KEY, JSON.stringify(initialFileSystem));
  };

  // Sync documents from the documents state with our file system
  const syncDocumentsWithFileSystem = (docs) => {
    // Identify documents that are not in the file system yet
    const fileIds = new Set();

    const collectFileIds = (items) => {
      items.forEach((item) => {
        if (item.type !== "folder") {
          fileIds.add(item.id);
          if (item.documentRef) {
            fileIds.add(item.documentRef);
          }
        }
        if (item.children) {
          collectFileIds(item.children);
        }
      });
    };

    collectFileIds(fileSystem);

    // Add any missing documents to the root level
    const missingDocs = docs.filter((doc) => !fileIds.has(doc.id));

    if (missingDocs.length > 0) {
      const updatedFileSystem = [...fileSystem];

      missingDocs.forEach((doc) => {
        updatedFileSystem.push({
          id: doc.id,
          name: doc.title + ".md",
          type: "markdown",
          documentRef: doc.id,
        });
      });

      setFileSystem(updatedFileSystem);
      localStorage.setItem(FILE_SYSTEM_KEY, JSON.stringify(updatedFileSystem));
    }
  };

  // Toggle folder expansion
  const toggleFolder = (folderId) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  // Create a new file
  const handleCreateFile = (parentId = null) => {
    // Generate a new document ID
    const newDocId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Create a new file object
    const newFile = {
      id: newDocId,
      name: "New File.md",
      type: "markdown",
      documentRef: newDocId,
    };

    // Create a new document
    const newDocument = {
      id: newDocId,
      user_id: "current-user",
      uuid: crypto.randomUUID(),
      title: "New File",
      content:
        "# New File\n\nStart typing here...\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n",
      version: 1,
      is_published: false,
      created_at: now,
      updated_at: now,
      last_synced_at: now,
      metadata: {},
      folder_id: parentId || "root",
    };

    // Add the document to localStorage
    const docsString = localStorage.getItem("documents");
    let docs = [];

    if (docsString) {
      docs = JSON.parse(docsString);
    }

    docs.push(newDocument);
    localStorage.setItem("documents", JSON.stringify(docs));

    // Add the file to our file system
    let updatedFileSystem;

    if (parentId) {
      // Add to specific folder
      updatedFileSystem = addItemToFolder(fileSystem, parentId, newFile);
    } else {
      // Add to root
      updatedFileSystem = [...fileSystem, newFile];
    }

    setFileSystem(updatedFileSystem);
    localStorage.setItem(FILE_SYSTEM_KEY, JSON.stringify(updatedFileSystem));

    // Ensure folder is expanded
    if (parentId) {
      setExpandedFolders((prev) => ({
        ...prev,
        [parentId]: true,
      }));
    }

    // Notify the app that documents have changed
    globalThis.dispatchEvent(new CustomEvent("documents-updated"));
  };

  // Create a new folder
  const handleCreateFolder = (parentId = null) => {
    // Create a new folder object
    const newFolder = {
      id: `folder-${Date.now()}`,
      name: "New Folder",
      type: "folder",
      children: [],
    };

    // Add the folder to our file system
    let updatedFileSystem;

    if (parentId) {
      // Add to specific folder
      updatedFileSystem = addItemToFolder(fileSystem, parentId, newFolder);

      // Ensure parent folder is expanded
      setExpandedFolders((prev) => ({
        ...prev,
        [parentId]: true,
      }));
    } else {
      // Add to root
      updatedFileSystem = [...fileSystem, newFolder];
    }

    // Ensure new folder is expanded
    setExpandedFolders((prev) => ({
      ...prev,
      [newFolder.id]: true,
    }));

    setFileSystem(updatedFileSystem);
    localStorage.setItem(FILE_SYSTEM_KEY, JSON.stringify(updatedFileSystem));
  };

  // Add an item to a specific folder
  const addItemToFolder = (items, folderId, newItem) => {
    return items.map((item) => {
      if (item.id === folderId) {
        return {
          ...item,
          children: [...(item.children || []), newItem],
        };
      }

      if (item.children) {
        return {
          ...item,
          children: addItemToFolder(item.children, folderId, newItem),
        };
      }

      return item;
    });
  };

  // Rename file or folder
  const handleRename = (itemId, newName) => {
    const updatedFileSystem = updateItemInFileSystem(
      fileSystem,
      itemId,
      (item) => {
        // For files, update both the file name and document title
        if (item.type !== "folder" && item.documentRef) {
          // Update document in localStorage
          const docsString = localStorage.getItem("documents");
          if (docsString) {
            const docs = JSON.parse(docsString);
            const updatedDocs = docs.map((doc) => {
              if (doc.id === item.documentRef) {
                // Keep the .md extension for file names
                const baseName = newName.endsWith(".md")
                  ? newName.slice(0, -3)
                  : newName;

                return {
                  ...doc,
                  title: baseName,
                  updated_at: new Date().toISOString(),
                };
              }
              return doc;
            });

            localStorage.setItem("documents", JSON.stringify(updatedDocs));

            // Notify document title changed
            globalThis.dispatchEvent(
              new CustomEvent("document-title-changed", {
                detail: {
                  id: item.documentRef,
                  title: newName.endsWith(".md")
                    ? newName.slice(0, -3)
                    : newName,
                },
              }),
            );
          }

          // Ensure filenames have .md extension for markdown files
          const fileName = item.type === "markdown" && !newName.endsWith(".md")
            ? `${newName}.md`
            : newName;
          return { ...item, name: fileName };
        }

        // For folders, just update the name
        return { ...item, name: newName };
      },
    );

    setFileSystem(updatedFileSystem);
    localStorage.setItem(FILE_SYSTEM_KEY, JSON.stringify(updatedFileSystem));
  };

  // Delete file or folder
  const handleDelete = (itemId) => {
    // Find the item and its parent
    const item = fileMap[itemId];

    if (!item) return;

    // For documents, check if this is the active document
    if (item.type !== "folder" && item.documentRef) {
      // If deleting a document, update documents in localStorage
      const docsString = localStorage.getItem("documents");
      if (docsString) {
        const docs = JSON.parse(docsString);
        const updatedDocs = docs.filter((doc) => doc.id !== item.documentRef);
        localStorage.setItem("documents", JSON.stringify(updatedDocs));
      }
    }

    // Remove from file system
    let updatedFileSystem;

    if (item.parentId) {
      // If it has a parent, update that parent's children
      updatedFileSystem = updateItemInFileSystem(
        fileSystem,
        item.parentId,
        (parentItem) => ({
          ...parentItem,
          children: parentItem.children.filter((child) => child.id !== itemId),
        }),
      );
    } else {
      // If it's at the root level, filter it from the root array
      updatedFileSystem = fileSystem.filter((fsItem) => fsItem.id !== itemId);
    }

    setFileSystem(updatedFileSystem);
    localStorage.setItem(FILE_SYSTEM_KEY, JSON.stringify(updatedFileSystem));

    // Notify the app that documents have changed
    globalThis.dispatchEvent(new CustomEvent("documents-updated"));
  };

  // Update an item in the file system tree
  const updateItemInFileSystem = (items, itemId, updateFn) => {
    return items.map((item) => {
      if (item.id === itemId) {
        return updateFn(item);
      }

      if (item.children) {
        return {
          ...item,
          children: updateItemInFileSystem(item.children, itemId, updateFn),
        };
      }

      return item;
    });
  };

  // Custom drag and drop handlers
  const handleDragStart = (item) => {
    setDraggedItem(item);
    setDropTarget(null);
  };

  const handleDragEnter = (item, _event) => {
    // Prevent dropping an item onto itself
    if (draggedItem && draggedItem.id === item.id) {
      setDropTarget(null);
      return;
    }

    // Prevent dropping a folder into itself or its descendants
    if (draggedItem && draggedItem.type === "folder") {
      let currentItem = item;
      while (currentItem && currentItem.parentId) {
        if (currentItem.parentId === draggedItem.id) {
          setDropTarget(null);
          return;
        }
        currentItem = fileMap[currentItem.parentId];
      }
    }
  };

  const handleDragOver = (item, position, _event) => {
    // Prevent dropping an item onto itself
    if (draggedItem && draggedItem.id === item.id) {
      setDropTarget(null);
      return;
    }

    // Update the drop target with position information
    setDropTarget({ id: item.id, position });
  };

  const handleDragLeave = (item) => {
    if (dropTarget && dropTarget.id === item.id) {
      setDropTarget(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTarget(null);
  };

  const handleDrop = (targetItem) => {
    // If no valid drag or drop target, do nothing
    if (!draggedItem || !dropTarget || !targetItem) {
      setDraggedItem(null);
      setDropTarget(null);
      return;
    }

    // Get the necessary information
    const draggedId = draggedItem.id;
    const targetId = targetItem.id;
    const position = dropTarget.position;

    // 1. Clone the file system to work with
    let updatedFileSystem = [...fileSystem];

    // 2. Get the dragged item data
    const draggedItemData = fileMap[draggedId];
    if (!draggedItemData) {
      setDraggedItem(null);
      setDropTarget(null);
      return;
    }

    // 3. Remove the dragged item from its original location
    if (draggedItemData.parentId) {
      // If it has a parent, remove from the parent's children
      updatedFileSystem = updateItemInFileSystem(
        updatedFileSystem,
        draggedItemData.parentId,
        (parent) => ({
          ...parent,
          children: parent.children.filter((child) => child.id !== draggedId),
        }),
      );
    } else {
      // If it's at the root level, filter it out
      updatedFileSystem = updatedFileSystem.filter((item) =>
        item.id !== draggedId
      );
    }

    // 4. Add the dragged item to the new location
    if (position === "inside" && targetItem.type === "folder") {
      // Add inside a folder
      updatedFileSystem = updateItemInFileSystem(
        updatedFileSystem,
        targetId,
        (folder) => ({
          ...folder,
          children: [...(folder.children || []), draggedItemData],
        }),
      );

      // Expand the target folder
      setExpandedFolders((prev) => ({
        ...prev,
        [targetId]: true,
      }));

      // Update document folder_id if it's a document
      if (draggedItemData.documentRef) {
        updateDocumentFolderId(draggedItemData.documentRef, targetId);
      }
    } else {
      // For top or bottom positions
      const targetParentId = fileMap[targetId]?.parentId;

      if (targetParentId) {
        // Target has a parent folder
        updatedFileSystem = updateItemInFileSystem(
          updatedFileSystem,
          targetParentId,
          (parent) => {
            const newChildren = [...parent.children];
            const targetIndex = newChildren.findIndex((child) =>
              child.id === targetId
            );

            // Add at the correct position
            if (position === "top") {
              newChildren.splice(targetIndex, 0, draggedItemData);
            } else {
              newChildren.splice(targetIndex + 1, 0, draggedItemData);
            }

            return {
              ...parent,
              children: newChildren,
            };
          },
        );

        // Update document folder_id if it's a document
        if (draggedItemData.documentRef) {
          updateDocumentFolderId(draggedItemData.documentRef, targetParentId);
        }
      } else {
        // Target is at root level
        const targetIndex = updatedFileSystem.findIndex((item) =>
          item.id === targetId
        );

        // Add at the correct position
        if (position === "top") {
          updatedFileSystem.splice(targetIndex, 0, draggedItemData);
        } else {
          updatedFileSystem.splice(targetIndex + 1, 0, draggedItemData);
        }

        // Update document folder_id if it's a document
        if (draggedItemData.documentRef) {
          updateDocumentFolderId(draggedItemData.documentRef, "root");
        }
      }
    }

    // 5. Save the updated file system
    setFileSystem(updatedFileSystem);
    localStorage.setItem(FILE_SYSTEM_KEY, JSON.stringify(updatedFileSystem));

    // 6. Clean up drag state
    setDraggedItem(null);
    setDropTarget(null);
  };

  // Update a document's folder_id
  const updateDocumentFolderId = (documentId, folderId) => {
    const docsString = localStorage.getItem("documents");
    if (docsString) {
      try {
        const docs = JSON.parse(docsString);
        const updatedDocs = docs.map((doc) => {
          if (doc.id === documentId) {
            return {
              ...doc,
              folder_id: folderId,
              updated_at: new Date().toISOString(),
            };
          }
          return doc;
        });

        localStorage.setItem("documents", JSON.stringify(updatedDocs));
      } catch (error) {
        console.error("Error updating document folder_id:", error);
      }
    }
  };

  // Root level action buttons
  const renderRootActions = () => (
    <div className="flex flex-row pe-2">
      <button
        type="button"
        onClick={() => handleCreateFile()}
        className="flex items-center px-1.5 py-1 hover:bg-neutral-200 hover:dark:bg-neutral-700 rounded text-xs text-neutral-400 dark:text-neutral-300"
      >
        <FilePlus size={12} />
      </button>
      <button
        type="button"
        onClick={() => handleCreateFolder()}
        className="flex items-center px-1.5 py-1 hover:bg-neutral-200 hover:dark:bg-neutral-700 rounded text-xs text-neutral-400 dark:text-neutral-300"
      >
        <FolderPlus size={12} />
      </button>
    </div>
  );

  // Create a dragging ghost element to show what's being dragged
  const _createDragGhost = (item) => {
    const ghost = document.createElement("div");

    ghost.className =
      "fixed top-0 left-0 bg-neutral-900 border border-blue-500 px-3 py-1 rounded shadow-md opacity-90 z-50 pointer-events-none";

    const icon = document.createElement("span");
    icon.className = "mr-2 inline-block";

    if (item.type === "folder") {
      icon.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';
    } else {
      icon.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>';
    }

    const text = document.createElement("span");
    text.textContent = item.name;
    text.className = "text-neutral-300 text-sm";

    ghost.appendChild(icon);
    ghost.appendChild(text);
    document.body.appendChild(ghost);

    return ghost;
  };

  return (
    <div className="mt-4 w-full overflow-y-auto flex flex-col h-full">
      <div className="flex flex-col">
        {expanded && (
          <div className="items-center flex flex-row justify-between border-neutral-800 mb-2 py-1.5">
            <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 px-3">
              Files
            </h3>
            {renderRootActions()}
          </div>
        )}

        {/* File Tree with Custom Drag and Drop */}
        <div className="flex flex-col">
          {fileSystem.map((item) => (
            <FileItem
              key={item.id}
              item={item}
              depth={0}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              onRename={handleRename}
              onDelete={handleDelete}
              onCreateFile={handleCreateFile}
              onCreateFolder={handleCreateFolder}
              activeDocumentId={activeDocumentId}
              handleDocumentChange={handleDocumentChange}
              draggedItem={draggedItem}
              handleDragStart={handleDragStart}
              handleDragEnter={handleDragEnter}
              handleDragOver={handleDragOver}
              handleDragLeave={handleDragLeave}
              handleDrop={handleDrop}
              dropTarget={dropTarget}
              handleDragEnd={handleDragEnd}
            />
          ))}
        </div>
      </div>

      {/* Footer links - preserved from original sidebar */}
      <div className="flex flex-col items-start justify-start pb-4 pt-2 px-2 gap-y-1 border-t-4 border-neutral-200 dark:border-neutral-800 mt-auto">
        {
          /* <div className="flex items-center py-1 px-2 hover:bg-neutral-800 cursor-pointer text-sm w-full">
                    <CreditCard size={14} className="text-neutral-400 mr-2" />
                    <span className="text-neutral-300">Premium</span>
                </div> */
        }
        <a
          href="https://github.com/kubeden/txtwrite"
          target="_blank"
          className="flex items-center py-2 px-2 hover:bg-neutral-200 hover:dark:bg-neutral-800 cursor-pointer text-sm w-full rounded-sm"
        >
          <span className="text-neutral-600 dark:text-neutral-300">
            Support
          </span>
        </a>
        {
          /* <div className="flex items-center py-1 px-2 hover:bg-neutral-800 cursor-pointer text-sm w-full">
                    <LogOut size={14} className="text-neutral-400 mr-2" />
                    <span className="text-neutral-300">Logout</span>
                </div> */
        }
      </div>
    </div>
  );
}
