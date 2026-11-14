import {
  KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { MapPin, Navigation, Search, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useClimateStore } from "@/store/useClimateStore";
import { useGeocodeSearch } from "@/hooks/useQueries";
import type { WeatherLocation } from "@/types/weather";

const QUICK_SUGGESTIONS: WeatherLocation[] = [
  noCity("7279746", "Noida", "India", "IN", "Uttar Pradesh", 28.58, 77.33, "Asia/Kolkata", 293908),
  noCity("1273294", "Delhi", "India", "IN", "Delhi", 28.65195, 77.23149, "Asia/Kolkata", 11034555),
  noCity("1275339", "Mumbai", "India", "IN", "Maharashtra", 19.07283, 72.88261, "Asia/Kolkata", 12691836),
  noCity("1277333", "Bengaluru", "India", "IN", "Karnataka", 12.97194, 77.59369, "Asia/Kolkata", 8495492),
];

function noCity(
  id: string,
  name: string,
  country: string,
  countryCode: string,
  admin1: string,
  latitude: number,
  longitude: number,
  timezone: string,
  population: number
): WeatherLocation {
  return { id, name, country, countryCode, admin1, latitude, longitude, timezone, population };
}

export function WeatherSearch({ autoFocus = false }: { autoFocus?: boolean }) {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [locating, setLocating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const setLocation = useClimateStore((s) => s.setLocation);
  const navigate = useNavigate();

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(term), 300);
    return () => window.clearTimeout(t);
  }, [term]);

  const { data: suggestions, isFetching } = useGeocodeSearch(debounced);
  const showQuick = debounced.trim().length < 2;
  const items: WeatherLocation[] = showQuick
    ? QUICK_SUGGESTIONS
    : (suggestions ?? []);

  useEffect(() => {
    setActiveIndex(-1);
  }, [debounced, open]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function select(location: WeatherLocation) {
    setLocation(location);
    setTerm("");
    setDebounced("");
    setOpen(false);
    toast.success(`Showing weather for ${location.name}`);
    navigate("/");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (event.key === "ArrowDown" || event.key === "Enter") setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = activeIndex >= 0 ? items[activeIndex] : items[0];
      if (target) select(target);
    } else if (event.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          let name = "My location";
          let country = "";
          let countryCode: string | undefined;
          let admin1: string | undefined;
          let id = `geo-${latitude.toFixed(3)},${longitude.toFixed(3)}`;
          try {
            const res = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            if (res.ok) {
              const json = await res.json();
              name =
                json?.city ||
                json?.locality ||
                json?.principalSubdivision ||
                name;
              country = json?.countryName ?? "";
              countryCode = json?.countryCode;
              admin1 = json?.principalSubdivision;
              if (json?.localityInfo?.administrative?.[2]?.id) {
                id = String(json.localityInfo.administrative[2].id);
              }
            }
          } catch {
            /* reverse geocoding is best-effort; keep coordinate label */
          }
          select({
            id,
            name,
            country,
            countryCode,
            admin1,
            latitude,
            longitude,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          });
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          toast.error(
            "Location permission denied — search for a city instead."
          );
        } else {
          toast.error("Couldn't get your location. Search for a city instead.");
        }
      },
      { timeout: 8000, maximumAge: 300_000 }
    );
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-owns={listId}
        className="flex items-center gap-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 shadow-sm transition focus-within:border-[var(--ring)]"
      >
        <Search size={16} aria-hidden="true" className="shrink-0 text-[var(--text-dim)]" />
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          aria-label="Search city"
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 && items[activeIndex]
              ? `${listId}-option-${items[activeIndex].id}`
              : undefined
          }
          className="w-full bg-transparent py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-dim)]"
          placeholder="Search any city — try Noida, Delhi, Mumbai…"
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
        {isFetching && (
          <Loader2 size={14} className="animate-spin text-[var(--text-dim)]" aria-hidden="true" />
        )}
        {term && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setTerm("")}
            className="rounded-md p-1 text-[var(--text-dim)] hover:bg-black/10 dark:hover:bg-white/10"
          >
            <X size={14} />
          </button>
        )}
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          aria-label="Use my location"
          title="Use my location"
          className="rounded-lg p-1.5 text-[var(--text)] transition hover:bg-black/10 disabled:opacity-50 dark:hover:bg-white/10"
        >
          {locating ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <Navigation size={16} aria-hidden="true" />
          )}
        </button>
      </div>

      {open && items.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Location suggestions"
          className="absolute z-30 mt-2 max-h-80 w-full overflow-auto rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-1.5 shadow-card backdrop-blur"
        >
          {showQuick && (
            <li className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
              Popular in India
            </li>
          )}
          {items.map((item, index) => (
            <li
              key={`${item.id}-${index}`}
              id={`${listId}-option-${item.id}`}
              role="option"
              aria-selected={index === activeIndex}
            >
              <button
                type="button"
                tabIndex={-1}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => select(item)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                  index === activeIndex
                    ? "bg-black/10 dark:bg-white/10"
                    : "hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <MapPin size={16} aria-hidden="true" className="shrink-0 text-[var(--text-dim)]" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[var(--text)]">
                    {item.name}
                    {item.countryCode === "IN" && (
                      <span className="ml-2 rounded bg-orange-500/20 px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase text-orange-700 dark:text-orange-300">
                        India
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-xs text-[var(--text-dim)]">
                    {[item.admin1, item.country].filter(Boolean).join(", ")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
