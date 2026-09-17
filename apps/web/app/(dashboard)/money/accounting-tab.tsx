import { AccountingNavCards, TrialBalancePanel } from "@/components/accounting/accounting-overview";

export async function AccountingTab({ companyId }: { companyId: string }) {
  return (
    <div className="space-y-6">
      {/* Navigation cards */}
      <AccountingNavCards />

      {/* Trial Balance Summary */}
      <TrialBalancePanel companyId={companyId} />
    </div>
  );
}
