import ShopHours from "@/components/ShopHours";

export default function Footer() {
  return (
    <footer className="bg-pine-dark text-canvas-light mt-0">
      <div className="max-w-5xl mx-auto px-5 py-10 grid gap-8 sm:grid-cols-3 text-sm">
        <div>
          <p className="font-display text-lg mb-2">Macclesfield General Store</p>
          <p className="opacity-80">32 Venables St, Macclesfield SA 5153</p>
        </div>
        <div>
          <ShopHours tone="dark" className="opacity-90" />
        </div>
        <div>
          <p className="font-mono uppercase text-xs tracking-widest opacity-60 mb-2">Get in touch</p>
          <p className="opacity-80">(08) 8188 5301</p>
          <p className="mt-3"><a href="/delivery-area" className="underline underline-offset-4 decoration-gold opacity-90">Do we deliver to you?</a></p>
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-4 text-center text-xs opacity-50 font-mono">
        &copy; {new Date().getFullYear()} Macclesfield General Store
      </div>
    </footer>
  );
}
