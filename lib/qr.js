import QRCode from "qrcode";

// A QR code as inline SVG (sharp at any print size, no image file needed).
export async function qrSvg(url, dark = "#202A1E") {
  return QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark, light: "#00000000" } });
}
