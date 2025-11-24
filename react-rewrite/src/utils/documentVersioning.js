// src/utils/documentVersioning.js

/**
 * Utility functions for managing document versions
 */

/**
 * Save a new version of a document
 * @param {object} document - The document to save a version of
 * @returns {object} The updated document with incremented version number
 */
export const saveDocumentVersion = (document) => {
    if (!document || !document.id) {
      console.error('Invalid document provided to saveDocumentVersion');
      return document;
    }
  
    try {
      // Get existing versions from localStorage
      const versionsString = localStorage.getItem('document_versions');
      let versions = {};
      
      if (versionsString) {
        versions = JSON.parse(versionsString);
      }
      
      // Initialize this document's versions array if it doesn't exist
      if (!versions[document.id]) {
        versions[document.id] = [];
      }
      
      // Create a version ID that is unique (timestamp + random string)
      const versionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Create a new version object with the unique ID
      const newVersion = {
        id: versionId,
        version: document.version, // Store current version number before incrementing
        title: document.title,
        content: document.content,
        timestamp: new Date().toISOString()
      };
      
      // Add the new version to the document's versions array
      versions[document.id].push(newVersion);
      
      // Save the updated versions back to localStorage
      localStorage.setItem('document_versions', JSON.stringify(versions));
      
      // Return a document with an incremented version number
      return {
        ...document,
        version: document.version + 1,
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error saving document version:', error);
      return document;
    }
  };
  
  /**
   * Get all versions of a document
   * @param {string} documentId - The ID of the document to get versions for
   * @returns {array} Array of document versions
   */
  export const getDocumentVersions = (documentId) => {
    if (!documentId) return [];
    
    try {
      const versionsString = localStorage.getItem('document_versions');
      if (!versionsString) return [];
      
      const versions = JSON.parse(versionsString);
      return versions[documentId] || [];
    } catch (error) {
      console.error('Error getting document versions:', error);
      return [];
    }
  };
  
  /**
   * Restore a specific version of a document without creating a new version first
   * @param {string} documentId - The ID of the document
   * @param {string} versionId - The version ID to restore
   * @returns {object|null} The restored document version or null if not found
   */
  export const restoreDocumentVersion = (documentId, versionId) => {
    if (!documentId || !versionId) return null;
    
    try {
      const allVersions = getDocumentVersions(documentId);
      const versionToRestore = allVersions.find(v => v.id === versionId);
      
      if (!versionToRestore) return null;
      
      return {
        title: versionToRestore.title,
        content: versionToRestore.content,
        version: versionToRestore.version,
        restored_from: versionId,
        restored_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error restoring document version:', error);
      return null;
    }
  };