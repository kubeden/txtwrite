'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import {
    createMarkdownExtensions,
    themeCompartment,
    guttersCompartment,
    lightTheme,
    darkTheme,
} from './CodeMirrorSetup';
import {
    FaBold,
    FaItalic,
    FaListUl,
    FaListOl,
    FaTable,
    FaQuoteRight,
    FaImage,
    FaHeading,
    FaLink,
    FaCode,
    FaCheckSquare,
    FaChevronUp,
    FaChevronDown,
} from 'react-icons/fa';

import {
    PanelRightClose,
    PanelRight,
    Eye,
    EyeOff
} from 'lucide-react'

export default function CodeMirrorEditor({
    markdownText,
    onTextChange,
    onScroll,
    saveDocumentToLocalStorage,
    setEditStatus,
    isDarkMode,
    editorViewRef,
    isMobile,
    isPreviewVisible,
    togglePreview,
    onEditorReady
}) {
    const editorRef = useRef(null);
    const localViewRef = useRef(null);
    const toolbarScrollRef = useRef(null);
    const toolbarRef = useRef(null); // Add ref for toolbar container
    const [isEditorReady, setIsEditorReady] = useState(false);
    const contentRef = useRef(markdownText);
    const isUpdatingRef = useRef(false);
    const lastCursorPositionRef = useRef(null);
    const debounceTimerRef = useRef(null);
    const initializationCompleteRef = useRef(false);

    // New state to track keyboard visibility
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    // New state to track toolbar collapse state
    const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);

    // Update the content reference when markdownText changes
    useEffect(() => {
        contentRef.current = markdownText;
    }, [markdownText]);

    // Toggle toolbar collapsed state
    const toggleToolbar = useCallback(() => {
        setIsToolbarCollapsed(prev => !prev);

        // Store preference in localStorage
        localStorage.setItem('toolbarCollapsed', (!isToolbarCollapsed).toString());
    }, [isToolbarCollapsed]);

    // Load toolbar collapsed preference on init
    useEffect(() => {
        if (isMobile) {
            const savedPreference = localStorage.getItem('toolbarCollapsed');
            if (savedPreference !== null) {
                setIsToolbarCollapsed(savedPreference === 'true');
            }
        }
    }, [isMobile]);

    // Memoized text change handler to prevent unnecessary re-renders
    const handleDocChange = useCallback((newText) => {
        // Prevent infinite loops
        if (isUpdatingRef.current || newText === contentRef.current || !initializationCompleteRef.current) return;

        // Mark as actively typing
        isActivelyTypingRef.current = true;

        // Reset any existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set timeout to consider typing stopped after inactivity
        typingTimeoutRef.current = setTimeout(() => {
            isActivelyTypingRef.current = false;
        }, 1000);

        // Track cursor position for localStorage
        if (localViewRef.current) {
            const state = localViewRef.current.state;
            const pos = state.selection.main.head;
            lastCursorPositionRef.current = pos;
        }

        // Update the content reference immediately
        contentRef.current = newText;

        // Immediately pass the changes to the parent - no debouncing here
        onTextChange(newText);
        setEditStatus('editing');
    }, [onTextChange, setEditStatus]);

    // Initialize CodeMirror editor
    useEffect(() => {
        if (!editorRef.current || localViewRef.current) return;

        // Create editor extensions
        const extensions = createMarkdownExtensions(
            isDarkMode,
            handleDocChange,
            onScroll
        );

        // Create editor state
        const state = EditorState.create({
            doc: markdownText,
            extensions
        });

        // Create editor view
        const view = new EditorView({
            state,
            parent: editorRef.current
        });

        localViewRef.current = view;
        if (editorViewRef) {
            editorViewRef.current = view;
        }

        // Add scrollToPercentage method to the view
        view.scrollToPercentage = (percentage) => {
            const { scrollHeight, clientHeight } = view.scrollDOM;
            const scrollTop = percentage * (scrollHeight - clientHeight);
            view.scrollDOM.scrollTop = scrollTop;
        };

        // Set a small delay before restoring cursor position to ensure the editor is fully initialized
        setTimeout(() => {
            try {
                // Restore cursor position if available
                const savedPositionData = localStorage.getItem('lastCursorPosition');
                if (savedPositionData) {
                    const { documentId, position } = JSON.parse(savedPositionData);
                    const currentDocId = localStorage.getItem('lastActiveDocument');

                    // Make sure we have a valid position that's within the document length
                    if (documentId === currentDocId && position !== undefined) {
                        // Get document content length
                        const docLength = view.state.doc.length;

                        // Make sure the position is valid (not beyond document length)
                        const safePosition = Math.min(position, docLength);

                        // Only apply if the position is valid
                        if (safePosition >= 0 && safePosition <= docLength) {
                            const transaction = view.state.update({
                                selection: { anchor: safePosition, head: safePosition }
                            });
                            view.dispatch(transaction);
                        }

                        // Focus the editor
                        view.focus();
                    }
                }
            } catch (error) {
                console.error('Error restoring cursor position:', error);
            }

            // Mark the editor as ready
            setIsEditorReady(true);
            initializationCompleteRef.current = true;

            // Notify parent component that editor is ready
            if (onEditorReady) {
                onEditorReady();
            }
        }, 200);

        return () => {
            view.destroy();
            localViewRef.current = null;
            if (editorViewRef) {
                editorViewRef.current = null;
            }
            initializationCompleteRef.current = false;
        };
    }, []);

    // Update theme when dark mode changes - wrapped in useCallback to optimize performance
    useEffect(() => {
        if (localViewRef.current) {
            localViewRef.current.dispatch({
                effects: [
                    themeCompartment.reconfigure(isDarkMode ? darkTheme : lightTheme),
                ]
            });
        }
    }, [isDarkMode]);

    // On mobile, adjust the editor's padding to make room for the bottom toolbar
    useEffect(() => {
        if (localViewRef.current && isMobile) {
            const editorDom = localViewRef.current.dom;
            // Adjust padding based on toolbar collapsed state
            editorDom.style.paddingBottom = isToolbarCollapsed ? '40px' : '80px';
        }
    }, [isMobile, isToolbarCollapsed]);

    // Track active typing to prevent cursor position restoration during typing
    const isActivelyTypingRef = useRef(false);
    const typingTimeoutRef = useRef(null);

    // Create a function to mark the user as actively typing
    const markAsActivelyTyping = useCallback(() => {
        isActivelyTypingRef.current = true;

        // Clear any existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Reset the actively typing flag after a period of inactivity
        typingTimeoutRef.current = setTimeout(() => {
            isActivelyTypingRef.current = false;
        }, 1000); // 1 second of inactivity before we consider typing to be stopped
    }, []);

    // Add event listeners for keypresses to track active typing
    useEffect(() => {
        if (!localViewRef.current) return;

        const handleKeyDown = () => {
            markAsActivelyTyping();
        };

        localViewRef.current.dom.addEventListener('keydown', handleKeyDown);

        return () => {
            if (localViewRef.current) {
                localViewRef.current.dom.removeEventListener('keydown', handleKeyDown);
            }
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [markAsActivelyTyping]);

    // Update content when document changes - this is key for document tab switching
    useEffect(() => {
        if (localViewRef.current && markdownText !== localViewRef.current.state.doc.toString()) {
            // Don't replace text if user is actively typing
            if (isActivelyTypingRef.current) {
                return;
            }

            // Set flag to prevent handleDocChange from firing during programmatic update
            isUpdatingRef.current = true;

            const transaction = localViewRef.current.state.update({
                changes: {
                    from: 0,
                    to: localViewRef.current.state.doc.length,
                    insert: markdownText
                }
            });

            localViewRef.current.dispatch(transaction);

            // Only restore cursor position if we're not actively typing
            // and if we're switching documents or loading a document
            try {
                const savedPositionData = localStorage.getItem('lastCursorPosition');
                if (savedPositionData && !isActivelyTypingRef.current) {
                    const { documentId, position } = JSON.parse(savedPositionData);
                    const currentDocId = localStorage.getItem('lastActiveDocument');

                    if (documentId === currentDocId && position !== undefined) {
                        // Check that the position is valid for the current document
                        const docLength = localViewRef.current.state.doc.length;

                        // Make sure position is not beyond the document length
                        const safePosition = Math.min(position, docLength);

                        if (safePosition >= 0 && safePosition <= docLength) {
                            const selTransaction = localViewRef.current.state.update({
                                selection: { anchor: safePosition, head: safePosition }
                            });
                            localViewRef.current.dispatch(selTransaction);
                        }
                    }
                }
            } catch (error) {
                console.error('Error restoring cursor position after document change:', error);
            }

            // Reset flag after a short delay to ensure the update completes
            setTimeout(() => {
                isUpdatingRef.current = false;
            }, 50);
        }
    }, [markdownText]);

    // Save cursor position on click and cursor movement
    useEffect(() => {
        if (!localViewRef.current || !initializationCompleteRef.current) return;

        const handleCursorActivity = () => {
            if (!localViewRef.current || isUpdatingRef.current) return;

            const state = localViewRef.current.state;
            const pos = state.selection.main.head;
            lastCursorPositionRef.current = pos;

            // Debounce saving to localStorage
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            debounceTimerRef.current = setTimeout(() => {
                const currentDocId = localStorage.getItem('lastActiveDocument');
                if (currentDocId) {
                    localStorage.setItem('lastCursorPosition', JSON.stringify({
                        documentId: currentDocId,
                        position: pos
                    }));
                }
            }, 500);
        };

        const view = localViewRef.current;

        // Use DOM events to capture clicks and key events
        view.dom.addEventListener('click', handleCursorActivity);
        view.dom.addEventListener('keyup', handleCursorActivity);

        return () => {
            if (view && view.dom) {
                view.dom.removeEventListener('click', handleCursorActivity);
                view.dom.removeEventListener('keyup', handleCursorActivity);
            }
        };
    }, []);

    // NEW: Add keyboard detection using visualViewport API
    useEffect(() => {
        if (!isMobile) return;

        // Function to adjust toolbar position based on viewport changes
        const handleViewportChange = () => {
            if (!window.visualViewport) return;

            const viewportHeight = window.visualViewport.height;
            const windowHeight = window.innerHeight;

            // If viewport height is significantly less than window height, keyboard is likely visible
            const isKeyboardVisible = viewportHeight < windowHeight * 0.8;

            if (toolbarRef.current) {
                if (isKeyboardVisible) {
                    // Keyboard is visible, position toolbar above it
                    const keyboardHeight = windowHeight - viewportHeight + 10;
                    toolbarRef.current.style.bottom = `${keyboardHeight}px`;
                    setKeyboardVisible(true);
                } else {
                    // Keyboard is hidden, reset toolbar position
                    toolbarRef.current.style.bottom = '1.25rem'; // Original bottom position
                    setKeyboardVisible(false);
                }
            }
        };

        // Listen for viewport changes
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportChange);
            window.visualViewport.addEventListener('scroll', handleViewportChange);
        }

        // Also listen for focus events on the editor to detect when keyboard might appear
        const handleFocus = () => {
            // Small delay to let the keyboard appear first
            setTimeout(handleViewportChange, 300);
        };

        if (localViewRef.current) {
            localViewRef.current.dom.addEventListener('focus', handleFocus);
        }

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleViewportChange);
                window.visualViewport.removeEventListener('scroll', handleViewportChange);
            }

            if (localViewRef.current) {
                localViewRef.current.dom.removeEventListener('focus', handleFocus);
            }
        };
    }, [isMobile]);

    // Formatting functions - memoized with useCallback
    const formatText = useCallback((startChars, endChars = '') => {
        if (!localViewRef.current || !initializationCompleteRef.current) return;

        const { state, dispatch } = localViewRef.current;
        const selection = state.selection.main;
        const selectedText = state.sliceDoc(selection.from, selection.to);

        let transaction;
        if (selection.empty) {
            // No selection, just insert the markers and place cursor between them
            transaction = state.update({
                changes: {
                    from: selection.from,
                    to: selection.from,
                    insert: startChars + endChars
                },
                selection: { anchor: selection.from + startChars.length }
            });
        } else {
            // Wrap selected text with markers
            transaction = state.update({
                changes: {
                    from: selection.from,
                    to: selection.to,
                    insert: startChars + selectedText + endChars
                },
                selection: { anchor: selection.from + startChars.length, head: selection.from + startChars.length + selectedText.length }
            });
        }

        dispatch(transaction);
        localViewRef.current.focus();
    }, []);

    // Multi-line formatting (for lists, etc.)
    const formatMultiLine = useCallback((linePrefix) => {
        if (!localViewRef.current || !initializationCompleteRef.current) return;

        const { state, dispatch } = localViewRef.current;
        const selection = state.selection.main;
        const selectedText = state.sliceDoc(selection.from, selection.to);

        if (selectedText) {
            // Apply to each line
            const lines = selectedText.split('\n');
            const formattedText = lines.map(line => `${linePrefix}${line}`).join('\n');

            dispatch(state.update({
                changes: {
                    from: selection.from,
                    to: selection.to,
                    insert: formattedText
                },
                selection: { anchor: selection.from, head: selection.from + formattedText.length }
            }));
        } else {
            // Just insert the prefix at current position
            dispatch(state.update({
                changes: {
                    from: selection.from,
                    to: selection.from,
                    insert: linePrefix
                },
                selection: { anchor: selection.from + linePrefix.length }
            }));
        }

        localViewRef.current.focus();
    }, []);

    // Memoized formatting handlers
    const handleBold = useCallback(() => formatText('**', '**'), [formatText]);
    const handleItalic = useCallback(() => formatText('*', '*'), [formatText]);
    const handleHeading = useCallback(() => formatText('## ', ''), [formatText]);
    const handleLink = useCallback(() => formatText('[Link text](', ')'), [formatText]);
    const handleImage = useCallback(() => formatText('![Alt text](', ' "Image title")'), [formatText]);
    const handleQuote = useCallback(() => formatMultiLine('> '), [formatMultiLine]);
    const handleUnorderedList = useCallback(() => formatMultiLine('- '), [formatMultiLine]);
    const handleCheckbox = useCallback(() => formatMultiLine('- [ ] '), [formatMultiLine]);
    const handleCode = useCallback(() => formatText('```\n', '\n```'), [formatText]);

    // Numbered list formatting needs special handling for incrementing numbers
    const formatOrderedList = useCallback(() => {
        if (!localViewRef.current || !initializationCompleteRef.current) return;

        const { state, dispatch } = localViewRef.current;
        const selection = state.selection.main;
        const selectedText = state.sliceDoc(selection.from, selection.to);

        if (selectedText) {
            const lines = selectedText.split('\n');
            const formattedText = lines.map((line, i) => `${i + 1}. ${line}`).join('\n');

            dispatch(state.update({
                changes: {
                    from: selection.from,
                    to: selection.to,
                    insert: formattedText
                },
                selection: { anchor: selection.from, head: selection.from + formattedText.length }
            }));
        } else {
            dispatch(state.update({
                changes: {
                    from: selection.from,
                    to: selection.from,
                    insert: '1. '
                },
                selection: { anchor: selection.from + 3 }
            }));
        }

        localViewRef.current.focus();
    }, []);

    const handleTable = useCallback(() => {
        formatText('\n| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Row 1, Col 1 | Row 1, Col 2 | Row 1, Col 3 |\n| Row 2, Col 1 | Row 2, Col 2 | Row 2, Col 3 |\n\n', '');
    }, [formatText]);

    const handleOrderedList = useCallback(() => formatOrderedList(), [formatOrderedList]);

    return (
        <div className="w-full h-full flex flex-col md:flex-row relative overflow-hidden">
            <div className="flex flex-1 relative overflow-hidden">
                <div ref={editorRef} className="w-full h-full overflow-auto md:pb-0" />
            </div>

            {/* Desktop toolbar - hidden on mobile */}
            {isEditorReady && !isMobile && (
                <div className="hidden md:flex flex-col items-center justify-between bg-neutral-100 dark:bg-neutral-900 top-0 right-2 overflow-hidden w-8 h-full ms-2">
                    <div className="flex flex-col items-center p-2">
                        <button onClick={handleBold} className="p-1 text-neutral-300 dark:text-neutral-700 hover:text-neutral-500 rounded" title="Bold">
                            <FaBold />
                        </button>
                        <button onClick={handleItalic} className="p-1 text-neutral-300 dark:text-neutral-700 hover:text-neutral-500 rounded" title="Italic">
                            <FaItalic />
                        </button>
                        <button onClick={handleHeading} className="p-1 text-neutral-300 dark:text-neutral-700 hover:text-neutral-500 rounded" title="Heading">
                            <FaHeading />
                        </button>
                        <span className="mx-1 text-neutral-600 py-4"> </span>
                        <button onClick={handleUnorderedList} className="p-1 text-neutral-300 dark:text-neutral-700 hover:text-neutral-500 rounded" title="Bullet List">
                            <FaListUl />
                        </button>
                        <button onClick={handleOrderedList} className="p-1 text-neutral-300 dark:text-neutral-700 hover:text-neutral-500 rounded" title="Numbered List">
                            <FaListOl />
                        </button>
                        <button onClick={handleCheckbox} className="p-1 text-neutral-300 dark:text-neutral-700 hover:text-neutral-500 rounded" title="Checkbox">
                            <FaCheckSquare />
                        </button>
                        <span className="mx-1 text-neutral-600 py-4"></span>
                        <button onClick={handleLink} className="p-1 text-neutral-300 dark:text-neutral-700 hover:text-neutral-500 rounded" title="Link">
                            <FaLink />
                        </button>
                        <button onClick={handleImage} className="p-1 text-neutral-300 dark:text-neutral-700 hover:text-neutral-500 rounded" title="Image">
                            <FaImage />
                        </button>
                        <button onClick={handleCode} className="p-1 text-neutral-300 dark:text-neutral-700 hover:text-neutral-500 rounded" title="Code Block">
                            <FaCode />
                        </button>
                        <button onClick={handleQuote} className="p-1 text-neutral-300 dark:text-neutral-700 hover:text-neutral-500 rounded" title="Quote">
                            <FaQuoteRight />
                        </button>
                        <button onClick={handleTable} className="p-1 text-neutral-300 dark:text-neutral-700 hover:text-neutral-500 rounded" title="Table">
                            <FaTable />
                        </button>
                    </div>

                    <div className="flex flex-col items-center">
                        <button
                            onClick={togglePreview}
                            className="p-1 text-neutral-300 dark:text-neutral-700 hover:text-neutral-500 rounded"
                            title={isPreviewVisible ? "Hide Preview" : "Show Preview"}
                        >
                            {isPreviewVisible ? <Eye /> : <EyeOff />}
                        </button>
                        <button
                            onClick={togglePreview}
                            className="p-1 text-neutral-300 dark:text-neutral-700 hover:text-neutral-500 rounded"
                            title={isPreviewVisible ? "Hide Preview" : "Show Preview"}
                        >
                            {isPreviewVisible ? <PanelRightClose /> : <PanelRight />}
                        </button>
                    </div>
                </div>
            )}

            {/* Mobile Toolbar with Chevron for collapsing/expanding */}
            {isEditorReady && isMobile && (
                <div
                    ref={toolbarRef}
                    className={`md:hidden fixed left-5 right-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md z-50 transition-all duration-200 ${keyboardVisible ? 'pb-2' : 'bottom-5'}`}
                    style={{
                        transitionProperty: 'bottom, transform',
                        willChange: 'bottom, transform'
                    }}
                >
                    {/* Top bar with title/indicator and chevron */}
                    <div className="flex justify-between items-center px-3 py-1 border-b border-neutral-200 dark:border-neutral-700">
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            {isToolbarCollapsed ? "Format" : "Formatting Tools"}
                        </span>
                        <button
                            className="p-1 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
                            onClick={toggleToolbar}
                        >
                            {isToolbarCollapsed ? (
                                <FaChevronUp size={14} />
                            ) : (
                                <FaChevronDown size={14} />
                            )}
                        </button>
                    </div>

                    {/* Horizontally scrollable toolbar - conditionally rendered based on collapsed state */}
                    {!isToolbarCollapsed && (
                        <div
                            ref={toolbarScrollRef}
                            className="flex items-center overflow-x-auto py-2 px-1 scrollbar-hide"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                        >
                            {/* First group - Common formatting options */}
                            <div className="flex space-x-1 px-2">
                                <button onClick={handleBold} className="p-2 min-w-[44px] flex flex-col items-center text-neutral-800 dark:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg" title="Bold">
                                    <FaBold size={18} />
                                </button>
                                <button onClick={handleItalic} className="p-2 min-w-[44px] flex flex-col items-center text-neutral-800 dark:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg" title="Italic">
                                    <FaItalic size={18} />
                                </button>
                                <button onClick={handleHeading} className="p-2 min-w-[44px] flex flex-col items-center text-neutral-800 dark:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg" title="Heading">
                                    <FaHeading size={18} />
                                </button>
                            </div>

                            {/* Separator */}
                            <div className="h-10 px-[1px] rounded-xs bg-neutral-100 dark:bg-neutral-700 mx-2"></div>

                            {/* Second group - Lists */}
                            <div className="flex space-x-1 px-2">
                                <button onClick={handleUnorderedList} className="p-2 min-w-[44px] flex flex-col items-center text-neutral-800 dark:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg" title="Bullet List">
                                    <FaListUl size={18} />
                                </button>
                                <button onClick={handleOrderedList} className="p-2 min-w-[44px] flex flex-col items-center text-neutral-800 dark:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg" title="Numbered List">
                                    <FaListOl size={18} />
                                </button>
                                <button onClick={handleCheckbox} className="p-2 min-w-[44px] flex flex-col items-center text-neutral-800 dark:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg" title="Checkbox">
                                    <FaCheckSquare size={18} />
                                </button>
                            </div>

                            {/* Separator */}
                            <div className="h-10 px-[1px] rounded-xs bg-neutral-100 dark:bg-neutral-700 mx-2"></div>

                            {/* Third group - Links and media */}
                            <div className="flex space-x-1 px-2">
                                <button onClick={handleLink} className="p-2 min-w-[44px] flex flex-col items-center text-neutral-800 dark:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg" title="Link">
                                    <FaLink size={18} />
                                </button>
                                <button onClick={handleImage} className="p-2 min-w-[44px] flex flex-col items-center text-neutral-800 dark:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg" title="Image">
                                    <FaImage size={18} />
                                </button>
                            </div>

                            {/* Separator */}
                            <div className="h-10 px-[1px] rounded-xs bg-neutral-100 dark:bg-neutral-700 mx-2"></div>

                            {/* Fourth group - Code, quotes, tables */}
                            <div className="flex space-x-1 px-2">
                                <button onClick={handleCode} className="p-2 min-w-[44px] flex flex-col items-center text-neutral-800 dark:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg" title="Code Block">
                                    <FaCode size={18} />
                                </button>
                                <button onClick={handleQuote} className="p-2 min-w-[44px] flex flex-col items-center text-neutral-800 dark:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg" title="Quote">
                                    <FaQuoteRight size={18} />
                                </button>
                                <button onClick={handleTable} className="p-2 min-w-[44px] flex flex-col items-center text-neutral-800 dark:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg" title="Table">
                                    <FaTable size={18} />
                                </button>
                            </div>
                            <div className="flex space-x-1 px-2">
                                <button onClick={handleCode} className="p-2 min-w-[44px] flex flex-col items-center text-neutral-800 dark:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg" title="Code Block">
                                    <FaCode size={18} />
                                </button>
                                <button onClick={handleQuote} className="p-2 min-w-[44px] flex flex-col items-center text-neutral-800 dark:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg" title="Quote">
                                    <FaQuoteRight size={18} />
                                </button>
                                <button onClick={handleTable} className="p-2 min-w-[44px] flex flex-col items-center text-neutral-800 dark:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg" title="Table">
                                    <FaTable size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}