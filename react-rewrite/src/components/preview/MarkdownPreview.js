// Optimized MarkdownPreview.js
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkReact from 'remark-react';
import { unified } from 'unified';
import '../../app/markdown-styles.css';

// Create processor once outside component
const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkReact, {
        createElement: React.createElement,
    });

export default function MarkdownPreview({
    markdownText,
    previewRef,
    handlePreviewScroll,
    isMobile
}) {
    const [content, setContent] = useState(null);

    // Process content immediately when markdownText changes
    useEffect(() => {
        // Use a higher priority microtask to process markdown faster
        const processMarkdown = async () => {
            try {
                const file = await processor.process(markdownText);
                setContent(file.result);
            } catch (error) {
                console.error('Error processing markdown:', error);
                setContent(<div>Error rendering markdown</div>);
            }
        };

        // Use Promise.resolve().then for microtask queue priority
        Promise.resolve().then(processMarkdown);
    }, [markdownText]);

    return (
        <div
            ref={previewRef}
            className="w-full md:w-full h-full overflow-y-auto px-3 md:px-5 bg-neutral-100 md:bg-brand-gray dark:bg-brand-dark md:me-4 rounded-none md:rounded-lg"
            onScroll={handlePreviewScroll}
        >
            <div className="markdown-body prose prose-sm md:prose max-w-none !text-neutral-800 dark:!text-neutral-400 !bg-neutral-100 md:!bg-brand-gray dark:!bg-brand-dark h-full pt-5">
                {content}
            </div>
        </div>
    );
}