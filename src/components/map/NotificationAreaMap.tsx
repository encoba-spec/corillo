"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";

interface NotificationArea {
  id: string;
  label: string;
  latitude: number | null;
  longitude: number | null;
  radiusKm: number;
  polygon: number[][] | null; // [[lng, lat], ...]
  isPolygon: boolean;
}

interface NotificationAreaMapProps {
  areas: NotificationArea[];
  onDrawComplete: (polygon: number[][]) => void;
  className?: string;
}

export function NotificationAreaMap({
  areas,
  onDrawComplete,
  className = "h-[350px]",
}: NotificationAreaMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawnLayerRef = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const areaLayerRef = useRef<L.LayerGroup>(new L.LayerGroup());
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Find center from areas or default
    let center: [number, number] = [18.45, -66.06]; // Default: San Juan
    let zoom = 11;

    const validAreas = areas.filter((a) => a.latitude && a.longitude);
    if (validAreas.length > 0) {
      const lats = validAreas.map((a) => a.latitude!);
      const lngs = validAreas.map((a) => a.longitude!);
      center = [
        (Math.min(...lats) + Math.max(...lats)) / 2,
        (Math.min(...lngs) + Math.max(...lngs)) / 2,
      ];
    }

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    // Add layers
    drawnLayerRef.current.addTo(map);
    areaLayerRef.current.addTo(map);

    // Set up draw control
    const drawControl = new (L.Control as any).Draw({
      position: "topright",
      draw: {
        polygon: {
          allowIntersection: false,
          shapeOptions: {
            color: "#06b6d4",
            fillColor: "#06b6d4",
            fillOpacity: 0.2,
            weight: 2,
          },
        },
        polyline: false,
        rectangle: {
          shapeOptions: {
            color: "#06b6d4",
            fillColor: "#06b6d4",
            fillOpacity: 0.2,
            weight: 2,
          },
        },
        circle: false,
        circlemarker: false,
        marker: false,
      },
      edit: false,
    });

    map.addControl(drawControl);

    // Handle draw events
    map.on(L.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      const latlngs = layer.getLatLngs()[0]; // array of LatLng
      const polygon = latlngs.map((ll: L.LatLng) => [ll.lng, ll.lat]);
      // Close the polygon
      polygon.push(polygon[0]);
      onDrawComplete(polygon);
      setIsDrawing(false);
    });

    map.on(L.Draw.Event.DRAWSTART, () => {
      setIsDrawing(true);
    });

    map.on(L.Draw.Event.DRAWSTOP, () => {
      setIsDrawing(false);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update area display when areas change
  useEffect(() => {
    if (!mapRef.current) return;

    areaLayerRef.current.clearLayers();

    const bounds: L.LatLng[] = [];

    for (const area of areas) {
      if (area.isPolygon && area.polygon && Array.isArray(area.polygon)) {
        // Draw polygon
        const latLngs = area.polygon.map(
          (coord: number[]) => [coord[1], coord[0]] as [number, number]
        );
        const poly = L.polygon(latLngs, {
          color: "#06b6d4",
          fillColor: "#06b6d4",
          fillOpacity: 0.15,
          weight: 2,
        });
        poly.bindTooltip(area.label, {
          permanent: false,
          direction: "center",
        });
        areaLayerRef.current.addLayer(poly);
        bounds.push(...latLngs.map((ll) => L.latLng(ll[0], ll[1])));
      } else if (area.latitude && area.longitude) {
        // Draw circle for named areas
        const circle = L.circle([area.latitude, area.longitude], {
          radius: area.radiusKm * 1000,
          color: "#06b6d4",
          fillColor: "#06b6d4",
          fillOpacity: 0.1,
          weight: 2,
        });
        circle.bindTooltip(area.label, {
          permanent: false,
          direction: "center",
        });
        areaLayerRef.current.addLayer(circle);

        // Also add a label marker
        const marker = L.circleMarker([area.latitude, area.longitude], {
          radius: 5,
          fillColor: "#06b6d4",
          fillOpacity: 0.8,
          color: "white",
          weight: 2,
        });
        marker.bindTooltip(area.label, {
          permanent: true,
          direction: "top",
          className: "area-label-tooltip",
          offset: [0, -8],
        });
        areaLayerRef.current.addLayer(marker);
        bounds.push(L.latLng(area.latitude, area.longitude));
      }
    }

    // Fit bounds if we have areas
    if (bounds.length > 0 && mapRef.current) {
      const latLngBounds = L.latLngBounds(bounds);
      mapRef.current.fitBounds(latLngBounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [areas]);

  return (
    <div className="relative">
      <div ref={containerRef} className={`rounded-lg overflow-hidden ${className}`} />
      {isDrawing && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-cyan-500 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg">
          Click to draw polygon points, double-click to finish
        </div>
      )}
    </div>
  );
}
