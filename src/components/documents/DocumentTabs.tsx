"use client";

import {
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import type { DocumentTab } from "../../types/documents.ts";

type ScrollDirection = "left" | "right";

interface DocumentTabsProps {
  documentTabs: DocumentTab[];
  activeDocumentId: string | null;
  handleDocumentChange: (documentId: string) => void;
  closeDocumentTab: (
    event: MouseEvent<HTMLElement>,
    documentId: string,
  ) => void;
  createNewDocument: () => void;
  editingTitleId: string | null;
  editingTitleValue: string;
  setEditingTitleValue: (value: string) => void;
  startEditingTitle: (
    event: MouseEvent<HTMLSpanElement>,
    documentId: string,
    currentTitle: string,
  ) => void;
  saveEditedTitle: () => void;
  titleInputRef: RefObject<HTMLInputElement>;
  handleTitleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

export default function DocumentTabs({
  documentTabs,
  activeDocumentId,
  handleDocumentChange,
  closeDocumentTab,
  createNewDocument,
  editingTitleId,
  editingTitleValue,
  setEditingTitleValue,
  startEditingTitle,
  saveEditedTitle,
  titleInputRef,
  handleTitleKeyDown,
}: DocumentTabsProps) {
  const fileTabsRef = useRef<HTMLDivElement | null>(null);
  const mobileTabsRef = useRef<HTMLDivElement | null>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [mobileLeftArrow, setMobileLeftArrow] = useState(false);
  const [mobileRightArrow, setMobileRightArrow] = useState(false);
  const [operationInProgress, setOperationInProgress] = useState(false);

  // Check scroll position and update arrow visibility for desktop
  const checkScrollPosition = () => {
    if (!fileTabsRef.current) return;

    const tabsContainer = fileTabsRef.current;
    const { scrollLeft, scrollWidth, clientWidth } = tabsContainer;

    // Show left arrow only if scrolled to the right
    setShowLeftArrow(scrollLeft > 0);

    // Calculate total width of all tabs
    const totalContentWidth = Array.from(tabsContainer.children)
      .reduce(
        (total, element) => total + (element as HTMLElement).offsetWidth,
        0,
      );

    // Add margin/gap between items (gap-x-2 = 0.5rem = ~8px)
    const gapWidth = (documentTabs.length + 1) * 8; // +1 for the "New Document" button
    const totalWidthWithGaps = totalContentWidth + gapWidth;

    // Only show right arrow if total content width exceeds visible width
    const hasMoreToScroll = totalWidthWithGaps > clientWidth &&
      Math.floor(scrollWidth - (scrollLeft + clientWidth)) > 2;

    setShowRightArrow(hasMoreToScroll);
  };

  // Check scroll position for mobile tabs
  const checkMobileScrollPosition = () => {
    if (!mobileTabsRef.current) return;

    const tabsContainer = mobileTabsRef.current;
    const { scrollLeft, scrollWidth, clientWidth } = tabsContainer;

    // Show left arrow only if scrolled to the right
    setMobileLeftArrow(scrollLeft > 0);

    // Only show right arrow if total content width exceeds visible width
    const hasMoreToScroll =
      Math.floor(scrollWidth - (scrollLeft + clientWidth)) > 2;
    setMobileRightArrow(hasMoreToScroll);
  };

  // Initialization of scroll indicators
  useEffect(() => {
    // Check both desktop and mobile tabs
    const checkAllTabs = () => {
      checkScrollPosition();
      checkMobileScrollPosition();
    };

    // Run checks with delays to ensure layout is complete
    const checkTimes = [0, 50, 150, 300, 500];
    const timers = checkTimes.map((delay) => setTimeout(checkAllTabs, delay));

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [documentTabs.length]);

  // Scroll tabs with buttons
  const scrollTabs = (direction: ScrollDirection, isMobile = false) => {
    const ref = isMobile ? mobileTabsRef : fileTabsRef;
    if (!ref.current) return;

    const scrollAmount = 200; // Adjust this value based on your preference
    const currentScroll = ref.current.scrollLeft;

    ref.current.scrollTo({
      left: direction === "right"
        ? currentScroll + scrollAmount
        : currentScroll - scrollAmount,
      behavior: "smooth",
    });
  };

  // Scroll to the active document
  useEffect(() => {
    if (mobileTabsRef.current && activeDocumentId) {
      const activeTab = mobileTabsRef.current.querySelector(
        `[data-doc-id="${activeDocumentId}"]`,
      );
      if (activeTab) {
        // Calculate the scroll position to center the active tab
        const tabsContainer = mobileTabsRef.current;
        const tabRect = activeTab.getBoundingClientRect();
        const containerRect = tabsContainer.getBoundingClientRect();

        const scrollTo = tabsContainer.scrollLeft +
          (tabRect.left - containerRect.left) -
          (containerRect.width / 2) + (tabRect.width / 2);

        tabsContainer.scrollTo({
          left: scrollTo,
          behavior: "smooth",
        });
      }
    }
  }, [activeDocumentId]);

  // Handle document change with safety measures
  const handleDocTabChange = (docId: string) => {
    if (operationInProgress || docId === activeDocumentId) return;

    setOperationInProgress(true);

    // Short delay to ensure the previous operation completed
    setTimeout(() => {
      handleDocumentChange(docId);

      // Small delay before allowing more operations
      setTimeout(() => {
        setOperationInProgress(false);
      }, 100);
    }, 10);
  };

  // Handle document tab close with safety measures
  const handleCloseTab = (
    e: MouseEvent<HTMLElement>,
    docId: string,
  ) => {
    if (operationInProgress) return;

    setOperationInProgress(true);

    // Use a short delay to ensure state updates complete
    setTimeout(() => {
      closeDocumentTab(e, docId);

      // Clear the operation flag after a delay
      setTimeout(() => {
        setOperationInProgress(false);
      }, 200);
    }, 10);
  };

  // Handle new document creation with safety measures
  const handleCreateNewDocument = (e: MouseEvent<HTMLDivElement>) => {
    if (operationInProgress) return;

    e.preventDefault();
    setOperationInProgress(true);

    // Use a short delay to ensure everything is ready
    setTimeout(() => {
      createNewDocument();

      // Clear the operation flag after a delay
      setTimeout(() => {
        setOperationInProgress(false);
      }, 300);
    }, 50);
  };

  return (
    <div className="relative text-sm mb-2 bg-neutral-100 dark:bg-neutral-900">
      {/* Mobile Document Slider - horizontal scrolling tabs */}
      <div className="md:hidden relative px-2 py-2">
        {/* Left shadow & arrow */}
        {mobileLeftArrow && (
          <div className="absolute left-0 top-0 bottom-0 w-8 z-10">
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-100 dark:from-neutral-900 to-transparent pointer-events-none">
            </div>
            <button
              type="button"
              className="absolute left-1 top-1/2 transform -translate-y-1/2 p-1 rounded-full bg-neutral-200 dark:bg-neutral-800 shadow-sm text-neutral-700 dark:text-neutral-400"
              onClick={() => scrollTabs("left", true)}
              aria-label="Scroll left"
            >
              <FaChevronLeft className="text-xs" />
            </button>
          </div>
        )}

        {/* Scrollable container for mobile */}
        <div
          ref={mobileTabsRef}
          className="flex overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory gap-x-2 px-6"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          onScroll={checkMobileScrollPosition}
        >
          {documentTabs.map((tab) => (
            <div
              key={tab.id}
              data-doc-id={tab.id}
              className={`px-3 py-2 ${
                activeDocumentId === tab.id
                  ? "bg-neutral-300 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-300"
                  : "bg-neutral-200 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-500"
              } rounded-md cursor-pointer flex-shrink-0 flex items-center justify-between min-w-[120px] max-w-[150px] snap-center`}
              onClick={() => handleDocTabChange(tab.id)}
            >
              <span className="truncate max-w-[80%]" title={tab.title}>
                {tab.title}
              </span>
              <button
                type="button"
                className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 ml-1 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseTab(e, tab.id);
                }}
                title="Close tab"
              >
                ×
              </button>
            </div>
          ))}

          {/* Add new document button */}
          <div
            className="px-3 py-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 rounded-md cursor-pointer flex-shrink-0 flex items-center justify-center min-w-[120px] max-w-[150px] snap-center text-neutral-700 dark:text-neutral-400"
            onClick={handleCreateNewDocument}
          >
            + New Doc
          </div>
        </div>

        {/* Right shadow & arrow */}
        {mobileRightArrow && (
          <div className="absolute right-0 top-0 bottom-0 w-8 z-10">
            <div className="absolute inset-0 bg-gradient-to-l from-neutral-100 dark:from-neutral-900 to-transparent pointer-events-none">
            </div>
            <button
              type="button"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 p-1 rounded-full bg-neutral-200 dark:bg-neutral-800 shadow-sm text-neutral-700 dark:text-neutral-400"
              onClick={() => scrollTabs("right", true)}
              aria-label="Scroll right"
            >
              <FaChevronRight className="text-xs" />
            </button>
          </div>
        )}
      </div>

      {/* Desktop Tabs - hidden on mobile */}
      <div className="hidden md:flex items-center relative px-3 text-sm">
        {/* Left shadow & chevron container */}
        {showLeftArrow && (
          <div className="absolute left-3 top-0 bottom-0 w-50 z-10 pointer-events-none">
            <div className="rounded-md absolute inset-0 bg-gradient-to-r from-brand-light dark:from-brand-dark to-transparent">
            </div>
            <button
              type="button"
              className="absolute left-1 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full text-neutral-700 opacity-90 transition-opacity duration-200 pointer-events-auto"
              onClick={() => scrollTabs("left")}
              aria-label="Scroll left"
            >
              <FaChevronLeft className="text-xs" />
            </button>
          </div>
        )}

        {/* Scrollable container */}
        <div
          ref={fileTabsRef}
          className="flex overflow-x-auto scrollbar-hide scroll-smooth text-neutral-600 gap-x-2 flex-grow"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          onScroll={checkScrollPosition}
        >
          {/* Document tabs - generated from documentTabs state */}
          {documentTabs.map((tab) => (
            <div
              key={tab.id}
              className={`px-3 py-1.5 ${
                activeDocumentId === tab.id
                  ? " text-neutral-600 dark:text-neutral-400"
                  : "text-neutral-400 dark:text-neutral-600"
              } my-1 rounded-md cursor-pointer group flex items-center shrink-0 w-30`}
              onClick={() => handleDocTabChange(tab.id)}
            >
              {editingTitleId === tab.id
                ? (
                  <input
                    ref={titleInputRef}
                    type="text"
                    className="bg-transparent border-none focus:outline-none text-neutral-400 w-full"
                    value={editingTitleValue}
                    onChange={(e) => setEditingTitleValue(e.target.value)}
                    onBlur={saveEditedTitle}
                    onKeyDown={handleTitleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                  />
                )
                : (
                  <div className="flex items-center justify-between w-full">
                    <span
                      className="truncate max-w-[80%]"
                      onDoubleClick={(e) =>
                        startEditingTitle(e, tab.id, tab.title)}
                      title={tab.title}
                    >
                      {tab.title}
                    </span>
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-700 hover:text-neutral-500 flex-shrink-0 ml-1"
                      onClick={(e) => handleCloseTab(e, tab.id)}
                      title="Close tab"
                    >
                      ×
                    </button>
                  </div>
                )}
            </div>
          ))}

          {/* Add new document button */}
          <div
            className="px-3 py-1.5 hover:bg-neutral-200 dark:hover:bg-brand-dark my-1 rounded-md cursor-pointer border border-neutral-100 dark:border-neutral-900 hover:border-dashed hover:border-neutral-400 flex items-center justify-center shrink-0 w-40 text-neutral-400 dark:text-neutral-700"
            onClick={handleCreateNewDocument}
          >
            + New Document
          </div>
        </div>

        {/* Right scroll button - only visible when more content is available */}
        {showRightArrow && (
          <div className="absolute right-4 top-0 bottom-0 w-50 z-10 pointer-events-none">
            <div className="rounded-md absolute inset-0 bg-gradient-to-l from-brand-light dark:from-brand-dark to-transparent">
            </div>
            <button
              type="button"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full text-neutral-700 opacity-90 transition-opacity duration-200 pointer-events-auto"
              onClick={() => scrollTabs("right")}
              aria-label="Scroll right"
            >
              <FaChevronRight className="text-xs" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
