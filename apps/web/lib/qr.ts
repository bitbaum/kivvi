import QRCode from "qrcode";

/**
 * Generate a QR code as a data URL (PNG).
 * Uses the qrcode library — works server-side (Node.js).
 */
export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 128,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });
}
