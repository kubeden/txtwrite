import type { EditorView } from "@codemirror/view";

export function formatInline(
  view: EditorView | null | undefined,
  startChars: string,
  endChars = "",
) {
  if (!view) return;

  const { state, dispatch } = view;
  const selection = state.selection.main;
  const selectedText = state.sliceDoc(selection.from, selection.to);

  if (selection.empty) {
    dispatch(state.update({
      changes: {
        from: selection.from,
        to: selection.from,
        insert: startChars + endChars,
      },
      selection: { anchor: selection.from + startChars.length },
    }));
  } else {
    dispatch(state.update({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: startChars + selectedText + endChars,
      },
      selection: {
        anchor: selection.from + startChars.length,
        head: selection.from + startChars.length + selectedText.length,
      },
    }));
  }

  view.focus();
}

export function formatLines(
  view: EditorView | null | undefined,
  linePrefix: string,
) {
  if (!view) return;

  const { state, dispatch } = view;
  const selection = state.selection.main;
  const selectedText = state.sliceDoc(selection.from, selection.to);

  if (selectedText) {
    const formattedText = selectedText
      .split("\n")
      .map((line) => `${linePrefix}${line}`)
      .join("\n");

    dispatch(state.update({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: formattedText,
      },
      selection: {
        anchor: selection.from,
        head: selection.from + formattedText.length,
      },
    }));
  } else {
    dispatch(state.update({
      changes: {
        from: selection.from,
        to: selection.from,
        insert: linePrefix,
      },
      selection: { anchor: selection.from + linePrefix.length },
    }));
  }

  view.focus();
}

export function formatOrderedList(view: EditorView | null | undefined) {
  if (!view) return;

  const { state, dispatch } = view;
  const selection = state.selection.main;
  const selectedText = state.sliceDoc(selection.from, selection.to);

  if (selectedText) {
    const formattedText = selectedText
      .split("\n")
      .map((line, index) => `${index + 1}. ${line}`)
      .join("\n");

    dispatch(state.update({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: formattedText,
      },
      selection: {
        anchor: selection.from,
        head: selection.from + formattedText.length,
      },
    }));
  } else {
    dispatch(state.update({
      changes: {
        from: selection.from,
        to: selection.from,
        insert: "1. ",
      },
      selection: { anchor: selection.from + 3 },
    }));
  }

  view.focus();
}

export function insertMarkdownTable(view: EditorView | null | undefined) {
  formatInline(
    view,
    "\n| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Row 1, Col 1 | Row 1, Col 2 | Row 1, Col 3 |\n| Row 2, Col 1 | Row 2, Col 2 | Row 2, Col 3 |\n\n",
  );
}
