"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Zone {
  userId: string;
  latitude: number;
  longitude: number;
  activityCount: number;
  radius: number;
  label?: string | null;
}

interface RunnerMapProps {
  myZones: { latitude: number; longitude: number; activityCount: number; radius: number }[];
  zones: Zone[];
  selectedUserId?: string | null;
  onZoneClick?: (userId: string) => void;
  className?: string;
}

export function RunnerMap({
  myZones,
  zones,
  selectedUserId,
  onZoneClick,
  className = "",
}: RunnerMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Default center: San Juan, PR (or first zone)
    const center: [number, number] =
      myZones.length > 0
        ? [myZones[0].latitude, myZones[0].longitude]
        : [18.4655, -66.1057];

    const map = L.map(mapRef.current).setView(center, 13);
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers/circles when data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing layers (except tile layer)
    map.eachLayer((layer) => {
      if (layer instanceof L.Circle || layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    // Draw my zones (blue)
    for (const zone of myZones) {
      L.circle([zone.latitude, zone.longitude], {
        radius: Math.max(zone.radius, 200),
        color: "#3B82F6",
        fillColor: "#3B82F6",
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map);

      L.circleMarker([zone.latitude, zone.longitude], {
        radius: 6,
        color: "#3B82F6",
        fillColor: "#3B82F6",
        fillOpacity: 0.8,
        weight: 2,
      })
        .bindTooltip("Your zone", { direction: "top" })
        .addTo(map);
    }

    // Draw other runners' zones (orange, highlight selected)
    for (const zone of zones) {
      const isSelected = zone.userId === selectedUserId;
      const color = isSelected ? "#06B6D4" : "#22D3EE";
      const opacity = isSelected ? 0.3 : 0.12;
      const weight = isSelected ? 3 : 1;

      L.circle([zone.latitude, zone.longitude], {
        radius: Math.max(zone.radius, 200),
        color,
        fillColor: color,
        fillOpacity: opacity,
        weight,
      }).addTo(map);

      const marker = L.circleMarker([zone.latitude, zone.longitude], {
        radius: isSelected ? 8 : 5,
        color,
        fillColor: color,
        fillOpacity: 0.8,
        weight: 2,
      }).addTo(map);

      if (zone.label) {
        marker.bindTooltip(
          `${zone.label} (${zone.activityCount} runs)`,
          { direction: "top" }
        );
      }

      if (onZoneClick) {
        marker.on("click", () => onZoneClick(zone.userId));
      }
    }

    // Fit bounds to show all zones
    const allPoints = [
      ...myZones.map((z) => [z.latitude, z.longitude] as [number, number]),
      ...zones.map((z) => [z.latitude, z.longitude] as [number, number]),
    ];
    if (allPoints.length > 1) {
      map.fitBounds(L.latLngBounds(allPoints), { padding: [50, 50] });
    }
  }, [myZones, zones, selectedUserId, onZoneClick]);

  return (
    <div
      ref={mapRef}
      className={`w-full rounded-xl overflow-hidden ${className}`}
      style={{ minHeight: "400px" }}
    />
  );
}
