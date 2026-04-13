import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Preise — Kivvi ERP";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
        padding: "60px",
      }}
    >
      <div
        style={{
          fontSize: "20px",
          fontWeight: 600,
          color: "#16a34a",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: "24px",
        }}
      >
        Kivvi ERP · Preise
      </div>
      <h1
        style={{
          fontSize: "64px",
          fontWeight: 800,
          color: "#111827",
          textAlign: "center",
          lineHeight: 1.2,
          margin: "0 0 32px 0",
        }}
      >
        Kostenlos selbst hosten.
        <br />
        Oder für CHF 49/Monat.
      </h1>
      <div
        style={{
          display: "flex",
          gap: "32px",
          marginTop: "16px",
        }}
      >
        {[
          { name: "Open Source", price: "CHF 0", sub: "für immer" },
          { name: "Cloud", price: "CHF 49", sub: "pro Monat" },
          { name: "Enterprise", price: "Auf Anfrage", sub: "" },
        ].map((tier) => (
          <div
            key={tier.name}
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "24px 32px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
              minWidth: "220px",
            }}
          >
            <div
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#374151",
                marginBottom: "8px",
              }}
            >
              {tier.name}
            </div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: 800,
                color: "#16a34a",
              }}
            >
              {tier.price}
            </div>
            {tier.sub && (
              <div style={{ fontSize: "14px", color: "#6b7280" }}>
                {tier.sub}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
