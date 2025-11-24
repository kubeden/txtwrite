// src/utils/documentSyncUtils.js

/**
 * Utility functions for synchronizing documents between file system and document tabs
 */

// Constants for event names
export const EVENT_TYPES = {
    DOCUMENT_CREATED: 'document-created',
    DOCUMENT_DELETED: 'document-deleted',
    DOCUMENT_TITLE_CHANGED: 'document-title-changed',
    DOCUMENT_CONTENT_CHANGED: 'document-content-changed',
    DOCUMENT_SWITCHED: 'document-switched',
    FILE_SYSTEM_UPDATED: 'file-system-updated',
    DOCUMENTS_UPDATED: 'documents-updated'
};

/**
 * Create a custom event with optional detail data
 * @param {string} eventType - The type of event
 * @param {object} detail - The event details
 * @returns {CustomEvent} - A custom event
 */
export const createEvent = (eventType, detail = {}) => {
    return new CustomEvent(eventType, { detail });
};

/**
 * Dispatch a document event
 * @param {string} eventType - The type of event
 * @param {object} detail - The event details
 */
export const dispatchDocumentEvent = (eventType, detail = {}) => {
    window.dispatchEvent(createEvent(eventType, detail));
};

/**
 * Synchronize document title with file system
 * @param {string} documentId - The document ID
 * @param {string} title - The new title
 */
export const synchronizeDocumentTitle = (documentId, title) => {
    if (!documentId || !title) return;

    try {
        // 1. Update document in documents storage
        const docsString = localStorage.getItem('documents');
        if (docsString) {
            const docs = JSON.parse(docsString);
            const updatedDocs = docs.map(doc => {
                if (doc.id === documentId) {
                    return {
                        ...doc,
                        title,
                        updated_at: new Date().toISOString()
                    };
                }
                return doc;
            });
            localStorage.setItem('documents', JSON.stringify(updatedDocs));
        }

        // 2. Update file in file system
        const fileSystemString = localStorage.getItem('txtwFileSystem');
        if (fileSystemString) {
            const fileSystem = JSON.parse(fileSystemString);

            // Helper function to find and update file
            const updateFileName = (items) => {
                return items.map(item => {
                    if (item.documentRef === documentId) {
                        // Ensure markdown files have .md extension
                        const fileName = title.endsWith('.md') ? title : `${title}.md`;
                        return { ...item, name: fileName };
                    }

                    if (item.children && item.children.length > 0) {
                        return { ...item, children: updateFileName(item.children) };
                    }

                    return item;
                });
            };

            const updatedFileSystem = updateFileName(fileSystem);
            localStorage.setItem('txtwFileSystem', JSON.stringify(updatedFileSystem));
        }

        // 3. Dispatch events to notify components
        dispatchDocumentEvent(EVENT_TYPES.DOCUMENT_TITLE_CHANGED, { documentId, title });
        dispatchDocumentEvent(EVENT_TYPES.FILE_SYSTEM_UPDATED);
    } catch (error) {
        console.error('Error synchronizing document title:', error);
    }
};

/**
 * Handle document deletion
 * @param {string} documentId - The ID of the document to delete
 */
export const handleDocumentDeletion = (documentId) => {
    if (!documentId) return;

    try {
        // 1. Remove from documents storage
        const docsString = localStorage.getItem('documents');
        if (docsString) {
            const docs = JSON.parse(docsString);
            const updatedDocs = docs.filter(doc => doc.id !== documentId);
            localStorage.setItem('documents', JSON.stringify(updatedDocs));
        }

        // 2. Dispatch event to notify components
        dispatchDocumentEvent(EVENT_TYPES.DOCUMENT_DELETED, { documentId });
        dispatchDocumentEvent(EVENT_TYPES.DOCUMENTS_UPDATED);

        // Note: We're NOT removing from file system as per requirement
    } catch (error) {
        console.error('Error handling document deletion:', error);
    }
};

/**
 * Get the active document
 * @returns {object|null} - The active document or null
 */
export const getActiveDocument = () => {
    try {
        const activeDocumentId = localStorage.getItem('lastActiveDocument');
        if (!activeDocumentId) return null;

        const docsString = localStorage.getItem('documents');
        if (!docsString) return null;

        const docs = JSON.parse(docsString);
        return docs.find(doc => doc.id === activeDocumentId) || null;
    } catch (error) {
        console.error('Error getting active document:', error);
        return null;
    }
};

/**
 * Switch to a different document
 * @param {string} documentId - The ID of the document to switch to
 */
export const switchToDocument = (documentId) => {
    if (!documentId) return;

    localStorage.setItem('lastActiveDocument', documentId);
    dispatchDocumentEvent(EVENT_TYPES.DOCUMENT_SWITCHED, { documentId });
};

/**
 * Get document by ID
 * @param {string} documentId - The document ID
 * @returns {object|null} - The document or null if not found
 */
export const getDocumentById = (documentId) => {
    if (!documentId) return null;

    try {
        const docsString = localStorage.getItem('documents');
        if (!docsString) return null;

        const docs = JSON.parse(docsString);
        return docs.find(doc => doc.id === documentId) || null;
    } catch (error) {
        console.error('Error getting document by ID:', error);
        return null;
    }
};