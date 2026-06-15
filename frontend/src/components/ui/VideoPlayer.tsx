"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { cn, isIframeVideoUrl } from "@/lib/utils";

interface VideoPlayerProps {
  src: string;
  className?: string;
  poster?: string;
  autoPlayOnHover?: boolean;
  muted?: boolean;
  loop?: boolean;
  size?: "sm" | "md" | "lg";
}

export function VideoPlayer({
  src,
  className,
  poster,
  autoPlayOnHover = true,
  muted = true,
  loop = true,
  size = "md",
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isIframe = isIframeVideoUrl(src);

  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/watch')) {
      const id = new URL(url).searchParams.get('v');
      return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1`;
    }
    if (url.includes('youtu.be/')) {
      const id = url.split('/').pop();
      return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1`;
    }
    return url;
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isIframe) return;
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(console.error);
        setIsPlaying(true);
      }
    }
  };

  const handleMouseEnter = () => {
    if (isIframe) return;
    if (autoPlayOnHover && videoRef.current && !isPlaying) {
      videoRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const handleMouseLeave = () => {
    if (isIframe) return;
    if (autoPlayOnHover && videoRef.current && isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  if (isIframe) {
    return (
      <div className={cn("relative overflow-hidden rounded-xl bg-black aspect-video", className)}>
        <iframe
          src={getEmbedUrl(src)}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div 
      className={cn("relative group cursor-pointer overflow-hidden rounded-xl bg-black/5", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted={muted}
        loop={loop}
        playsInline
        className="w-full h-full object-cover"
      />
      
      {/* Overlay Play/Pause Button - Always visible or enhanced on hover */}
      <div className={cn(
        "absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-all duration-300",
        isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
      )}>
        <div className={cn(
          "rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-2xl transform transition-all duration-300 border border-white/20",
          size === "sm" ? "w-8 h-8" : size === "lg" ? "w-16 h-16" : "w-12 h-12",
          isPlaying ? "scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100" : "scale-100 opacity-100"
        )}>
          {isPlaying ? (
            <Pause className={cn(size === "sm" ? "h-3 w-3" : size === "lg" ? "h-6 w-6" : "h-5 w-5", "text-gray-900 fill-current")} />
          ) : (
            <Play className={cn(size === "sm" ? "h-3 w-3 ml-0.5" : size === "lg" ? "h-6 w-6 ml-1.5" : "h-5 w-5 ml-1", "text-gray-900 fill-current")} />
          )}
        </div>
      </div>

      {/* Premium Glass Bottom Bar (Subtle) */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 overflow-hidden">
        <div 
          className={cn(
            "h-full bg-indigo-500 transition-all duration-1000 linear",
            isPlaying ? "w-full" : "w-0"
          )}
        />
      </div>
    </div>
  );
}
