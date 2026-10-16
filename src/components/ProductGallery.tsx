"use client";

import React, { useState } from "react";
import Image from "next/image";

interface ProductGalleryProps {
  images: { url: string; alt: string }[];
  title: string;
}

export function ProductGallery({ images, title }: ProductGalleryProps) {
  const safeImages = images && images.length > 0
    ? images
    : [{ url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800", alt: title }];

  const [activeIndex, setActiveIndex] = useState(0);
  const [errorMap, setErrorMap] = useState<Record<number, boolean>>({});

  const activeImage = safeImages[activeIndex] || safeImages[0];
  const activeUrl = errorMap[activeIndex]
    ? "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"
    : activeImage.url;

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image Stage */}
      <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm">
        <Image
          src={activeUrl}
          alt={activeImage.alt || `${title} — изображение ${activeIndex + 1}`}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain p-4 sm:p-6 transition-all duration-300"
          onError={() => setErrorMap((prev) => ({ ...prev, [activeIndex]: true }))}
        />
      </div>

      {/* Thumbnails strip */}
      {safeImages.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {safeImages.map((img, idx) => {
            const isSelected = idx === activeIndex;
            const thumbUrl = errorMap[idx]
              ? "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200"
              : img.url;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`Показать фото ${idx + 1}`}
                className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-card transition-all duration-200 ${
                  isSelected
                    ? "border-emerald-600 ring-2 ring-emerald-500/20 scale-95"
                    : "border-border/60 opacity-70 hover:opacity-100 hover:border-emerald-500/40"
                }`}
              >
                <Image
                  src={thumbUrl}
                  alt={img.alt || `${title} миниатюра ${idx + 1}`}
                  fill
                  sizes="80px"
                  className="object-cover"
                  onError={() => setErrorMap((prev) => ({ ...prev, [idx]: true }))}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
