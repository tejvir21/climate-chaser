import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// MapLibre ships its web worker as a separate asset; bundling it as a URL
// avoids the CDN worker fetch (which fails under strict MIME checks and
// leaves the map dead). Worker files exist only in the .mjs dist.
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
maplibregl.setWorkerUrl(maplibreWorkerUrl);
import {
  Crosshair,
  Layers,
  Loader2,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useClimateStore } from "@/store/useClimateStore";
import { openWeatherEnabled } from "@/services/weather/openWeatherMap";
import { Card } from "@/components/ui/primitives";

const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

type OverlayLayer = "none" | "radar" | "temp" | "clouds" | "precip";

interface RainViewerFrame {
  time: number;
  path: string;
}
interface RainViewerResponse {
  host: string;
  radar: { past: RainViewerFrame[]; nowcast: RainViewerFrame[] };
}

async function fetchRainViewer(): Promise<RainViewerResponse> {
  const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
  if (!res.ok) throw new Error(`RainViewer responded with ${res.status}`);
  return res.json();
}

const RADAR_SOURCE = "rv-radar";
const RADAR_LAYER = "rv-radar-layer";
const OWM_SOURCE = "owm-overlay";
const OWM_LAYER = "owm-overlay-layer";

const OWM_TILE: Record<Exclude<OverlayLayer, "none" | "radar">, { url: string; opacity: number; label: string }> = {
  temp: { url: "https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png", opacity: 0.55, label: "Temperature" },
  clouds: { url: "https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png", opacity: 0.6, label: "Cloud cover" },
  precip: { url: "https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png", opacity: 0.6, label: "Precipitation" },
};

export default function Maps() {
  const location = useClimateStore((s) => s.location);
  const setLocation = useClimateStore((s) => s.setLocation);
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [layer, setLayer] = useState<OverlayLayer>("radar");
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const owmAvailable = openWeatherEnabled();

  const rainViewer = useQuery({
    queryKey: ["rainviewer"],
    queryFn: fetchRainViewer,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const frames: RainViewerFrame[] = useMemo(() => {
    const past = rainViewer.data?.radar?.past ?? [];
    return past.slice(-12); // last hour, 5-minute frames
  }, [rainViewer.data]);

  const safeFrameIndex = frames.length ? Math.min(frameIndex, frames.length - 1) : 0;

  // After RainViewer resolves, start at the most recent frame.
  useEffect(() => {
    if (frames.length > 0) setFrameIndex(frames.length - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rainViewer.data]);

  /* Initialise map once */
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    let map: maplibregl.Map | null = null;
    try {
      map = new maplibregl.Map({
        container: mapContainer.current,
        style: BASEMAP_STYLE,
        center: [location.longitude, location.latitude],
        zoom: 6.5,
        attributionControl: { compact: true },
      });
    } catch (error) {
      setMapError(error instanceof Error ? error.message : "Map failed to initialise");
      return;
    }

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => setReady(true));
    map.on("error", (event) => {
      const ev = event as unknown as { error?: { message?: string } };
      if (ev?.error?.message) setMapError(ev.error.message);
    });

    map.on("click", async (event: maplibregl.MapMouseEvent) => {
      const { lng, lat } = event.lngLat;
      let name = `Pin ${lat.toFixed(2)}, ${lng.toFixed(2)}`;
      let country = "";
      let countryCode: string | undefined;
      let admin1: string | undefined;
      const id = `map-${lat.toFixed(3)}-${lng.toFixed(3)}`;
      try {
        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
        );
        if (res.ok) {
          const json = await res.json();
          name = json?.city || json?.locality || json?.principalSubdivision || name;
          country = json?.countryName ?? "";
          countryCode = json?.countryCode;
          admin1 = json?.principalSubdivision;
        }
      } catch {
        /* reverse lookup is best-effort */
      }
      setLocation({ id, name, country, countryCode, admin1, latitude: lat, longitude: lng });
      toast.success(`Location set to ${name}`);
    });

    mapRef.current = map;
    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map?.remove();
      mapRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once; recentering handled below
  }, []);

  /* Recenter + marker on location change */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.flyTo({ center: [location.longitude, location.latitude], zoom: Math.max(map.getZoom(), 7), essential: true });

    if (markerRef.current) {
      markerRef.current.setLngLat([location.longitude, location.latitude]);
    } else {
      const el = document.createElement("div");
      el.setAttribute("aria-label", `Location: ${location.name}`);
      el.style.cssText =
        "width:18px;height:18px;border-radius:9999px;background:var(--accent);border:3px solid #0b1220;box-shadow:0 0 0 3px rgba(255,255,255,.35), 0 2px 10px rgba(0,0,0,.5);";
      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([location.longitude, location.latitude])
        .addTo(map);
    }
  }, [location.longitude, location.latitude, location.name, ready]);

  /* Overlay management */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const applyOverlays = () => {
      // Remove existing overlays first.
      for (const [source, layerId] of [
        [RADAR_SOURCE, RADAR_LAYER],
        [OWM_SOURCE, OWM_LAYER],
      ] as const) {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(source)) map.removeSource(source);
      }

      if (layer === "radar") {
        const frame = frames[safeFrameIndex];
        const host = rainViewer.data?.host ?? "https://tilecache.rainviewer.com";
        if (!frame) return;
        map.addSource(RADAR_SOURCE, {
          type: "raster",
          tiles: [`${host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`],
          tileSize: 256,
        });
        map.addLayer({
          id: RADAR_LAYER,
          type: "raster",
          source: RADAR_SOURCE,
          paint: { "raster-opacity": 0.75 },
        });
        // Force MapLibre to request tiles immediately.
        map.triggerRepaint();
        return;
      }

      if (layer !== "none" && owmAvailable) {
        const spec = OWM_TILE[layer];
        map.addSource(OWM_SOURCE, {
          type: "raster",
          tiles: [spec.url],
          tileSize: 256,
        });
        map.addLayer({
          id: OWM_LAYER,
          type: "raster",
          source: OWM_SOURCE,
          paint: { "raster-opacity": spec.opacity },
        });
        map.triggerRepaint();
      }
    };

    if (map.isStyleLoaded()) {
      applyOverlays();
    } else {
      // Style (basemap JSON + sprite/glyphs) may still be loading — wait for
      // the first 'load'/'styledata' so addSource doesn't throw.
      map.once("load", applyOverlays);
      map.once("styledata", applyOverlays);
    }
  }, [layer, ready, safeFrameIndex, frames, rainViewer.data?.host, owmAvailable]);

  /* Radar playback */
  useEffect(() => {
    if (!playing || frames.length === 0) return;
    const id = window.setInterval(
      () => setFrameIndex((i) => (i + 1) % frames.length),
      650
    );
    return () => window.clearInterval(id);
  }, [playing, frames.length]);

  useEffect(() => {
    if (layer !== "radar") setPlaying(false);
  }, [layer]);

  const frameTime =
    frames[safeFrameIndex] &&
    new Date(frames[safeFrameIndex].time * 1000).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const layerOptions: Array<{ value: OverlayLayer; label: string; disabled?: boolean }> = [
    { value: "none", label: "Base only" },
    { value: "radar", label: "Rain radar" },
    { value: "temp", label: "Temperature", disabled: !owmAvailable },
    { value: "clouds", label: "Cloud cover", disabled: !owmAvailable },
    { value: "precip", label: "Precipitation", disabled: !owmAvailable },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">
            Weather map
          </h1>
          <p className="mt-0.5 text-sm text-[var(--text-dim)]">
            {location.name}, {location.country} Â· click anywhere on the map to inspect that place
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Layers size={16} aria-hidden="true" className="text-[var(--text-dim)]" />
          <div role="radiogroup" aria-label="Map overlay layer" className="flex flex-wrap gap-1.5">
            {layerOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={layer === option.value}
                disabled={option.disabled}
                title={option.disabled ? "Requires OpenWeatherMap API key (VITE_OPENWEATHER_API_KEY)" : option.label}
                onClick={() => setLayer(option.value)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                  layer === option.value
                    ? "bg-[var(--accent)] text-slate-900"
                    : option.disabled
                      ? "cursor-not-allowed border border-[var(--surface-border)] text-[var(--text-dim)] opacity-50"
                      : "border border-[var(--surface-border)] text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Card className="relative overflow-hidden !p-0" aria-label="Interactive weather map">
        <div ref={mapContainer} className="h-[68vh] min-h-[420px] w-full" />
        {!ready && !mapError && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
            <Loader2 size={32} className="animate-spin text-white" aria-hidden="true" />
          </div>
        )}
        {mapError && (
          <div role="alert" className="absolute left-3 top-3 max-w-sm rounded-xl border border-red-400/40 bg-red-950/90 p-3 text-xs text-red-100">
            Map layer error: {mapError}. Basemap may still work â€” check your connection.
          </div>
        )}

        {/* Radar timeline control */}
        {layer === "radar" && frames.length > 0 && (
          <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-xl border border-white/15 bg-slate-950/85 px-3 py-2 backdrop-blur">
            <button
              type="button"
              onClick={() => setPlaying((v) => !v)}
              aria-label={playing ? "Pause radar animation" : "Play radar animation"}
              className="rounded-lg bg-[var(--accent)] p-1.5 text-slate-900 transition hover:brightness-110"
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <input
              type="range"
              min={0}
              max={frames.length - 1}
              value={safeFrameIndex}
              onChange={(event) => {
                setFrameIndex(Number(event.target.value));
                setPlaying(false);
              }}
              aria-label="Radar frame time"
              aria-valuetext={frameTime}
              className="w-32 accent-sky-400 sm:w-44"
            />
            <span className="min-w-12 text-xs font-bold tabular-nums text-white">
              {frameTime ?? ""}
            </span>
            <span className="hidden text-[9px] font-semibold uppercase text-white/50 md:inline">
              Past hour
            </span>
          </div>
        )}

        {/* Radar legend */}
        {layer === "radar" && (
          <div className="absolute bottom-3 right-3 hidden rounded-xl border border-white/15 bg-slate-950/85 p-2.5 backdrop-blur sm:block" aria-hidden="true">
            <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-white/70">
              Rain intensity
            </p>
            <div className="h-2 w-36 rounded-full bg-[linear-gradient(90deg,#70c0ff,#4d8aff,#1f5eff,#00e0c6,#ffff54,#ffb044,#ff5b5b,#f071f1)]" />
            <div className="mt-0.5 flex justify-between text-[9px] font-semibold text-white/60">
              <span>Light</span>
              <span>Moderate</span>
              <span>Heavy</span>
            </div>
          </div>
        )}

        {/* Reset view */}
        <button
          type="button"
          onClick={() =>
            mapRef.current?.flyTo({
              center: [location.longitude, location.latitude],
              zoom: 10,
              essential: true,
            })
          }
          aria-label="Reset map view to selected city"
          title="Reset view"
          className="absolute right-3 top-3 rounded-lg border border-white/15 bg-slate-950/85 p-2 text-white/85 backdrop-blur transition hover:bg-slate-800"
        >
          <RotateCcw size={16} aria-hidden="true" />
        </button>
        <span className="pointer-events-none absolute left-3 top-3 hidden items-center gap-1 rounded-lg bg-slate-950/70 px-2 py-1 text-[10px] font-bold text-white/80 md:flex">
          <Crosshair size={11} aria-hidden="true" /> Click map to select
        </span>
      </Card>

      <p className="text-[11px] text-[var(--text-dim)]">
        Radar: {rainViewer.isSuccess ? "RainViewer, last 12 five-minute frames" : rainViewer.isError ? "RainViewer unavailable" : "loadingâ€¦"} Â·
        Basemap: OpenFreeMap Liberty (tiles Â© OpenFreeMap, OpenMapTiles â€” Â©{" "}
        <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          OpenStreetMap contributors
        </a>
        ).
        {!owmAvailable && " OpenWeatherMap overlays are hidden â€” set VITE_OPENWEATHER_API_KEY to enable temperature/cloud/precipitation tile layers."}
      </p>
    </div>
  );
}

