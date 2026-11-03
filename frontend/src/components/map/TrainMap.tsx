"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { RailwayStatus } from "@/lib/types";
import { Info } from "lucide-react";

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
      let coordinates: [number, number][] = [];

      if (routeData?.coordinates && Array.isArray(routeData.coordinates)) {
        coordinates = routeData.coordinates;
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
            "line-color": "#e5a93b",
            "line-width": 3.5,
            "line-opacity": 0.85,
          },
        });

        const bounds = new maplibregl.LngLatBounds();
        coordinates.forEach((coord) => bounds.extend(coord));
        map.fitBounds(bounds, { padding: 40 });
      }

      if (status.latitude && status.longitude) {
        const el = document.createElement("div");
        el.className = "relative flex items-center justify-center cursor-pointer";

        const pulseRing = document.createElement("div");
        pulseRing.className = `absolute w-7 h-7 rounded-full motion-safe:animate-ping motion-reduce:animate-none ${
          status.is_simulated ? "bg-accent/40" : "bg-ok/40"
        }`;

        const markerBody = document.createElement("div");
        markerBody.className = `relative w-4 h-4 rounded-full border border-paper shadow-sm flex items-center justify-center ${
          status.is_simulated ? "bg-accent" : "bg-ok"
        }`;

        el.appendChild(pulseRing);
        el.appendChild(markerBody);

        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div style="font-family: inherit; padding: 4px; background: #1c1d22; color: #f4f4f6; border-radius: 6px;">
            <strong style="font-size: 12px; font-weight: 700;">${status.train_name} (${status.train_number})</strong>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #a2a3ad;">
              Speed: <strong>${status.speed_kmph ?? 0} km/h</strong> / Delay: <strong>${status.delay_minutes}m</strong>
            </p>
            <p style="margin: 4px 0 0 0; font-size: 10px; color: ${status.is_simulated ? "#e5a93b" : "#4ade80"};">
              ${status.is_simulated ? "Simulated demo position" : "Live GPS telemetry"}
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
    <div className="relative w-full h-[320px] sm:h-[400px] md:h-[480px] rounded-card overflow-hidden border border-rule bg-paper-3">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Floating Info Pill on Map */}
      <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-paper-3 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-pill border border-rule text-[11px] sm:text-xs flex items-center gap-1.5 sm:gap-2 max-w-[95%] overflow-hidden">
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            status.is_simulated ? "bg-accent" : "bg-ok motion-safe:animate-pulse motion-reduce:animate-none"
          }`}
        />
        <span className="font-semibold text-ink font-outlier truncate">
          #{status.train_number} / {status.current_station || "In transit"}
        </span>
        <span className="text-rule-2">/</span>
        <span className="text-muted font-outlier shrink-0">
          {status.speed_kmph ? `${status.speed_kmph} km/h` : "Speed unavailable"}
        </span>
      </div>

      {!status.latitude && (
        <div className="absolute top-2 left-2 right-2 sm:top-3 sm:left-3 sm:right-3 bg-paper-2 text-ink px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-pill border border-rule text-[11px] sm:text-xs flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="line-clamp-2">Precise GPS coordinates are not returned by the upstream provider. Showing station halting geometry.</span>
        </div>
      )}
    </div>
  );
}
