// Text message to the staff phone when an order arrives: a backup for when nobody hears the alarm.
// Off unless these are set in Vercel: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM (the Twilio
// number or sender name) and ALERT_PHONE (staff mobile in +61 form, several separated by commas).
// Never blocks or fails an order: any problem is logged and ignored.
export function smsConfigured() {
  const e = process.env;
  return Boolean(e.TWILIO_ACCOUNT_SID && e.TWILIO_AUTH_TOKEN && e.TWILIO_FROM && e.ALERT_PHONE);
}

export async function textStaff(message) {
  if (!smsConfigured()) return false;
  const e = process.env;
  const base = e.TWILIO_API_BASE || "https://api.twilio.com";
  const auth = Buffer.from(`${e.TWILIO_ACCOUNT_SID}:${e.TWILIO_AUTH_TOKEN}`).toString("base64");
  const numbers = e.ALERT_PHONE.split(",").map((n) => n.trim()).filter(Boolean).slice(0, 5);
  let sent = false;
  await Promise.all(
    numbers.map(async (to) => {
      try {
        const res = await fetch(`${base}/2010-04-01/Accounts/${e.TWILIO_ACCOUNT_SID}/Messages.json`, {
          method: "POST",
          headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ To: to, From: e.TWILIO_FROM, Body: message.slice(0, 300) }).toString(),
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) sent = true;
        else console.error("SMS failed", res.status);
      } catch (err) {
        console.error("SMS failed", err.message);
      }
    })
  );
  return sent;
}
