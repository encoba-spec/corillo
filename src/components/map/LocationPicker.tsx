"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  className?: string;
}

export function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
  className = "h-[300px]",
}: LocationPickerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center: [number, number] =
      latitude && longitude ? [latitude, longitude] : [18.45, -66.06];

    const map = L.map(containerRef.current, {
      center,
      zoom: latitude && longitude ? 15 : 12,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    // Add marker if we have initial coordinates
    if (latitude && longitude) {
      markerRef.current = L.marker([latitude, longitude], {
        draggable: true,
      }).addTo(map);

      markerRef.current.on("dragend", () => {
        const pos = markerRef.current!.getLatLng();
        onLocationChange(pos.lat, pos.lng);
      });
    }

    // Click to place/move marker
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], {
          draggable: true,
        }).addTo(map);

        markerRef.current.on("dragend", () => {
          const pos = markerRef.current!.getLatLng();
          onLocationChange(pos.lat, pos.lng);
        });
      }

      onLocationChange(lat, lng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker when coordinates change externally (geocoding, geolocation)
  useEffect(() => {
    if (!mapRef.current || !latitude || !longitude) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    } else {
      markerRef.current = L.marker([latitude, longitude], {
        draggable: true,
      }).addTo(mapRef.current);

      markerRef.current.on("dragend", () => {
        const pos = markerRef.current!.getLatLng();
        onLocationChange(pos.lat, pos.lng);
      });
    }

    mapRef.current.setView([latitude, longitude], 15);
  }, [latitude, longitude, onLocationChange]);

  return (
    <div
      ref={containerRef}
      className={`rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 ${className}`}
    />
  );
}
