import Hero from "@/components/Hero";

export default function Home() {
  return (
    <>
      <Hero />

      {/* About */}
      <section className="max-w-5xl mx-auto px-5 py-20 grid gap-10 sm:grid-cols-2 sm:items-center">
        <div>
          <span className="price-tag mb-4">Our Story</span>
          <h2 className="font-display font-700 text-3xl mt-4 mb-4">
            A proper general store, run the way they used to be.
          </h2>
          <p className="text-ink/80 leading-relaxed">
            Macclesfield General Store has been under new management since 2024,
            bringing dine-in, takeaway, and a full range of groceries and everyday
            supplies back to Venables St. Whether you&apos;re after a morning coffee,
            a quick pantry top-up, or a proper sit-down bite, you&apos;ll find it here
            &mdash; with a family-friendly welcome and a bowl of water out front for
            the dog.
          </p>
        </div>
        <div className="bg-canvas-light border border-ink/10 p-8">
          <p className="font-mono uppercase text-xs tracking-widest text-ink/50 mb-4">
            What&apos;s on offer
          </p>
          <ul className="space-y-3 text-ink/80">
            <li>&mdash; Coffee, breakfast &amp; brunch</li>
            <li>&mdash; Lunch &amp; deli-style plates</li>
            <li>&mdash; Groceries, milk &amp; frozen meals</li>
            <li>&mdash; Gas bottle swap &amp; go, firewood &amp; kindling</li>
            <li>&mdash; Outdoor seating &amp; takeaway</li>
          </ul>
          <a
            href="/store"
            className="inline-block mt-6 font-mono text-xs uppercase tracking-widest text-rust hover:underline"
          >
            See everything in store &rarr;
          </a>
        </div>
      </section>

      {/* Punjabi Cuisine callout — the unexpected local favourite */}
      <section className="bg-pine text-canvas-light">
        <div className="max-w-5xl mx-auto px-5 py-16 sm:py-20">
          <span className="price-tag w-fit mb-4">Locals&apos; Favourite</span>
          <h2 className="font-display font-700 text-3xl mt-4 mb-3 max-w-lg">
            Proper Punjabi curries, right here on Venables St.
          </h2>
          <p className="text-canvas-light/80 max-w-md">
            Butter chicken, lamb rogan josh, fresh naan &mdash; not what you&apos;d
            expect from a country general store, and exactly why people drive out
            of their way for it.
          </p>
          <a
            href="/menu"
            className="inline-block mt-6 border border-canvas-light/40 font-mono text-xs uppercase tracking-widest px-6 py-3 hover:border-canvas-light transition-colors"
          >
            See the Curries
          </a>
        </div>
      </section>

      {/* Hours & Location */}
      <section className="bg-canvas-light border-y border-ink/10">
        <div className="max-w-5xl mx-auto px-5 py-20 grid gap-12 sm:grid-cols-2">
          <div>
            <span className="price-tag mb-4">Hours</span>
            <table className="mt-6 w-full text-sm">
              <tbody>
                <tr className="border-b border-ink/10">
                  <td className="py-2 text-ink/70">Monday &ndash; Friday</td>
                  <td className="py-2 text-right font-mono">6:30am &ndash; 6:30pm</td>
                </tr>
                <tr>
                  <td className="py-2 text-ink/70">Saturday &ndash; Sunday</td>
                  <td className="py-2 text-right font-mono">7:30am &ndash; 6:00pm</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <span className="price-tag mb-4">Find Us</span>
            <div className="mt-6 space-y-1 text-ink/80">
              <p>32 Venables St</p>
              <p>Macclesfield SA 5153</p>
              <p className="pt-2 font-mono text-sm">(08) 8188 5301</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
