"use client";

import { useState } from "react";

export const metadataInfo = {
  title: "Menu | Macclesfield General Store",
};

const menu = {
  Drinks: [
    {
      name: "Coffee",
      note: "Small $5.50 / Medium $6 / Large $7",
      items: [
        { name: "Latte", price: "" },
        { name: "Cappuccino", price: "" },
        { name: "Flat White", price: "" },
        { name: "Long Black", price: "" },
        { name: "Piccolo", price: "$4.50" },
        { name: "Macchiato", price: "$4.50" },
        { name: "Babycino", price: "$3.50" },
        { name: "Extra shot", price: "$1.00" },
        { name: "Alternative milks (oat/soy/almond/lactose free)", price: "$1.00" },
        { name: "Syrups (caramel/vanilla/hazelnut)", price: "$1.00" },
      ],
    },
    {
      name: "Heavenly Hot Chocolate",
      items: [
        { name: "Milk", price: "" },
        { name: "Dark", price: "" },
        { name: "White", price: "" },
        { name: "Mint (v/gf)", price: "" },
        { name: "Orange (v/gf)", price: "" },
        { name: "Chilli (v/gf)", price: "" },
        { name: "Salted Caramel (v/gf)", price: "" },
        { name: "Milk Choc (v/gf)", price: "" },
      ],
    },
    {
      name: "Tea",
      items: [
        { name: "English Breakfast", price: "" },
        { name: "Earl Grey", price: "" },
        { name: "Chai", price: "" },
        { name: "Green", price: "" },
        { name: "Peppermint", price: "" },
        { name: "Chamomile", price: "" },
        { name: "Honeydew Green", price: "" },
        { name: "Teapot for one", price: "$7.00" },
        { name: "Teapot for two", price: "$9.00" },
      ],
    },
    {
      name: "Chai",
      items: [
        { name: "Spiced", price: "" },
        { name: "Chocolate", price: "" },
        { name: "Vegan & GF Chai", price: "" },
        { name: "Vanilla", price: "" },
        { name: "Mango", price: "" },
      ],
    },
    {
      name: "Iced Drinks",
      note: "One size $8.50 · made with cream and icecream (except Long Black)",
      items: [
        { name: "Iced Coffee", price: "" },
        { name: "Iced Chocolate", price: "" },
        { name: "Iced Mocha", price: "" },
        { name: "Iced Chai", price: "" },
        { name: "Long Black (v)", price: "" },
      ],
    },
    {
      name: "Smoothies",
      note: "One size $9.00 · made with apple juice",
      items: [
        { name: "Mixed Berries", price: "" },
        { name: "Mango and Banana", price: "" },
      ],
    },
    {
      name: "Shakes",
      note: "Milkshakes $8.00 / Thickshakes $9.00",
      items: [
        { name: "Chocolate", price: "" },
        { name: "Vanilla", price: "" },
        { name: "Caramel", price: "" },
        { name: "Lime", price: "" },
        { name: "Strawberry", price: "" },
        { name: "Coffee", price: "" },
        { name: "Blue Heaven", price: "" },
        { name: "Banana", price: "" },
      ],
    },
  ],
  Breakfast: [
    {
      name: "Muffins",
      items: [
        { name: "Maccy Muffin — bacon, fried egg & American cheese on a toasted English muffin", price: "$9" },
        { name: "Tradie Muffin — bacon, fried egg, hashbrown & American cheese on a toasted English muffin", price: "$10" },
        { name: "Veg Maccy Muffin — fried egg, hashbrown & American cheese on a toasted English muffin", price: "$9" },
      ],
    },
    {
      name: "Rolls & Classics",
      items: [
        { name: "Bacon & Egg Sandwich — toasted white bread", price: "$8" },
        { name: "Bacon & Egg Roll — toasted roll", price: "$10" },
        { name: "BLT — bacon, lettuce, tomato and aioli, toasted white bread", price: "$9" },
      ],
    },
    {
      name: "Croissants",
      items: [
        { name: "Ham & Cheese", price: "$8.50" },
        { name: "Cheese & Tomato (v)", price: "$8.50" },
        { name: "Ham, Cheese & Tomato", price: "$9.00" },
      ],
    },
    {
      name: "Toasted Sandwiches",
      items: [
        { name: "Ham & Cheese", price: "$7" },
        { name: "Cheese & Tomato (v)", price: "$7" },
        { name: "Ham, Cheese & Tomato", price: "$8" },
      ],
    },
    {
      name: "Sourdough Breakfasts",
      items: [
        { name: "Bacon & Eggs on Sourdough — two eggs (fried or scrambled) with bacon", price: "$16" },
        { name: "Eggs on Sourdough — two eggs (fried or scrambled)", price: "$13.50" },
        { name: "Veggie Brekky — two eggs, grilled tomato and baby spinach", price: "$14.50" },
      ],
    },
    {
      name: "Toast",
      items: [
        { name: "Toast (v)", price: "$7" },
        { name: "Raisin Toast (v)", price: "$7" },
      ],
    },
    {
      name: "Extras",
      items: [
        { name: "Mushrooms", price: "$2" },
        { name: "Tomato", price: "$2" },
        { name: "Baby spinach", price: "$1.50" },
        { name: "Hashbrown", price: "$3.50" },
        { name: "Bacon", price: "$2" },
        { name: "Egg", price: "$2" },
        { name: "Avocado", price: "$2" },
        { name: "Cheese", price: "50c" },
      ],
    },
  ],
  Lunch: [
    {
      name: "Burgers",
      items: [
        { name: "Beef Burger — cheese, onion, tomato, lettuce, chutney & mayo (add egg or bacon $2 each)", price: "$15" },
        { name: "Chicken Burger — crumbed chicken, cheese, lettuce, tomato, red onion & mayo (add Peri mayo)", price: "$15" },
        { name: "Veggie Burger — cheese, tomato, lettuce, red onion & mayo", price: "$15" },
        { name: "Cheeseburger — American cheese, onion, pickles, mustard & tomato sauce", price: "$11" },
      ],
    },
    {
      name: "Hot Dogs",
      items: [
        { name: "Hot Dog — tomato sauce and mustard", price: "$8" },
        { name: "Hot Dog with the lot — cheese, fried onion, bacon, tomato sauce & mustard", price: "$10" },
      ],
    },
    {
      name: "Meals",
      items: [
        { name: "Chicken Schnitzel — served with chips and salad", price: "$18" },
        { name: "Fish and Chips — one piece of fish with chips, salad & tartare (extra piece $4)", price: "$16" },
      ],
    },
    {
      name: "Chips & Share",
      items: [
        { name: "Hot Chips — Small", price: "$8" },
        { name: "Hot Chips — Large", price: "$10" },
        { name: "Side of chips with meal", price: "$3" },
        { name: "Gravy", price: "$2" },
        { name: "Wedges — Small (sour cream & sweet chilli)", price: "$10" },
        { name: "Wedges — Large", price: "$11.50" },
      ],
    },
    {
      name: "Sides & Snacks",
      items: [
        { name: "Chiko Roll", price: "$5" },
        { name: "Cornjack", price: "$5" },
        { name: "Dim Sims", price: "3 for $6.50" },
        { name: "Devil Wings", price: "3 for $9" },
        { name: "Chicken Nuggets", price: "5 for $5.50 / 10 for $8.50" },
        { name: "Chicken Tenders", price: "$3 / 3 for $8" },
      ],
    },
    {
      name: "Kids",
      items: [
        { name: "Kids Snack Pack — two chicken tenders, chips and tomato sauce", price: "$9" },
      ],
    },
  ],
  "Punjabi Cuisine": [
    {
      name: "Curries",
      note: "Prices shown are with rice / without rice",
      items: [
        { name: "Butter Chicken (gf) — mild creamy tomato gravy", price: "$17 / $19" },
        { name: "Mango Chicken (gf) — very mild, sweet & creamy mango gravy", price: "$18 / $20" },
        { name: "Lamb Rogan Josh (gf/df) — rich, medium spiced aromatic gravy", price: "$19 / $21" },
        { name: "Beef Rogan Josh (gf/df) — rich, medium spiced aromatic gravy", price: "$19 / $21" },
        { name: "Vegetarian Curry (v) — ask staff for today's option", price: "$15 / $17" },
      ],
    },
    {
      name: "Sides & Snacks",
      items: [
        { name: "Rice", price: "$4" },
        { name: "Butter Naan", price: "$4" },
        { name: "Garlic Naan", price: "$4.50" },
        { name: "Cheese Naan", price: "$4.50" },
        { name: "Pappadam (2)", price: "$3" },
        { name: "Tikki (v)", price: "$3" },
        { name: "Samosa (v)", price: "$3.50" },
      ],
    },
  ],
};

const tabs = Object.keys(menu);

export default function MenuPage() {
  const [active, setActive] = useState(tabs[0]);

  return (
    <section className="max-w-5xl mx-auto px-5 py-20">
      <span className="price-tag mb-4">On the Board</span>
      <h1 className="font-display font-900 text-4xl mt-4 mb-10">Menu</h1>

      <div className="flex flex-wrap gap-2 mb-14 border-b border-ink/10 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={`font-mono text-xs uppercase tracking-widest px-4 py-2 border transition-colors ${
              active === tab
                ? "bg-pine text-canvas-light border-pine"
                : "border-ink/20 text-ink/70 hover:border-ink/50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-16">
        {menu[active].map((cat) => (
          <div key={cat.name}>
            <h2 className="font-display font-700 text-2xl mb-1">{cat.name}</h2>
            {cat.note && <p className="text-ink/60 text-sm mb-6">{cat.note}</p>}
            <ul className={`divide-y divide-ink/10 border-t border-b border-ink/10 ${!cat.note ? "mt-6" : ""}`}>
              {cat.items.map((item) => (
                <li key={item.name} className="flex items-start justify-between gap-6 py-3">
                  <span className="text-ink/90">{item.name}</span>
                  {item.price && (
                    <span className="font-mono text-sm text-ink/60 whitespace-nowrap">{item.price}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
