'use client';

import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { indentWithTab } from '@codemirror/commands';
import { keymap } from '@codemirror/view';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';

// Create a custom markdown configuration for CodeMirror
export function createMarkdownExtensions() {
    return [
        // Basic markdown support
        markdown({
            base: markdownLanguage,
            codeLanguages: languages,
            addKeymap: true
        }),

        // Enable tab for indentation
        keymap.of([indentWithTab]),

        // Syntax highlighting
        syntaxHighlighting(defaultHighlightStyle),

        // Additional keymaps for Markdown shortcuts could be added here
        keymap.of([
            // Example: Ctrl+B for bold
            {
                key: 'Mod-b', run: view => {
                    const { from, to } = view.state.selection.main;
                    const selection = view.state.doc.sliceString(from, to);

                    view.dispatch({
                        changes: { from, to, insert: `**${selection}**` },
                        selection: { anchor: from + 2, head: to + 2 }
                    });

                    return true;
                }
            },

            // Ctrl+I for italic
            {
                key: 'Mod-i', run: view => {
                    const { from, to } = view.state.selection.main;
                    const selection = view.state.doc.sliceString(from, to);

                    view.dispatch({
                        changes: { from, to, insert: `*${selection}*` },
                        selection: { anchor: from + 1, head: to + 1 }
                    });

                    return true;
                }
            },

            // Add more keyboard shortcuts for common Markdown formatting
        ])
    ];
}

// Create a theme configuration for the editor
export function createEditorTheme(isDarkMode = false) {
    const theme = {
        "&": {
            fontSize: "14px",
            fontFamily: "var(--font-berkley-mono), monospace",
            height: "100%"
        },
        ".cm-content": {
            color: isDarkMode ? "#d4d4d8" : "#1f1f1f",
            caretColor: isDarkMode ? "#d4d4d8" : "#1f1f1f",
            minHeight: "100%"
        },
        "&.cm-focused .cm-cursor": {
            borderLeftColor: isDarkMode ? "#d4d4d8" : "#1f1f1f"
        },
        ".cm-activeLine": {
            backgroundColor: isDarkMode ? "rgba(66, 66, 66, 0.3)" : "rgba(240, 240, 240, 0.5)"
        },
        ".cm-activeLineGutter": {
            backgroundColor: isDarkMode ? "rgba(66, 66, 66, 0.3)" : "rgba(240, 240, 240, 0.5)"
        },
        ".cm-selectionMatch": {
            backgroundColor: isDarkMode ? "rgba(127, 127, 127, 0.3)" : "rgba(127, 127, 127, 0.2)"
        },
        ".cm-selectionBackground": {
            backgroundColor: isDarkMode ? "rgba(127, 127, 127, 0.5)" : "rgba(127, 127, 127, 0.3)"
        },

        // Markdown-specific styling
        ".cm-header": { color: isDarkMode ? "#93c5fd" : "#2563eb", fontWeight: "bold" },
        ".cm-em": { fontStyle: "italic" },
        ".cm-strong": { fontWeight: "bold" },
        ".cm-link": { color: isDarkMode ? "#60a5fa" : "#3b82f6" },
        ".cm-url": { color: isDarkMode ? "#a1a1aa" : "#737373" },
        ".cm-quote": { color: isDarkMode ? "#a3e635" : "#65a30d", fontStyle: "italic" },
        ".cm-hr": { color: isDarkMode ? "#a1a1aa" : "#737373" },
        ".cm-formatting": { color: isDarkMode ? "#a1a1aa" : "#737373", opacity: 0.7 }
    };

    return theme;
}