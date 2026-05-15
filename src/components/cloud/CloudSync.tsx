import { useEffect, useRef } from "react";
import { readLocalSnapshot, STORAGE_KEYS } from "../../lib/localSnapshot.ts";
import { saveSnapshotToCloud } from "../../lib/neonDocumentStore.ts";
import { useCloud } from "../../contexts/useCloud.ts";

const WATCHED_STORAGE_KEYS = new Set<string>([
  STORAGE_KEYS.documents,
  STORAGE_KEYS.versions,
  STORAGE_KEYS.fileSystem,
  STORAGE_KEYS.documentTabs,
  STORAGE_KEYS.activeDocument,
  "theme",
  "previewVisible",
  "toolbarCollapsed",
]);

const WATCHED_EVENTS = [
  "documents-updated",
  "active-document-changed",
  "document-title-changed",
  "file-title-changed",
] as const;

export default function CloudSync({ enabled }: { enabled: boolean }) {
  const { setSyncError, setSyncStatus } = useCloud();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setSyncStatus("idle");
      setSyncError(null);
      return;
    }

    const save = async () => {
      if (savingRef.current) {
        pendingRef.current = true;
        return;
      }

      savingRef.current = true;
      pendingRef.current = false;
      setSyncStatus("saving");
      setSyncError(null);

      try {
        await saveSnapshotToCloud(readLocalSnapshot());
        if (!mountedRef.current) return;
        setSyncStatus("saved");
      } catch (syncError) {
        if (!mountedRef.current) return;
        const message = syncError instanceof Error
          ? syncError.message
          : String(syncError);
        setSyncError(message);
        setSyncStatus("error");
      } finally {
        savingRef.current = false;
        if (pendingRef.current && mountedRef.current) {
          scheduleSave();
        }
      }
    };

    const scheduleSave = () => {
      setSyncStatus("saving");
      setSyncError(null);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void save();
      }, 1200);
    };

    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;

    Storage.prototype.setItem = function setItem(key, value) {
      originalSetItem.call(this, key, value);
      if (this === localStorage && WATCHED_STORAGE_KEYS.has(key)) {
        scheduleSave();
      }
    };

    Storage.prototype.removeItem = function removeItem(key) {
      originalRemoveItem.call(this, key);
      if (this === localStorage && WATCHED_STORAGE_KEYS.has(key)) {
        scheduleSave();
      }
    };

    const eventListener = () => scheduleSave();
    for (const eventName of WATCHED_EVENTS) {
      globalThis.addEventListener(eventName, eventListener);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      Storage.prototype.setItem = originalSetItem;
      Storage.prototype.removeItem = originalRemoveItem;
      for (const eventName of WATCHED_EVENTS) {
        globalThis.removeEventListener(eventName, eventListener);
      }
    };
  }, [enabled, setSyncError, setSyncStatus]);

  return null;
}
