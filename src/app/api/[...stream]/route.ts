// // /app/api/[...stream]

// import { NextRequest, NextResponse } from "next/server";

// export const runtime = "nodejs";

// export async function GET(
//   req: NextRequest,
//   {
//     params,
//   }: {
//     params: {
//       stream: string[];
//     };
//   }
// ) {
//   const [media_type, id, season, episode] = params.stream || [];

//   if (!media_type || !id) {
//     return NextResponse.json(
//       { error: "Missing media_type or id in the URL" },
//       { status: 400 }
//     );
//   }

//   let targetUrl = "";

//   if (media_type === "movie") {
//     targetUrl = `https://scrennnifu.click/movie/${id}/playlist.m3u8`;
//   } else if (media_type === "serial") {
//     if (!season || !episode) {
//       return NextResponse.json(
//         { error: "Missing season or episode for serial" },
//         { status: 400 }
//       );
//     }
//     targetUrl = `https://scrennnifu.click/serial/${id}/${season}/${episode}/playlist.m3u8`;
//   } else {
//     return NextResponse.json({ error: "Invalid media_type" }, { status: 400 });
//   }

//   return NextResponse.json({ m3u8: targetUrl });
// }
// import { NextRequest } from "next/server";
// import { PassThrough } from "stream";
// import axios from "axios";

// export const runtime = "nodejs";

// export async function GET(
//   req: NextRequest,
//   {
//     params,
//   }: {
//     params: {
//       stream: string[];
//     };
//   }
// ) {
//   const path = params.stream.join("/");
//   if (!path) return new Response("Missing path", { status: 400 });

//   const targetUrl = `https://scrennnifu.click/${path}`;
//   const isM3U8 = targetUrl.endsWith(".m3u8");

//   console.log("Proxying request to:", targetUrl); // ✅ Log for debug

//   try {
//     const response = await axios.get(targetUrl, {
//       responseType: isM3U8 ? "text" : "stream",
//       headers: {
//         "User-Agent": req.headers.get("user-agent") || "",
//       },
//     });

//     if (isM3U8) {
//       const basePath = `/api/${params.stream.slice(0, -1).join("/")}`;
//       const rewritten = response.data.replace(
//         /^(?!#)(.*\.(m3u8|ts|m4s|vtt))$/gm,
//         (match: string) => `${basePath}/${match}`
//       );

//       return new Response(rewritten, {
//         status: 200,
//         headers: {
//           "Content-Type": "application/vnd.apple.mpegurl",
//           "Access-Control-Allow-Origin": "*",
//         },
//       });
//     }

//     const stream = new PassThrough();
//     response.data.pipe(stream);

//     return new Response(stream as any, {
//       status: 200,
//       headers: {
//         "Content-Type": response.headers["content-type"] || "application/octet-stream",
//         "Access-Control-Allow-Origin": "*",
//       },
//     });
//   } catch (err: any) {
//     console.error("❌ Proxy error:", err.message);
//     if (err.response) {
//       console.error("❗ Response status:", err.response.status);
//       console.error("❗ Response data:", err.response.data);
//     }
//     return new Response("Proxy fetch failed", { status: 500 });
//   }
// }

import { NextRequest } from "next/server";
import { Readable } from "stream";
import axios, { AxiosError } from "axios";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ stream: string[] }> }
) {
  // Await the params since they're now a Promise
  const resolvedParams = await params;
  const path = resolvedParams.stream.join("/");

  if (!path) return new Response("Missing path", { status: 400 });

  const targetUrl = `https://scrennnifu.click/${path}`;
  const isM3U8 = targetUrl.endsWith(".m3u8");

  console.log("Proxying request to:", targetUrl); // ✅ Log for debug

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

    // Convert Node.js stream to Web API ReadableStream
    const nodeStream = response.data as Readable;
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on("data", (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });

        nodeStream.on("end", () => {
          controller.close();
        });

        nodeStream.on("error", (error) => {
          controller.error(error);
        });
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
