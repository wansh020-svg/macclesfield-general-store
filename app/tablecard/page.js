import PrintBar from "@/components/PrintBar";
import { isLight, printTheme } from "@/lib/printTheme";
import { deliveryText } from "@/lib/hours";
import { printDelivery } from "@/lib/printDelivery";
import { qrSvg } from "@/lib/qr";
import { SHOP, SITE_URL } from "@/lib/site";

export const metadata = { title: "Table cards | Macclesfield General Store", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const clean = (v) => String(v || "").replace(/[<>]/g, "").slice(0, 60);

// One half of a table tent (210 x 74 mm).
function Panel({ qr, shown, offer, t, flip, when }) {
  return (
    <div
      className={`${t.page} flex items-center`}
      style={{ width: "210mm", height: "74.05mm", padding: "7mm 12mm", gap: "9mm", transform: flip ? "rotate(180deg)" : undefined }}
    >
      <div className="flex-1">
        <p className={`font-mono uppercase ${t.accent}`} style={{ fontSize: "3.2mm", letterSpacing: "0.2em" }}>{SHOP.name}</p>
        <h2 className="font-display font-900 leading-[0.98]" style={{ fontSize: "11mm", marginTop: "2.5mm" }}>Love it? We&apos;ll bring it over next time.</h2>
        {offer ? (
          <p className="font-display font-900 bg-gold text-ink rounded-full inline-block" style={{ fontSize: "4mm", padding: "1.6mm 5mm", marginTop: "3mm" }}>{offer}</p>
        ) : (
          <p className={t.sub} style={{ fontSize: "4mm", marginTop: "3mm" }}>Order online and pay cash when it arrives.</p>
        )}
        <p className={t.sub} style={{ fontSize: "3.6mm", marginTop: "3mm" }}>Delivery {when} &nbsp;&middot;&nbsp; {SHOP.phone}</p>
        <p className={`font-mono ${t.accent}`} style={{ fontSize: "3.4mm", marginTop: "1mm" }}>{shown}</p>
      </div>
      <div className="text-center shrink-0">
        <div className={`${t.qrTile} rounded-2xl`} style={{ padding: "3.5mm", width: "40mm", height: "40mm" }}>
          <div className="w-full h-full [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: qr }} />
        </div>
        <p className="font-display font-900" style={{ fontSize: "5mm", marginTop: "2mm" }}>Scan to order</p>
      </div>
    </div>
  );
}

// Two table tents per A4 sheet. Cut along the long dashed line, fold each strip on the short dashed line,
// and the card stands up with the right way up on both sides.
export default async function TableCardPage({ searchParams }) {
  const offer = clean(searchParams?.offer);
  const light = isLight(searchParams?.light);
  const t = printTheme(light);
  const when = deliveryText(await printDelivery());
  const link = `${SITE_URL}/order?src=table`;
  const shown = link.replace(/^https?:\/\/(www\.)?/, "").replace(/\?.*$/, "");
  const qr = await qrSvg(link);

  return (
    <div className="bg-ink/10 min-h-screen print:bg-white print:min-h-0">
      <style>{`@page { size: A4; margin: 0 } html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact }
        @media print { body { padding: 0 !important; background: #fff !important } }`}</style>
      <PrintBar title="Table tents (2 per A4)" light={light} offer={offer} hint="Print on thick card if you can. Cut along the long dashed line, fold each strip on the short dashed line." />
      <div className="overflow-x-auto py-6 print:py-0">
        <div className="mx-auto bg-white shadow-xl print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
          {[0, 1].map((i) => (
            <div key={i} style={{ height: "148.5mm", outline: "0.3mm dashed #999", outlineOffset: "-0.15mm" }}>
              <Panel qr={qr} shown={shown} offer={offer} t={t} when={when} flip />
              <div style={{ borderTop: "0.3mm dashed #777" }} />
              <Panel qr={qr} shown={shown} offer={offer} t={t} when={when} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
