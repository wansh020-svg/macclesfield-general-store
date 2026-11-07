import PrintBar from "@/components/PrintBar";
import { isLight, printTheme } from "@/lib/printTheme";
import { deliveryText, pickupText } from "@/lib/hours";
import { printDelivery, printPickup } from "@/lib/printDelivery";
import { feeText } from "@/lib/fees";
import { qrSvg } from "@/lib/qr";
import { SHOP, SITE_URL } from "@/lib/site";

export const metadata = { title: "Thank you poster | Macclesfield General Store", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const clean = (v) => String(v || "").replace(/[<>]/g, "").slice(0, 60);

// Towns well inside a 10 km circle from the shop (Nov 2026). Only shown when the radius in Settings is 9 km or more,
// so a smaller radius never prints a town we don't reach. Mount Barker and Prospect Hill are about 10.4 km: left off.
const TOWNS = ["Macclesfield", "Meadows", "Echunga", "Bugle Ranges", "Paris Creek"];

export default async function ThankYouPoster({ searchParams }) {
  const offer = clean(searchParams?.offer);
  const light = isLight(searchParams?.light);
  const t = printTheme(light);
  const delivery = await printDelivery();
  const when = deliveryText(delivery);
  const pick = pickupText(await printPickup());
  const radius = Number(delivery.radiusKm) || 0;
  const towns = radius >= 9 ? TOWNS : [];
  const link = `${SITE_URL}/delivery-area?src=thanks-poster`;
  const shown = link.replace(/^https?:\/\/(www\.)?/, "").replace(/\?.*$/, "");
  const qr = await qrSvg(link);

  return (
    <div className="bg-ink/10 min-h-screen print:bg-white print:min-h-0">
      <style>{`@page { size: A4; margin: 0 } html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact }
        @media print { body { padding: 0 !important; background: #fff !important } }`}</style>
      <PrintBar title="A4 thank-you poster" light={light} offer={offer} hint="Print on a computer: A4, margins None, background graphics on." />
      <div className="overflow-x-auto py-6 print:py-0">
        <div style={{ width: "210mm", height: "297mm" }} className={`mx-auto ${t.page} flex flex-col overflow-hidden shadow-xl print:shadow-none`}>
          <div className="relative" style={{ height: "50mm" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hero.jpg" alt="" className="w-full h-full object-cover" style={{ objectPosition: "50% 30%" }} />
            <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t ${t.fadeFrom} to-transparent`} style={{ height: "34mm" }} />
          </div>

          <div className="relative z-10 flex-1 flex flex-col" style={{ padding: "0 14mm 11mm", marginTop: "-8mm" }}>
            <p className="font-display font-900 bg-gold text-ink rounded-full self-start" style={{ fontSize: "6mm", padding: "2.2mm 7mm" }}>
              From all of us at the store
            </p>
            <h1 className="font-display font-900 leading-[0.92]" style={{ fontSize: "19mm", marginTop: "4mm" }}>Thank you!</h1>
            <p className="font-display font-700 leading-tight" style={{ fontSize: "7.8mm", marginTop: "2mm", maxWidth: "172mm" }}>
              We&apos;ve been blown away by the response to online ordering.
            </p>
            <p className={t.sub} style={{ fontSize: "4.8mm", marginTop: "3mm", maxWidth: "168mm" }}>
              Every order, every kind word and every bit of patience while we found our feet has meant the world to us.
              So we&apos;re going further to bring it to you.
            </p>

            <div className={`rounded-3xl border-2 ${light ? "border-rust" : "border-gold"}`} style={{ marginTop: "6mm", padding: "5mm 7mm" }}>
              <p className={`font-mono uppercase ${t.accent}`} style={{ fontSize: "3.6mm", letterSpacing: "0.2em" }}>Delivery has started</p>
              <p className="font-display font-900 leading-none" style={{ fontSize: "13mm", marginTop: "2.5mm" }}>
                Now within {radius} km
              </p>
              {towns.length > 0 && (
                <>
                  <div className="flex flex-wrap" style={{ gap: "2.4mm", marginTop: "4.5mm" }}>
                    {towns.map((town) => (
                      <span key={town} className={`font-display font-900 rounded-full border-2 ${light ? "border-ink/30" : "border-canvas-light/50"}`} style={{ fontSize: "5.2mm", padding: "1.4mm 5mm" }}>
                        {town}
                      </span>
                    ))}
                  </div>
                  <p className={t.sub} style={{ fontSize: "4.4mm", marginTop: "3mm" }}>and the farms and roads in between.</p>
                </>
              )}
              <p className="font-display font-700" style={{ fontSize: "5.2mm", marginTop: "4mm" }}>
                {when} &middot; {feeText(delivery)} &middot; cash to the driver
              </p>
            </div>
            {offer && (
              <p className="font-display font-900 bg-gold text-ink rounded-full self-start" style={{ fontSize: "6mm", padding: "2.5mm 7mm", marginTop: "5mm" }}>{offer}</p>
            )}

            <div className="flex items-center" style={{ gap: "9mm", marginTop: "auto", paddingTop: "5mm" }}>
              <div className={`${t.qrTile} rounded-3xl shrink-0`} style={{ padding: "4.5mm", width: "48mm", height: "48mm" }}>
                <div className="w-full h-full [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: qr }} />
              </div>
              <div>
                <p className="font-display font-900 leading-none" style={{ fontSize: "11mm" }}>Do we reach you?</p>
                <p className={t.sub} style={{ fontSize: "4.8mm", marginTop: "3mm" }}>Scan, type your address, and order in a tap.</p>
                <p className={`font-mono ${t.accent}`} style={{ fontSize: "4.4mm", marginTop: "3mm" }}>{shown}</p>
                <p className={t.sub} style={{ fontSize: "4.2mm", marginTop: "3mm" }}>Pickup {pick}.</p>
              </div>
            </div>

            <div className={`border-t ${t.line} flex justify-between items-end`} style={{ marginTop: "6mm", paddingTop: "4mm", fontSize: "4.4mm" }}>
              <div>
                <p className="font-display font-900" style={{ fontSize: "5mm" }}>{SHOP.name}</p>
                <p className={t.sub}>{SHOP.street}, {SHOP.locality} {SHOP.state} {SHOP.postcode}</p>
              </div>
              <p className={`font-display font-900 ${t.accent}`} style={{ fontSize: "6mm" }}>{SHOP.phone}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
