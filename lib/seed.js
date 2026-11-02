// Starting menu, used once to fill an empty database (and as a fallback if the
// database can't be reached). After that, staff edit everything from /dashboard/menu.
import { menu, splitItem, parsePrice } from "@/lib/menu";

// group/category on the old menu -> division on the new Order page
const DIVISIONS = [
  ["Coffee", ["Drinks/Coffee"]],
  ["Hot Drinks", ["Drinks/Heavenly Hot Chocolate", "Drinks/Tea", "Drinks/Chai"]],
  ["Cold Drinks", ["Drinks/Iced Drinks", "Drinks/Smoothies", "Drinks/Shakes"]],
  ["Breakfast", ["Breakfast/Muffins", "Breakfast/Rolls & Classics", "Breakfast/Sourdough Breakfasts", "Breakfast/Toast", "Breakfast/Extras"]],
  ["Toasties & Croissants", ["Breakfast/Croissants", "Breakfast/Toasted Sandwiches"]],
  ["Burgers & Dogs", ["Lunch/Burgers", "Lunch/Hot Dogs"]],
  ["Meals", ["Lunch/Meals"]],
  ["Chips & Sides", ["Lunch/Chips & Share", "Lunch/Sides & Snacks"]],
  ["Kids", ["Lunch/Kids"]],
  ["Curries", ["Punjabi Cuisine/Curries"]],
  ["Naan & Sides", ["Punjabi Cuisine/Sides & Snacks"]],
];

// Prices stated once in the old category note ("One size $8.50"...).
const NOTE_PRICE = { "Iced Drinks": 8.5, Smoothies: 9 };
const COFFEE_SIZES = [{ label: "Small", price: 5.5 }, { label: "Medium", price: 6 }, { label: "Large", price: 7 }];
export const CATEGORY_SIZES = {
  Coffee: COFFEE_SIZES,
  "Heavenly Hot Chocolate": COFFEE_SIZES, // hot chocolate, tea and chai are sold in the same sizes as coffee
  Tea: COFFEE_SIZES,
  Chai: COFFEE_SIZES,
  Shakes: [{ label: "Milkshake", price: 8 }, { label: "Thickshake", price: 9 }],
};
const CURRY_LABELS = ["With rice", "Without rice"];

function sizeLabel(part, i, catName) {
  if (catName === "Curries") return CURRY_LABELS[i] || `Option ${i + 1}`;
  const text = part.replace(/\$[\d.]+/, "").trim();
  const m = text.match(/^(\d+) for$/);
  if (m) return `${m[1]} pieces`;
  return text || "Single";
}

function convertItem(cat, raw) {
  const { title, desc } = splitItem(raw.name);
  const out = { category: cat.name, name: title, description: desc, price: null, price_note: null, sizes: null };
  const amounts = (raw.price || "").match(/\$[\d.]+/g) || [];
  if (amounts.length > 1) {
    out.sizes = raw.price.split("/").map((p, i) => ({
      label: sizeLabel(p, i, cat.name),
      price: parseFloat(p.match(/\$([\d.]+)/)[1]),
    }));
  } else if (amounts.length === 1) {
    out.price = parsePrice(raw.price);
    if (raw.price.replace(/\s/g, "") !== amounts[0]) out.price_note = raw.price; // e.g. "3 for $6.50"
  } else if (CATEGORY_SIZES[cat.name]) {
    out.sizes = CATEGORY_SIZES[cat.name];
  } else if (NOTE_PRICE[cat.name]) {
    out.price = NOTE_PRICE[cat.name];
  }
  return out;
}

export function seedDivisions() {
  const byKey = {};
  for (const group of Object.keys(menu)) for (const cat of menu[group]) byKey[`${group}/${cat.name}`] = cat;
  const used = new Set();
  const result = DIVISIONS.map(([name, keys]) => ({
    name,
    items: keys.flatMap((k) => {
      used.add(k);
      return (byKey[k]?.items || []).map((it) => convertItem(byKey[k], it));
    }),
  }));
  const missing = Object.keys(byKey).filter((k) => !used.has(k));
  if (missing.length) {
    result.push({ name: "More", items: missing.flatMap((k) => byKey[k].items.map((it) => convertItem(byKey[k], it))) });
  }
  return result;
}

// Same shape as getMenu() in lib/db.js, with negative ids so nothing can be ordered from it.
export function fallbackMenu() {
  let n = 0;
  return seedDivisions().map((d, di) => ({
    id: -(di + 1),
    name: d.name,
    items: d.items.map((it) => ({ ...it, id: --n, available: true, image_id: null, division_id: -(di + 1) })),
  }));
}
