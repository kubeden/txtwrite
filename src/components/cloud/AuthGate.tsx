import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import {
  ArrowRight,
  Cloud,
  Database,
  FileText,
  LockKeyhole,
} from "lucide-react";
import {
  CloudProvider,
  type CloudSyncStatus,
} from "../../contexts/CloudContext.tsx";
import { client, isNeonConfigured } from "../../lib/auth.ts";
import {
  AUTH_STORAGE_KEYS,
  clearLocalSnapshot,
  createDefaultSnapshot,
  hasLocalDocuments,
  readLocalSnapshot,
  writeLocalSnapshot,
} from "../../lib/localSnapshot.ts";
import {
  loadCloudSnapshot,
  saveSnapshotToCloud,
} from "../../lib/neonDocumentStore.ts";
import CloudSync from "./CloudSync.tsx";

type BootstrapStatus = "loading" | "ready" | "error";
type AuthMode = "signin" | "signup";

const authBenefits = [
  {
    icon: FileText,
    title: "Focused markdown",
    body: "A quiet editor for drafts, notes, docs, and technical writing.",
  },
  {
    icon: Cloud,
    title: "Synced with Neon",
    body: "Documents save through Neon Auth, Data API, and row-level security.",
  },
  {
    icon: LockKeyhole,
    title: "Private by default",
    body: "Each account only sees its own workspace and document history.",
  },
];

const importCompleteKey = (userId: string) =>
  `txtwriteCloudImportComplete:${userId}`;

const errorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return String(error);
};

const isAuthResponseError = (response: unknown) => {
  return Boolean(
    response && typeof response === "object" && "error" in response &&
      (response as { error?: unknown }).error,
  );
};

function LogoMark({ size = "lg" }: { size?: "sm" | "lg" }) {
  const boxClass = size === "lg" ? "h-11 w-11" : "h-9 w-9";
  const imageClass = size === "lg" ? "h-8 w-8" : "h-6 w-6";

  return (
    <div
      className={`flex ${boxClass} shrink-0 items-center justify-center rounded-sm border border-neutral-800 bg-neutral-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]`}
    >
      <img src="/logo/logo-dark.png" className={imageClass} alt="TXTWrite" />
    </div>
  );
}

function LoadingScreen() {
  return (
    <FullScreenPanel>
      <div className="flex min-h-full items-center justify-center">
        <div className="animate-pulse">
          <LogoMark />
        </div>
      </div>
    </FullScreenPanel>
  );
}

function AuthStoryPanel() {
  return (
    <section className="hidden overflow-hidden rounded-[18px] border border-neutral-800 bg-neutral-900 p-8 text-neutral-100 lg:flex lg:flex-col lg:justify-between">
      <div className="grid gap-12">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <LogoMark />
            <span>
              <span className="block text-sm font-semibold">TXTWrite</span>
              <span className="block text-xs text-neutral-500">
                Markdown workspace
              </span>
            </span>
          </div>
          <div className="rounded-full border border-neutral-700 bg-neutral-950/50 px-3 py-1.5 text-xs font-medium text-neutral-400">
            Neon native
          </div>
        </div>

        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Write, sync, continue
          </p>
          <h1 className="mt-4 text-5xl font-semibold leading-[1.02] tracking-tight text-neutral-100">
            Your markdown editor, backed by Neon.
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-neutral-400">
            TXTWrite keeps the writing surface simple while Neon handles
            identity, storage, sync, and per-user access rules behind the
            scenes.
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        {authBenefits.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-3 border-t border-neutral-800 pt-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-800 bg-neutral-950 text-neutral-400">
                <Icon size={17} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-neutral-200">
                  {item.title}
                </div>
                <p className="mt-1 text-xs leading-5 text-neutral-500">
                  {item.body}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AuthForm(
  { onAuthenticated }: { onAuthenticated: () => Promise<void> },
) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = mode === "signin"
        ? await client.auth.signIn.email({ email, password })
        : await client.auth.signUp.email({
          email,
          password,
          name: name.trim() || email,
        });

      if (isAuthResponseError(response)) {
        const authError = (response as { error: unknown }).error;
        throw new Error(errorMessage(authError));
      }

      await onAuthenticated();
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FullScreenPanel>
      <main className="grid min-h-[calc(100dvh-16px)] gap-2 p-2 lg:grid-cols-[1.02fr_0.98fr] lg:gap-3">
        <AuthStoryPanel />

        <section className="flex min-h-[calc(100dvh-16px)] justify-center rounded-[18px] border border-neutral-900 bg-brand-dark px-4 py-8 text-neutral-100 sm:px-6 lg:items-start lg:border-neutral-800 lg:bg-neutral-950">
          <div className="w-full max-w-[440px] pt-12 sm:pt-16 lg:pt-24">
            <div className="mb-8 flex items-start gap-3">
              <LogoMark />
              <div className="min-w-0 pt-1">
                <h1 className="text-lg font-semibold leading-tight text-neutral-200">
                  TXTWrite
                </h1>
                <p className="mt-0.5 text-sm text-neutral-500">
                  {mode === "signin"
                    ? "Sign in to your workspace"
                    : "Create your workspace"}
                </p>
              </div>
            </div>

            <div className="mb-5 grid grid-cols-2 rounded-md border border-neutral-800 bg-neutral-950/70 p-1 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                }}
                className={`rounded px-3 py-1.5 transition ${
                  mode === "signin"
                    ? "bg-neutral-800 text-neutral-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                    : "text-neutral-500 hover:text-neutral-200"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className={`rounded px-3 py-1.5 transition ${
                  mode === "signup"
                    ? "bg-neutral-800 text-neutral-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                    : "text-neutral-500 hover:text-neutral-200"
                }`}
              >
                Register
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 border-y border-neutral-800 py-5"
            >
              {mode === "signup" && (
                <label className="block text-sm text-neutral-500">
                  <span className="mb-1 block">Name</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-md border border-neutral-800 bg-neutral-950/70 px-3 py-2 text-sm text-neutral-100 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition focus:border-neutral-600"
                    autoComplete="name"
                  />
                </label>
              )}

              <label className="block text-sm text-neutral-500">
                <span className="mb-1 block">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-md border border-neutral-800 bg-neutral-950/70 px-3 py-2 text-sm text-neutral-100 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition focus:border-neutral-600"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="block text-sm text-neutral-500">
                <span className="mb-1 block">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-md border border-neutral-800 bg-neutral-950/70 px-3 py-2 text-sm text-neutral-100 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition focus:border-neutral-600"
                  autoComplete={mode === "signin"
                    ? "current-password"
                    : "new-password"}
                  minLength={8}
                  required
                />
              </label>

              {error && (
                <p className="rounded-md border border-red-900 bg-red-950/70 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Working..."
                  : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
                {!isSubmitting && <ArrowRight size={15} />}
              </button>
            </form>

            <div className="mt-5 grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 rounded-md border border-neutral-800 bg-neutral-950/70 p-3 text-xs leading-5 text-neutral-500">
              <div className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-800 text-neutral-400">
                <Database size={15} />
              </div>
              <p>
                Authentication and documents are stored with Neon. Local drafts
                can be imported after sign in.
              </p>
            </div>
          </div>
        </section>
      </main>
    </FullScreenPanel>
  );
}

function FullScreenPanel({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950 text-neutral-100">
      {children}
    </div>
  );
}

function MissingConfig() {
  return (
    <FullScreenPanel>
      <div className="mx-auto flex min-h-full w-full max-w-xl items-center">
        <div className="w-full border-y border-neutral-800 py-6">
          <div className="mb-4 flex items-center gap-3">
            <LogoMark size="sm" />
            <div>
              <h1 className="text-lg font-semibold leading-tight">TXTWrite</h1>
              <p className="text-sm text-neutral-500">
                Neon is not configured
              </p>
            </div>
          </div>
          <p className="text-sm leading-6 text-neutral-400">
            Set `VITE_NEON_AUTH_URL` and `VITE_NEON_DATA_API_URL` in
            `.env.local`, run the migration with `DATABASE_URL`, then restart
            Vite.
          </p>
        </div>
      </div>
    </FullScreenPanel>
  );
}

function ImportBanner({
  onImport,
  isImporting,
}: {
  onImport: () => void;
  isImporting: boolean;
}) {
  return (
    <div className="fixed left-1/2 top-3 z-50 flex w-[calc(100vw-1.5rem)] max-w-2xl -translate-x-1/2 items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 shadow-sm dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
      <span className="min-w-0">
        Local documents found. Import them to Neon to enable cloud sync.
      </span>
      <button
        type="button"
        onClick={onImport}
        disabled={isImporting}
        className="shrink-0 rounded-md bg-amber-900 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-200 dark:text-amber-950"
      >
        {isImporting ? "Importing..." : "Import"}
      </button>
    </div>
  );
}

function ConfiguredAuthGate({ children }: { children: ReactNode }) {
  const session = client.auth.useSession();
  const user = session.data?.user;
  const [bootstrapStatus, setBootstrapStatus] = useState<BootstrapStatus>(
    "loading",
  );
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showImportBanner, setShowImportBanner] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (session.isPending || !user?.id) return;

    let cancelled = false;

    const bootstrap = async () => {
      setBootstrapStatus("loading");
      setBootstrapError(null);
      setSyncEnabled(false);

      try {
        const previousUserId = localStorage.getItem(
          AUTH_STORAGE_KEYS.currentUserId,
        );
        if (previousUserId && previousUserId !== user.id) {
          clearLocalSnapshot();
          localStorage.removeItem(importCompleteKey(previousUserId));
        }
        localStorage.setItem(AUTH_STORAGE_KEYS.currentUserId, user.id);

        const localHadDocuments = hasLocalDocuments();
        const cloudSnapshot = await loadCloudSnapshot();
        const cloudHasDocuments = cloudSnapshot.documents.length > 0;
        const importWasCompleted =
          localStorage.getItem(importCompleteKey(user.id)) === "true";

        if (cancelled) return;

        if (cloudHasDocuments) {
          writeLocalSnapshot(cloudSnapshot);
          setShowImportBanner(false);
          setSyncEnabled(true);
        } else if (localHadDocuments && !importWasCompleted) {
          setShowImportBanner(true);
          setSyncEnabled(false);
        } else {
          const snapshot = localHadDocuments
            ? readLocalSnapshot()
            : createDefaultSnapshot();
          writeLocalSnapshot(snapshot);
          await saveSnapshotToCloud(snapshot);
          localStorage.setItem(importCompleteKey(user.id), "true");
          setShowImportBanner(false);
          setSyncEnabled(true);
        }

        setBootstrapStatus("ready");
      } catch (error) {
        if (cancelled) return;
        setBootstrapError(errorMessage(error));
        setBootstrapStatus("error");
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [session.isPending, user?.id]);

  const handleImport = async () => {
    if (!user?.id) return;

    setIsImporting(true);
    setBootstrapError(null);

    try {
      await saveSnapshotToCloud(readLocalSnapshot());
      localStorage.setItem(importCompleteKey(user.id), "true");
      setShowImportBanner(false);
      setSyncEnabled(true);
    } catch (error) {
      setBootstrapError(errorMessage(error));
    } finally {
      setIsImporting(false);
    }
  };

  const handleSignOut = async () => {
    if (user?.id) {
      localStorage.removeItem(importCompleteKey(user.id));
    }
    await client.auth.signOut();
    await session.refetch();
    clearLocalSnapshot();
    localStorage.removeItem(AUTH_STORAGE_KEYS.currentUserId);
    globalThis.location.reload();
  };

  if (session.isPending) {
    return <LoadingScreen />;
  }
  if (!user) return <AuthForm onAuthenticated={session.refetch} />;
  if (bootstrapStatus === "loading") {
    return <LoadingScreen />;
  }
  if (bootstrapStatus === "error") {
    return (
      <FullScreenPanel>
        <div className="mx-auto flex min-h-full w-full max-w-lg items-center">
          <div className="w-full rounded-md border border-red-900 bg-red-950 p-4 text-sm text-red-300">
            {bootstrapError ?? "Could not load TXTWrite from Neon."}
          </div>
        </div>
      </FullScreenPanel>
    );
  }

  return (
    <CloudProvider
      value={{
        syncEnabled,
        syncStatus,
        syncError,
        setSyncStatus,
        setSyncError,
        userEmail: user.email,
        signOut: handleSignOut,
      }}
    >
      {children}
      {showImportBanner && (
        <ImportBanner onImport={handleImport} isImporting={isImporting} />
      )}
      {bootstrapError && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 shadow-sm dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {bootstrapError}
        </div>
      )}
      <CloudSync enabled={syncEnabled} />
    </CloudProvider>
  );
}

export default function AuthGate({ children }: { children: ReactNode }) {
  if (!isNeonConfigured) return <MissingConfig />;
  return <ConfiguredAuthGate>{children}</ConfiguredAuthGate>;
}
