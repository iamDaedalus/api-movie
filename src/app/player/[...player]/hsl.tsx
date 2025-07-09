"use client";
import { useEffect, useRef, useState } from "react";
import Hls, { Level } from "hls.js";
type SubtitleTrack = {
  id: number;
  name: string;
  lang?: string;
  type: string;
  url: string;
  default?: boolean;
  forced?: boolean;
  autoselect?: boolean;
};
type AudioTrack = {
  id: number;
  name: string;
  lang?: string;
  groupId: string;
  default: boolean;
  autoselect: boolean;
  forced: boolean;
};
import {
  Maximize,
  Minimize,
  Pause,
  Play,
  RedoDot,
  Settings,
  UndoDot,
  Volume2,
  VolumeX,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";

export type MediaData = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  backdrop_path: string;
  poster_path?: string;
  media_type?: "movie" | "serial";
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState("");
  const [isStreamUnavailable, setIsStreamUnavailable] = useState(false);
  const [hlsInstance, setHlsInstance] = useState<Hls | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number>(-1);
  const [selectedSubtitle, setSelectedSubtitle] = useState<number>(-1);
  const [selectedAudio, setSelectedAudio] = useState<number>(0);

  // Video control states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  let controlsTimeout: NodeJS.Timeout;
  console.log(error);
  useEffect(() => {
    const fetchStream = async () => {
      try {
        setIsLoading(true);
        setError("");
        setIsStreamUnavailable(false);

        if (m3u8link && videoRef.current) {
          if (Hls.isSupported()) {
            const hls = new Hls();

            // Add error handling for HLS
            hls.on(Hls.Events.ERROR, (event, data) => {
              console.error("HLS Error:", data);
              if (data.fatal) {
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    setError("Network error occurred");
                    setIsStreamUnavailable(true);
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    setError("Media error occurred");
                    setIsStreamUnavailable(true);
                    break;
                  default:
                    setError("An error occurred while loading the stream");
                    setIsStreamUnavailable(true);
                    break;
                }
              }
            });

            hls.loadSource(m3u8link);
            hls.attachMedia(videoRef.current);

            hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
              setLevels(data.levels);
              setIsLoading(false);
            });

            hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
              setSubtitles(data.subtitleTracks);
            });

            hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_, data) => {
              setAudioTracks(data.audioTracks);
            });

            setHlsInstance(hls);
          } else if (
            videoRef.current.canPlayType("application/vnd.apple.mpegurl")
          ) {
            videoRef.current.src = m3u8link;
            videoRef.current.addEventListener("loadedmetadata", () => {
              setIsLoading(false);
            });
            videoRef.current.addEventListener("error", () => {
              setError("Failed to load video stream");
              setIsStreamUnavailable(true);
              setIsLoading(false);
            });
          }
        } else {
          setError("No video found.");
          setIsStreamUnavailable(true);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error loading stream:", err);
        setError("Failed to load video.");
        setIsStreamUnavailable(true);
        setIsLoading(false);
      }
    };

    fetchStream();
  }, [m3u8link]);

  // Apply HLS changes
  useEffect(() => {
    if (hlsInstance) hlsInstance.currentLevel = selectedLevel;
  }, [selectedLevel, hlsInstance]);

  useEffect(() => {
    if (hlsInstance) hlsInstance.subtitleTrack = selectedSubtitle;
  }, [selectedSubtitle, hlsInstance]);

  useEffect(() => {
    if (hlsInstance) hlsInstance.audioTrack = selectedAudio;
  }, [selectedAudio, hlsInstance]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleWaiting = () => {
      setIsBuffering(true);
    };

    const handleCanPlay = () => {
      setIsBuffering(false);
    };

    const handleError = () => {
      setError("Video playback error");
      setIsStreamUnavailable(true);
      setIsLoading(false);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", handleError);
    };
  }, []);

  // Auto-hide controls
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(controlsTimeout);
      controlsTimeout = setTimeout(() => {
        if (isPlaying) setShowControls(false);
      }, 3000);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      return () => {
        container.removeEventListener("mousemove", handleMouseMove);
        clearTimeout(controlsTimeout);
      };
    }
  }, [isPlaying]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      const newTime = (value[0] / 100) * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100;
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(
        0,
        Math.min(duration, currentTime + seconds)
      );
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleRetry = () => {
    setError("");
    setIsStreamUnavailable(false);
    setIsLoading(true);

    // Trigger re-fetch by updating the effect dependency
    if (hlsInstance) {
      hlsInstance.destroy();
      setHlsInstance(null);
    }

    // Reset video element
    if (videoRef.current) {
      videoRef.current.src = "";
      videoRef.current.load();
    }

    // The useEffect will re-run due to the state changes
  };

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0;

  // Handle container click (but not when clicking on controls)
  const handleContainerClick = (e: React.MouseEvent) => {
    // Only toggle play if clicking on the video itself or empty space
    if (e.target === e.currentTarget || e.target === videoRef.current) {
      togglePlay();
    }
  };

  const posterUrl = data.backdrop_path
    ? `https://image.tmdb.org/t/p/original/${data.backdrop_path}`
    : undefined;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[100dvh] bg-black overflow-hidden group"
      onClick={handleContainerClick}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        poster={posterUrl}
        className="w-full h-full object-contain bg-black"
        autoPlay
      />

      {/* Loading Indicator */}
      {isLoading && !isStreamUnavailable && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-lg">Loading stream...</p>
          </div>
        </div>
      )}

      {/* Stream Unavailable Fallback */}
      {isStreamUnavailable && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-30">
          <div className="text-center max-w-md mx-auto p-6">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-white text-2xl font-bold mb-2">
              Stream Unavailable
            </h2>
            <p className="text-gray-300 text-lg mb-6">
              The current server is not responding. Please switch to another
              server to continue watching.
            </p>
            <div className="space-y-4">
              <button
                onClick={handleRetry}
                className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors mx-auto"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Retry Current Server</span>
              </button>
              <p className="text-gray-400 text-sm">
                or switch to a different server from the server list
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Buffering Indicator */}
      {isBuffering && !isStreamUnavailable && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 bg-opacity-50 z-30 pointer-events-none">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Main Controls Overlay */}
      {showControls && !isStreamUnavailable && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/50 z-10 pointer-events-none">
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center pointer-events-auto">
            <div className="text-white text-xl font-semibold">
              {data.name || data.title} on ZXC[STREAM]
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSettings(!showSettings);
              }}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <Settings className="lg:w-8 lg:h-8 w-6 h-6 text-white" />
            </button>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-6 space-y-4 pointer-events-auto">
            {/* Progress Bar */}
            <div className="flex items-center space-x-6">
              <span className="text-white text-center  font-mono text-sm min-w-[3rem]">
                {formatTime(currentTime)}
              </span>
              <div className="flex-1">
                <Slider
                  value={[progressPercentage]}
                  onValueChange={handleSeek}
                  max={100}
                  step={0.1}
                  className="w-full"
                />
              </div>
              <span className="text-white text-center font-mono text-sm min-w-[3rem]">
                {formatTime(duration)}
              </span>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center lg:space-x-4 space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    skip(-10);
                  }}
                  className="lg:p-3 p-1 rounded-full hover:bg-white/20 transition-colors"
                >
                  <UndoDot className="lg:w-8 lg:h-8 w-6 h-6 text-white" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  className="w-10 flex justify-center rounded-full hover:bg-white/20 transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="lg:w-8 lg:h-8 w-7 h-7 text-white" />
                  ) : (
                    <Play className="lg:w-8 lg:h-8 w-7 h-7 text-white ml-1" />
                  )}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    skip(10);
                  }}
                  className="lg:p-3 p-1 rounded-full hover:bg-white/20 transition-colors"
                >
                  <RedoDot className="lg:w-8 lg:h-8 w-6 h-6 text-white" />
                </button>

                {/* Volume Control */}
                <div className="lg:flex hidden items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMute();
                    }}
                    className="p-2 rounded-full hover:bg-white/20 transition-colors"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="lg:w-8 lg:h-8 w-6 h-6 text-white" />
                    ) : (
                      <Volume2 className="lg:w-8 lg:h-8 w-6 h-6 text-white" />
                    )}
                  </button>
                  <div className="w-24">
                    <Slider
                      value={[isMuted ? 0 : volume * 100]}
                      onValueChange={handleVolumeChange}
                      max={100}
                      step={1}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                {isFullscreen ? (
                  <Minimize className="lg:w-8 lg:h-8 w-6 h-6 text-white" />
                ) : (
                  <Maximize className="lg:w-8 lg:h-8 w-6 h-6 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && !isStreamUnavailable && (
        <div className="absolute top-16 right-6 bg-black/90 backdrop-blur-sm rounded-lg p-5 w-80 space-y-5 z-40">
          {/* Quality Settings */}
          {levels.length > 0 && (
            <div>
              <label className="block text-white font-semibold mb-3 text-base">
                Quality
              </label>
              <select
                className="w-full bg-black text-white p-3 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-base"
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(Number(e.target.value))}
              >
                <option value={-1}>Auto</option>
                {levels.map((level, i) => (
                  <option key={i} value={i}>
                    {level.height}p
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Subtitles Settings */}
          {subtitles.length > 0 && (
            <div>
              <label className="block text-white font-semibold mb-3 text-base">
                Subtitles
              </label>
              <select
                className="w-full bg-black text-white p-3 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-base"
                value={selectedSubtitle}
                onChange={(e) => setSelectedSubtitle(Number(e.target.value))}
              >
                <option value={-1}>Off</option>
                {subtitles.map((sub, i) => (
                  <option key={i} value={i}>
                    {sub.name} ({sub.lang})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Audio Track Settings */}
          {audioTracks.length > 1 && (
            <div>
              <label className="block text-white font-semibold mb-3 text-base">
                Audio Track
              </label>
              <select
                className="w-full bg-black text-white p-3 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-base"
                value={selectedAudio}
                onChange={(e) => setSelectedAudio(Number(e.target.value))}
              >
                {audioTracks.map((track, i) => (
                  <option key={i} value={i}>
                    {track.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
