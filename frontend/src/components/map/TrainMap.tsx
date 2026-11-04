"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { RailwayStatus } from "@/lib/types";
import {
  Crosshair,
  Gauge,
  Info,
  Layers,
  MapPin,
  Maximize2,
  Train,
} from "lucide-react";

const CARTO_API_KEY =
  process.env.NEXT_PUBLIC_CARTO_API_KEY || "cb1_51qv_1_2cc697bb718340cc0fe3fa22";

export const CARTO_STYLES = {
  voyager: `https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json?key=${CARTO_API_KEY}`,
  dark: `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json?key=${CARTO_API_KEY}`,
  raster: {
    version: 8 as const,
    sources: {
      carto_raster_voyager: {
        type: "raster" as const,
        tiles: [
          `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${CARTO_API_KEY}`,
        ],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>',
      },
    },
    layers: [
      {
        id: "carto-raster-base",
        type: "raster" as const,
        source: "carto_raster_voyager",
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  },
};

export type MapTheme = "voyager" | "dark" | "raster";

interface TrainMapProps {
  status: RailwayStatus;
  routeData?: any;
  selectedStationCode?: string | null;
  onSelectStation?: (stationCode: string) => void;
  className?: string;
}

export function TrainMap({
  status,
  routeData,
  selectedStationCode,
  onSelectStation,
  className = "",
}: TrainMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const trainMarkerRef = useRef<maplibregl.Marker | null>(null);
  const stationPopupRef = useRef<maplibregl.Popup | null>(null);
  const [mapTheme, setMapTheme] = useState<MapTheme>("voyager");
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Helper to add train route & station halts layers to MapLibre
  const addRouteAndHaltLayers = (map: maplibregl.Map) => {
    // 1. Calculate Coordinates
    let coordinates: [number, number][] = [];
    if (routeData?.coordinates && Array.isArray(routeData.coordinates)) {
      coordinates = routeData.coordinates;
    } else if (status.halts && status.halts.length > 1) {
      coordinates = status.halts
        .filter((h) => h.latitude && h.longitude)
        .map((h) => [h.longitude!, h.latitude!]);
    }

    // 2. Add Route Corridor Source & Layers
    if (coordinates.length > 1) {
      if (!map.getSource("route-line")) {
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
      }

      if (!map.getLayer("route-casing-layer")) {
        map.addLayer({
          id: "route-casing-layer",
          type: "line",
          source: "route-line",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#1c1d22",
            "line-width": 5,
            "line-opacity": 0.8,
          },
        });
      }

      if (!map.getLayer("route-line-layer")) {
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
            "line-width": 2.5,
            "line-opacity": 1.0,
          },
        });
      }
    }

    // 3. Add Station Halts GeoJSON Source & Layers
    const haltsWithCoords = (status.halts || []).filter(
      (h) => h.latitude && h.longitude
    );

    if (haltsWithCoords.length > 0) {
      const haltsGeoJson = {
        type: "FeatureCollection" as const,
        features: haltsWithCoords.map((h) => {
          const isCurrent = Boolean(
            (!h.has_departed && h.has_arrived) ||
              (status.current_station &&
                (status.current_station.includes(h.station_code) ||
                  status.current_station.includes(h.station_name)))
          );

          return {
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates: [h.longitude!, h.latitude!] as [number, number],
            },
            properties: {
              code: h.station_code,
              name: h.station_name,
              arr: h.arrival_time || h.actual_arrival || "--",
              dep: h.departure_time || h.actual_departure || "--",
              platform: h.platform || "1",
              delay: h.delay_minutes || 0,
              hasDeparted: h.has_departed ? 1 : 0,
              isCurrent: isCurrent ? 1 : 0,
            },
          };
        }),
      };

      if (!map.getSource("halts-source")) {
        map.addSource("halts-source", {
          type: "geojson",
          data: haltsGeoJson,
        });
      }

      if (!map.getLayer("halts-nodes-layer")) {
        map.addLayer({
          id: "halts-nodes-layer",
          type: "circle",
          source: "halts-source",
          paint: {
            "circle-radius": [
              "case",
              ["==", ["get", "isCurrent"], 1],
              6.5,
              4.5,
            ],
            "circle-color": [
              "case",
              ["==", ["get", "isCurrent"], 1],
              "#e5a93b",
              ["==", ["get", "hasDeparted"], 1],
              "#52535e",
              "#d8d9e2",
            ],
            "circle-stroke-color": [
              "case",
              ["==", ["get", "isCurrent"], 1],
              "#e5a93b",
              "#1c1d22",
            ],
            "circle-stroke-width": 1.5,
          },
        });
      }

      if (!map.getLayer("halts-labels-layer")) {
        map.addLayer({
          id: "halts-labels-layer",
          type: "symbol",
          source: "halts-source",
          minzoom: 6.8,
          layout: {
            "text-field": ["get", "code"],
            "text-size": 10.5,
            "text-offset": [0, 1.25],
            "text-anchor": "top",
          },
          paint: {
            "text-color": [
              "case",
              ["==", ["get", "isCurrent"], 1],
              "#e5a93b",
              "#a2a3ad",
            ],
          },
        });
      }
    }
  };

  // Initialize Map with CARTO Basemap
  useEffect(() => {
    if (!mapContainer.current) return;

    const defaultCenter: [number, number] = [
      status.longitude ?? 77.209,
      status.latitude ?? 22.5,
    ];

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: CARTO_STYLES.voyager,
      center: defaultCenter,
      zoom: status.latitude && status.longitude ? 8 : 5,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      setIsMapLoaded(true);

      // Add route geometry and station halts
      addRouteAndHaltLayers(map);

      // Fit map bounds if route is available
      let coordinates: [number, number][] = [];
      if (routeData?.coordinates && Array.isArray(routeData.coordinates)) {
        coordinates = routeData.coordinates;
      } else if (status.halts && status.halts.length > 1) {
        coordinates = status.halts
          .filter((h) => h.latitude && h.longitude)
          .map((h) => [h.longitude!, h.latitude!]);
      }

      if (coordinates.length > 1) {
        const bounds = new maplibregl.LngLatBounds();
        coordinates.forEach((coord) => bounds.extend(coord));
        map.fitBounds(bounds, { padding: 48 });
      }

      // Station click handler
      map.on("click", "halts-nodes-layer", (e) => {
        if (!e.features || !e.features[0]) return;
        const feat = e.features[0];
        const props = feat.properties as any;
        const coords = (feat.geometry as any).coordinates.slice();

        const delayText =
          props.delay > 0 ? `+${props.delay}m late` : "On time";
        const delayColor = props.delay > 0 ? "#e5a93b" : "#4ade80";

        new maplibregl.Popup({ offset: 12 })
          .setLngLat(coords)
          .setHTML(`
            <div style="font-family: inherit; font-size: 11px; line-height: 1.4;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <strong style="font-size: 12px; color: #f4f4f6;">${props.name}</strong>
                <span style="font-size: 10px; padding: 1px 4px; border-radius: 9999px; background: #26272e; color: #a2a3ad; border: 1px solid #363740;">${props.code}</span>
              </div>
              <div style="margin-top: 6px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; color: #a2a3ad; font-size: 10px;">
                <div>Arr: <strong style="color: #f4f4f6;">${props.arr}</strong></div>
                <div>Dep: <strong style="color: #f4f4f6;">${props.dep}</strong></div>
              </div>
              <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #2e2f38; display: flex; align-items: center; justify-content: space-between;">
                <span style="font-size: 10px; color: #a2a3ad;">Platform ${props.platform}</span>
                <span style="font-size: 10px; font-weight: 600; color: ${delayColor};">${delayText}</span>
              </div>
            </div>
          `)
          .addTo(map);

        if (onSelectStation) {
          onSelectStation(props.code);
        }
      });

      map.on("mouseenter", "halts-nodes-layer", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "halts-nodes-layer", () => {
        map.getCanvas().style.cursor = "";
      });

      // Add Custom Train Marker
      if (status.latitude && status.longitude) {
        const el = document.createElement("div");
        el.className = "relative flex items-center justify-center cursor-pointer group";

        const outerGlow = document.createElement("div");
        outerGlow.className = `absolute w-9 h-9 rounded-full ${
          status.is_simulated ? "bg-accent/25" : "bg-ok/25"
        }`;

        const innerTrain = document.createElement("div");
        innerTrain.className = `relative w-6 h-6 rounded-full border border-paper flex items-center justify-center text-accent-ink font-bold ${
          status.is_simulated ? "bg-accent" : "bg-ok"
        }`;
        innerTrain.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect width="16" height="16" x="4" y="3" rx="2"/>
            <path d="M4 11h16"/>
            <path d="M12 3v8"/>
            <path d="m8 19-2 3"/>
            <path d="m18 22-2-3"/>
            <circle cx="8" cy="15" r="1"/>
            <circle cx="16" cy="15" r="1"/>
          </svg>
        `;

        el.appendChild(outerGlow);
        el.appendChild(innerTrain);

        const popup = new maplibregl.Popup({ offset: 18 }).setHTML(`
          <div style="font-family: inherit; font-size: 11px; line-height: 1.4;">
            <div style="font-weight: 700; font-size: 12px; color: #f4f4f6;">
              ${status.train_name} (#${status.train_number})
            </div>
            <div style="margin-top: 4px; color: #a2a3ad; font-size: 11px;">
              Speed: <strong style="color: #f4f4f6;">${status.speed_kmph ?? 0} km/h</strong> / Delay: <strong style="color: ${status.delay_minutes > 0 ? "#e5a93b" : "#4ade80"};">${status.delay_minutes > 0 ? `+${status.delay_minutes}m` : "On time"}</strong>
            </div>
            <div style="margin-top: 4px; font-size: 10px; color: #a2a3ad;">
              Station: <span style="color: #f4f4f6;">${status.current_station || "In transit"}</span>
            </div>
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
  }, [status.train_number, routeData]);

  // Update Train Marker coordinates on status updates
  useEffect(() => {
    if (trainMarkerRef.current && status.latitude && status.longitude) {
      trainMarkerRef.current.setLngLat([status.longitude, status.latitude]);
    }
  }, [status.latitude, status.longitude, status.speed_kmph, status.delay_minutes]);

  // Handle Station Focus from External Timeline selection
  useEffect(() => {
    if (!mapInstance.current || !selectedStationCode || !status.halts) return;

    const halt = status.halts.find((h) => h.station_code === selectedStationCode);
    if (halt && halt.latitude && halt.longitude) {
      mapInstance.current.flyTo({
        center: [halt.longitude, halt.latitude],
        zoom: 10.5,
        essential: true,
      });

      // Open Popup
      if (stationPopupRef.current) {
        stationPopupRef.current.remove();
      }

      const delayText =
        halt.delay_minutes > 0 ? `+${halt.delay_minutes}m late` : "On time";
      const delayColor = halt.delay_minutes > 0 ? "#e5a93b" : "#4ade80";

      stationPopupRef.current = new maplibregl.Popup({ offset: 12 })
        .setLngLat([halt.longitude, halt.latitude])
        .setHTML(`
          <div style="font-family: inherit; font-size: 11px; line-height: 1.4;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              <strong style="font-size: 12px; color: #f4f4f6;">${halt.station_name}</strong>
              <span style="font-size: 10px; padding: 1px 4px; border-radius: 9999px; background: #26272e; color: #a2a3ad; border: 1px solid #363740;">${halt.station_code}</span>
            </div>
            <div style="margin-top: 6px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; color: #a2a3ad; font-size: 10px;">
              <div>Arr: <strong style="color: #f4f4f6;">${halt.arrival_time || "--"}</strong></div>
              <div>Dep: <strong style="color: #f4f4f6;">${halt.departure_time || "--"}</strong></div>
            </div>
            <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #2e2f38; display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 10px; color: #a2a3ad;">Platform ${halt.platform || "1"}</span>
              <span style="font-size: 10px; font-weight: 600; color: ${delayColor};">${delayText}</span>
            </div>
          </div>
        `)
        .addTo(mapInstance.current);
    }
  }, [selectedStationCode, status.halts]);

  // Recenter Train Handler
  const handleRecenter = () => {
    if (!mapInstance.current || !status.latitude || !status.longitude) return;
    mapInstance.current.flyTo({
      center: [status.longitude, status.latitude],
      zoom: 9.5,
      essential: true,
    });
  };

  // Fit Entire Journey Handler
  const handleFitJourney = () => {
    if (!mapInstance.current) return;
    let coordinates: [number, number][] = [];
    if (routeData?.coordinates && Array.isArray(routeData.coordinates)) {
      coordinates = routeData.coordinates;
    } else if (status.halts && status.halts.length > 1) {
      coordinates = status.halts
        .filter((h) => h.latitude && h.longitude)
        .map((h) => [h.longitude!, h.latitude!]);
    }

    if (coordinates.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      coordinates.forEach((coord) => bounds.extend(coord));
      mapInstance.current.fitBounds(bounds, { padding: 48 });
    }
  };

  // Toggle Map Style Layer across CARTO Voyager, Dark Matter, and Raster
  const toggleMapStyle = () => {
    if (!mapInstance.current || !isMapLoaded) return;
    const modes: MapTheme[] = ["voyager", "dark", "raster"];
    const nextIdx = (modes.indexOf(mapTheme) + 1) % modes.length;
    const nextMode = modes[nextIdx];
    setMapTheme(nextMode);

    const map = mapInstance.current;
    map.setStyle(CARTO_STYLES[nextMode] as any);

    // Re-apply route & halts once the new style loads
    map.once("style.load", () => {
      addRouteAndHaltLayers(map);
    });
  };

  return (
    <div
      className={`relative w-full h-[360px] sm:h-[440px] md:h-[520px] rounded-card overflow-hidden border border-rule bg-paper-3 ${className}`}
    >
      <div ref={mapContainer} className="w-full h-full" />

      {/* Tactical Map Toolbar (Top-Right) */}
      <div className="absolute top-2.5 right-12 sm:right-14 flex items-center gap-1.5 z-10">
        <button
          type="button"
          onClick={handleRecenter}
          disabled={!status.latitude}
          className="p-1.5 sm:px-2.5 sm:py-1 rounded-pill bg-paper-2 hover:bg-paper-3 active:opacity-80 text-ink border border-rule text-xs font-medium transition-colors flex items-center gap-1.5 shadow-none disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
          title="Recenter on live train"
        >
          <Crosshair className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="hidden sm:inline">Center train</span>
        </button>

        <button
          type="button"
          onClick={handleFitJourney}
          className="p-1.5 sm:px-2.5 sm:py-1 rounded-pill bg-paper-2 hover:bg-paper-3 active:opacity-80 text-ink border border-rule text-xs font-medium transition-colors flex items-center gap-1.5 shadow-none cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
          title="Fit full route in viewport"
        >
          <Maximize2 className="w-3.5 h-3.5 text-muted shrink-0" />
          <span className="hidden sm:inline">Full route</span>
        </button>

        <button
          type="button"
          onClick={toggleMapStyle}
          className="p-1.5 sm:px-2.5 sm:py-1 rounded-pill bg-paper-2 hover:bg-paper-3 active:opacity-80 text-ink border border-rule text-xs font-medium transition-colors flex items-center gap-1.5 shadow-none cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
          title="Switch CARTO Basemap theme (Vector Voyager, Dark Matter, Raster)"
        >
          <Layers className="w-3.5 h-3.5 text-cool shrink-0" />
          <span className="hidden sm:inline font-outlier text-[11px] font-semibold">
            {mapTheme === "voyager"
              ? "CARTO Voyager"
              : mapTheme === "dark"
              ? "CARTO Dark"
              : "CARTO Raster"}
          </span>
        </button>
      </div>

      {/* CARTO Basemap Indicator (Top-Left) */}
      <div className="absolute top-2.5 left-2.5 bg-paper-2 border border-rule px-2.5 py-1 rounded text-[11px] text-muted flex items-center gap-1.5 z-10">
        <span className="font-semibold text-ink">CARTO</span>
        <span className="text-rule-2">/</span>
        <span className="text-[11px] text-accent font-medium font-outlier">
          {mapTheme === "raster" ? "Raster" : "Vector GL"}
        </span>
      </div>

      {/* Railway Telemetry HUD (Bottom) - Solid neutral surface, no glassmorphism */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:right-auto bg-paper-2 border border-rule px-3 sm:px-3.5 py-1.5 rounded flex flex-wrap items-center gap-2 sm:gap-3 text-xs z-10">
        <div className="flex items-center gap-1.5 font-outlier font-bold text-ink tabular-nums">
          <Train className="w-3.5 h-3.5 text-accent" />
          <span>#{status.train_number}</span>
        </div>

        <span className="text-rule-2">/</span>

        <div className="flex items-center gap-1 text-ink font-outlier font-semibold tabular-nums">
          <Gauge className="w-3.5 h-3.5 text-cool" />
          <span>{status.speed_kmph ?? 0} km/h</span>
        </div>

        <span className="text-rule-2 hidden sm:inline">/</span>

        <div className="flex items-center gap-1 text-muted text-[11px] truncate max-w-[180px] sm:max-w-none">
          <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="truncate">{status.current_station || "In transit"}</span>
        </div>

        {status.latitude && status.longitude && (
          <>
            <span className="text-rule-2 hidden md:inline">/</span>
            <span className="text-[10px] text-muted font-outlier hidden md:inline tabular-nums">
              {status.latitude.toFixed(4)}° N, {status.longitude.toFixed(4)}° E
            </span>
          </>
        )}
      </div>

      {/* Station Coordinates Notice */}
      {!status.latitude && (
        <div className="absolute top-10 left-2.5 right-12 sm:right-auto bg-paper-2 text-ink px-3 py-1 rounded border border-rule text-xs flex items-center gap-2 z-10">
          <Info className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="text-[11px]">Station halting trajectory active</span>
        </div>
      )}
    </div>
  );
}
