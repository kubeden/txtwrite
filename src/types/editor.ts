import type { EditorView } from "@codemirror/view";

export type ScrollableEditorView = EditorView & {
  scrollToPercentage?: (percentage: number) => void;
};
