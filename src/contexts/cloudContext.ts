import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useContext,
} from "react";

export type CloudSyncStatus = "idle" | "saving" | "saved" | "error";

export interface CloudContextValue {
  syncEnabled: boolean;
  syncStatus: CloudSyncStatus;
  syncError: string | null;
  setSyncStatus: Dispatch<SetStateAction<CloudSyncStatus>>;
  setSyncError: Dispatch<SetStateAction<string | null>>;
  userEmail?: string;
  signOut: () => Promise<void>;
}

export const CloudContext = createContext<CloudContextValue>({
  syncEnabled: false,
  syncStatus: "idle",
  syncError: null,
  setSyncStatus: () => {},
  setSyncError: () => {},
  signOut: async () => {},
});

export const useCloud = () => useContext(CloudContext);
