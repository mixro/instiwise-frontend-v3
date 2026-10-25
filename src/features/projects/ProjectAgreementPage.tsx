import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Lock, Send } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ErrorState } from "@/components/ErrorState";
import { FormAlert } from "@/components/FormAlert";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import type { AgreementVersion } from "@/features/client/api";
import { useErrorText } from "@/hooks/useErrorText";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";
import { SUPPORTED_LANGUAGES } from "@/i18n/languages";
import { projectsApi, STAFF_BASE, type StaffProjectDetail, type StaffRole } from "./api";
import { AgreementPreview } from "./AgreementPreview";
import { ProjectFormFields } from "./ProjectFormFields";
import {
  projectKeys,
  useMayCreateProjects,
  useRefreshProjects,
  useStaffAgreement,
  useStaffProject,
} from "./queries";
import {
  agreementDraft,
  projectFields,
  projectFormSchema,
  toProjectForm,
  type ProjectFormValues,
} from "./schemas";

/** The saved draft as the client will see it, in English and in Swahili. */
function Preview({ project, version }: { project: StaffProjectDetail; version: AgreementVersion }) {
  const { t } = useTranslation();
  const language = useLanguage();
  return (
    <section aria-labelledby="preview-heading" className="space-y-3 lg:sticky lg:top-4">
      <h2 id="preview-heading" className="text-base font-semibold">
        {t("projects.preview.title")}
      </h2>
      <p className="text-sm text-muted">{t("projects.preview.body")}</p>
      <Tabs defaultValue={language}>
        <TabsList aria-label={t("projects.preview.languages")}>
          {SUPPORTED_LANGUAGES.map((lng) => (
            <TabsTrigger key={lng} value={lng} lang={lng}>
              {t(`language.${lng}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        {SUPPORTED_LANGUAGES.map((lng) => (
          <TabsContent key={lng} value={lng} className="pt-3">
            <AgreementPreview project={project} version={version} language={lng} />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}

function DraftEditor({
  role,
  project,
  version,
}: {
  role: StaffRole;
  project: StaffProjectDetail;
  version: AgreementVersion;
}) {
  const { t } = useTranslation();
  const { apiError } = useErrorText();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const refresh = useRefreshProjects();
  const [formError, setFormError] = useState<string>();
  const [confirming, setConfirming] = useState(false);
  const [sendError, setSendError] = useState<string>();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: toProjectForm(project, version),
  });
  const {
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = form;

  async function onSubmit(values: ProjectFormValues) {
    setFormError(undefined);
    try {
      const savedProject = await projectsApi[role].update(project.id, projectFields(values));
      const savedVersion = await projectsApi[role].saveDraft(project.id, agreementDraft(values));
      queryClient.setQueryData(projectKeys.detail(role, project.id), savedProject);
      queryClient.setQueryData(projectKeys.agreement(role, project.id), {
        versions: [savedVersion],
      });
      reset(toProjectForm(savedProject, savedVersion));
      toast({ variant: "success", title: t("projects.draftSaved") });
      void refresh();
    } catch (error) {
      setFormError(apiError(error));
    }
  }

  async function send() {
    setSendError(undefined);
    try {
      await projectsApi[role].send(project.id);
      toast({ variant: "success", title: t("projects.sent", { name: project.clientName }) });
      await refresh();
    } catch (error) {
      setSendError(apiError(error));
      throw error;
    }
  }

  return (
    <div className="space-y-6">
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {formError && <FormAlert>{formError}</FormAlert>}
        <ProjectFormFields form={form} />
        <Button
          type="submit"
          variant="primary"
          loading={isSubmitting}
          disabled={!isDirty}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? t("projects.saving") : t("projects.saveDraft")}
        </Button>
      </form>

      <section
        aria-labelledby="send-heading"
        className="space-y-3 rounded-lg border border-border bg-surface p-4 sm:p-6"
      >
        <h2 id="send-heading" className="text-base font-semibold">
          {t("projects.sendTitle")}
        </h2>
        <p className="text-sm text-muted">{t("projects.sendBody", { name: project.clientName })}</p>
        {isDirty && <p className="text-sm text-warning-fg">{t("projects.saveFirst")}</p>}
        <Button disabled={isDirty} onClick={() => setConfirming(true)} className="w-full sm:w-auto">
          <Send className="size-4" aria-hidden="true" />
          {t("projects.send")}
        </Button>
      </section>

      <ConfirmDialog
        open={confirming}
        onOpenChange={(open) => {
          setConfirming(open);
          if (!open) setSendError(undefined);
        }}
        title={t("projects.confirmTitle", { version: version.version, name: project.clientName })}
        description={t("projects.confirmBody")}
        confirmLabel={t("projects.send")}
        error={sendError}
        onConfirm={send}
      />
    </div>
  );
}

/**
 * A project's agreement v1 for staff. While DRAFT: edit the project and the
 * terms, preview them as the client will see them, then send. Once sent it is
 * history and read-only here (decided 2026-10-25).
 */
export function ProjectAgreementPage({ role }: { role: StaffRole }) {
  const { t } = useTranslation();
  const { projectId = "" } = useParams();
  const project = useStaffProject(role, projectId);
  const agreement = useStaffAgreement(role, projectId);
  const mayEdit = useMayCreateProjects(role);
  const base = STAFF_BASE[role];
  const version = agreement.data?.versions[0];
  const isDraft = project.data?.status === "DRAFT" && version?.status === "DRAFT";

  return (
    <div className="space-y-6">
      <Link
        to={`${base}/projects`}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-brand-text underline underline-offset-4"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("projects.backToList")}
      </Link>

      {(project.isPending || agreement.isPending) && (
        <div aria-busy="true" className="space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      )}
      {project.isError && (
        <ErrorState error={project.error} onRetry={() => void project.refetch()} />
      )}
      {!project.isError && agreement.isError && (
        <ErrorState error={agreement.error} onRetry={() => void agreement.refetch()} />
      )}

      {project.data && version && (
        <>
          <PageHeader
            title={project.data.title}
            description={`${project.data.reference} · ${project.data.clientName}`}
            badge={<StatusBadge kind="project" status={project.data.status} />}
          />
          {!isDraft && (
            <p
              role="status"
              className="flex gap-2 rounded-lg border border-border bg-surface p-4 text-sm"
            >
              <Lock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
              <span>{t("projects.sentNotice", { name: project.data.clientName })}</span>
            </p>
          )}
          {isDraft && !mayEdit && (
            <p role="status" className="rounded-lg border border-border bg-surface p-4 text-sm">
              {t("projects.readOnlyDraft")}
            </p>
          )}
          {isDraft && mayEdit ? (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
              <div className="min-w-0">
                <DraftEditor
                  key={project.data.id}
                  role={role}
                  project={project.data}
                  version={version}
                />
              </div>
              <Preview project={project.data} version={version} />
            </div>
          ) : (
            <Preview project={project.data} version={version} />
          )}
        </>
      )}
    </div>
  );
}
