import PrintBar from "@/components/PrintBar";
import { isLight, printTheme } from "@/lib/printTheme";
import { qrSvg } from "@/lib/qr";
import { SHOP, SITE_URL } from "@/lib/site";

export const metadata = { title: "Poster | Macclesfield General Store", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const clean = (v) => String(v || "").replace(/[<>]/g, "").slice(0, 60);

export default async function PosterPage({ searchParams }) {
  const offer = clean(searchParams?.offer);
  const light = isLight(searchParams?.light);
  const t = printTheme(light);
  const link = `${SITE_URL}/order?src=poster`;
  const shown = link.replace(/^https?:\/\/(www\.)?/, "").replace(/\?.*$/, "");
  const qr = await qrSvg(link);

  return (
    <div className="bg-ink/10 min-h-screen print:bg-white print:min-h-0">
      <style>{`@page { size: A4; margin: 0 } html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact }
        @media print { body { padding: 0 !important; background: #fff !important } }`}</style>
      <PrintBar title="A4 poster" light={light} offer={offer} hint="Print on a computer: A4, margins None, background graphics on." />
      <div className="overflow-x-auto py-6 print:py-0">
        <div style={{ width: "210mm", height: "297mm" }} className={`mx-auto ${t.page} flex flex-col overflow-hidden shadow-xl print:shadow-none`}>
          <div className="relative" style={{ height: "100mm" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hero.jpg" alt="" className="w-full h-full object-cover" style={{ objectPosition: "50% 30%" }} />
            <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t ${t.fadeFrom} to-transparent`} style={{ height: "40mm" }} />
          </div>

          <div className="relative z-10 flex-1 flex flex-col" style={{ padding: "0 14mm 12mm", marginTop: "-6mm" }}>
            <h1 className="font-display font-900 leading-[0.95]" style={{ fontSize: "21mm" }}>Hungry? We&apos;ll bring it over.</h1>
            <p style={{ fontSize: "5.2mm", marginTop: "5mm", maxWidth: "150mm" }} className={t.sub}>
              Coffee, brekkie, burgers and proper Punjabi curries from your local general store. Order online and pay cash when it arrives.
            </p>
            {offer && (
              <p className="font-display font-900 bg-gold text-ink rounded-full self-start" style={{ fontSize: "6mm", padding: "2.5mm 7mm", marginTop: "6mm" }}>{offer}</p>
            )}

            <div className="flex items-center" style={{ gap: "10mm", marginTop: "auto" }}>
              <div className={`${t.qrTile} rounded-3xl shrink-0`} style={{ padding: "6mm", width: "68mm", height: "68mm" }}>
                <div className="w-full h-full [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: qr }} />
              </div>
              <div>
                <p className="font-display font-900 leading-none" style={{ fontSize: "15mm" }}>Scan to order</p>
                <p className={`font-mono ${t.accent}`} style={{ fontSize: "5.2mm", marginTop: "4mm" }}>{shown}</p>
                <ol className="font-display font-700" style={{ fontSize: "5.2mm", marginTop: "6mm", display: "grid", gap: "2mm" }}>
                  <li><span className={`${t.accent} font-900`}>1</span>&nbsp; Pick your food</li>
                  <li><span className={`${t.accent} font-900`}>2</span>&nbsp; We&apos;ll call to confirm</li>
                  <li><span className={`${t.accent} font-900`}>3</span>&nbsp; Pay cash at the door</li>
                </ol>
              </div>
            </div>

            <div className={`border-t ${t.line} flex justify-between`} style={{ marginTop: "9mm", paddingTop: "5mm", fontSize: "4.4mm" }}>
              <div>
                <p className="font-display font-900" style={{ fontSize: "5mm" }}>{SHOP.name}</p>
                <p className={t.sub}>{SHOP.street}, {SHOP.locality} {SHOP.state} {SHOP.postcode}</p>
              </div>
              <div className="text-right">
                <p className={`font-display font-900 ${t.accent}`} style={{ fontSize: "5.4mm" }}>{SHOP.phone}</p>
                <p className={t.sub}>Open 7 days. Delivery within 5 km.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
