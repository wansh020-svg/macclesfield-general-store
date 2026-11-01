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
  hours: [
    { label: "Mon to Fri", text: "6:30am to 6:30pm" },
    { label: "Sat and Sun", text: "7:30am to 6:00pm" },
  ],
};
