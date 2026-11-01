import Link from "next/link";

export const metadata = {
  title: "Order Received | Macclesfield General Store",
};

export default function SuccessPage({ searchParams }) {
  const id = /^\d+$/.test(searchParams?.id || "") ? searchParams.id : null;
  const token = /^[0-9a-f-]{36}$/.test(searchParams?.t || "") ? searchParams.t : null;
  return (
    <section className="max-w-md mx-auto px-5 py-24 text-center">
      <span className="price-tag mb-4">Order Received</span>
      <h1 className="font-display font-900 text-3xl mt-4 mb-4">Thanks!</h1>
      {id && <p className="font-mono text-sm mb-3">Order #{id}</p>}
      <p className="text-ink/70">
        We&apos;ve got your order and will call to confirm details and delivery time.
        Payment is cash on delivery.
      </p>
      {token && (
        <Link href={`/track/${token}`} className="inline-block mt-8 rounded-full bg-gold text-ink font-display font-900 text-lg px-8 py-3">
          Track your order
        </Link>
      )}
      <br />
      <Link href="/order" className="inline-block mt-4 rounded-full bg-pine text-canvas-light font-mono text-xs uppercase tracking-widest px-8 py-3">
        Back to the menu
      </Link>
    </section>
  );
}
