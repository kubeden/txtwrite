// Optimized MarkdownPreview.js
"use client";

import React, {
  type ReactNode,
  type RefObject,
  type UIEventHandler,
  useEffect,
  useState,
} from "react";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkReact from "remark-react";
import { unified } from "unified";
import "../../markdown-styles.css";

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  // @ts-ignore - remark-react typings are not compatible with unified@11 yet
  .use(remarkReact, {
    createElement: React.createElement,
  });

interface MarkdownPreviewProps {
  markdownText: string;
  previewRef: RefObject<HTMLDivElement>;
  handlePreviewScroll: UIEventHandler<HTMLDivElement>;
  isMobile?: boolean;
}

export default function MarkdownPreview({
  markdownText,
  previewRef,
  handlePreviewScroll,
  isMobile: _isMobile, // reserved for future responsive tweaks
}: MarkdownPreviewProps) {
  const [content, setContent] = useState<ReactNode>(null);

  useEffect(() => {
    const processMarkdown = async () => {
      try {
        const file = await processor.process(markdownText);
        setContent(file.result as ReactNode);
      } catch (error) {
        console.error("Error processing markdown:", error);
        setContent(<div>Error rendering markdown</div>);
      }
    };

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
