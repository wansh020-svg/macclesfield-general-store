export const metadata = {
  title: "In the Store | Macclesfield General Store",
};

const categories = [
  {
    name: "Everyday Essentials",
    items: ["Grocery", "Milk", "Deli", "Frozen Meals", "Ready Meals"],
  },
  {
    name: "Quick Bites",
    items: ["Premade Sandwiches", "Pies, Pasties & Sausage Rolls", "Confectionery"],
  },
  {
    name: "Drinks",
    items: ["Soft Drinks", "Box Water", "Ice Bags"],
  },
  {
    name: "Home & Outdoors",
    items: ["Swap & Go Gas Bottles", "Firewood", "Kindling"],
  },
  {
    name: "Other Bits & Pieces",
    items: ["Automotive Supplies", "Pet Supplies", "Stationery"],
  },
];

export default function StorePage() {
  return (
    <section className="max-w-5xl mx-auto px-5 py-20">
      <span className="price-tag mb-4">On the Shelves</span>
      <h1 className="font-display font-900 text-4xl mt-4 mb-4">In the Store</h1>
      <p className="text-ink/70 max-w-xl mb-14">
        More than a cafe &mdash; a proper general store. If you&apos;ve run out of
        something at home, chances are we&apos;ve got it.
      </p>

      <div className="grid gap-12 sm:grid-cols-2">
        {categories.map((cat) => (
          <div key={cat.name}>
            <h2 className="font-display font-700 text-2xl mb-4">{cat.name}</h2>
            <ul className="space-y-2 text-ink/80">
              {cat.items.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-rust">&mdash;</span> {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
