import { Plus, Trash2 } from "lucide-react";
import { useId } from "react";
import {
  get,
  useFieldArray,
  useFormState,
  type ArrayPath,
  type Control,
  type FieldArray,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useErrorText } from "@/hooks/useErrorText";
import { TERM_MAX_LENGTH } from "@/lib/terms";

interface TermsEditorProps<V extends FieldValues> {
  control: Control<V>;
  /** The form field holding the rows ({ en, sw }[]). */
  name: ArrayPath<V>;
  /** Already translated: "Scope", "Payment terms"… */
  legend: string;
  hint?: string;
}

/**
 * An editable list of agreement terms, each in English and Swahili side by side
 * (stacked on phones). Both copies are written by staff (ADR 0004). Errors come
 * from termsField() in lib/terms and show inline.
 */
export function TermsEditor<V extends FieldValues>({
  control,
  name,
  legend,
  hint,
}: TermsEditorProps<V>) {
  const { t } = useTranslation();
  const { fieldError } = useErrorText();
  const rows = useFieldArray({ control, name });
  const { errors } = useFormState({ control, name: name as unknown as Path<V> });
  const hintId = useId();
  const baseId = useId();

  const messageAt = (path: string): string | undefined =>
    fieldError((get(errors, path) as { message?: string } | undefined)?.message);
  const listError = messageAt(`${name}.root`) ?? messageAt(`${name}`);

  return (
    <fieldset className="space-y-3" aria-describedby={hint ? hintId : undefined}>
      <legend className="text-sm font-medium">{legend}</legend>
      {hint && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      <ol className="space-y-3">
        {rows.fields.map((row, index) => {
          const number = index + 1;
          return (
            <li
              key={row.id}
              className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start sm:border-0 sm:p-0"
            >
              {(["en", "sw"] as const).map((language) => {
                const id = `${baseId}-${index}-${language}`;
                const error = messageAt(`${name}.${index}.${language}`);
                return (
                  <div key={language} className="flex flex-col gap-1">
                    <Label htmlFor={id} className="text-xs text-muted">
                      {t("terms.itemLabel", {
                        list: legend,
                        number,
                        language: t(`language.${language}`),
                      })}
                    </Label>
                    <Input
                      id={id}
                      lang={language}
                      maxLength={TERM_MAX_LENGTH}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? `${id}-error` : undefined}
                      {...control.register(`${name}.${index}.${language}` as Path<V>)}
                    />
                    {error && (
                      <p id={`${id}-error`} className="text-sm text-danger-fg">
                        {error}
                      </p>
                    )}
                  </div>
                );
              })}
              <Button
                size="icon"
                variant="ghost"
                className="justify-self-end sm:mt-5"
                aria-label={t("terms.remove", { list: legend, number })}
                onClick={() => rows.remove(index)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </li>
          );
        })}
      </ol>
      {listError && <p className="text-sm text-danger-fg">{listError}</p>}
      <Button
        size="sm"
        onClick={() => rows.append({ en: "", sw: "" } as FieldArray<V, ArrayPath<V>>)}
      >
        <Plus className="size-4" aria-hidden="true" />
        {t("terms.add", { list: legend })}
      </Button>
    </fieldset>
  );
}
