import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, FolderPlus } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { FormAlert } from "@/components/FormAlert";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAdminClients } from "@/features/admin/queries";
import { useOperatorClients } from "@/features/operator/queries";
import { useErrorText } from "@/hooks/useErrorText";
import { useToast } from "@/hooks/useToast";
import { ApiError } from "@/lib/api";
import { projectsApi, STAFF_BASE, type StaffRole } from "./api";
import { ClientPicker, type PickableClient } from "./ClientPicker";
import { ProjectFormFields } from "./ProjectFormFields";
import { useMayCreateProjects, useRefreshProjects } from "./queries";
import {
  agreementDraft,
  emptyProjectForm,
  newProjectSchema,
  projectFields,
  type ProjectFormValues,
} from "./schemas";

/** Operators: their assigned clients only. Admins: every client, with their operator. */
function useClientChoices(role: StaffRole) {
  const { t } = useTranslation();
  const operatorClients = useOperatorClients(role === "OPERATOR");
  const adminClients = useAdminClients(role === "ADMIN");
  const query = role === "OPERATOR" ? operatorClients : adminClients;
  const choices: PickableClient[] | undefined =
    role === "OPERATOR"
      ? operatorClients.data?.map(({ id, name, email }) => ({ id, name, email }))
      : adminClients.data?.map(({ id, name, email, operator }) => ({
          id,
          name,
          email,
          note: operator ? operator.name : t("admin.clients.unassigned"),
        }));
  return { query, choices };
}

/**
 * A new project with agreement version 1, both DRAFT: the client sees nothing
 * until it is sent from the draft page (decided 2026-10-25).
 */
export function NewProjectPage({ role }: { role: StaffRole }) {
  const { t } = useTranslation();
  const { fieldError, apiError } = useErrorText();
  const { toast } = useToast();
  const navigate = useNavigate();
  const refresh = useRefreshProjects();
  const mayCreate = useMayCreateProjects(role);
  const { query, choices } = useClientChoices(role);
  const [formError, setFormError] = useState<string>();
  const base = STAFF_BASE[role];

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(newProjectSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: emptyProjectForm(),
  });
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  async function onSubmit(values: ProjectFormValues) {
    setFormError(undefined);
    try {
      const created = await projectsApi[role].create({
        clientId: values.clientId,
        ...projectFields(values),
        agreement: agreementDraft(values),
      });
      toast({ variant: "success", title: t("projects.created", { reference: created.reference }) });
      void refresh();
      navigate(`${base}/projects/${created.id}/agreement`);
    } catch (error) {
      if (error instanceof ApiError && error.code === "CLIENT_NOT_FOUND") {
        setError("clientId", { message: "apiErrors.CLIENT_NOT_FOUND" });
        return;
      }
      setFormError(apiError(error));
    }
  }

  const back = (
    <Link
      to={`${base}/projects`}
      className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-brand-text underline underline-offset-4"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {t("projects.backToList")}
    </Link>
  );

  if (!mayCreate) {
    return (
      <div className="space-y-6">
        {back}
        <EmptyState
          icon={FolderPlus}
          title={t("projects.notAllowed")}
          description={t("projects.notAllowedBody")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {back}
      <PageHeader title={t("projects.newTitle")} description={t("projects.newSubtitle")} />

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {formError && <FormAlert>{formError}</FormAlert>}

        <section className="space-y-4 rounded-lg border border-border bg-surface p-4 sm:p-6">
          {query.isPending && <Skeleton className="h-40 w-full rounded-md" />}
          {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}
          {choices && (
            <Controller
              control={control}
              name="clientId"
              render={({ field }) => (
                <ClientPicker
                  clients={choices}
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldError(errors.clientId?.message)}
                />
              )}
            />
          )}
        </section>

        <ProjectFormFields form={form} />

        <p className="text-sm text-muted">{t("projects.createNote")}</p>
        <Button type="submit" variant="primary" loading={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? t("projects.creating") : t("projects.create")}
        </Button>
      </form>
    </div>
  );
}
