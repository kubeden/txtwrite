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

const sanitizeUrl = (
  value: unknown,
  allowedProtocols: Set<string>,
  allowRelative = true,
) => {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  try {
    const parsed = new URL(trimmed, "https://txtwrite.local");
    const isRelative = !/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed);

    if (isRelative && allowRelative) return trimmed;
    if (allowedProtocols.has(parsed.protocol)) return trimmed;
  } catch {
    return undefined;
  }

  return undefined;
};

const safeLinkProtocols = new Set(["http:", "https:", "mailto:"]);
const safeImageProtocols = new Set(["http:", "https:"]);
const safeDataImagePattern =
  /^data:image\/(?:avif|gif|jpe?g|png|webp);base64,[a-z0-9+/]+=*$/i;

const sanitizeImageUrl = (value: unknown) => {
  const safeNetworkSrc = sanitizeUrl(value, safeImageProtocols);
  if (safeNetworkSrc) return safeNetworkSrc;

  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return safeDataImagePattern.test(trimmed) ? trimmed : undefined;
};

const SafeLink = ({
  href,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
  const safeHref = sanitizeUrl(href, safeLinkProtocols);
  const isExternal = safeHref?.startsWith("http://") ||
    safeHref?.startsWith("https://");

  return (
    <a
      {...props}
      href={safeHref}
      rel={isExternal ? "noopener noreferrer" : undefined}
      target={isExternal ? "_blank" : undefined}
    >
      {children}
    </a>
  );
};

const SafeImage = ({
  src,
  alt,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) => {
  const safeSrc = sanitizeImageUrl(src);
  if (!safeSrc) return null;

  return (
    <img
      {...props}
      src={safeSrc}
      alt={alt ?? ""}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  );
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  // @ts-expect-error - remark-react typings are not compatible with unified@11 yet
  .use(remarkReact, {
    createElement: React.createElement,
    remarkReactComponents: {
      a: SafeLink,
      img: SafeImage,
    },
  });

interface MarkdownPreviewProps {
  markdownText: string;
  previewRef: RefObject<HTMLDivElement | null>;
  handlePreviewScroll: UIEventHandler<HTMLDivElement>;
  isMobile?: boolean;
}

export default function MarkdownPreview({
  markdownText,
  previewRef,
  handlePreviewScroll,
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
