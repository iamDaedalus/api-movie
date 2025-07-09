"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import HslPlayer from "./hsl";

export default function PlayerPage() {
  const params = useParams();
  const media_type = params?.player?.[0];
  const id = params?.player?.[1];
  const season = params?.player?.[2];
  const episode = params?.player?.[3];

  const [show, setShow] = useState<any>(null);
  const [m3u8Url, setM3u8Url] = useState("");
  const apiKey = "47a1a7df542d3d483227f758a7317dff";

  useEffect(() => {
    const fetchStream = async () => {
      if (!media_type || !id) return;

      try {
        const imdb = `https://api.themoviedb.org/3/${media_type}/${id}/external_ids?api_key=${apiKey}`;
        const endpoint = `https://api.themoviedb.org/3/${media_type}/${id}?api_key=${apiKey}`;

        const [imdbres, endpointres] = await Promise.all([
          fetch(imdb),
          fetch(endpoint),
        ]);

        const imdbdata = await imdbres.json();
        const endpointdata = await endpointres.json();

        setShow(endpointdata);

        if (imdbdata?.imdb_id) {
          const url = `/api/${[
            media_type === "tv" ? "serial" : "movie",
            imdbdata.imdb_id,
            season,
            episode,
          ]
            .filter(Boolean)
            .join("/")}/playlist.m3u8`;

          setM3u8Url(url);
        }
      } catch (error) {
        console.error("Stream fetch failed", error);
      }
    };

    fetchStream();
  }, [media_type, id, season, episode]);

  return <>{m3u8Url && show && <HslPlayer m3u8link={m3u8Url} data={show} />}</>;
}
