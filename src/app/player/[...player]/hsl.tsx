"use client";
import { useEffect, useRef } from "react";
import Hls from "hls.js";

export type MediaData = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  backdrop_path: string;
  poster_path?: string;
  media_type?: "movie" | "tv";
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
};

export default function HslPlayer({
  m3u8link,
  data,
}: {
  m3u8link: string;
  data: MediaData;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(m3u8link);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("HLS.js error:", data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });

      return () => {
        hls.destroy();
      };
    } else if (video?.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = m3u8link;
    } else {
      console.error("This browser does not support HLS.");
    }
  }, [m3u8link]);

  const posterUrl = data.backdrop_path
    ? `https://image.tmdb.org/t/p/original/${data.backdrop_path}`
    : undefined;
  console.log(posterUrl);
  return (
    <div className="w-full h-[100dvh] bg-black">
      <video
        ref={videoRef}
        controls
        className="w-full h-full object-cover"
        poster={posterUrl}
        preload="none"
      />
    </div>
  );
}
