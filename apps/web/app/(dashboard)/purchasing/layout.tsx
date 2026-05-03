import { DocTypeSubNav } from "@/components/documents/doc-type-sub-nav";

export default function PurchasingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <DocTypeSubNav section="purchasing" />
      {children}
    </div>
  );
}
