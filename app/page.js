import Link from "next/link";
import OpenStatus from "@/components/OpenStatus";
import CartBar from "@/components/CartBar";
import { DealCard, Row } from "@/components/Cards";
import { getDeals, getMenu } from "@/lib/db";
import { slug } from "@/lib/format";

export const dynamic = "force-dynamic";

async function safe(fn) {
  try {
    return await fn();
  } catch (err) {
    console.error("Home page data unavailable:", err.message);
    return [];
  }
}

const TILE = ["bg-pine text-canvas-light", "bg-rust text-canvas-light", "bg-canvas-light text-ink border border-ink/15"];

export default async function Home() {
  const [deals, divisions] = await Promise.all([safe(getDeals), safe(getMenu)]);

  return (
    <div className="pb-28">
      <section className="bg-pine-dark text-canvas-light px-5 pt-8 pb-10">
        <div className="max-w-5xl mx-auto">
          <OpenStatus />
          <h1 className="font-display font-900 text-4xl sm:text-5xl leading-[1.05] mt-4 max-w-2xl">
            Hungry? Order from the store on Venables St.
          </h1>
          <p className="mt-3 text-canvas-light/75 max-w-md">
            Coffee, brekkie, burgers and Punjabi curries, delivered to your door. Pay cash when it arrives.
          </p>
          <Link
            href="/order"
            className="inline-block mt-6 rounded-full bg-rust text-canvas-light font-display font-700 text-lg px-8 py-3"
          >
            Start your order
          </Link>
        </div>
      </section>

      {deals.length > 0 && (
        <Row id="deals" title="Deals">
          {deals.map((d) => (
            <DealCard key={d.id} deal={d} />
          ))}
        </Row>
      )}

      {divisions.length > 0 && (
        <section className="max-w-5xl mx-auto px-5 pt-10">
          <h2 className="font-display font-900 text-2xl uppercase tracking-tight">
            What are you after? <span className="text-rust">&rarr;</span>
          </h2>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {divisions.map((d, i) => (
              <Link
                key={d.id}
                href={`/order#${slug(d.name)}`}
                className={`rounded-2xl p-4 min-h-24 flex flex-col justify-between ${TILE[i % TILE.length]}`}
              >
                <span className="font-display font-700 text-xl leading-tight">{d.name}</span>
                <span className="font-mono text-[11px] uppercase tracking-widest opacity-70">
                  {d.items.length} {d.items.length === 1 ? "item" : "items"}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="max-w-5xl mx-auto px-5 pt-12 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="font-display font-900 text-2xl uppercase tracking-tight">
            Find us <span className="text-rust">&rarr;</span>
          </h2>
          <p className="mt-3 text-ink/80">32 Venables St, Macclesfield SA 5153</p>
          <a href="tel:0881885301" className="inline-block mt-1 font-mono text-sm text-rust">(08) 8188 5301</a>
          <p className="mt-4 text-sm text-ink/70">Mon &ndash; Fri 6:30am &ndash; 6:30pm</p>
          <p className="text-sm text-ink/70">Sat &ndash; Sun 7:30am &ndash; 6:00pm</p>
          <div className="mt-4 flex gap-4 font-mono text-xs uppercase tracking-widest">
            <Link href="/store" className="text-rust">In the store</Link>
            <Link href="/contact" className="text-rust">Visit us</Link>
          </div>
        </div>
        <p className="text-ink/70 leading-relaxed">
          A proper general store, under new management since 2024: dine-in, takeaway, groceries and everyday
          supplies, with a bowl of water out front for the dog.
        </p>
      </section>

      <CartBar />
    </div>
  );
}
