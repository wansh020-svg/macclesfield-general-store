import Link from "next/link";
import OpenStatus from "@/components/OpenStatus";
import CartBar from "@/components/CartBar";
import { DealBanner, DealCard, Row } from "@/components/Cards";
import { getDeals, getMenu } from "@/lib/db";
import { slug } from "@/lib/format";
import { toneAt } from "@/lib/tones";

export const dynamic = "force-dynamic";

async function safe(fn) {
  try {
    return await fn();
  } catch (err) {
    console.error("Home page data unavailable:", err.message);
    return [];
  }
}

const STEPS = [
  ["1", "Pick your food", "Swipe the shelves and tap +."],
  ["2", "Place your order", "We'll call to confirm."],
  ["3", "Pay cash at the door", "No card needed online."],
];

export default async function Home() {
  const [deals, divisions] = await Promise.all([safe(getDeals), safe(getMenu)]);
  const [headline, ...moreDeals] = deals;

  return (
    <div className="pb-28">
      {/* Hero: the real shopfront */}
      <section className="bg-pine-dark text-canvas-light">
        <div className="relative h-72 sm:h-[26rem] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero.jpg" alt="Macclesfield General Store on Venables St" className="w-full h-full object-cover object-[50%_30%]" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-pine-dark to-transparent" />
        </div>
        <div className="relative max-w-5xl mx-auto px-5 -mt-12 pb-10">
          <span className="inline-block rounded-full bg-pine-dark px-4 py-2 border border-canvas-light/20">
            <OpenStatus />
          </span>
          <h1 className="font-display font-900 text-5xl sm:text-7xl leading-[0.98] mt-5 max-w-xl">
            Hungry? We&apos;ll bring it over.
          </h1>
          <p className="mt-4 text-canvas-light/80 text-lg max-w-md">
            Coffee, brekkie, burgers and proper Punjabi curries from Macclesfield&apos;s own general store.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link
              href="/order"
              className="rounded-full bg-gold text-ink font-display font-900 text-xl px-9 py-4 active:scale-95 transition-transform"
            >
              Start your order
            </Link>
            <a href="tel:0881885301" className="font-display font-700 underline underline-offset-4 decoration-gold">
              or call (08) 8188 5301
            </a>
          </div>
        </div>
      </section>

      <div className="bg-gold text-ink overflow-x-auto [scrollbar-width:none]">
        <p className="flex gap-6 whitespace-nowrap px-5 py-3 font-display font-900 text-sm uppercase tracking-wide justify-center">
          <span>Open 7 days</span><span aria-hidden="true">&bull;</span>
          <span>Dine-in &amp; takeaway</span><span aria-hidden="true">&bull;</span>
          <span>Cash on delivery</span>
        </p>
      </div>

      {headline && <DealBanner deal={headline} />}
      {moreDeals.length > 0 && (
        <Row id="deals" title="More deals" tone={2}>
          {moreDeals.map((d) => (
            <DealCard key={d.id} deal={d} />
          ))}
        </Row>
      )}

      {divisions.length > 0 && (
        <section className="max-w-5xl mx-auto px-5 pt-12">
          <h2 className="font-display font-900 text-3xl uppercase tracking-tight">What are you after?</h2>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {divisions.map((d, i) => (
              <Link
                key={d.id}
                href={`/order#${slug(d.name)}`}
                className={`rounded-3xl p-5 min-h-32 flex flex-col justify-between active:scale-95 transition-transform ${toneAt(i).solid}`}
              >
                <span className="font-display font-900 text-2xl leading-tight">{d.name}</span>
                <span className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-widest opacity-80">
                    {d.items.length} {d.items.length === 1 ? "item" : "items"}
                  </span>
                  <span className="w-8 h-8 rounded-full bg-black/20 grid place-items-center" aria-hidden="true">&rarr;</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="max-w-5xl mx-auto px-5 pt-12">
        <h2 className="font-display font-900 text-3xl uppercase tracking-tight">How it works</h2>
        <ol className="mt-5 grid gap-3 sm:grid-cols-3">
          {STEPS.map(([n, title, sub]) => (
            <li key={n} className="flex items-center gap-4 rounded-3xl bg-canvas-light border-2 border-ink/10 p-4">
              <span className="font-display font-900 text-5xl leading-none text-rust w-10 text-center">{n}</span>
              <span>
                <span className="block font-display font-900 text-lg leading-tight">{title}</span>
                <span className="block text-sm text-ink/60">{sub}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12 bg-pine-dark text-canvas-light">
        <div className="max-w-5xl mx-auto px-5 py-10 grid gap-8 sm:grid-cols-2">
          <div>
            <h2 className="font-display font-900 text-3xl uppercase tracking-tight">Find us</h2>
            <p className="mt-3 text-canvas-light/80">32 Venables St, Macclesfield SA 5153</p>
            <a href="tel:0881885301" className="inline-block mt-1 font-display font-900 text-2xl text-gold">(08) 8188 5301</a>
            <p className="mt-4 text-sm text-canvas-light/70">Mon &ndash; Fri 6:30am &ndash; 6:30pm</p>
            <p className="text-sm text-canvas-light/70">Sat &ndash; Sun 7:30am &ndash; 6:00pm</p>
            <div className="mt-5 flex gap-5 font-display font-700">
              <Link href="/store" className="underline underline-offset-4 decoration-gold">In the store</Link>
              <Link href="/contact" className="underline underline-offset-4 decoration-gold">Visit us</Link>
            </div>
          </div>
          <p className="text-canvas-light/75 leading-relaxed sm:self-end">
            A proper general store, under new management since 2024: dine-in, takeaway, groceries and everyday
            supplies, with a bowl of water out front for the dog.
          </p>
        </div>
      </section>

      <CartBar />
    </div>
  );
}
