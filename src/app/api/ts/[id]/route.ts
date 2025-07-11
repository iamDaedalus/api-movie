import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const encoded = params.id;
    if (!encoded) return new Response("Missing ID", { status: 400 });

    // Decode the base64 back to the real .ts URL
    const realUrl = Buffer.from(encoded, "base64url").toString("utf-8");

    // Fetch the real .ts
    const res = await fetch(realUrl);
    if (!res.ok) return new Response("Failed to fetch", { status: 502 });

    const buffer = await res.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp2t",
        "Cache-Control": "public, max-age=86400", // cache for 1 day
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.error("Segment error:", e);
    return new Response("Error", { status: 500 });
  }
}
