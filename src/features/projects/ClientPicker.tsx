import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { cn } from "@/lib/cn";

export interface PickableClient {
  id: string;
  name: string;
  email: string;
  /** Admin list: who works with them. */
  note?: string;
}

interface ClientPickerProps {
  clients: PickableClient[];
  value: string;
  onChange: (clientId: string) => void;
  error?: string;
}

/**
 * Choose the client: type to narrow the list, then pick one (radio buttons, so it
 * works with a keyboard and a screen reader). Operators only ever get their
 * assigned clients from the server.
 */
export function ClientPicker({ clients, value, onChange, error }: ClientPickerProps) {
  const { t } = useTranslation();
  const searchId = useId();
  const errorId = useId();
  const [query, setQuery] = useState("");
  const wanted = query.trim().toLowerCase();
  const shown = clients.filter(
    (client) =>
      !wanted ||
      client.name.toLowerCase().includes(wanted) ||
      client.email.toLowerCase().includes(wanted) ||
      client.id === value,
  );

  return (
    <fieldset className="space-y-2" aria-describedby={error ? errorId : undefined}>
      <legend className="text-sm font-medium">{t("projects.form.client")}</legend>
      <Label htmlFor={searchId} className="sr-only">
        {t("projects.form.clientSearch")}
      </Label>
      <Input
        id={searchId}
        type="search"
        placeholder={t("projects.form.clientSearch")}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {shown.length === 0 ? (
        <p className="text-sm text-muted">{t("projects.form.noClients")}</p>
      ) : (
        <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border p-1">
          {shown.map((client) => (
            <label
              key={client.id}
              className={cn(
                "flex min-h-11 cursor-pointer items-start gap-3 rounded-md px-3 py-2 text-sm",
                client.id === value ? "bg-brand-soft" : "hover:bg-surface-muted",
              )}
            >
              <input
                type="radio"
                name={`${searchId}-client`}
                value={client.id}
                checked={client.id === value}
                onChange={() => onChange(client.id)}
                className="mt-1 size-4 accent-[var(--brand)]"
              />
              <span className="min-w-0">
                <span className="block font-medium">{client.name}</span>
                <span className="block text-xs text-muted">
                  {client.email}
                  {client.note && ` · ${client.note}`}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}
      {error && (
        <p id={errorId} className="text-sm text-danger-fg">
          {error}
        </p>
      )}
    </fieldset>
  );
}
