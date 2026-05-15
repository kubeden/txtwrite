import type { ReactNode } from "react";
import { CloudContext, type CloudContextValue } from "./cloudContext.ts";

export type { CloudSyncStatus } from "./cloudContext.ts";

export function CloudProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: CloudContextValue;
}) {
  return <CloudContext.Provider value={value}>{children}
  </CloudContext.Provider>;
}
