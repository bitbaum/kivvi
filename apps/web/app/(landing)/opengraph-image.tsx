import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Kivvi — Das ERP für die Kreislaufwirtschaft";
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
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "12px",
            background: "#16a34a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "28px",
          }}
        >
          ♻
        </div>
        <span style={{ fontSize: "36px", fontWeight: 700, color: "#166534" }}>Kivvi</span>
      </div>
      <h1
        style={{
          fontSize: "56px",
          fontWeight: 800,
          color: "#111827",
          textAlign: "center",
          lineHeight: 1.2,
          margin: "0 0 24px 0",
        }}
      >
        Das ERP, das Secondhand
        <br />
        wirklich versteht.
      </h1>
      <p
        style={{
          fontSize: "24px",
          color: "#374151",
          textAlign: "center",
          margin: "0 0 48px 0",
          maxWidth: "800px",
        }}
      >
        Brockenhäuser · IT-Refurbisher · Repair Cafés · Vintage-Shops
      </p>
      <div
        style={{
          display: "flex",
          gap: "16px",
        }}
      >
        {["Open Source", "MIT-Lizenz", "Swiss-native"].map((tag) => (
          <div
            key={tag}
            style={{
              background: "#ffffff",
              border: "2px solid #16a34a",
              borderRadius: "999px",
              padding: "8px 24px",
              fontSize: "18px",
              color: "#16a34a",
              fontWeight: 600,
            }}
          >
            {tag}
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
