export const metadata = {
  title: "Order Received | Macclesfield General Store",
};

export default function SuccessPage() {
  return (
    <section className="max-w-md mx-auto px-5 py-24 text-center">
      <span className="price-tag mb-4">Order Received</span>
      <h1 className="font-display font-900 text-3xl mt-4 mb-4">Thanks!</h1>
      <p className="text-ink/70">
        We&apos;ve got your order and will call to confirm details and delivery time.
        Payment is cash on delivery.
      </p>
    </section>
  );
}
