import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import TabBar from "@/components/TabBar";
import Chrome from "@/components/Chrome";
import SourceTracker from "@/components/SourceTracker";
import { DeliveryProvider } from "@/components/DeliveryContext";
import { DAY_NAMES, storeWindows } from "@/lib/hours";
import { getDeliveryCached, publicDelivery } from "@/lib/db";
import { SHOP, SITE_URL } from "@/lib/site";
import { CartProvider } from "@/components/CartContext";
import "@fontsource-variable/fraunces";
import "@fontsource/work-sans/400.css";
import "@fontsource/work-sans/500.css";
import "@fontsource/work-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";

// Delivery times and hours are read per request, so changes in Dashboard > Settings show straight away
// (otherwise Next would bake the build-time defaults into every page).
export const dynamic = "force-dynamic";

const TITLE = "Macclesfield General Store | Order online, delivered to your door";
const DESCRIPTION =
  "Coffee, breakfast, burgers and Punjabi curries from the general store on Venables St, Macclesfield. Order online and pay cash on delivery.";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: SHOP.name,
  // This is what Facebook, Messenger, iMessage and WhatsApp show when the link is shared.
  openGraph: {
    type: "website",
    siteName: SHOP.name,
    locale: "en_AU",
    title: "Order from Macclesfield General Store",
    description: "Coffee, brekkie, burgers and Punjabi curries, delivered. Pay cash when it arrives.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Macclesfield General Store on Venables St" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Order from Macclesfield General Store",
    description: "Coffee, brekkie, burgers and Punjabi curries, delivered. Pay cash when it arrives.",
    images: ["/og.jpg"],
  },
};

// One entry per group of days that share the same opening hours.
function storeHoursSpec() {
  const groups = {};
  storeWindows().forEach((w, d) => {
    if (!w) return;
    (groups[`${w.open}-${w.close}`] ||= { w, days: [] }).days.push(DAY_NAMES[d]);
  });
  return Object.values(groups).map(({ w, days }) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: days, opens: w.open, closes: w.close }));
}

// Lets Google show the shop's details properly (address, phone, hours, ordering link).
const BUSINESS = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: SHOP.name,
  url: SITE_URL,
  telephone: SHOP.phoneTel,
  image: `${SITE_URL}/og.jpg`,
  servesCuisine: ["Cafe", "Australian", "Punjabi"],
  address: {
    "@type": "PostalAddress",
    streetAddress: SHOP.street,
    addressLocality: SHOP.locality,
    addressRegion: SHOP.state,
    postalCode: SHOP.postcode,
    addressCountry: "AU",
  },
  openingHoursSpecification: storeHoursSpec(),
  potentialAction: { "@type": "OrderAction", target: `${SITE_URL}/order`, deliveryMethod: "http://purl.org/goodrelations/v1#DeliveryModeOwnFleet" },
};

export default async function RootLayout({ children }) {
  let delivery = null;
  try {
    delivery = publicDelivery(await getDeliveryCached());
  } catch (err) {
    console.error("Delivery settings unavailable:", err.message); // pages fall back to the default times
  }
  return (
    <html lang="en">
      <body
        className={`font-body bg-canvas text-ink pb-16 md:pb-0`}
      >
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BUSINESS) }} />
        <DeliveryProvider delivery={delivery} serverNow={Date.now()}>
        <CartProvider>
          <SourceTracker />
          <Chrome><Nav /></Chrome>
          <main>{children}</main>
          <Chrome><Footer /></Chrome>
          <TabBar />
        </CartProvider>
        </DeliveryProvider>
      </body>
    </html>
  );
}
