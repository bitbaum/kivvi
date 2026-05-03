import { DocTypeSubNav } from "@/components/documents/doc-type-sub-nav";

export default function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <DocTypeSubNav section="sales" />
      {children}
    </div>
  );
}
