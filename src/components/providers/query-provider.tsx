"use client";

import { useEffect, useRef, useState } from "react";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";

function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => console.error("Query failed:", error),
    }),
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 10 * 60 * 1000,
      },
    },
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // One client per mount: stable across renders and in-layout navigation,
  // never shared between server requests or between users.
  const [queryClient] = useState(makeQueryClient);
  const { data: session, isPending } = useSession();
  const userId = session?.user?.id ?? null;
  const lastUserId = useRef<string | null | undefined>(undefined);

  // Drop all cached data if the signed-in user changes (e.g. sign-out or an
  // account switch in another tab) so one user's data is never shown to another.
  useEffect(() => {
    if (isPending) return;
    if (lastUserId.current !== undefined && lastUserId.current !== userId) {
      queryClient.clear();
    }
    lastUserId.current = userId;
  }, [isPending, userId, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}