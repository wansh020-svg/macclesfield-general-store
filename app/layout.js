import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import TabBar from "@/components/TabBar";
import Chrome from "@/components/Chrome";
import SourceTracker from "@/components/SourceTracker";
import { SHOP, SITE_URL } from "@/lib/site";
import { CartProvider } from "@/components/CartContext";
import "@fontsource-variable/fraunces";
import "@fontsource/work-sans/400.css";
import "@fontsource/work-sans/500.css";
import "@fontsource/work-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";

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
  openingHoursSpecification: [
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "06:30", closes: "18:30" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Saturday", "Sunday"], opens: "07:30", closes: "18:00" },
  ],
  potentialAction: { "@type": "OrderAction", target: `${SITE_URL}/order`, deliveryMethod: "http://purl.org/goodrelations/v1#DeliveryModeOwnFleet" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`font-body bg-canvas text-ink pb-16 md:pb-0`}
      >
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BUSINESS) }} />
        <CartProvider>
          <SourceTracker />
          <Chrome><Nav /></Chrome>
          <main>{children}</main>
          <Chrome><Footer /></Chrome>
          <TabBar />
        </CartProvider>
      </body>
    </html>
  );
}
