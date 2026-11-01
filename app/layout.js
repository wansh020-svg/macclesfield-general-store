import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import TabBar from "@/components/TabBar";
import Chrome from "@/components/Chrome";
import { CartProvider } from "@/components/CartContext";
import "@fontsource-variable/fraunces";
import "@fontsource/work-sans/400.css";
import "@fontsource/work-sans/500.css";
import "@fontsource/work-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";

export const metadata = {
  title: "Macclesfield General Store | Venables St, Macclesfield SA",
  description:
    "Your local general store and cafe on Venables St, Macclesfield SA. Coffee, groceries, and good company, open 7 days.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`font-body bg-canvas text-ink pb-16 md:pb-0`}
      >
        <CartProvider>
          <Chrome><Nav /></Chrome>
          <main>{children}</main>
          <Chrome><Footer /></Chrome>
          <TabBar />
        </CartProvider>
      </body>
    </html>
  );
}
