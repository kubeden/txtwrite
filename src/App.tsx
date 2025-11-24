// @ts-nocheck
import { useCallback, useEffect, useRef, useState } from 'react';
import DashboardLayout from './components/layout/DashboardLayout.jsx';
import DocumentTabs from './components/documents/DocumentTabs.jsx';
import CodeMirrorEditor from './components/editor/CodeMirrorEditor.jsx';
import MarkdownPreview from './components/preview/MarkdownPreview.jsx';
import StatusBar from './components/editor/StatusBar.jsx';
import useDocuments from './hooks/useDocuments.js';
import { useTheme } from './contexts/ThemeContext.jsx';

export default function App() {
  const [markdownText, setMarkdownText] = useState('# Loading...');
  const [editStatus, setEditStatus] = useState<'editing' | 'saved'>('saved');
  const [activeView, setActiveView] = useState<'editor' | 'preview'>('editor');
  const [isMobile, setIsMobile] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);

  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  const previewRef = useRef<HTMLDivElement | null>(null);
  const editorViewRef = useRef<any>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isEditorScrolling, setIsEditorScrolling] = useState(false);
  const [isPreviewScrolling, setIsPreviewScrolling] = useState(false);

  const {
    documents,
    activeDocumentId,
    documentTabs,
    createNewDocument,
    handleDocumentChange,
    closeDocumentTab,
    startEditingTitle,
    saveEditedTitle,
    editingTitleId,
    editingTitleValue,
    setEditingTitleValue,
    titleInputRef,
    handleTitleKeyDown,
    saveDocumentToLocalStorage,
    saveNewDocumentVersion,
    getVersions,
    restoreVersion
  } = useDocuments(markdownText, setMarkdownText);

  const togglePreview = useCallback(() => {
    setIsPreviewVisible((prev) => {
      const nextValue = !prev;
      localStorage.setItem('previewVisible', nextValue.toString());
      return nextValue;
    });
  }, []);

  useEffect(() => {
    const savedPreference = localStorage.getItem('previewVisible');
    if (savedPreference !== null) {
      setIsPreviewVisible(savedPreference === 'true');
    }
  }, []);

  const toggleView = () => {
    setActiveView((current) => (current === 'editor' ? 'preview' : 'editor'));
  };

  const getContentHeight = () => {
    if (isMobile) {
      return 'h-[calc(100%-60px-20px)]';
    }
    return 'h-[calc(100%-120px)]';
  };

  const getEditorWidth = () => {
    if (isMobile) return 'w-full';
    return isPreviewVisible ? 'w-1/2' : 'w-full';
  };

  useEffect(() => {
    const checkMobile = () => {
      const isMobileView = globalThis.innerWidth < 768;
      setIsMobile(isMobileView);
      if (isMobileView) {
        setActiveView('editor');
      }
    };

    checkMobile();
    globalThis.addEventListener('resize', checkMobile);
    return () => globalThis.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (activeDocumentId && getVersions && restoreVersion) {
      globalThis.dispatchEvent(new CustomEvent('version-functions-ready', {
        detail: { getVersions, restoreVersion }
      }));
    }
  }, [documents, activeDocumentId, getVersions, restoreVersion]);

  useEffect(() => {
    const handleSaveVersion = () => {
      if (saveDocumentToLocalStorage && saveNewDocumentVersion) {
        saveDocumentToLocalStorage(markdownText);
        saveNewDocumentVersion();
      }
    };

    const handleNotification = (event: Event) => {
      const customEvent = event as CustomEvent<{ message: string }>;
      setNotification(customEvent.detail.message);
      setTimeout(() => setNotification(null), 3000);
    };

    globalThis.addEventListener('save-document-version', handleSaveVersion);
    globalThis.addEventListener('show-notification', handleNotification as EventListener);

    return () => {
      globalThis.removeEventListener('save-document-version', handleSaveVersion);
      globalThis.removeEventListener('show-notification', handleNotification as EventListener);
    };
  }, [markdownText, saveDocumentToLocalStorage, saveNewDocumentVersion]);

  const handleEditorScroll = useCallback((percentage: number) => {
    if (!previewRef.current || isPreviewScrolling) return;
    setIsEditorScrolling(true);
    const previewElement = previewRef.current;
    const previewScrollHeight = previewElement.scrollHeight - previewElement.clientHeight;
    previewElement.scrollTop = previewScrollHeight * percentage;
    setTimeout(() => setIsEditorScrolling(false), 20);
  }, [isPreviewScrolling]);

  const handlePreviewScroll = useCallback(() => {
    if (!previewRef.current || isEditorScrolling) return;
    setIsPreviewScrolling(true);
    const { scrollTop, scrollHeight, clientHeight } = previewRef.current;
    const percentage = scrollTop / (scrollHeight - clientHeight || 1);
    if (editorViewRef.current && typeof editorViewRef.current.scrollToPercentage === 'function') {
      editorViewRef.current.scrollToPercentage(percentage);
    }
    setTimeout(() => setIsPreviewScrolling(false), 20);
  }, [isEditorScrolling]);

  const handleTextChange = useCallback((newText: string) => {
    if (newText === markdownText) return;
    setMarkdownText(newText);
    setEditStatus('editing');
    saveDocumentToLocalStorage(newText);

    if (isMobile && activeView === 'editor') {
      setTimeout(() => {
        if (activeView === 'editor') {
          setActiveView('preview');
        }
      }, 800);
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      setEditStatus('saved');
    }, 500);
  }, [markdownText, isMobile, activeView, saveDocumentToLocalStorage]);

  const getLineAndColumn = useCallback(() => {
    if (!editorViewRef.current) return { line: 1, column: 1 };
    try {
      const state = editorViewRef.current.state;
      const pos = state.selection.main.head;
      const line = state.doc.lineAt(pos);
      return {
        line: line.number,
        column: pos - line.from + 1
      };
    } catch (error) {
      console.error('Error getting cursor position:', error);
      return { line: 1, column: 1 };
    }
  }, []);

  useEffect(() => {
    const handleSidebarDocumentChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ documentId: string }>;
      const { documentId } = customEvent.detail || {};
      if (documentId && documentId !== activeDocumentId) {
        handleDocumentChange(documentId);
      }
    };

    globalThis.addEventListener('sidebar-document-changed', handleSidebarDocumentChange);
    return () => {
      globalThis.removeEventListener('sidebar-document-changed', handleSidebarDocumentChange);
    };
  }, [activeDocumentId, handleDocumentChange]);

  useEffect(() => {
    const handleFileTitleChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ documentId: string; title: string }>;
      const { documentId, title } = customEvent.detail || {};
      if (documentId && documentId === activeDocumentId) {
        globalThis.dispatchEvent(new CustomEvent('update-document-title', {
          detail: { documentId, title }
        }));
      }
    };

    globalThis.addEventListener('file-title-changed', handleFileTitleChanged);
    return () => globalThis.removeEventListener('file-title-changed', handleFileTitleChanged);
  }, [activeDocumentId]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex flex-col bg-neutral-100 dark:bg-neutral-900 h-full">
          <div className="w-full hidden md:flex">
            <DocumentTabs
              documents={documents}
              documentTabs={documentTabs}
              activeDocumentId={activeDocumentId}
              handleDocumentChange={handleDocumentChange}
              closeDocumentTab={closeDocumentTab}
              createNewDocument={createNewDocument}
              editingTitleId={editingTitleId}
              editingTitleValue={editingTitleValue}
              setEditingTitleValue={setEditingTitleValue}
              startEditingTitle={startEditingTitle}
              saveEditedTitle={saveEditedTitle}
              titleInputRef={titleInputRef}
              handleTitleKeyDown={handleTitleKeyDown}
            />
          </div>

          <div className={`flex md:flex-row flex-col overflow-hidden bg-neutral-100 dark:bg-neutral-900 ${getContentHeight()} md:h-[calc(100%-135px)]`}>
            <div
              className={`${activeView === 'editor' || !isMobile ? 'flex' : 'hidden'} 
                ${getEditorWidth()} h-full relative overflow-hidden`}
            >
              <CodeMirrorEditor
                markdownText={markdownText}
                onTextChange={handleTextChange}
                onScroll={handleEditorScroll}
                saveDocumentToLocalStorage={saveDocumentToLocalStorage}
                setEditStatus={setEditStatus}
                isDarkMode={isDarkMode}
                editorViewRef={editorViewRef}
                isMobile={isMobile}
                isPreviewVisible={isPreviewVisible}
                togglePreview={togglePreview}
              />
            </div>

            {(isPreviewVisible || (isMobile && activeView === 'preview')) && (
              <div
                className={`${activeView === 'preview' || !isMobile ? 'flex' : 'hidden'} 
                  w-full md:w-1/2 h-full relative overflow-hidden`}
              >
                <MarkdownPreview
                  markdownText={markdownText}
                  previewRef={previewRef}
                  handlePreviewScroll={handlePreviewScroll}
                  isMobile={isMobile}
                />
              </div>
            )}
          </div>

          <StatusBar
            markdownText={markdownText}
            editStatus={editStatus}
            getLineAndColumn={getLineAndColumn}
          />

          {isMobile && (
            <button
              onClick={toggleView}
              className="md:hidden fixed bottom-[16vh] right-6 z-30 bg-neutral-200 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-white p-3 rounded-md"
              aria-label={`Switch to ${activeView === 'editor' ? 'preview' : 'editor'}`}
            >
              {activeView === 'editor' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="#606060">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="#606060">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {notification && (
        <div className="fixed bottom-4 right-4 bg-green-100 dark:bg-neutral-900 text-green-800 dark:text-green-600 px-8 py-4 rounded shadow-md z-50 transition-opacity duration-300 border border-neutral-800">
          {notification}
        </div>
      )}
    </DashboardLayout>
  );
}
