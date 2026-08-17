import Link from "next/link";

export const metadata = {
  title: "Online Ordering | Macclesfield General Store",
};

export default function OrderPage() {
  return (
    <section className="max-w-2xl mx-auto px-5 py-24 text-center">
      <span className="price-tag mb-6">Cash on Delivery</span>
      <h1 className="font-display font-900 text-4xl sm:text-5xl mt-4 mb-6">Order Online</h1>
      <p className="text-ink/70 max-w-xl mx-auto text-lg mb-10">
        Browse the menu, add what you&apos;d like, and place your order &mdash;
        no payment needed online, just cash when it arrives.
      </p>
      <Link
        href="/menu"
        className="inline-block bg-rust text-canvas-light font-mono text-xs uppercase tracking-widest px-6 py-3 hover:bg-rust/90 transition-colors"
      >
        Browse the Menu
      </Link>
    </section>
  );
}
