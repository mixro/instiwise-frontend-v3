import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ErrorState } from "@/components/ErrorState";
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
import { Skeleton } from "@/components/ui/Skeleton";
import { useErrorText } from "@/hooks/useErrorText";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/cn";
import { expensesApi, type ExpenseCategory } from "./api";
import { useExpenseCategories, useRefreshExpenses } from "./queries";

const nameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "validation.categoryNameRequired")
    .max(40, "validation.categoryNameRequired"),
});
type NameValues = z.infer<typeof nameSchema>;

/** One name field and a button: adding a category, or renaming one in a dialog. */
function NameForm({
  id,
  label,
  initial,
  onSave,
}: {
  id: string;
  label: string;
  initial: string;
  onSave: (name: string) => Promise<void>;
}) {
  const { fieldError, apiError } = useErrorText();
  const [formError, setFormError] = useState<string>();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NameValues>({
    resolver: zodResolver(nameSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { name: initial },
  });

  return (
    <form
      id={id}
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setFormError(undefined);
        try {
          await onSave(values.name.trim());
          reset({ name: initial });
        } catch (error) {
          setFormError(apiError(error));
        }
      })}
      className="space-y-2"
    >
      {formError && <FormAlert>{formError}</FormAlert>}
      <FormField label={label} error={fieldError(errors.name?.message)}>
        {(field) => <Input autoComplete="off" {...field} {...register("name")} />}
      </FormField>
    </form>
  );
}

/**
 * The managed list of expense categories (decided 2026-10-25): add, rename,
 * deactivate or reactivate. Only an unused category can be deleted.
 */
export function ExpenseCategoriesSettings() {
  const { t } = useTranslation();
  const { apiError } = useErrorText();
  const { toast } = useToast();
  const refresh = useRefreshExpenses();
  const categories = useExpenseCategories("ADMIN");
  const [renaming, setRenaming] = useState<ExpenseCategory | null>(null);
  const [deleting, setDeleting] = useState<ExpenseCategory | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const list = (categories.data ?? []) as ExpenseCategory[];

  async function toggle(category: ExpenseCategory) {
    try {
      await expensesApi.admin.updateCategory(category.id, { active: !category.active });
      toast({
        variant: "success",
        title: t(
          category.active ? "expenses.categories.deactivated" : "expenses.categories.activated",
          {
            name: category.name,
          },
        ),
      });
      await refresh();
    } catch (error) {
      toast({ variant: "error", title: apiError(error) });
    }
  }

  return (
    <section aria-labelledby="categories-heading" className="max-w-xl space-y-4">
      <div className="space-y-1">
        <h2 id="categories-heading" className="text-base font-semibold">
          {t("expenses.categories.title")}
        </h2>
        <p className="text-sm text-muted">{t("expenses.categories.body")}</p>
      </div>

      {categories.isPending && <Skeleton className="h-40 w-full rounded-lg" />}
      {categories.isError && (
        <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />
      )}
      {categories.data && (
        <ul
          aria-label={t("expenses.categories.list")}
          className="divide-y divide-border rounded-lg border border-border bg-surface"
        >
          {list.map((category) => (
            <li key={category.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className={cn("font-medium", !category.active && "text-muted line-through")}>
                  {category.name}
                </p>
                <p className="text-xs text-muted">
                  {category.active
                    ? t("expenses.categories.active")
                    : t("expenses.categories.inactive")}{" "}
                  ·{" "}
                  {category.usageCount > 0
                    ? t("expenses.categories.inUse", { count: category.usageCount })
                    : t("expenses.categories.unused")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setRenaming(category)}>
                  {t("expenses.categories.rename")}
                  <span className="sr-only"> {category.name}</span>
                </Button>
                <Button size="sm" onClick={() => void toggle(category)}>
                  {category.active
                    ? t("expenses.categories.deactivate")
                    : t("expenses.categories.activate")}
                  <span className="sr-only"> {category.name}</span>
                </Button>
                {category.usageCount === 0 ? (
                  <Button size="sm" variant="danger" onClick={() => setDeleting(category)}>
                    {t("expenses.categories.delete")}
                    <span className="sr-only"> {category.name}</span>
                  </Button>
                ) : (
                  <p className="w-full text-xs text-muted sm:w-auto sm:max-w-48">
                    {t("expenses.categories.cannotDelete")}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 rounded-lg border border-border bg-surface p-4">
        <NameForm
          id="add-category"
          label={t("expenses.categories.name")}
          initial=""
          onSave={async (name) => {
            await expensesApi.admin.createCategory(name);
            toast({ variant: "success", title: t("expenses.categories.added", { name }) });
            await refresh();
          }}
        />
        <Button type="submit" form="add-category" size="sm">
          {t("expenses.categories.add")}
        </Button>
      </div>

      <Dialog open={renaming !== null} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent>
          {renaming && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {t("expenses.categories.renameTitle", { name: renaming.name })}
                </DialogTitle>
                <DialogDescription>{t("expenses.categories.body")}</DialogDescription>
              </DialogHeader>
              <NameForm
                id="rename-category"
                label={t("expenses.categories.newName")}
                initial={renaming.name}
                onSave={async (name) => {
                  await expensesApi.admin.updateCategory(renaming.id, { name });
                  toast({ variant: "success", title: t("expenses.categories.renamed", { name }) });
                  setRenaming(null);
                  await refresh();
                }}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button>{t("ui.cancel")}</Button>
                </DialogClose>
                <Button type="submit" form="rename-category" variant="primary">
                  {t("expenses.categories.save")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
            setDeleteError(undefined);
          }
        }}
        tone="danger"
        title={t("expenses.categories.deleteTitle", { name: deleting?.name ?? "" })}
        description={t("expenses.categories.deleteBody")}
        confirmLabel={t("expenses.categories.delete")}
        error={deleteError}
        onConfirm={async () => {
          if (!deleting) return;
          setDeleteError(undefined);
          try {
            await expensesApi.admin.deleteCategory(deleting.id);
            toast({
              variant: "success",
              title: t("expenses.categories.deleted", { name: deleting.name }),
            });
            await refresh();
          } catch (error) {
            setDeleteError(apiError(error));
            throw error;
          }
        }}
      />
    </section>
  );
}
