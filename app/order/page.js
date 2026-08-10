export const metadata = {
  title: "Online Ordering | Macclesfield General Store",
};

export default function OrderPage() {
  return (
    <section className="max-w-5xl mx-auto px-5 py-24 text-center">
      <span className="price-tag mb-6">Coming Soon</span>
      <h1 className="font-display font-900 text-4xl sm:text-5xl mt-4 mb-6">
        Online Ordering &amp; Delivery
      </h1>
      <p className="text-ink/70 max-w-xl mx-auto text-lg">
        We&apos;re working on bringing the Macclesfield General Store menu straight
        to your door. In the meantime, give us a call on{" "}
        <span className="font-mono">(08) 8188 5301</span> or drop by 32 Venables St
        &mdash; dine-in and takeaway are open as usual.
      </p>
    </section>
  );
}
