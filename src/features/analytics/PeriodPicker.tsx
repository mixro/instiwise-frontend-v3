import { useId } from "react";
import { useTranslation } from "react-i18next";
import { FormField } from "@/components/FormField";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useLanguage } from "@/hooks/useLanguage";
import { formatDate } from "@/lib/format";
import { PERIOD_PRESETS, type PeriodPreset, type PeriodSelection } from "./period";

interface PeriodPickerProps {
  selection: PeriodSelection;
  /** The new period as address parameters (period, and from/to for a custom range). */
  onChange: (next: { period: PeriodPreset; from?: string; to?: string }) => void;
}

/** One control for the whole page: a preset, or two dates for a custom range. */
export function PeriodPicker({ selection, onChange }: PeriodPickerProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const presetId = useId();
  const custom = selection.preset === "custom";
  const from = selection.period?.from ?? (selection.error ? selection.from : "");
  const to = selection.period?.to ?? (selection.error ? selection.to : "");

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start">
        <div className="flex flex-col gap-2 sm:w-52">
          <Label htmlFor={presetId}>{t("analytics.period.label")}</Label>
          <Select
            value={selection.preset}
            onValueChange={(value) => {
              const preset = PERIOD_PRESETS.find((candidate) => candidate === value) ?? "month";
              // A custom range starts from the days shown, so it can be adjusted.
              onChange(preset === "custom" ? { period: preset, from, to } : { period: preset });
            }}
          >
            <SelectTrigger id={presetId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_PRESETS.map((preset) => (
                <SelectItem key={preset} value={preset}>
                  {t(`analytics.period.${preset}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {custom && (
          <>
            <FormField
              label={t("analytics.period.from")}
              className="sm:w-44"
              error={selection.error === "invalid" ? t("analytics.period.invalid") : undefined}
            >
              {(field) => (
                <Input
                  type="date"
                  value={from}
                  onChange={(event) => onChange({ period: "custom", from: event.target.value, to })}
                  {...field}
                />
              )}
            </FormField>
            <FormField
              label={t("analytics.period.to")}
              className="sm:w-44"
              error={selection.error === "missing" ? t("analytics.period.missing") : undefined}
            >
              {(field) => (
                <Input
                  type="date"
                  value={to}
                  onChange={(event) => onChange({ period: "custom", from, to: event.target.value })}
                  {...field}
                />
              )}
            </FormField>
          </>
        )}
      </div>
      {selection.period && (
        <p className="text-sm text-muted" aria-live="polite">
          {t("analytics.period.showing", {
            from: formatDate(selection.period.from, language),
            to: formatDate(selection.period.to, language),
          })}
        </p>
      )}
    </div>
  );
}
