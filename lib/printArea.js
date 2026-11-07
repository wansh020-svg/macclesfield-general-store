// Optional town for a targeted print run, e.g. /flyer?area=Meadows.
// Adds a "Now delivering to Meadows" line and tags the QR code (?src=meadows-flyer)
// so those orders show "via meadows-flyer" on the staff Orders screen.
export function printArea(value) {
  const name = String(value || "").replace(/[^A-Za-z ]/g, "").replace(/\s+/g, " ").trim().slice(0, 20);
  const slug = name.toLowerCase().replace(/ /g, "-").slice(0, 12);
  return { name, src: (kind) => (slug ? `${slug}-${kind}` : kind) };
}
