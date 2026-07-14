import { describe, it, expect } from "vitest";
import { computeFundMovement, capitalBlockOf } from "../domain/funds";

describe("capitalBlockOf (FER-21 classification)", () => {
  it("external purpose-bound → Fondskapital", () => {
    expect(capitalBlockOf("extern_zweckgebunden")).toBe("fondskapital");
  });
  it("board-designated → Organisationskapital", () => {
    expect(capitalBlockOf("intern_gebunden")).toBe("organisationskapital");
  });
  it("free → Organisationskapital", () => {
    expect(capitalBlockOf("frei")).toBe("organisationskapital");
  });
});

describe("computeFundMovement (Fondsrechnung row)", () => {
  it("closing = opening + Zuweisungen − Verwendung", () => {
    const m = computeFundMovement("1000.00", "500.00", "300.00");
    expect(m).toEqual({
      opening: "1000.00",
      zuweisungen: "500.00",
      verwendung: "300.00",
      closing: "1200.00",
    });
  });

  it("handles a fully-used fund returning to zero", () => {
    const m = computeFundMovement("0", "800.00", "800.00");
    expect(m.closing).toBe("0.00");
  });

  it("uses decimal math (no float drift)", () => {
    const m = computeFundMovement("0.10", "0.20", "0");
    expect(m.closing).toBe("0.30");
  });
});
