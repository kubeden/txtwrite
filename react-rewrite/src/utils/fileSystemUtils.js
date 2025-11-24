// src/utils/fileSystemUtils.js

/**
 * Utility functions for managing file system in localStorage
 */

// Local storage keys
export const FILE_SYSTEM_KEY = 'txtwFileSystem';

/**
 * Generate a unique ID for a file or folder
 * @param {string} type - 'file' or 'folder'
 * @returns {string} - A unique ID
 */
export const generateUniqueId = (type) => {
    return type === 'folder'
        ? `folder-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        : crypto.randomUUID();
};

/**
 * Load the file system from localStorage
 * @returns {Array} - The file system array
 */
export const loadFileSystem = () => {
    try {
        const savedFileSystem = localStorage.getItem(FILE_SYSTEM_KEY);
        if (savedFileSystem) {
            return JSON.parse(savedFileSystem);
        }
    } catch (error) {
        console.error('Error loading file system:', error);
    }
    return [];
};

/**
 * Save the file system to localStorage
 * @param {Array} fileSystem - The file system to save
 */
export const saveFileSystem = (fileSystem) => {
    try {
        localStorage.setItem(FILE_SYSTEM_KEY, JSON.stringify(fileSystem));
    } catch (error) {
        console.error('Error saving file system:', error);
    }
};

/**
 * Initialize a new file system with default structure
 * @returns {Array} - A default file system structure
 */
export const initializeFileSystem = () => {
    const initialFileSystem = [
        {
            id: 'folder-root',
            name: 'My Documents',
            type: 'folder',
            children: []
        }
    ];

    saveFileSystem(initialFileSystem);
    return initialFileSystem;
};

/**
 * Generate a flat map of all files and folders for quick lookup
 * @param {Array} fileSystem - The file system array
 * @returns {Object} - A map of all items with their parent IDs
 */
export const generateFileMap = (fileSystem) => {
    const map = {};

    const addToMap = (items, parentId = null) => {
        items.forEach(item => {
            map[item.id] = { ...item, parentId };
            if (item.children) {
                addToMap(item.children, item.id);
            }
        });
    };

    addToMap(fileSystem);
    return map;
};

/**
 * Find an item in the file system by ID
 * @param {Array} fileSystem - The file system array
 * @param {string} itemId - The ID of the item to find
 * @returns {Object|null} - The found item or null
 */
export const findItemById = (fileSystem, itemId) => {
    const map = generateFileMap(fileSystem);
    return map[itemId] || null;
};

/**
 * Add a new item to a parent folder
 * @param {Array} fileSystem - The file system array
 * @param {string|null} parentId - The parent folder ID or null for root
 * @param {Object} newItem - The new item to add
 * @returns {Array} - The updated file system
 */
export const addItemToFolder = (fileSystem, parentId, newItem) => {
    if (!parentId) {
        return [...fileSystem, newItem];
    }

    return fileSystem.map(item => {
        if (item.id === parentId) {
            return {
                ...item,
                children: [...(item.children || []), newItem]
            };
        }

        if (item.children) {
            return {
                ...item,
                children: addItemToFolder(item.children, parentId, newItem)
            };
        }

        return item;
    });
};

/**
 * Remove an item from the file system
 * @param {Array} fileSystem - The file system array
 * @param {string} itemId - The ID of the item to remove
 * @returns {Array} - The updated file system
 */
export const removeItemFromFileSystem = (fileSystem, itemId) => {
    // If the item is at the root level, filter it out
    const rootFiltered = fileSystem.filter(item => item.id !== itemId);

    if (rootFiltered.length < fileSystem.length) {
        return rootFiltered;
    }

    // Otherwise, look for it in children
    return fileSystem.map(item => {
        if (item.children) {
            const filteredChildren = item.children.filter(child => child.id !== itemId);

            if (filteredChildren.length < item.children.length) {
                return {
                    ...item,
                    children: filteredChildren
                };
            }

            return {
                ...item,
                children: removeItemFromFileSystem(item.children, itemId)
            };
        }

        return item;
    });
};

/**
 * Update an item in the file system
 * @param {Array} fileSystem - The file system array
 * @param {string} itemId - The ID of the item to update
 * @param {Function} updateFn - Function that takes the item and returns updated item
 * @returns {Array} - The updated file system
 */
export const updateItemInFileSystem = (fileSystem, itemId, updateFn) => {
    return fileSystem.map(item => {
        if (item.id === itemId) {
            return updateFn(item);
        }

        if (item.children) {
            return {
                ...item,
                children: updateItemInFileSystem(item.children, itemId, updateFn)
            };
        }

        return item;
    });
};

/**
 * Move an item from one location to another in the file system
 * @param {Array} fileSystem - The file system array
 * @param {string} itemId - The ID of the item to move
 * @param {string|null} targetId - The ID of the target (folder or sibling item) or null for root
 * @param {boolean} asChild - If true, add as child of target; if false, add as sibling
 * @returns {Array} - The updated file system
 */
export const moveItemInFileSystem = (fileSystem, itemId, targetId, asChild = false) => {
    // Find the item and its current location
    const fileMap = generateFileMap(fileSystem);
    const itemToMove = fileMap[itemId];

    if (!itemToMove) return fileSystem;

    // First, remove the item from its current location
    let updatedFileSystem = removeItemFromFileSystem(fileSystem, itemId);

    // Then, add it to the new location
    if (!targetId) {
        // Add to root if no target
        return [...updatedFileSystem, itemToMove];
    }

    const targetItem = fileMap[targetId];

    if (!targetItem) return updatedFileSystem;

    if (asChild && targetItem.type === 'folder') {
        // Add as a child of the target folder
        return updateItemInFileSystem(
            updatedFileSystem,
            targetId,
            folder => ({
                ...folder,
                children: [...(folder.children || []), itemToMove]
            })
        );
    } else {
        // Add as a sibling of the target
        const targetParentId = targetItem.parentId;

        if (targetParentId) {
            // If target has a parent, add to that parent's children
            return updateItemInFileSystem(
                updatedFileSystem,
                targetParentId,
                parent => {
                    const newChildren = [...parent.children];
                    const targetIndex = newChildren.findIndex(child => child.id === targetId);

                    newChildren.splice(targetIndex + 1, 0, itemToMove);

                    return {
                        ...parent,
                        children: newChildren
                    };
                }
            );
        } else {
            // If target is at root, add to root
            const targetIndex = updatedFileSystem.findIndex(item => item.id === targetId);
            updatedFileSystem.splice(targetIndex + 1, 0, itemToMove);
            return updatedFileSystem;
        }
    }
};

/**
 * Get the path to an item in the file system
 * @param {Object} fileMap - The file map from generateFileMap
 * @param {string} itemId - The ID of the item
 * @returns {Array} - Array of parent IDs from root to the item (excluding the item itself)
 */
export const getPathToItem = (fileMap, itemId) => {
    const path = [];
    let currentId = itemId;
    let item = fileMap[currentId];

    while (item && item.parentId) {
        path.unshift(item.parentId);
        currentId = item.parentId;
        item = fileMap[currentId];
    }

    return path;
};

/**
 * Create a new document file in the file system
 * @param {string|null} parentId - The parent folder ID or null for root
 * @param {string} fileName - The name of the file
 * @returns {Object} - The created file object
 */
export const createDocumentFile = (parentId = null, fileName = 'New File') => {
    const id = generateUniqueId('file');
    const now = new Date().toISOString();

    // Ensure the file has .md extension
    const normalizedFileName = fileName.endsWith('.md') ? fileName : `${fileName}.md`;
    const baseName = normalizedFileName.slice(0, -3); // Remove .md for the document title

    // Create the file object for the file system
    const fileObj = {
        id,
        name: normalizedFileName,
        type: 'markdown',
        documentRef: id
    };

    // Create the document object for document storage
    const document = {
        id,
        user_id: 'current-user',
        uuid: crypto.randomUUID(),
        title: baseName,
        content: `# ${baseName}\n\nStart typing here...`,
        version: 1,
        is_published: false,
        created_at: now,
        updated_at: now,
        last_synced_at: now,
        metadata: {},
        folder_id: parentId || 'root'
    };

    // Save the document to localStorage
    const docsString = localStorage.getItem('documents');
    let docs = [];

    if (docsString) {
        try {
            docs = JSON.parse(docsString);
        } catch (e) {
            console.error('Error parsing documents from localStorage:', e);
        }
    }

    docs.push(document);
    localStorage.setItem('documents', JSON.stringify(docs));

    // Get the current file system
    let fileSystem = loadFileSystem();

    // Add the file to the file system
    fileSystem = addItemToFolder(fileSystem, parentId, fileObj);
    saveFileSystem(fileSystem);

    return { fileObj, document };
};

/**
 * Create a new folder in the file system
 * @param {string|null} parentId - The parent folder ID or null for root
 * @param {string} folderName - The name of the folder
 * @returns {Object} - The created folder object
 */
export const createFolder = (parentId = null, folderName = 'New Folder') => {
    const folder = {
        id: generateUniqueId('folder'),
        name: folderName,
        type: 'folder',
        children: []
    };

    // Get the current file system
    let fileSystem = loadFileSystem();

    // Add the folder to the file system
    fileSystem = addItemToFolder(fileSystem, parentId, folder);
    saveFileSystem(fileSystem);

    return folder;
};

/**
 * Sync the documents with the file system
 * @param {Array} documents - The documents array
 */
export const syncDocumentsWithFileSystem = (documents) => {
    if (!documents || documents.length === 0) return;

    let fileSystem = loadFileSystem();
    if (fileSystem.length === 0) {
        fileSystem = initializeFileSystem();
    }

    // Collect all file IDs in the file system
    const fileMap = generateFileMap(fileSystem);
    const fileIds = new Set(
        Object.keys(fileMap).filter(id => fileMap[id].type !== 'folder')
    );

    // Add any missing documents to the root
    const missingDocs = documents.filter(doc => !fileIds.has(doc.id));
    let updatedFileSystem = [...fileSystem];

    missingDocs.forEach(doc => {
        const fileObj = {
            id: doc.id,
            name: `${doc.title}.md`,
            type: 'markdown',
            documentRef: doc.id
        };

        // If the document has a folder_id that exists in our file system, add it there
        if (doc.folder_id && doc.folder_id !== 'root' && fileMap[doc.folder_id]) {
            updatedFileSystem = addItemToFolder(updatedFileSystem, doc.folder_id, fileObj);
        } else {
            // Otherwise add to root
            updatedFileSystem.push(fileObj);
        }
    });

    if (missingDocs.length > 0) {
        saveFileSystem(updatedFileSystem);
    }

    return updatedFileSystem;
};

// Add this function to better handle document synchronization
export const updateFileSystemForDocument = (fileSystem, document) => {
    const fileMap = generateFileMap(fileSystem);
    const existingFile = Object.values(fileMap).find(
        item => item.documentRef === document.id
    );

    if (!existingFile) {
        const newFile = {
            id: document.id,
            name: `${document.title}.md`,
            type: 'markdown',
            documentRef: document.id
        };

        // Add to appropriate folder
        return addItemToFolder(fileSystem, document.folder_id || 'root', newFile);
    }

    // Update existing file name if needed
    return updateItemInFileSystem(fileSystem, existingFile.id, (item) => ({
        ...item,
        name: `${document.title}.md`
    }));
};