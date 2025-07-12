// // /app/api/[...stream]

import { NextRequest } from "next/server";
import { Readable } from "stream";
import axios, { AxiosError } from "axios";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ stream: string[] }> }
) {
  const resolvedParams = await params;
  const path = resolvedParams.stream.join("/");

  if (!path) return new Response("Missing path", { status: 400 });

  const targetUrl = `https://scrennnifu.click/${path}`;
  const isM3U8 = targetUrl.endsWith(".m3u8");

  // ✅ Secure Origin/Referer Check
  const origin = req.headers.get("origin") || "";
  const referer = req.headers.get("referer") || "";

  const allowed = [
    "https://zxcstream-api-production.up.railway.app", "http://localhost:3001/api/movie/34234"
  ];

  const isValidOrigin = allowed.some((url) => origin === url);
  const isValidReferer = allowed.some((url) => referer.startsWith(url));

  if (!isValidOrigin && !isValidReferer) {
    console.warn("❌ Blocked request | Origin:", origin, "| Referer:", referer);
    return new Response("Forbidden: Invalid Origin/Referer", { status: 403 });
  }

  console.log("✅ Proxying request to:", targetUrl);

  try {
    const response = await axios.get(targetUrl, {
      responseType: isM3U8 ? "text" : "stream",
      headers: {
        "User-Agent": req.headers.get("user-agent") || "",
      },
    });

    if (isM3U8) {
      const basePath = `/api/${resolvedParams.stream.slice(0, -1).join("/")}`;
      const rewritten = response.data.replace(
        /^(?!#)(.*\.(m3u8|ts|m4s|vtt))$/gm,
        (match: string) => `${basePath}/${match}`
      );

      return new Response(rewritten, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const nodeStream = response.data as Readable;
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on("data", (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        nodeStream.on("end", () => controller.close());
        nodeStream.on("error", (error) => controller.error(error));
      },
    });

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type":
          response.headers["content-type"] || "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: unknown) {
    const error = err as AxiosError;
    console.error("❌ Proxy error:", error.message);
    if (error.response) {
      console.error("❗ Response status:", error.response.status);
      console.error("❗ Response data:", error.response.data);
    }
    return new Response("Proxy fetch failed", { status: 500 });
  }
}
