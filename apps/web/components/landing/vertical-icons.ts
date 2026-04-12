import { Laptop, Store, Wrench, Shirt } from "lucide-react";

// Keyed by VERTICALS[].id — shared between landing nav and vertical cards
export const VERTICAL_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  "it-refurbishers": Laptop,
  brockenhaeuser: Store,
  "repair-cafes": Wrench,
  vintage: Shirt,
};
