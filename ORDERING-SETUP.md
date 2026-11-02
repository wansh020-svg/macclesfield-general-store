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

## Delivery area and address checking

At checkout the customer starts typing their address and picks it from a dropdown of
real addresses (free OpenStreetMap data via Photon). Each suggestion shows its distance
from the store; ones outside the radius are greyed out and can't be chosen. Distance is a
straight line from the store, and the server re-checks it when the order is placed, so it
can't be faked.

- **Dashboard > Settings:** set the radius (default 5 km), switch the limit on or off, and set
  the store's exact location. Best: open Settings on a phone while standing in the shop and
  tap **Use this device's location**. Until then it uses an approximate spot in Macclesfield.
- If an address isn't in the map data (thin in some rural areas) or the search is down, the
  customer can tap **My address isn't listed. Continue anyway**. Those orders show a red
  **Address not checked: call to confirm** badge for staff. Checked orders show their distance.
  If every match is outside the area, there is no way around it on the page.
- The dropdown waits for a pause in typing before searching, results are remembered for
  30 days, and each person is limited to 120 searches per 10 minutes. Photon's public server
  asks for fair use and promises no uptime; if it ever struggles, switch to Google.
- Drivers' Google/Apple Maps buttons use the exact checked location when there is one.
- To switch to Google later, only `lookupAddress()` in `lib/geo.js` needs to change.

## Advertising: posters, flyers and link previews

- **`/poster`** is a printable A4 poster with a QR code to the ordering page (for the window);
  **`/flyer`** is a sheet of four cut-out cards (for bags and letterbox drops); **`/tablecard`**
  is a sheet of two table tents (cut, fold, stand up). Each has an **Ink saver** tick box for a
  light-background version that is cheaper to print. Open them on a computer, type an
  optional offer line (for example the launch offer) and press **Update**, then **Print**
  (A4, margins "None", background graphics on). They don't show the website's menu or footer.
- The QR codes carry a tag (`?src=poster`, `?src=flyer`). When someone orders after scanning one,
  the staff Orders screen shows **via poster** / **via flyer** on that order, so you can see what
  worked. For your own links, add a tag the same way, for example `yoursite.com.au/?src=facebook`
  (letters, numbers, dashes only).
- **Link previews:** when the site address is shared on Facebook, Messenger, WhatsApp or iMessage
  it shows the shopfront photo and "Hungry? We'll bring it over." The picture is `public/og.jpg`
  (1200 x 630). Facebook remembers old previews: after the first share, paste the link into
  Facebook's Sharing Debugger and press "Scrape Again" if it looks wrong.
- The site also tells Google its address, phone, opening hours and ordering link.
- Set `SITE_URL` in Vercel only if the main address ever changes from
  `www.macclesfieldgeneralstore.com.au`.


## Opening hours and delivery times

- **Delivery times** (default: Friday, Saturday and Sunday, 4pm to 8pm, Adelaide time) are set in
  **Dashboard > Settings > Delivery times**: tick the days, set the start and end, press **Save times**.
  The website, footer, Contact page, posters and flyers all update (the PDFs need re-printing).
- Online ordering **only works during delivery times**. Outside them customers can look at the menu,
  but the Add buttons say Closed, checkout is blocked, and the server refuses the order with the next
  delivery time. The same switch has two overrides: **Open now** (ignores the times, handy for an
  extra night) and **Paused** (no orders at all, handy if the kitchen is swamped). Switch it back to
  **Following the weekly times** afterwards.
- **Dine-in hours** (Mon to Thu 6:30am to 6:30pm; Fri to Sun 6:30am to 8pm) are set in the code, in
  `SHOP.hours` in `lib/site.js`. Change them there and they update everywhere on the site.

## Pickup as well as delivery

Customers choose **Pickup** or **Delivery** in the cart and at checkout. Each has its own opening
times, so on a Monday morning pickup can be open while delivery is closed (the site pre-selects the
open one and tells the customer).

- **Pickup** needs only a name and phone number: no address and no distance check. It shows
  "Ready in about N minutes" and the shop's address. The customer pays **at the counter**.
- **Pickup times** are in **Dashboard > Settings > Pickup times**. By default pickup is **Mon to Thu 6:30am to 3pm** (no delivery those days) and
  **Fri to Sun 6:30am to 8pm**, and pickup orders stop **15 minutes before closing** (change "Last orders"). The same
  **Open now** and **Paused** switches exist for pickup and delivery separately. "Usual prep time"
  (default 15 minutes) is what customers are told.
- **Staff Orders screen:** each order has a **Pickup** or **Delivery** badge, and there are
  All / Delivery / Pickup tabs. A pickup goes **Accept, Ready to collect, Mark collected**: no driver
  step. A pickup shows no address or map link.
- **Drivers never see pickup orders**: the server leaves them out of the driver app and refuses a
  claim even if someone tries to guess the order number.
- **Tracking page:** pickup customers see Received, Being made, **Ready to collect**, Collected.
- The status "collected" is only for pickups, and "out for delivery" / "delivered" only for deliveries.

## Delivery fee

Delivery orders pay a flat **$8** (Dashboard > Settings > **Delivery fee**). Pickup is never charged.
The fee is worked out on the server from these settings, so a customer's phone cannot change it, and
it is stored on each order: changing the fee later does not alter orders already placed.

Optional extras, all off until you fill them in (empty box = off):

- **Minimum food order for delivery**: smaller delivery orders are asked to add more or choose pickup.
- **Free delivery over**: food total at or above this ships free.
- **Further than (km) / charge**: a higher fee for far addresses. An address that could not be checked
  pays the normal fee (you phone to confirm anyway).

The fee shows on checkout, the staff Orders screen and the driver's cash-to-collect, which includes it.
Printed posters, flyers and table tents show the current fee, so reprint them if you change it.

## Extras (milk, extra shot, syrups, bacon...)

Items with extras show a **Customise** button. It opens a sheet with the size, then each set of extras
with its price, and a live total on the **Add to cart** button. The choices show in the cart, on the
staff Orders screen, on the driver's list and on the tracking page ("Latte - Large (Oat milk, Extra shot)").

Staff edit them in **Dashboard > Extras**:

- Each **set** has a name, whether the customer picks one (milk) or any (tick boxes), whether it is
  required, and its choices with prices ($0 for free things like sugar). **Sold out** hides a single
  choice without deleting it.
- **Goes on**: tick a whole menu section, then open it to untick items it doesn't suit (milk is off the
  Long Black). New items added to a ticked section get the extras automatically.
- Starting sets, taken from the prices already on the menu: milk +$1 (oat, soy, almond, lactose free),
  coffee extras (extra shot, caramel/vanilla/hazelnut syrup +$1, sugar free), syrups and sugar for hot
  chocolate and chai, sugar for tea, breakfast extras (mushrooms, tomato, spinach, hashbrown, bacon, egg,
  avocado, cheese) on rolls, sourdough, toast, toasties, croissants and muffins, egg/bacon +$2 on the
  Beef Burger, and an extra piece of fish +$4.
- The old loose "Extra shot / Syrups / Alternative milks" and breakfast "Extras" rows were removed from
  the menu because they are now real extras. Add an item back in Menu if you want to sell one on its own.

The server prices every extra itself and refuses anything not offered for that item, sold out, or
against a pick-one rule, so a phone can't change a price.

## Add-ons at checkout

Before they enter their details, customers see **Add something to your order?** with a few quick extras
(each has Add, then - and + so they can order as many as they like). They are ordinary menu items, so they
share a cart line with the same item on the menu and are priced by the server like everything else.

Staff edit the list in **Dashboard > Extras > Offered at checkout**: pick the menu item (and size), give it
a short name if you like ("5 nugget pack"), switch it Showing/Hidden, or remove it. An item with no price,
or one that is sold out, is skipped automatically. Starting list: Side of fries ($3, the "Side of chips with
meal" item), 5 nugget pack ($5.50), 3 dim sims ($6.50), Samosa ($3.50).

To offer a Coke bottle: add it in **Dashboard > Menu** with a price, then add it here.

## Spam and bots

- Each phone number can place at most 4 orders in 10 minutes and have at most 3 waiting for staff to accept;
  each internet address at most 10 orders in 10 minutes. Anyone over the limit is told to call the store.
- The checkout form has a hidden box that only bots fill in. Those orders are quietly dropped.
- On the Orders screen, a new order has a **Spam** button: it cancels the order and blocks that phone
  number. Blocked numbers are listed in **Dashboard > Settings > Blocked phone numbers**, with **Unblock**.

## Making sure nobody misses an order

- **Sound warning:** if alerts are off, or the browser has blocked sound, the Orders screen shows a big bar
  with a button to fix it. Once an order has waited a minute, the alarm rings every 8 seconds (instead of
  every 20) and a red bar says how long it has waited. The tab title flashes "NEW ORDER".
- **Connection warning:** if the screen can't reach the server twice in a row, a red bar says NOT CONNECTED
  and the alarm sounds until it reconnects, so a dead internet connection can't go unnoticed.
- **No double orders:** each checkout visit has its own key; a second tap or a retry after a bad
  connection returns the first order instead of creating another.
- **Text message backup (optional, costs a few cents per text):** to get a text on a staff mobile for each
  new order, create a Twilio account and add these in Vercel > Settings > Environment Variables, then
  redeploy: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` (your Twilio number), and
  `ALERT_PHONE` (staff mobile like +61412345678, several separated by commas). It stays off until all four
  are set, and is capped at 40 texts an hour.

## Delivery runs

Delivery is booked by **run**: the driver leaves at set times and customers pick one at checkout
("Leaves 5:30pm, arrives about 5:45pm to 6:15pm, 3 spots left"). Runs that are full, closed or past
their cutoff are greyed out, and a run that fills while a customer is checking out is refused with a
message and the open runs. Customers can book any run for today, from the morning.

- **Default runs:** Fri, Sat and Sun at 4:30, 5:30, 6:30 and 7:30pm, 5 orders per run, orders closing
  30 minutes before a run leaves, arrival window 30 minutes after a 15-minute drive.
- **Edit them** in **Dashboard > Settings > Delivery runs**: set times per day, an optional limit for any
  single run, and the three numbers above. "Following the runs below" / "Paused" switch delivery on and off.
  The delivery hours shown on the site and printed pieces ("Fri to Sun, 4:30pm to 8pm") are worked out from
  the runs. Reprint the poster, flyers and table tents if you change them.
- **On the day** (Orders screen, **Delivery runs today**): Delay 10 min (the customers' pages update),
  Allow 1 more (staff can take more orders than the limit), Close to new orders, Cancel run, and Add a
  one-off run. Each delivery order shows its run, and a **Move to** list sends it to another run, even a full one.
  If a run is cancelled its orders are flagged until they are moved or cancelled.
- A cancelled order gives its place in the run back. Pickup is not affected.
