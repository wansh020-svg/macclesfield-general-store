export const metadata = {
  title: "Visit Us | Macclesfield General Store",
};

export default function ContactPage() {
  return (
    <section className="max-w-5xl mx-auto px-5 py-20">
      <span className="price-tag mb-4">Visit Us</span>
      <h1 className="font-display font-900 text-4xl mt-4 mb-10">Find Us</h1>

      <div className="grid gap-12 sm:grid-cols-2">
        <div>
          <p className="font-mono uppercase text-xs tracking-widest text-ink/50 mb-3">
            Address
          </p>
          <p className="text-lg mb-1">32 Venables St</p>
          <p className="text-lg mb-6">Macclesfield SA 5153</p>

          <p className="font-mono uppercase text-xs tracking-widest text-ink/50 mb-3">
            Phone
          </p>
          <p className="text-lg mb-6">(08) 8188 5301</p>

          <p className="font-mono uppercase text-xs tracking-widest text-ink/50 mb-3">
            Hours
          </p>
          <p className="text-ink/80">Mon &ndash; Fri: 6:30am &ndash; 6:30pm</p>
          <p className="text-ink/80">Sat &ndash; Sun: 7:30am &ndash; 6:00pm</p>
        </div>

        <div className="aspect-[4/3] w-full border border-ink/10">
          <iframe
            title="Map to Macclesfield General Store"
            className="w-full h-full"
            loading="lazy"
            allowFullScreen
            src="https://www.google.com/maps?q=32+Venables+St,+Macclesfield+SA+5153&output=embed"
          />
        </div>
      </div>

      {/* Placeholder contact form — wire up to a form service (e.g. Formspree,
          Resend) or a Next.js API route when you're ready to accept messages. */}
      <div className="mt-20 max-w-lg">
        <p className="font-mono uppercase text-xs tracking-widest text-ink/50 mb-3">
          Send a Message
        </p>
        <form className="space-y-4">
          <input
            type="text"
            placeholder="Your name"
            className="w-full border border-ink/20 bg-canvas-light px-4 py-3"
          />
          <input
            type="email"
            placeholder="Your email"
            className="w-full border border-ink/20 bg-canvas-light px-4 py-3"
          />
          <textarea
            placeholder="Message"
            rows={4}
            className="w-full border border-ink/20 bg-canvas-light px-4 py-3"
          />
          <button
            type="submit"
            className="bg-rust text-canvas-light font-mono text-xs uppercase tracking-widest px-6 py-3 hover:bg-rust/90 transition-colors"
          >
            Send
          </button>
        </form>
        <p className="text-ink/40 text-xs mt-3">
          This form isn&apos;t connected to anything yet &mdash; see the README for
          how to wire it up.
        </p>
      </div>
    </section>
  );
}
