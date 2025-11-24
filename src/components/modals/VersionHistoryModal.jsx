'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Clock } from 'lucide-react';
import VersionHistory from '../documents/VersionHistory.jsx';

export default function VersionHistoryModal({ 
  isOpen, 
  onClose, 
  documentId, 
  currentVersion, 
  getVersions, 
  restoreVersion 
}) {
  const drawerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  // Handle animation and visibility
  useEffect(() => {
    if (isOpen) {
      // First make the component visible
      setIsVisible(true);
      // Then allow a tick for the browser to render it before animating
      const animationTimer = setTimeout(() => {
        // Now update the DOM to trigger the animation
        if (drawerRef.current) {
          drawerRef.current.classList.remove('translate-x-full');
          drawerRef.current.classList.add('translate-x-0');
        }
      }, 10); // Small delay to ensure DOM updates
      
      return () => clearTimeout(animationTimer);
    } else {
      // When closing, first animate out
      if (drawerRef.current) {
        drawerRef.current.classList.remove('translate-x-0');
        drawerRef.current.classList.add('translate-x-full');
      }
      // Then after animation completes, hide the component
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300); // Match with animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle clicks outside the drawer to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  // Prevent body scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isVisible && !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Glassmorphic backdrop with blur effect */}
      <div 
        className={`absolute inset-0 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Sliding drawer */}
      <div className="absolute inset-y-0 right-0 max-w-full flex outline-none">
        <div 
          ref={drawerRef} 
          className="w-full sm:w-[420px] md:w-[540px] h-full transform transition-transform duration-300 ease-out bg-white dark:bg-neutral-900 shadow-xl flex flex-col translate-x-full"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-neutral-900 z-10">
            <h2 className="text-lg font-medium text-neutral-800 dark:text-neutral-300 flex items-center">
              <Clock className="mr-2 h-5 w-5 text-neutral-500 dark:text-neutral-400" />
              Document History
            </h2>
            <button 
              onClick={onClose}
              className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 focus:outline-none p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Content area */}
          <div className="flex-1 overflow-hidden">
            <VersionHistory
              documentId={documentId}
              currentVersion={currentVersion}
              getVersions={getVersions}
              restoreVersion={restoreVersion}
              onClose={onClose}
            />
          </div>
          
          {/* Optional footer */}
          <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-500 dark:text-neutral-400">
            Save a new version anytime with Cmd+S / Ctrl+S
          </div>
        </div>
      </div>
    </div>
  );
}