import { useTranslation } from "react-i18next";
import { ErrorState } from "@/components/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/Sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ReceiptDetails } from "@/features/receipts/ReceiptDetails";
import { useReceipt } from "./queries";

interface ReceiptSheetProps {
  /** The receipt to show; null closes the sheet. */
  receiptNumber: string | null;
  onClose: () => void;
}

/**
 * A receipt as the system recorded it (brief 12.4). Slides up from the bottom on
 * phones, from the side on wider screens. PDF downloads in English and Swahili
 * arrive with the receipts backend (phase 5.6).
 */
export function ReceiptSheet({ receiptNumber, onClose }: ReceiptSheetProps) {
  const { t } = useTranslation();
  const wide = useMediaQuery("(min-width: 640px)");
  const receipt = useReceipt(receiptNumber);

  return (
    <Sheet open={receiptNumber !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side={wide ? "right" : "bottom"}>
        <SheetHeader>
          <SheetTitle>{t("client.receipt.title", { number: receiptNumber ?? "" })}</SheetTitle>
          <SheetDescription>{t("client.receipt.disclaimer")}</SheetDescription>
        </SheetHeader>

        {receipt.isPending && (
          <div aria-busy="true" className="space-y-3">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}

        {receipt.isError && (
          <ErrorState error={receipt.error} onRetry={() => void receipt.refetch()} />
        )}

        {receipt.data && <ReceiptDetails receipt={receipt.data} showDisclaimer={false} />}
      </SheetContent>
    </Sheet>
  );
}
