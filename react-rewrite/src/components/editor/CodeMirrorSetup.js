import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { EditorState, Compartment } from '@codemirror/state';
import {
    EditorView,
    highlightActiveLine,
    highlightActiveLineGutter,
    keymap,
    lineNumbers
} from '@codemirror/view';
import {
    defaultKeymap,
    history,
    historyKeymap,
    indentWithTab
} from '@codemirror/commands';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';

// Create a custom highlight style specifically for markdown
export const markdownHighlightStyle = HighlightStyle.define([
    // Original styles (unchanged)
    { tag: tags.heading, fontWeight: 'bold', class: 'cm-heading' },
    { tag: tags.heading1, fontSize: '1.6em', class: 'cm-heading-1' },
    { tag: tags.heading2, fontSize: '1.4em', class: 'cm-heading-2' },
    { tag: tags.heading3, fontSize: '1.2em', class: 'cm-heading-3' },
    { tag: tags.heading4, fontSize: '1.0em', class: 'cm-heading-4' },
    { tag: tags.strong, fontWeight: 'bold', class: 'cm-strong' },
    { tag: tags.emphasis, fontStyle: 'italic', class: 'cm-emphasis' },
    { tag: tags.link, color: '#0077cc', class: 'cm-link' },
    { tag: tags.url, color: '#0077cc', class: 'cm-url' },
    { tag: tags.escape, color: '#0077cc', class: 'cm-escape' },
    
    // Add styling for inline code (backticks)
    { tag: tags.monospace, fontFamily: 'monospace', class: 'cm-inline-code' },
    
    // Add styling for blockquotes (>)
    { tag: tags.quote, class: 'cm-blockquote' },

    // Add styling for lists (ordered and unordered)
    { tag: tags.list, class: 'cm-list' }
]);

// Create a theme compartment for easy updates
export const themeCompartment = new Compartment();

// Create a light theme with Markdown-specific styling
export const lightTheme = EditorView.theme({
    '&': {
        height: '100%',
        fontSize: 'inherit',
        fontFamily: 'inherit',
    },
});

// Create a dark theme with Markdown-specific styling
export const darkTheme = EditorView.theme({

});

// Performance optimizations - we create this once and reuse
const createFormattingKeymap = (() => {
    const keymap = [
        // Bold: Ctrl/Cmd + B
        {
            key: "Mod-b",
            run: (view) => {
                const { state, dispatch } = view;
                const selection = state.selection.main;
                const selectedText = state.sliceDoc(selection.from, selection.to);

                if (selection.empty) {
                    // No selection, just insert the markers and place cursor between them
                    dispatch(state.update({
                        changes: {
                            from: selection.from,
                            to: selection.from,
                            insert: "****"
                        },
                        selection: { anchor: selection.from + 2 }
                    }));
                } else {
                    // Wrap selected text with markers
                    dispatch(state.update({
                        changes: {
                            from: selection.from,
                            to: selection.to,
                            insert: `**${selectedText}**`
                        },
                        selection: {
                            anchor: selection.from + 2,
                            head: selection.from + 2 + selectedText.length
                        }
                    }));
                }
                return true;
            }
        },

        // Italic: Ctrl/Cmd + I
        {
            key: "Mod-i",
            run: (view) => {
                const { state, dispatch } = view;
                const selection = state.selection.main;
                const selectedText = state.sliceDoc(selection.from, selection.to);

                if (selection.empty) {
                    // No selection, just insert the markers and place cursor between them
                    dispatch(state.update({
                        changes: {
                            from: selection.from,
                            to: selection.from,
                            insert: "**"
                        },
                        selection: { anchor: selection.from + 1 }
                    }));
                } else {
                    // Wrap selected text with markers
                    dispatch(state.update({
                        changes: {
                            from: selection.from,
                            to: selection.to,
                            insert: `*${selectedText}*`
                        },
                        selection: {
                            anchor: selection.from + 1,
                            head: selection.from + 1 + selectedText.length
                        }
                    }));
                }
                return true;
            }
        },

        // Link: Ctrl/Cmd + K
        {
            key: "Mod-k",
            run: (view) => {
                const { state, dispatch } = view;
                const selection = state.selection.main;
                const selectedText = state.sliceDoc(selection.from, selection.to);

                if (selection.empty) {
                    // No selection, insert empty link format
                    dispatch(state.update({
                        changes: {
                            from: selection.from,
                            to: selection.from,
                            insert: "[]()"
                        },
                        selection: { anchor: selection.from + 1 }
                    }));
                } else {
                    // Use selected text as link text
                    dispatch(state.update({
                        changes: {
                            from: selection.from,
                            to: selection.to,
                            insert: `[${selectedText}]()`
                        },
                        selection: { anchor: selection.from + selectedText.length + 3 }
                    }));
                }
                return true;
            }
        }
    ];

    return () => keymap;
})();

// Debounce helper for scroll events
function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            fn(...args);
            timer = null;
        }, delay);
    };
}

// Constants for typing behavior tuning
const TYPING_DEBOUNCE_TIME = 20; // ms - short debounce for smoother typing
const UPDATE_INTERVAL_MIN = 50; // ms - minimum time between updates during rapid typing
const SCROLL_DEBOUNCE_TIME = 1; // ms - scroll events debounce

// Base CodeMirror setup with Markdown support
export const createMarkdownExtensions = (isDarkMode, onDocChange, onScroll) => {
    // Create debounced version of scroll handler
    const debouncedScroll = onScroll ? debounce((percentage) => {
        onScroll(percentage);
    }, SCROLL_DEBOUNCE_TIME) : null;

    // Create debounced version of docChange handler
    const debouncedDocChange = onDocChange ? debounce((text) => {
        onDocChange(text);
    }, TYPING_DEBOUNCE_TIME) : null;

    // Track typing activity to optimize update frequency
    let lastUpdateTime = 0;
    let pendingText = null;
    let updateScheduled = false;

    // Intelligent update scheduler
    const scheduleUpdate = (text) => {
        pendingText = text;

        if (updateScheduled) return;
        updateScheduled = true;

        const now = Date.now();
        const timeSinceUpdate = now - lastUpdateTime;

        if (timeSinceUpdate < UPDATE_INTERVAL_MIN) {
            // Too soon for another update - schedule one for later
            setTimeout(() => {
                updateScheduled = false;
                lastUpdateTime = Date.now();
                if (pendingText !== null) {
                    onDocChange(pendingText);
                    pendingText = null;
                }
            }, UPDATE_INTERVAL_MIN - timeSinceUpdate);
        } else {
            // Enough time has passed - update now
            updateScheduled = false;
            lastUpdateTime = now;
            onDocChange(text);
            pendingText = null;
        }
    };

    return [
        lineNumbers(),
        // highlightActiveLine(), // Commenting out to improve performance
        highlightActiveLineGutter(),
        history(),
        syntaxHighlighting(markdownHighlightStyle),
        markdown({
            base: markdownLanguage,
            codeLanguages: languages,
            addKeymap: true,
        }),
        keymap.of([
            indentWithTab,
            ...createFormattingKeymap(),
            ...defaultKeymap,
            ...historyKeymap,
        ]),
        themeCompartment.of(isDarkMode ? darkTheme : lightTheme),
        EditorView.updateListener.of(update => {
            if (update.docChanged && onDocChange) {
                // Get the latest text content
                const text = update.state.doc.toString();

                // Send it to the parent component SYNCHRONOUSLY - no async
                onDocChange(text);
            }
        }),

        EditorView.domEventHandlers({
            scroll(event, view) {
                if (debouncedScroll) {
                    const { scrollTop, scrollHeight, clientHeight } = view.scrollDOM;
                    const percentage = scrollTop / (scrollHeight - clientHeight || 1);
                    debouncedScroll(percentage);
                }
            }
        }),
        EditorView.lineWrapping
    ];
};

// Create an initial editor state
export const createEditorState = (initialContent, extensions) => {
    return EditorState.create({
        doc: initialContent,
        extensions
    });
};