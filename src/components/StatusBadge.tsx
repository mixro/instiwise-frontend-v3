import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import {
  AGREEMENT_STATUS_TONES,
  CHANGE_REQUEST_STATUS_TONES,
  CORRECTION_KIND_TONES,
  OPERATOR_STATUS_TONES,
  INVITATION_STATUS_TONES,
  PAYMENT_STATUS_TONES,
  PROJECT_STATUS_TONES,
  type AgreementStatus,
  type ChangeRequestStatus,
  type CorrectionKind,
  type OperatorStatus,
  type InvitationStatus,
  type PaymentStatus,
  type ProjectStatus,
  type StatusTone,
} from "@/lib/status";

const TONE_STYLES: Record<StatusTone, string> = {
  neutral: "border-border-strong bg-surface-muted text-muted",
  positive: "border-transparent bg-brand-soft text-brand-text",
  warning: "border-transparent bg-warning-bg text-warning-fg",
  danger: "border-transparent bg-danger-bg text-danger-fg",
};

type StatusBadgeProps = { className?: string } & (
  | { kind: "project"; status: ProjectStatus }
  | { kind: "payment"; status: PaymentStatus }
  | { kind: "invitation"; status: InvitationStatus }
  | { kind: "agreement"; status: AgreementStatus }
  | { kind: "changeRequest"; status: ChangeRequestStatus }
  | { kind: "correction"; status: CorrectionKind }
  | { kind: "operator"; status: OperatorStatus }
);

// One branch per kind so each translation key is checked against the locale file.
function describe(props: StatusBadgeProps, t: TFunction): { tone: StatusTone; label: string } {
  switch (props.kind) {
    case "project":
      return {
        tone: PROJECT_STATUS_TONES[props.status],
        label: t(`status.project.${props.status}`),
      };
    case "payment":
      return {
        tone: PAYMENT_STATUS_TONES[props.status],
        label: t(`status.payment.${props.status}`),
      };
    case "invitation":
      return {
        tone: INVITATION_STATUS_TONES[props.status],
        label: t(`status.invitation.${props.status}`),
      };
    case "agreement":
      return {
        tone: AGREEMENT_STATUS_TONES[props.status],
        label: t(`status.agreement.${props.status}`),
      };
    case "changeRequest":
      return {
        tone: CHANGE_REQUEST_STATUS_TONES[props.status],
        label: t(`status.changeRequest.${props.status}`),
      };
    case "correction":
      return {
        tone: CORRECTION_KIND_TONES[props.status],
        label: t(`status.correction.${props.status}`),
      };
    case "operator":
      return {
        tone: OPERATOR_STATUS_TONES[props.status],
        label: t(`status.operator.${props.status}`),
      };
  }
}

/** A status as words plus colour. The text alone must be enough; colour never stands alone. */
export function StatusBadge(props: StatusBadgeProps) {
  const { t } = useTranslation();
  const { tone, label } = describe(props, t);

  return (
    <span
      data-tone={tone}
      className={cn(
        "inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium whitespace-nowrap",
        TONE_STYLES[tone],
        props.className,
      )}
    >
      {label}
    </span>
  );
}
