import { Fraunces, Work_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import TabBar from "@/components/TabBar";
import { CartProvider } from "@/components/CartContext";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["500", "600", "700", "900"],
  style: ["normal", "italic"],
});

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500"],
});

export const metadata = {
  title: "Macclesfield General Store | Venables St, Macclesfield SA",
  description:
    "Your local general store and cafe on Venables St, Macclesfield SA. Coffee, groceries, and good company, open 7 days.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${fraunces.variable} ${workSans.variable} ${plexMono.variable} font-body bg-canvas text-ink pb-16 md:pb-0`}
      >
        <CartProvider>
          <Nav />
          <main>{children}</main>
          <Footer />
          <TabBar />
        </CartProvider>
      </body>
    </html>
  );
}
