import AreaChecker from "@/components/AreaChecker";

export const metadata = {
  title: "Do we deliver to you? | Macclesfield General Store",
  description: "Type your address to see if Macclesfield General Store delivers to you, and when.",
};
export const dynamic = "force-dynamic";

export default function DeliveryAreaPage() {
  return (
    <section className="max-w-md mx-auto px-5 pt-10 pb-20">
      <span className="inline-block rounded-full bg-gold text-ink px-3 py-1 font-mono text-[11px] uppercase tracking-widest">Delivery</span>
      <h1 className="font-display font-900 text-4xl leading-none mt-4">Do we deliver to you?</h1>
      <p className="text-ink/70 mt-3">Type your street or address and we&apos;ll tell you straight away. We don&apos;t keep what you type.</p>
      <AreaChecker />
    </section>
  );
}
