export const metadata = {
  title: "Driver | Macclesfield General Store",
  manifest: "/driver.webmanifest",
  appleWebApp: { capable: true, title: "Maccy Driver", statusBarStyle: "black-translucent" },
  icons: { apple: "/driver-icon-180.png" },
  robots: { index: false, follow: false },
};

export const viewport = { themeColor: "#2F3B2C", width: "device-width", initialScale: 1 };

export default function DriverLayout({ children }) {
  return <div className="min-h-screen bg-pine-dark text-canvas-light">{children}</div>;
}
