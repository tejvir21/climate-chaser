/** App-wide persisted store: settings, current location, favorites, recents. */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { WeatherLocation } from "@/types/weather";
import type { TemperatureUnit, TimeFormat, WindSpeedUnit } from "@/utils/units";

export type ThemeMode = "auto" | "light" | "dark";
export type ProviderPreference = "auto" | "open-meteo" | "openweathermap";

export interface Settings {
  unit: TemperatureUnit;
  windUnit: WindSpeedUnit;
  timeFormat: TimeFormat;
  themeMode: ThemeMode;
  provider: ProviderPreference;
  defaultCity: string;
}

export const DEFAULT_SETTINGS: Settings = {
  unit: "c",
  windUnit: "kmh",
  timeFormat: "24h",
  themeMode: "auto",
  provider: "auto",
  defaultCity: "Noida",
};

export const DEFAULT_LOCATION: WeatherLocation = {
  id: "7279746",
  name: "Noida",
  country: "India",
  countryCode: "IN",
  admin1: "Uttar Pradesh",
  latitude: 28.58,
  longitude: 77.33,
  elevation: 206,
  timezone: "Asia/Kolkata",
  population: 293908,
};

interface ClimateState {
  settings: Settings;
  location: WeatherLocation;
  favorites: WeatherLocation[];
  recents: WeatherLocation[];
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  setLocation: (location: WeatherLocation, opts?: { addToRecents?: boolean }) => void;
  toggleFavorite: (location: WeatherLocation) => void;
  removeFavorite: (id: string) => void;
  clearRecents: () => void;
  isFavorite: (id: string) => boolean;
}

const MAX_FAVORITES = 12;
const MAX_RECENTS = 8;

function sameLocation(a: WeatherLocation | null | undefined, b: WeatherLocation | null | undefined) {
  return a?.id === b?.id;
}

export const useClimateStore = create<ClimateState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      location: DEFAULT_LOCATION,
      favorites: [],
      recents: [],

      setSetting: (key, value) =>
        set((state) => ({ settings: { ...state.settings, [key]: value } })),

      setLocation: (location, opts) => {
        const addToRecents = opts?.addToRecents !== false;
        set((state) => {
          const recents = addToRecents
            ? [location, ...state.recents.filter((r) => !sameLocation(r, location))].slice(
                0,
                MAX_RECENTS
              )
            : state.recents;
          return { location, recents };
        });
      },

      toggleFavorite: (location) =>
        set((state) => {
          const exists = state.favorites.some((f) => f.id === location.id);
          const favorites = exists
            ? state.favorites.filter((f) => f.id !== location.id)
            : [location, ...state.favorites].slice(0, MAX_FAVORITES);
          return { favorites };
        }),

      removeFavorite: (id) =>
        set((state) => ({ favorites: state.favorites.filter((f) => f.id !== id) })),

      clearRecents: () => set({ recents: [] }),

      isFavorite: (id) => get().favorites.some((f) => f.id === id),
    }),
    {
      name: "climate-chaser:store:v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
        location: state.location,
        favorites: state.favorites,
        recents: state.recents,
      }),
    }
  )
);
