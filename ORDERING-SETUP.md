# Setting Up Online Ordering

This site now has cash-on-delivery ordering: customers add items to a cart,
enter their details, and the order gets saved for staff to see on a private
dashboard. There's no online payment involved anywhere.

Before this works, you need to do **two things** — a database, and a staff
password.

## 1. Add a database (stores incoming orders)

1. Go to your project on [vercel.com](https://vercel.com), open the
   **Storage** tab.
2. Click **Create Database** → choose **Postgres** (powered by Neon) →
   follow the prompts, keep defaults, click **Connect** to link it to this
   project.
3. Vercel automatically adds the right environment variables
   (`POSTGRES_URL` and friends) — you don't need to copy/paste anything.
   The site reads `POSTGRES_URL` with the standard `pg` driver, so any normal
   Postgres connection string works (direct or pooled; Neon, Prisma Postgres, etc.).
4. Redeploy the project once (Vercel usually does this automatically after
   connecting storage — if not, go to **Deployments** → **Redeploy**).

The very first order placed (or dashboard visit) automatically creates the
`orders` table — no manual database setup needed beyond connecting it.

## 2. Set a staff password

1. In your Vercel project, go to **Settings** → **Environment Variables**.
2. Add a new variable:
   - **Name:** `ORDERS_PASSWORD`
   - **Value:** whatever password staff should use (e.g. `maccy2024` — pick
     something better than that example!)
3. Redeploy for it to take effect.

This password protects `/dashboard` — the page where staff see incoming
orders. Nobody can view it without this password.

## Using it day-to-day

- **Customers:** browse `/menu`, click "Add" on items, review at `/cart`,
  enter details at `/checkout`, submit. They're told payment is cash on
  delivery.
- **Staff:** go to `yoursite.com/dashboard`, log in with the password above,
  see every order live, click "Mark Fulfilled" once it's delivered.

## Running this locally (optional)

To test ordering on your own PC (not just the live site), you need the same
two things available locally:

1. Run `vercel login` then `vercel link` in your project folder (connects
   your local folder to the Vercel project).
2. Run `vercel env pull .env.local` — this downloads the database
   connection details into a local file automatically.
3. Manually add one more line to that same `.env.local` file:
   ```
   ORDERS_PASSWORD=yourpasswordhere
   ```
4. Restart `npm run dev`.

Without this setup, `/cart`, `/checkout`, and `/dashboard` will show errors
locally — but the rest of the site (`/`, `/menu`, `/store`, `/contact`)
works completely fine either way, since only the ordering feature needs the
database.

## Managing the menu, deals and pictures (staff)

Log in at `/dashboard` and use the three tabs at the top:

- **Orders**: incoming orders, as before.
- **Menu**: every division (the sideways shelves on the Order page) and every item.
  Tap an item to change its name, description, price, sizes/options, picture,
  or mark it **Sold out**. Use the arrows to reorder divisions, **Hidden** to hide one.
  Items with no price show "Ask in store" and can't be ordered until you set one.
  For options with different prices, write them as `Small=5.50, Medium=6, Large=7`.
- **Deals**: the cards in the row on the Home page. New deals start **Hidden**;
  fill one in, then switch it to **Showing**. A deal with no price is info-only.

Pictures are optional. A card only shows a picture if one was uploaded for it.
Photos are shrunk in the browser before upload and stored in the same database,
so there is nothing extra to set up.

The first time the site runs after this update it fills the menu from the built-in
starting menu. After that, **the dashboard is the source of truth**: editing
`lib/menu.js` no longer changes the live menu.

Prices are always worked out on the server from the database, so a customer
can't change what they pay by editing the page in their browser.
