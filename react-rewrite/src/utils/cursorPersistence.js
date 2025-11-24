// src/utils/cursorPersistence.js

/**
 * Utility functions for managing cursor position persistence
 */

/**
 * Save cursor position for a specific document
 * @param {string} documentId - ID of the current document
 * @param {number} position - Cursor position in the document
 * @param {object} additionalData - Any additional data to store
 */
export const saveCursorPosition = (documentId, position, additionalData = {}) => {
    if (!documentId || position === undefined) return;

    try {
        const data = {
            documentId,
            position,
            timestamp: Date.now(),
            ...additionalData
        };

        localStorage.setItem('lastCursorPosition', JSON.stringify(data));
    } catch (error) {
        console.error('Error saving cursor position:', error);
    }
};

/**
 * Get the last saved cursor position for a document
 * @param {string} documentId - ID of the document to get cursor position for
 * @returns {object|null} - Object with position or null if not found
 */
export const getCursorPosition = (documentId) => {
    try {
        const savedPositionData = localStorage.getItem('lastCursorPosition');

        if (!savedPositionData) return null;

        const data = JSON.parse(savedPositionData);

        // If documentId is provided, only return if it's for the requested document
        if (documentId && data.documentId !== documentId) {
            return null;
        }

        return data;
    } catch (error) {
        console.error('Error retrieving cursor position:', error);
        return null;
    }
};

/**
 * Clear the saved cursor position
 */
export const clearCursorPosition = () => {
    try {
        localStorage.removeItem('lastCursorPosition');
    } catch (error) {
        console.error('Error clearing cursor position:', error);
    }
};

/**
 * Save scroll position for a document
 * @param {string} documentId - ID of the current document
 * @param {number} scrollPercentage - Scroll position as percentage (0-1)
 */
export const saveScrollPosition = (documentId, scrollPercentage) => {
    if (!documentId || scrollPercentage === undefined) return;

    try {
        const data = {
            documentId,
            scrollPercentage,
            timestamp: Date.now()
        };

        localStorage.setItem('lastScrollPosition', JSON.stringify(data));
    } catch (error) {
        console.error('Error saving scroll position:', error);
    }
};

/**
 * Get the last saved scroll position for a document
 * @param {string} documentId - ID of the document to get scroll position for
 * @returns {object|null} - Object with scrollPercentage or null if not found
 */
export const getScrollPosition = (documentId) => {
    try {
        const savedPositionData = localStorage.getItem('lastScrollPosition');

        if (!savedPositionData) return null;

        const data = JSON.parse(savedPositionData);

        // If documentId is provided, only return if it's for the requested document
        if (documentId && data.documentId !== documentId) {
            return null;
        }

        return data;
    } catch (error) {
        console.error('Error retrieving scroll position:', error);
        return null;
    }
};

/**
 * Save both cursor and scroll position in a single operation
 * @param {string} documentId - ID of the current document
 * @param {number} cursorPosition - Cursor position in the document
 * @param {number} scrollPercentage - Scroll position as percentage (0-1)
 */
export const saveEditorState = (documentId, cursorPosition, scrollPercentage) => {
    if (!documentId) return;

    try {
        saveCursorPosition(documentId, cursorPosition);

        if (scrollPercentage !== undefined) {
            saveScrollPosition(documentId, scrollPercentage);
        }
    } catch (error) {
        console.error('Error saving editor state:', error);
    }
};