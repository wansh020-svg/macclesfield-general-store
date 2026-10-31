import { getImage } from "@/lib/db";

export async function GET(_req, { params }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return new Response("Not found", { status: 404 });
  const img = await getImage(id);
  if (!img) return new Response("Not found", { status: 404 });
  // A replaced picture gets a new id, so these can be cached for good.
  return new Response(Buffer.from(img.data, "base64"), {
    headers: { "Content-Type": img.mime, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
