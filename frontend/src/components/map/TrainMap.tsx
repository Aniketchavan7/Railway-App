"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { RailwayStatus } from "@/lib/types";

interface TrainMapProps {
  status: RailwayStatus;
  routeData?: any;
}

export function TrainMap({ status, routeData }: TrainMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const trainMarkerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Default center to India / Maharashtra
    const defaultCenter: [number, number] = [
      status.longitude ?? 77.209,
      status.latitude ?? 22.5,
    ];

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: [
              "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
              "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
          },
        },
        layers: [
          {
            id: "osm-tiles",
            type: "raster",
            source: "osm",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: defaultCenter,
      zoom: status.latitude && status.longitude ? 8 : 5,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      // Draw route line if coordinates are available
      let coordinates: [number, number][] = [];

      if (routeData?.coordinates && Array.isArray(routeData.coordinates)) {
        coordinates = routeData.coordinates;
      } else if (status.halts && status.halts.length > 0) {
        // Collect halts coordinates from halts data or fallback stations
        // We'll filter valid coordinates
      }

      if (coordinates.length > 1) {
        map.addSource("route-line", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: coordinates,
            },
          },
        });

        map.addLayer({
          id: "route-line-layer",
          type: "line",
          source: "route-line",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#2563eb",
            "line-width": 4,
            "line-opacity": 0.8,
          },
        });

        // Fit bounds
        const bounds = new maplibregl.LngLatBounds();
        coordinates.forEach((coord) => bounds.extend(coord));
        map.fitBounds(bounds, { padding: 40 });
      }

      // Add train marker if valid coordinates exist
      if (status.latitude && status.longitude) {
        const el = document.createElement("div");
        el.className = "relative flex items-center justify-center cursor-pointer";

        const pulseRing = document.createElement("div");
        pulseRing.className = `absolute w-8 h-8 rounded-full ${
          status.is_simulated ? "bg-amber-400/50 animate-ping" : "bg-emerald-500/50 animate-ping"
        }`;

        const markerBody = document.createElement("div");
        markerBody.className = `relative w-5 h-5 rounded-full border-2 border-white shadow-md flex items-center justify-center ${
          status.is_simulated ? "bg-amber-600" : "bg-emerald-600"
        }`;

        el.appendChild(pulseRing);
        el.appendChild(markerBody);

        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div style="font-family: sans-serif; padding: 4px;">
            <strong style="color: #0f172a; font-size: 13px;">${status.train_name} (${status.train_number})</strong>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">
              Speed: <strong>${status.speed_kmph ?? 0} km/h</strong> • Delay: <strong>${status.delay_minutes}m</strong>
            </p>
            <p style="margin: 4px 0 0 0; font-size: 10px; color: ${status.is_simulated ? "#b45309" : "#047857"};">
              ${status.is_simulated ? "⚠️ Simulated Demo Position" : "🟢 Live GPS Telemetry"}
            </p>
          </div>
        `);

        trainMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([status.longitude, status.latitude])
          .setPopup(popup)
          .addTo(map);
      }
    });

    mapInstance.current = map;

    return () => {
      map.remove();
    };
  }, [status.train_number, status.latitude, status.longitude, routeData]);

  return (
    <div className="relative w-full h-[400px] md:h-[480px] rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Floating Info Pill on Map */}
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 text-xs shadow-md flex items-center gap-2">
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            status.is_simulated ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
          }`}
        />
        <span className="font-semibold text-slate-800">
          {status.train_number} • {status.current_station || "In Transit"}
        </span>
        <span className="text-slate-400">|</span>
        <span className="text-slate-600 font-medium">
          {status.speed_kmph ? `${status.speed_kmph} km/h` : "Speed N/A"}
        </span>
      </div>

      {!status.latitude && (
        <div className="absolute top-3 left-3 right-3 bg-slate-900/85 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs flex items-center justify-between">
          <span>ℹ️ Precise GPS coordinates are not returned by the upstream provider. Showing station halting geometry.</span>
        </div>
      )}
    </div>
  );
}
