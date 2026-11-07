import PrintBar from "@/components/PrintBar";
import { isLight, printTheme } from "@/lib/printTheme";
import { deliveryText, pickupText } from "@/lib/hours";
import { printDelivery, printPickup } from "@/lib/printDelivery";
import { feeText } from "@/lib/fees";
import { qrSvg } from "@/lib/qr";
import { SHOP, SITE_URL } from "@/lib/site";
import { printArea } from "@/lib/printArea";

export const metadata = { title: "Flyers | Macclesfield General Store", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const clean = (v) => String(v || "").replace(/[<>]/g, "").slice(0, 60);

function Card({ qr, shown, offer, t, when, pick, area }) {
  return (
    <div className={`${t.page} flex flex-col text-center`} style={{ width: "105mm", height: "148.5mm", padding: "9mm 8mm 8mm" }}>
      <p className={`font-mono ${t.accent} uppercase`} style={{ fontSize: "3mm", letterSpacing: "0.2em" }}>{SHOP.name}</p>
      {area && (
        <p className="font-display font-900 bg-gold text-ink rounded-full self-center" style={{ fontSize: "4.6mm", padding: "1.6mm 5mm", marginTop: "3mm" }}>Now delivering to {area}</p>
      )}
      <h2 className="font-display font-900 leading-[0.98]" style={{ fontSize: area ? "8mm" : "10mm", marginTop: area ? "3mm" : "4mm" }}>Hungry? Pick it up or we&apos;ll bring it over.</h2>
      {offer ? (
        <p className="font-display font-900 bg-gold text-ink rounded-full self-center" style={{ fontSize: "4.2mm", padding: "1.8mm 5mm", marginTop: "4mm" }}>{offer}</p>
      ) : (
        <p className={t.sub} style={{ fontSize: area ? "3.6mm" : "4mm", marginTop: area ? "3mm" : "4mm" }}>
          {area
            ? `Thanks for the overwhelming response, Macclesfield! Now delivering burgers, curries and more to ${area} too.`
            : "Coffee, brekkie, burgers and Punjabi curries. Order online for pickup or delivery."}
        </p>
      )}
      <div className={`${t.qrTile} rounded-2xl self-center`} style={{ padding: "4mm", width: area ? "36mm" : "44mm", height: area ? "36mm" : "44mm", marginTop: "auto" }}>
        <div className="w-full h-full [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: qr }} />
      </div>
      <p className="font-display font-900" style={{ fontSize: "6mm", marginTop: "3mm" }}>Scan to order</p>
      <p className={`font-mono ${t.accent}`} style={{ fontSize: "3.2mm", marginTop: "1mm" }}>{shown}</p>
      <p className={t.sub} style={{ fontSize: "3.2mm", marginTop: "3mm" }}>Pickup {pick}. Delivery {when}.</p>
      <p className="font-display font-700" style={{ fontSize: "3.6mm" }}>{SHOP.phone}</p>
    </div>
  );
}

export default async function FlyerPage({ searchParams }) {
  const offer = clean(searchParams?.offer);
  const light = isLight(searchParams?.light);
  const area = printArea(searchParams?.area);
  const t = printTheme(light);
  const dcfg = await printDelivery();
  const pick = pickupText(await printPickup());
  const when = `${deliveryText(dcfg)} (${feeText(dcfg)})`;
  const link = `${SITE_URL}/order?src=${area.src("flyer")}`;
  const shown = link.replace(/^https?:\/\/(www\.)?/, "").replace(/\?.*$/, "");
  const qr = await qrSvg(link);

  return (
    <div className="bg-ink/10 min-h-screen print:bg-white print:min-h-0">
      <style>{`@page { size: A4; margin: 0 } html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact }
        @media print { body { padding: 0 !important; background: #fff !important } }`}</style>
      <PrintBar title={area.name ? `Cut-out flyers (4 per A4): ${area.name}` : "Cut-out flyers (4 per A4)"} light={light} offer={offer} area={area.name} hint="Print on a computer: A4, margins None, background graphics on. Cut along the dotted lines." />
      <div className="overflow-x-auto py-6 print:py-0">
        <div className="mx-auto grid grid-cols-2 bg-white shadow-xl print:shadow-none" style={{ width: "210mm", height: "297mm", gridTemplateRows: "148.5mm 148.5mm" }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ outline: "0.3mm dashed #999", outlineOffset: "-0.15mm" }}>
              <Card qr={qr} shown={shown} offer={offer} t={t} when={when} pick={pick} area={area.name} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
