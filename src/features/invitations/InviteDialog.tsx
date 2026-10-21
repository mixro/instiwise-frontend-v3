import { zodResolver } from "@hookform/resolvers/zod";
import { Info, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { FormAlert } from "@/components/FormAlert";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useErrorText } from "@/hooks/useErrorText";
import { invitationsApi, LABEL_MAX, type InvitationRole, type StaffInvitation } from "./api";
import { InvitationShare } from "./InvitationShare";
import { useShareIntro } from "./useShareIntro";
import { useRefreshInvitations } from "./queries";

const NO_OPERATOR = "none";

const schema = z.object({
  label: z.string().trim().max(LABEL_MAX, "validation.tooLong"),
  role: z.enum(["CLIENT", "OPERATOR"]),
  operatorId: z.string(),
});

type Values = z.infer<typeof schema>;

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * "operator": a client, assigned to the signed-in operator on registration.
   * "admin": a client (optionally for an active operator) or an operator.
   */
  mode: "operator" | "admin";
  /** Admin only: active operators a client invitation can be for. */
  operators?: { id: string; name: string }[];
}

/** Creates an invitation, then shows its link and code to share. */
export function InviteDialog({ open, onOpenChange, mode, operators = [] }: InviteDialogProps) {
  const { t } = useTranslation();
  const { fieldError, apiError } = useErrorText();
  const refresh = useRefreshInvitations();
  const [created, setCreated] = useState<StaffInvitation | null>(null);
  const [formError, setFormError] = useState<string>();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { label: "", role: "CLIENT", operatorId: NO_OPERATOR },
  });
  const [role, operatorId] = useWatch({ control, name: ["role", "operatorId"] });
  const operatorName = operators.find((operator) => operator.id === operatorId)?.name;
  const shareIntro = useShareIntro(created);

  function close(next: boolean) {
    if (isSubmitting) return;
    if (!next) {
      reset();
      setCreated(null);
      setFormError(undefined);
    }
    onOpenChange(next);
  }

  async function onSubmit(values: Values) {
    setFormError(undefined);
    const label = values.label || undefined;
    try {
      const invitation =
        mode === "operator"
          ? await invitationsApi.operator.create(label)
          : await invitationsApi.admin.create({
              role: values.role,
              label,
              operatorId:
                values.role === "CLIENT" && values.operatorId !== NO_OPERATOR
                  ? values.operatorId
                  : undefined,
            });
      setCreated(invitation);
      void refresh();
    } catch (failure) {
      setFormError(apiError(failure));
    }
  }

  const assignment = (invitedRole: InvitationRole) => {
    if (invitedRole === "OPERATOR") return t("invitations.form.operatorNote");
    if (mode === "operator") return t("invitations.form.assignedToYou");
    return operatorName
      ? t("invitations.form.assignedToOperator", { name: operatorName })
      : t("invitations.form.notAssigned");
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("invitations.share.title")}</DialogTitle>
              <DialogDescription>{shareIntro}</DialogDescription>
            </DialogHeader>
            <InvitationShare invitation={created} />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="primary">{t("invitations.share.done")}</Button>
              </DialogClose>
            </DialogFooter>
          </>
        ) : (
          <form noValidate onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
            <DialogHeader>
              <DialogTitle>
                {mode === "operator"
                  ? t("invitations.form.titleClient")
                  : t("invitations.form.titleAdmin")}
              </DialogTitle>
              <DialogDescription>{t("invitations.form.description")}</DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              {mode === "admin" && (
                <FormField label={t("invitations.form.role")}>
                  {({ id, ...aria }) => (
                    <Controller
                      control={control}
                      name="role"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id={id} {...aria}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CLIENT">
                              {t("invitations.roleTag.CLIENT")}
                            </SelectItem>
                            <SelectItem value="OPERATOR">
                              {t("invitations.roleTag.OPERATOR")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  )}
                </FormField>
              )}

              <FormField
                label={t("invitations.form.label")}
                hint={t("invitations.form.labelHint")}
                error={fieldError(errors.label?.message)}
                optional
              >
                {(controlProps) => (
                  <Input {...controlProps} autoComplete="off" {...register("label")} />
                )}
              </FormField>

              {mode === "admin" && role === "CLIENT" && (
                <FormField label={t("invitations.form.operator")} optional>
                  {({ id, ...aria }) => (
                    <Controller
                      control={control}
                      name="operatorId"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id={id} {...aria}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_OPERATOR}>
                              {t("invitations.form.operatorNone")}
                            </SelectItem>
                            {operators.map((operator) => (
                              <SelectItem key={operator.id} value={operator.id}>
                                {operator.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  )}
                </FormField>
              )}

              <div className="space-y-2 rounded-md border border-border bg-surface-muted p-3 text-sm">
                <p className="flex gap-2">
                  <Info className="mt-0.5 size-4 shrink-0 text-brand-text" aria-hidden="true" />
                  <span>{assignment(mode === "operator" ? "CLIENT" : role)}</span>
                </p>
                <p className="flex gap-2 text-muted">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>{t("invitations.form.privacy")}</span>
                </p>
              </div>

              {formError && <FormAlert>{formError}</FormAlert>}
            </div>

            <DialogFooter className="mt-6">
              <DialogClose asChild>
                <Button type="button" disabled={isSubmitting}>
                  {t("ui.cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" variant="primary" loading={isSubmitting}>
                {t("invitations.form.create")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
