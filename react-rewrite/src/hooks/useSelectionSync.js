'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook to synchronize text selection and cursor position between the editor and preview
 */
export default function useSelectionSync(textareaRef, previewRef) {
    // Selection state
    const [selection, setSelection] = useState({
        start: 0,
        end: 0,
        active: false,
        text: ''
    });

    // Cursor position state
    const [cursorPosition, setCursorPosition] = useState({
        line: 1,
        column: 1,
        charIndex: 0
    });

    // Track if the editor has focus
    const [editorHasFocus, setEditorHasFocus] = useState(false);

    // Update selection when text is selected in the editor
    const handleEditorSelection = () => {
        if (!textareaRef.current) return;

        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = textareaRef.current.value.substring(start, end);

        setSelection({
            start,
            end,
            active: start !== end,
            text
        });

        // Calculate cursor position (line and column)
        const textUpToCursor = textareaRef.current.value.substring(0, end);
        const lines = textUpToCursor.split('\n');
        const lineNumber = lines.length;
        const columnNumber = lines[lines.length - 1].length + 1;

        setCursorPosition({
            line: lineNumber,
            column: columnNumber,
            charIndex: end
        });
    };

    // Handle editor focus and blur
    const handleEditorFocus = () => setEditorHasFocus(true);
    const handleEditorBlur = () => setEditorHasFocus(false);

    // Find the corresponding elements in the preview that match the selected text
    const highlightPreviewSelection = () => {
        if (!previewRef.current || !selection.active) return;

        // Remove any existing highlights
        const existingHighlights = previewRef.current.querySelectorAll('.preview-highlight');
        existingHighlights.forEach(el => {
            const parent = el.parentNode;
            if (parent) {
                // Replace the highlight span with its original content
                const fragment = document.createDocumentFragment();
                while (el.firstChild) {
                    fragment.appendChild(el.firstChild);
                }
                parent.replaceChild(fragment, el);
            }
        });

        if (!selection.text) return;

        // This is a simplified approach that works for exact text matches
        // For a more accurate implementation, you'd need position-aware markdown parsing
        const previewContent = previewRef.current;
        const searchText = selection.text;

        if (searchText.trim() === '') return;

        // Use a TreeWalker to find text nodes in the preview
        const walker = document.createTreeWalker(
            previewContent,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let currentNode;

        // Collect all text nodes
        while (currentNode = walker.nextNode()) {
            textNodes.push(currentNode);
        }

        // Check each text node for the search text
        textNodes.forEach(node => {
            const nodeText = node.textContent || '';
            const index = nodeText.indexOf(searchText);

            if (index > -1) {
                // Create a highlight span
                const highlightSpan = document.createElement('span');
                highlightSpan.className = 'preview-highlight';

                // Split the text node and highlight the matched part
                const before = nodeText.substring(0, index);
                const matched = nodeText.substring(index, index + searchText.length);
                const after = nodeText.substring(index + searchText.length);

                const beforeNode = document.createTextNode(before);
                const matchedNode = document.createTextNode(matched);
                const afterNode = document.createTextNode(after);

                highlightSpan.appendChild(matchedNode);

                // Replace the text node with our three new nodes
                const parent = node.parentNode;
                if (parent) {
                    parent.insertBefore(beforeNode, node);
                    parent.insertBefore(highlightSpan, node);
                    parent.insertBefore(afterNode, node);
                    parent.removeChild(node);
                }
            }
        });
    };

    // Show the cursor position in the preview
    const updateCursorIndicator = () => {
        if (!previewRef.current || !editorHasFocus) return;

        // Remove existing cursor indicators
        const existingCursors = document.querySelectorAll('.preview-cursor');
        existingCursors.forEach(el => el.remove());

        // This is a simplified approach - a more accurate implementation would
        // map the exact cursor position to the rendered markdown
        // For now, we'll just scroll to approximately the right position

        if (previewRef.current && textareaRef.current) {
            // Estimate the relative position
            const editorHeight = textareaRef.current.scrollHeight;
            const previewHeight = previewRef.current.scrollHeight;
            const ratio = previewHeight / editorHeight;
            const cursorPos = textareaRef.current.value.substring(0, cursorPosition.charIndex).length;
            const relativePos = cursorPos / textareaRef.current.value.length;

            // Create cursor indicator
            const cursorIndicator = document.createElement('div');
            cursorIndicator.className = 'preview-cursor';
            cursorIndicator.style.position = 'absolute';
            cursorIndicator.style.left = '0';
            cursorIndicator.style.width = '2px';
            cursorIndicator.style.backgroundColor = '#3b82f6';
            cursorIndicator.style.animation = 'cursor-blink 1s infinite';

            // Add the cursor indicator to a relative point in the preview
            // This is an approximation and won't be perfectly accurate for all markdown
            previewRef.current.appendChild(cursorIndicator);

            // Position it at approximately the right spot
            setTimeout(() => {
                const previewDom = previewRef.current.querySelector('.markdown-body');
                if (previewDom) {
                    const allElements = Array.from(previewDom.querySelectorAll('*'));
                    const totalElements = allElements.length;
                    const targetIndex = Math.floor(totalElements * relativePos);
                    const targetElement = allElements[Math.min(targetIndex, totalElements - 1)];

                    if (targetElement) {
                        const rect = targetElement.getBoundingClientRect();
                        const previewRect = previewRef.current.getBoundingClientRect();

                        cursorIndicator.style.top = `${rect.top - previewRect.top}px`;
                        cursorIndicator.style.height = `${rect.height}px`;
                    }
                }
            }, 0);
        }
    };

    // Set up event listeners
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.addEventListener('select', handleEditorSelection);
            textareaRef.current.addEventListener('click', handleEditorSelection);
            textareaRef.current.addEventListener('keyup', handleEditorSelection);
            textareaRef.current.addEventListener('focus', handleEditorFocus);
            textareaRef.current.addEventListener('blur', handleEditorBlur);

            // Initial position
            handleEditorSelection();
        }

        return () => {
            if (textareaRef.current) {
                textareaRef.current.removeEventListener('select', handleEditorSelection);
                textareaRef.current.removeEventListener('click', handleEditorSelection);
                textareaRef.current.removeEventListener('keyup', handleEditorSelection);
                textareaRef.current.removeEventListener('focus', handleEditorFocus);
                textareaRef.current.removeEventListener('blur', handleEditorBlur);
            }
        };
    }, [textareaRef.current]);

    // Update preview highlights when selection changes
    useEffect(() => {
        highlightPreviewSelection();
    }, [selection, previewRef.current]);

    // Update cursor indicator when cursor position changes
    useEffect(() => {
        updateCursorIndicator();
    }, [cursorPosition, editorHasFocus, previewRef.current]);

    return {
        selection,
        cursorPosition,
        editorHasFocus
    };
}