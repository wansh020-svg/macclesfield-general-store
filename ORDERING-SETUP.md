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


## Live orders, drivers and tracking

**Staff Orders screen.** It refreshes itself every few seconds. On each device that will
be watching it (the counter tablet, a phone), tap **Turn on alerts** once: browsers don't
allow sound until someone taps. It then chimes for every new order and repeats every 20
seconds until the order is accepted or cancelled. Buttons: **Accept**, **Ready**,
**Cancel**; the driver does the rest, and staff can use **Mark delivered** as a fallback.

**Drivers.** In **Dashboard > Drivers**, add each driver with a name and a 4 to 8 digit PIN.
Drivers open `yoursite.com/driver`, sign in, and tap **Start shift** (turns on the chime
and keeps the screen awake). On an iPhone: Safari > Share > **Add to Home Screen**, and it
opens like an app.
- A driver only sees the area (not the street, name or phone) until they tap **Pick up**.
- They then get directions links, a call button, the items, the notes and the cash to collect.
- **Delivered** asks how much cash they collected; if it's different from the order total,
  staff see it highlighted in red.
- **Switch off** in the Drivers tab signs a driver out immediately. **Reset PIN** replaces a PIN.
- Five wrong PINs lock that name (and that network address) out for 10 minutes.

**Customer tracking.** After checkout the customer gets a **Track your order** link (also
under Profile > Past orders). The link contains a long random code, so only the person who
placed the order can open it.

**Not included yet:** live driver location on a map, and push notifications while the
phone is locked. On iPhones a web app can't track location or refresh in the background.
