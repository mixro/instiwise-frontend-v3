import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { clientApi } from "./api";

/** Query keys for the client area. Everything sits under "client" so it can be refreshed at once. */
export const clientKeys = {
  all: ["client"] as const,
  home: () => [...clientKeys.all, "home"] as const,
  projects: () => [...clientKeys.all, "projects"] as const,
  project: (id: string) => [...clientKeys.all, "project", id] as const,
  agreement: (id: string) => [...clientKeys.project(id), "agreement"] as const,
  progress: (id: string) => [...clientKeys.project(id), "progress"] as const,
  messages: (id: string) => [...clientKeys.project(id), "messages"] as const,
  projectPayments: (id: string) => [...clientKeys.project(id), "payments"] as const,
  documents: (id: string) => [...clientKeys.project(id), "documents"] as const,
  payments: () => [...clientKeys.all, "payments"] as const,
  receipt: (number: string) => [...clientKeys.all, "receipt", number] as const,
  profile: () => [...clientKeys.all, "profile"] as const,
};

/** How often an open conversation asks for new messages (polling first; sockets later). */
export const MESSAGE_POLL_MS = 15_000;

export const useHome = () => useQuery({ queryKey: clientKeys.home(), queryFn: clientApi.home });

export const useProjects = () =>
  useQuery({ queryKey: clientKeys.projects(), queryFn: clientApi.projects });

export const useProject = (id: string) =>
  useQuery({ queryKey: clientKeys.project(id), queryFn: () => clientApi.project(id) });

export const useAgreement = (id: string) =>
  useQuery({ queryKey: clientKeys.agreement(id), queryFn: () => clientApi.agreement(id) });

export const useProgress = (id: string) =>
  useQuery({ queryKey: clientKeys.progress(id), queryFn: () => clientApi.progress(id) });

export const useMessages = (id: string) =>
  useQuery({
    queryKey: clientKeys.messages(id),
    queryFn: () => clientApi.messages(id),
    refetchInterval: MESSAGE_POLL_MS,
  });

export const useProjectPayments = (id: string) =>
  useQuery({
    queryKey: clientKeys.projectPayments(id),
    queryFn: () => clientApi.projectPayments(id),
  });

export const usePayments = () =>
  useQuery({ queryKey: clientKeys.payments(), queryFn: clientApi.payments });

export const useReceipt = (number: string | null) =>
  useQuery({
    queryKey: clientKeys.receipt(number ?? ""),
    queryFn: () => clientApi.receipt(number ?? ""),
    enabled: number !== null,
  });

export const useDocuments = (id: string) =>
  useQuery({ queryKey: clientKeys.documents(id), queryFn: () => clientApi.documents(id) });

export const useProfile = () =>
  useQuery({ queryKey: clientKeys.profile(), queryFn: clientApi.profile });

/** After a change, ask the server again for everything in the client area (totals included). */
export function useRefreshClient() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: clientKeys.all }),
    [queryClient],
  );
}
