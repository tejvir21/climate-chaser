import { ExternalLink } from "lucide-react";

/** Data source attribution — required by provider licenses. */
export function AttributionFooter() {
  return (
    <footer className="border-t border-white/10 bg-black/30 px-4 py-3 text-[11px] leading-relaxed text-white/60 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-1.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>
            Weather & air quality:{" "}
            <a className="font-semibold text-sky-300 hover:text-sky-200" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
              Open-Meteo.com
            </a>{" "}
            (CC BY 4.0)
          </span>
          <span>
            Secondary:{" "}
            <a className="font-semibold text-sky-300 hover:text-sky-200" href="https://openweathermap.org/" target="_blank" rel="noopener noreferrer">
              OpenWeatherMap
            </a>
          </span>
          <span>
            Maps:{" "}
            <a className="font-semibold text-sky-300 hover:text-sky-200" href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">
              OpenMapTiles
            </a>
            {" / © "}
            <a className="font-semibold text-sky-300 hover:text-sky-200" href="https://www.openfreemap.org/" target="_blank" rel="noopener noreferrer">
              OpenFreeMap
            </a>
            {" · © "}
            <a className="font-semibold text-sky-300 hover:text-sky-200" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
              OpenStreetMap contributors
            </a>
          </span>
          <span>
            Radar:{" "}
            <a className="font-semibold text-sky-300 hover:text-sky-200" href="https://www.rainviewer.com/" target="_blank" rel="noopener noreferrer">
              RainViewer <ExternalLink size={10} className="inline" aria-hidden="true" />
            </a>
          </span>
        </div>
        <span className="text-white/45">
          Climate Chaser · MIT · Tejvir Chauhan
        </span>
      </div>
    </footer>
  );
}
