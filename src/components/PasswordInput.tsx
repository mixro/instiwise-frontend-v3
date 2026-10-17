import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

type PasswordInputProps = Omit<ComponentProps<"input">, "type"> & {
  /** "current-password" on sign-in, "new-password" on registration. */
  autoComplete: "current-password" | "new-password";
};

/** A password field with a show/hide button (long passwords are easy to mistype on phones). */
export function PasswordInput({ className, id, ...props }: PasswordInputProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={cn("pr-14 sm:pr-12", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-pressed={visible}
        aria-controls={id}
        aria-label={visible ? t("auth.password.hide") : t("auth.password.show")}
        disabled={props.disabled}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-muted hover:text-foreground disabled:pointer-events-none sm:w-10"
      >
        <Icon className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
