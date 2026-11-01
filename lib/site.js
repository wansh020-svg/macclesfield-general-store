// One place for the shop's public details (used by link previews, Google data and the print pages).
export const SITE_URL = (process.env.SITE_URL ? `https://${process.env.SITE_URL.replace(/^https?:\/\//, "")}` : "https://www.macclesfieldgeneralstore.com.au");
export const SHOP = {
  name: "Macclesfield General Store",
  phone: "(08) 8188 5301",
  phoneTel: "+61881885301",
  street: "32 Venables St",
  locality: "Macclesfield",
  state: "SA",
  postcode: "5153",
  // Dine-in opening hours. Days are 0 = Monday ... 6 = Sunday. Edit here to change them everywhere.
  // (Delivery times are separate: they live in Dashboard > Settings.)
  hours: [
    { days: [0, 1, 2, 3], open: "06:30", close: "18:30" },
    { days: [4, 5, 6], open: "06:30", close: "20:00" },
  ],
};
