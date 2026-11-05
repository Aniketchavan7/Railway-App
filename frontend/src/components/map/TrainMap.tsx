"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { RailwayStatus, StationHalt } from "@/lib/types";
import { delayLabel, escapeHtml, formatDay } from "@/lib/format";
import { Crosshair, Gauge, Info, Layers, MapPin, Maximize2, Train } from "lucide-react";

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
        tiles: [`https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${CARTO_API_KEY}`],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>',
      },
    },
    layers: [{ id: "carto-raster-base", type: "raster" as const, source: "carto_raster_voyager", minzoom: 0, maxzoom: 19 }],
  },
};

export type MapTheme = "voyager" | "dark" | "raster";

const MOVE_ANIMATION_MS = 900;
const THEME_NAMES: Record<MapTheme, string> = { voyager: "Light", dark: "Dark", raster: "Raster" };

interface TrainMapProps {
  status: RailwayStatus;
  routeData?: { coordinates?: [number, number][] } | null;
  selectedStationCode?: string | null;
  onSelectStation?: (stationCode: string) => void;
  className?: string;
}

function hasCoords(h: StationHalt): boolean {
  return h.latitude != null && h.longitude != null;
}

function routeCoordinates(status: RailwayStatus, routeData: TrainMapProps["routeData"]): [number, number][] {
  if (Array.isArray(routeData?.coordinates) && routeData.coordinates.length > 1) return routeData.coordinates;
  return (status.halts ?? []).filter(hasCoords).map((h) => [h.longitude!, h.latitude!]);
}

function routeGeoJson(coordinates: [number, number][]): GeoJSON.Feature {
  return { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates } };
}

function haltsGeoJson(status: RailwayStatus): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: (status.halts ?? []).filter(hasCoords).map((h) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [h.longitude!, h.latitude!] },
      properties: {
        code: h.station_code,
        name: h.station_name,
        arr: h.arrival_time || "--",
        dep: h.departure_time || "--",
        platform: h.platform || "",
        hasDeparted: h.has_departed ? 1 : 0,
        isCurrent: h.has_arrived && !h.has_departed ? 1 : 0,
      },
    })),
  };
}

function stationPopupHtml(p: { name: string; code: string; arr: string; dep: string; platform?: string }): string {
  return `
    <div style="font-family: inherit; font-size: 11px; line-height: 1.4;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        <strong style="font-size: 12px; color: #f4f4f6;">${escapeHtml(p.name)}</strong>
        <span style="font-size: 10px; padding: 1px 4px; border-radius: 9999px; background: #26272e; color: #a2a3ad; border: 1px solid #363740;">${escapeHtml(p.code)}</span>
      </div>
      <div style="margin-top: 6px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; color: #a2a3ad; font-size: 10px;">
        <div>Arr: <strong style="color: #f4f4f6;">${escapeHtml(p.arr)}</strong></div>
        <div>Dep: <strong style="color: #f4f4f6;">${escapeHtml(p.dep)}</strong></div>
      </div>
      ${p.platform ? `<div style="margin-top: 6px; font-size: 10px; color: #a2a3ad;">Platform ${escapeHtml(p.platform)} (may change)</div>` : ""}
    </div>`;
}

function trainPopupHtml(status: RailwayStatus): string {
  return `
    <div style="font-family: inherit; font-size: 11px; line-height: 1.4;">
      <div style="font-weight: 700; font-size: 12px; color: #f4f4f6;">${escapeHtml(status.train_name)} (#${escapeHtml(status.train_number)})</div>
      <div style="margin-top: 4px; color: #a2a3ad;">${escapeHtml(status.position_label || status.current_station || "")}</div>
      <div style="margin-top: 4px; color: #a2a3ad;">
        ${status.speed_kmph != null ? `${Math.round(status.speed_kmph)} km/h · ` : ""}${escapeHtml(delayLabel(status.delay_minutes))}
      </div>
    </div>`;
}

function buildMarkerElement(): { root: HTMLDivElement; dot: HTMLDivElement; glow: HTMLDivElement } {
  const root = document.createElement("div");
  root.className = "relative flex items-center justify-center cursor-pointer";
  const glow = document.createElement("div");
  const dot = document.createElement("div");
  dot.innerHTML = `
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><path d="m8 19-2 3"/><path d="m18 22-2-3"/>
      <circle cx="8" cy="15" r="1"/><circle cx="16" cy="15" r="1"/>
    </svg>`;
  root.append(glow, dot);
  return { root, dot, glow };
}

/** Solid means observed by GPS. Hollow means worked out, so the two can't be confused. */
function styleMarker(parts: { dot: HTMLDivElement; glow: HTMLDivElement }, status: RailwayStatus) {
  const observed = status.position_basis === "PASSENGER_GPS" || status.position_basis === "PROVIDER_GPS";
  const base = "relative w-6 h-6 rounded-full flex items-center justify-center";
  // Full class names, because Tailwind only generates classes it can find as plain text.
  if (status.is_simulated) {
    parts.glow.className = "absolute w-9 h-9 rounded-full bg-accent/25";
    parts.dot.className = `${base} border-2 border-accent text-accent bg-paper`;
  } else if (observed) {
    parts.glow.className = "absolute w-9 h-9 rounded-full bg-ok/25";
    parts.dot.className = `${base} border border-paper text-paper bg-ok`;
  } else {
    parts.glow.className = "absolute w-9 h-9 rounded-full bg-cool/25";
    parts.dot.className = `${base} border-2 border-cool text-cool bg-paper`;
  }
}

export function TrainMap({ status, routeData, selectedStationCode, onSelectStation, className = "" }: TrainMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const markerParts = useRef<ReturnType<typeof buildMarkerElement> | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const animationRef = useRef<number | null>(null);
  const hasFitted = useRef(false);
  const [mapTheme, setMapTheme] = useState<MapTheme>("voyager");
  const [isStyleReady, setIsStyleReady] = useState(false);

  // Always the latest props, for handlers registered once at map creation.
  const latest = useRef({ status, routeData, onSelectStation });
  latest.current = { status, routeData, onSelectStation };

  const syncLayers = () => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const { status: current, routeData: route } = latest.current;
    const coordinates = routeCoordinates(current, route);

    const routeSource = map.getSource("route-line") as maplibregl.GeoJSONSource | undefined;
    if (routeSource) {
      routeSource.setData(routeGeoJson(coordinates));
    } else {
      map.addSource("route-line", { type: "geojson", data: routeGeoJson(coordinates) });
      map.addLayer({
        id: "route-casing-layer",
        type: "line",
        source: "route-line",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#1c1d22", "line-width": 5, "line-opacity": 0.8 },
      });
      map.addLayer({
        id: "route-line-layer",
        type: "line",
        source: "route-line",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#e5a93b", "line-width": 2.5 },
      });
    }

    const haltsSource = map.getSource("halts-source") as maplibregl.GeoJSONSource | undefined;
    if (haltsSource) {
      haltsSource.setData(haltsGeoJson(current));
    } else {
      map.addSource("halts-source", { type: "geojson", data: haltsGeoJson(current) });
      map.addLayer({
        id: "halts-nodes-layer",
        type: "circle",
        source: "halts-source",
        paint: {
          "circle-radius": ["case", ["==", ["get", "isCurrent"], 1], 6.5, 4.5],
          "circle-color": [
            "case",
            ["==", ["get", "isCurrent"], 1],
            "#e5a93b",
            ["==", ["get", "hasDeparted"], 1],
            "#52535e",
            "#d8d9e2",
          ],
          "circle-stroke-color": ["case", ["==", ["get", "isCurrent"], 1], "#e5a93b", "#1c1d22"],
          "circle-stroke-width": 1.5,
        },
      });
      map.addLayer({
        id: "halts-labels-layer",
        type: "symbol",
        source: "halts-source",
        minzoom: 6.8,
        layout: { "text-field": ["get", "code"], "text-size": 10.5, "text-offset": [0, 1.25], "text-anchor": "top" },
        paint: { "text-color": ["case", ["==", ["get", "isCurrent"], 1], "#e5a93b", "#7a7b85"] },
      });
    }

    if (!hasFitted.current && coordinates.length > 1) {
      hasFitted.current = true;
      fitRoute(coordinates);
    }
  };

  const fitRoute = (coordinates: [number, number][]) => {
    const map = mapRef.current;
    if (!map || coordinates.length < 2) return;
    const bounds = new maplibregl.LngLatBounds();
    coordinates.forEach((coordinate) => bounds.extend(coordinate));
    map.fitBounds(bounds, { padding: 48, animate: false });
  };

  // One map per mounted component. The page gives each train its own key.
  useEffect(() => {
    if (!container.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: CARTO_STYLES.voyager,
      center: [status.longitude ?? 78.9, status.latitude ?? 22.5],
      zoom: status.latitude != null ? 8 : 4,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("style.load", () => {
      setIsStyleReady(true);
      syncLayers();
    });
    map.on("click", "halts-nodes-layer", (event) => {
      const feature = event.features?.[0];
      if (!feature) return;
      const props = feature.properties as { name: string; code: string; arr: string; dep: string; platform: string };
      new maplibregl.Popup({ offset: 12 })
        .setLngLat((feature.geometry as GeoJSON.Point).coordinates as [number, number])
        .setHTML(stationPopupHtml(props))
        .addTo(map);
      latest.current.onSelectStation?.(props.code);
    });
    map.on("mouseenter", "halts-nodes-layer", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "halts-nodes-layer", () => {
      map.getCanvas().style.cursor = "";
    });

    // The map can start inside a hidden tab, and would otherwise stay blank when shown.
    const resizer = new ResizeObserver(() => map.resize());
    resizer.observe(container.current);

    return () => {
      resizer.disconnect();
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      markerParts.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Route and stop progress update in place, without rebuilding the map.
  useEffect(() => {
    if (isStyleReady) syncLayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.halts, routeData, isStyleReady]);

  // Create, move or remove the train marker as its position changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const { latitude, longitude } = status;

    if (latitude == null || longitude == null) {
      markerRef.current?.remove();
      markerRef.current = null;
      markerParts.current = null;
      return;
    }

    if (!markerRef.current) {
      markerParts.current = buildMarkerElement();
      markerRef.current = new maplibregl.Marker({ element: markerParts.current.root })
        .setLngLat([longitude, latitude])
        .setPopup(new maplibregl.Popup({ offset: 18 }))
        .addTo(map);
    } else {
      animateMarker(markerRef.current, [longitude, latitude]);
    }
    styleMarker(markerParts.current!, status);
    markerRef.current.getPopup()?.setHTML(trainPopupHtml(status));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.latitude, status.longitude, status.position_basis, status.position_label, status.speed_kmph, status.delay_minutes]);

  const animateMarker = (marker: maplibregl.Marker, target: [number, number]) => {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    const from = marker.getLngLat();
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      (from.lng === target[0] && from.lat === target[1])
    ) {
      marker.setLngLat(target);
      return;
    }
    const startedAt = performance.now();
    const step = (time: number) => {
      const t = Math.min(1, (time - startedAt) / MOVE_ANIMATION_MS);
      marker.setLngLat([from.lng + (target[0] - from.lng) * t, from.lat + (target[1] - from.lat) * t]);
      animationRef.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    animationRef.current = requestAnimationFrame(step);
  };

  // Focus a station chosen from the timeline.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedStationCode) return;
    const halt = status.halts?.find((h) => h.station_code === selectedStationCode);
    if (!halt || !hasCoords(halt)) return;
    map.flyTo({ center: [halt.longitude!, halt.latitude!], zoom: 10.5, essential: true });
    popupRef.current?.remove();
    popupRef.current = new maplibregl.Popup({ offset: 12 })
      .setLngLat([halt.longitude!, halt.latitude!])
      .setHTML(
        stationPopupHtml({
          name: halt.station_name,
          code: halt.station_code,
          arr: halt.arrival_time || "--",
          dep: halt.departure_time || "--",
          platform: halt.platform || undefined,
        })
      )
      .addTo(map);
    // Only when the selection changes, not on every live update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStationCode]);

  const hasPosition = status.latitude != null && status.longitude != null;

  const handleRecenter = () => {
    if (hasPosition) {
      mapRef.current?.flyTo({ center: [status.longitude!, status.latitude!], zoom: 9.5, essential: true });
    }
  };

  const toggleMapStyle = () => {
    const map = mapRef.current;
    if (!map || !isStyleReady) return;
    const modes: MapTheme[] = ["voyager", "dark", "raster"];
    const next = modes[(modes.indexOf(mapTheme) + 1) % modes.length];
    setMapTheme(next);
    setIsStyleReady(false);
    // The "style.load" handler above restores the route and stops. The marker is not a layer.
    map.setStyle(CARTO_STYLES[next] as maplibregl.StyleSpecification | string);
  };

  const noMarkerMessage =
    status.service_state === "NOT_RUNNING_TODAY"
      ? `Not running today${status.next_run_date ? `. Next run ${formatDay(status.next_run_date)}` : ""}`
      : status.service_state === "CANCELLED"
        ? "Reported as cancelled"
        : status.position_label || "Train position not available";

  return (
    <div className={`relative w-full h-[360px] sm:h-[440px] md:h-[520px] rounded-card overflow-hidden border border-rule bg-paper-3 ${className}`}>
      <div ref={container} className="w-full h-full" />

      <div className="absolute top-2.5 right-12 sm:right-14 flex items-center gap-1.5 z-10">
        <button
          type="button"
          onClick={handleRecenter}
          disabled={!hasPosition}
          className="p-1.5 sm:px-2.5 sm:py-1 rounded-pill bg-paper-2 hover:bg-paper-3 active:opacity-80 text-ink border border-rule text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
          title="Center on train"
        >
          <Crosshair className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="hidden sm:inline">Center train</span>
        </button>
        <button
          type="button"
          onClick={() => fitRoute(routeCoordinates(status, routeData))}
          className="p-1.5 sm:px-2.5 sm:py-1 rounded-pill bg-paper-2 hover:bg-paper-3 active:opacity-80 text-ink border border-rule text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
          title="Show the full route"
        >
          <Maximize2 className="w-3.5 h-3.5 text-muted shrink-0" />
          <span className="hidden sm:inline">Full route</span>
        </button>
        <button
          type="button"
          onClick={toggleMapStyle}
          className="p-1.5 sm:px-2.5 sm:py-1 rounded-pill bg-paper-2 hover:bg-paper-3 active:opacity-80 text-ink border border-rule text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
          title="Change map style"
        >
          <Layers className="w-3.5 h-3.5 text-cool shrink-0" />
          <span className="hidden sm:inline">{THEME_NAMES[mapTheme]}</span>
        </button>
      </div>

      {!hasPosition && (
        <div className="absolute top-2.5 left-2.5 right-[8.5rem] sm:right-auto bg-paper-2 text-ink px-3 py-1.5 rounded border border-rule text-xs flex items-center gap-2 z-10">
          <Info className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="text-[11px]">{noMarkerMessage}</span>
        </div>
      )}

      <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:right-auto sm:max-w-[80%] bg-paper-2 border border-rule px-3 sm:px-3.5 py-1.5 rounded flex flex-wrap items-center gap-2 sm:gap-3 text-xs z-10">
        <div className="flex items-center gap-1.5 font-outlier font-bold text-ink tabular-nums">
          <Train className="w-3.5 h-3.5 text-accent" />
          <span>#{status.train_number}</span>
        </div>
        {status.speed_kmph != null && (
          <div className="flex items-center gap-1 text-ink font-outlier font-semibold tabular-nums">
            <Gauge className="w-3.5 h-3.5 text-cool" />
            <span>{Math.round(status.speed_kmph)} km/h</span>
          </div>
        )}
        {hasPosition && status.position_label && (
          <div className="flex items-center gap-1 text-muted text-[11px] min-w-0">
            <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
            <span className="truncate">{status.position_label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
