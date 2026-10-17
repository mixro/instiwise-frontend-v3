import {
  Download,
  File,
  FileArchive,
  FileImage,
  FileText,
  FileVideo,
  FolderOpen,
  Presentation,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useErrorText } from "@/hooks/useErrorText";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";
import { formatDate, formatFileSize } from "@/lib/format";
import { clientApi, type DocumentKind, type ProjectDocument } from "./api";
import { useProjectId } from "./project-tabs";
import { useDocuments } from "./queries";

const ICONS: Record<DocumentKind, LucideIcon> = {
  pdf: FileText,
  word: FileText,
  slides: Presentation,
  image: FileImage,
  video: FileVideo,
  archive: FileArchive,
  other: File,
};

/** Asks the server for a short-lived signed link, then downloads from it. */
async function download(document: ProjectDocument): Promise<void> {
  const { url } = await clientApi.documentLink(document.id);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = document.name;
  link.rel = "noopener";
  link.click();
}

/** Final deliverables and records the team shared with the client (brief section 14). */
export function DocumentsTab() {
  const { t } = useTranslation();
  const language = useLanguage();
  const { apiError } = useErrorText();
  const { toast } = useToast();
  const documents = useDocuments(useProjectId());
  const [busy, setBusy] = useState<string>();

  async function onDownload(document: ProjectDocument) {
    setBusy(document.id);
    try {
      await download(document);
    } catch (error) {
      toast({
        variant: "error",
        title: t("client.documents.failed"),
        description: apiError(error),
      });
    } finally {
      setBusy(undefined);
    }
  }

  if (documents.isPending) {
    return (
      <div aria-busy="true" className="space-y-2">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }
  if (documents.isError) {
    return <ErrorState error={documents.error} onRetry={() => void documents.refetch()} />;
  }
  if (documents.data.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title={t("client.documents.empty")}
        description={t("client.documents.emptyBody")}
      />
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
      {documents.data.map((document) => {
        const Icon = ICONS[document.kind];
        return (
          <li key={document.id} className="flex items-center gap-4 p-4">
            <Icon className="size-6 shrink-0 text-muted" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="font-medium break-words">{document.name}</p>
              <p className="text-sm text-muted">
                {document.category} · {formatFileSize(document.sizeBytes, language)} ·{" "}
                {formatDate(document.uploadedAt, language)}
              </p>
            </div>
            <Button
              size="icon"
              loading={busy === document.id}
              onClick={() => void onDownload(document)}
              aria-label={t("client.documents.download", { name: document.name })}
            >
              {busy !== document.id && <Download className="size-4" aria-hidden="true" />}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
