import type { MouseEvent, RefObject } from "react";
import type { EditorView } from "@codemirror/view";
import {
  FaBold,
  FaCheckSquare,
  FaCode,
  FaHeading,
  FaImage,
  FaItalic,
  FaLink,
  FaListOl,
  FaListUl,
  FaQuoteRight,
  FaTable,
} from "react-icons/fa";
import {
  formatInline,
  formatLines,
  formatOrderedList,
  insertMarkdownTable,
} from "../../lib/editorFormatting.ts";

interface MobileFormatToolbarProps {
  editorViewRef: RefObject<EditorView | null>;
  visible: boolean;
}

const buttonClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-neutral-700 hover:bg-neutral-200 active:bg-neutral-200 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:active:bg-neutral-800";

export default function MobileFormatToolbar({
  editorViewRef,
  visible,
}: MobileFormatToolbarProps) {
  if (!visible) return null;

  const view = () => editorViewRef.current;

  const keepEditorFocused = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  return (
    <div className="md:hidden shrink-0 border-t border-neutral-200 bg-neutral-100 px-2 py-1 dark:border-neutral-800 dark:bg-neutral-900">
      <div
        className="flex h-11 items-center gap-1 overflow-x-auto overscroll-x-contain"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <button
          type="button"
          onMouseDown={keepEditorFocused}
          onClick={() => formatInline(view(), "**", "**")}
          className={buttonClass}
          title="Bold"
          aria-label="Bold"
        >
          <FaBold size={16} />
        </button>
        <button
          type="button"
          onMouseDown={keepEditorFocused}
          onClick={() => formatInline(view(), "*", "*")}
          className={buttonClass}
          title="Italic"
          aria-label="Italic"
        >
          <FaItalic size={16} />
        </button>
        <button
          type="button"
          onMouseDown={keepEditorFocused}
          onClick={() => formatInline(view(), "## ")}
          className={buttonClass}
          title="Heading"
          aria-label="Heading"
        >
          <FaHeading size={16} />
        </button>

        <span className="mx-1 h-7 w-px shrink-0 bg-neutral-300 dark:bg-neutral-800" />

        <button
          type="button"
          onMouseDown={keepEditorFocused}
          onClick={() => formatLines(view(), "- ")}
          className={buttonClass}
          title="Bullet list"
          aria-label="Bullet list"
        >
          <FaListUl size={16} />
        </button>
        <button
          type="button"
          onMouseDown={keepEditorFocused}
          onClick={() => formatOrderedList(view())}
          className={buttonClass}
          title="Numbered list"
          aria-label="Numbered list"
        >
          <FaListOl size={16} />
        </button>
        <button
          type="button"
          onMouseDown={keepEditorFocused}
          onClick={() => formatLines(view(), "- [ ] ")}
          className={buttonClass}
          title="Checkbox"
          aria-label="Checkbox"
        >
          <FaCheckSquare size={16} />
        </button>

        <span className="mx-1 h-7 w-px shrink-0 bg-neutral-300 dark:bg-neutral-800" />

        <button
          type="button"
          onMouseDown={keepEditorFocused}
          onClick={() => formatInline(view(), "[Link text](", ")")}
          className={buttonClass}
          title="Link"
          aria-label="Link"
        >
          <FaLink size={16} />
        </button>
        <button
          type="button"
          onMouseDown={keepEditorFocused}
          onClick={() =>
            formatInline(view(), "![Alt text](", ' "Image title")')}
          className={buttonClass}
          title="Image"
          aria-label="Image"
        >
          <FaImage size={16} />
        </button>

        <span className="mx-1 h-7 w-px shrink-0 bg-neutral-300 dark:bg-neutral-800" />

        <button
          type="button"
          onMouseDown={keepEditorFocused}
          onClick={() => formatInline(view(), "```\n", "\n```")}
          className={buttonClass}
          title="Code block"
          aria-label="Code block"
        >
          <FaCode size={16} />
        </button>
        <button
          type="button"
          onMouseDown={keepEditorFocused}
          onClick={() => formatLines(view(), "> ")}
          className={buttonClass}
          title="Quote"
          aria-label="Quote"
        >
          <FaQuoteRight size={16} />
        </button>
        <button
          type="button"
          onMouseDown={keepEditorFocused}
          onClick={() => insertMarkdownTable(view())}
          className={buttonClass}
          title="Table"
          aria-label="Table"
        >
          <FaTable size={16} />
        </button>
      </div>
    </div>
  );
}
