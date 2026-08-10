# Macclesfield General Store — Website

A Next.js + Tailwind starter for the Macclesfield General Store site
(32 Venables St, Macclesfield SA 5153), built to grow feature by feature.

## Run it locally

You'll need [Node.js](https://nodejs.org) 18+ installed.

```bash
cd macclesfield-general-store
npm install
npm run dev
```

Then open http://localhost:3000

## Project structure

```
/app
  layout.js         -> shared shell: fonts, nav, footer
  page.js            -> homepage
  /menu/page.js      -> menu page (placeholder items — edit freely)
  /contact/page.js   -> hours, address, map, contact form
  globals.css        -> design tokens + the "price tag" signature style
/components
  Nav.js
  Footer.js
```

Colors, fonts, and spacing all come from `tailwind.config.js`, so a palette
or type change happens in one place instead of hunting through every page.

## What's real vs. placeholder

- Address, phone, and hours came from public listings (Facebook, Zmenu,
  Top-Rated) — worth double-checking against the till/roster before publishing.
- The menu page has **placeholder** category names and no real prices —
  replace `app/menu/page.js` with the actual menu.
- The contact form doesn't send anywhere yet.

## Adding features later

This structure is set up so each of these is additive, not a rebuild:

| Feature | How to add it |
|---|---|
| Working contact form | Wire the form in `app/contact/page.js` to [Formspree](https://formspree.io) (no backend needed) or a Next.js API route + [Resend](https://resend.com) |
| Real menu with photos | Add images to `/public`, extend the `categories` array in `app/menu/page.js`, or move menu data to a CMS (Sanity/Contentful) once it changes often |
| Online ordering | Add Stripe Checkout or a service like Shopify Lite for a `/order` route |
| Events / specials board | Add an `/app/specials` route, reusing the `.price-tag` style already in `globals.css` |
| Photo gallery | New `/app/gallery` route + images in `/public` |
| Deploy live | Push to GitHub, connect the repo to [Vercel](https://vercel.com) — deploys automatically on every push |

## Deploying

The fastest path is [Vercel](https://vercel.com/new): connect your GitHub repo,
it detects Next.js automatically, and gives you a live URL plus previews on
every future change.
