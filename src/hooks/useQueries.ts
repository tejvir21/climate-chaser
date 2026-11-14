/** TanStack Query hooks — the only place components talk to the network. */

import {
  keepPreviousData,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getWeatherBundle } from "@/services/weather/weatherService";
import { useClimateStore } from "@/store/useClimateStore";
import {
  fetchOpenMeteoAirQuality,
  fetchOpenMeteoArchive,
  searchOpenMeteoLocations,
} from "@/services/weather/openMeteo";
import type { WeatherLocation } from "@/types/weather";

const TEN_MIN = 10 * 60 * 1000;
const FORTY_FIVE_MIN = 45 * 60 * 1000;
const DAY = 24 * 3600 * 1000;

export function useWeatherBundle(location: WeatherLocation) {
  const queryClient = useQueryClient();
  const provider = useClimateStore((s) => s.settings.provider);
  const query = useQuery({
    queryKey: [
      "weather",
      location.id,
      location.latitude,
      location.longitude,
      provider,
    ],
    queryFn: ({ signal }) => {
      void signal; // individual fetch exposes its own timeout/abort in the service
      return getWeatherBundle(location, { prefer: provider });
    },
    staleTime: TEN_MIN,
    gcTime: FORTY_FIVE_MIN,
    placeholderData: keepPreviousData,
    retry: false, // the service layer already retries with backoff
    refetchOnWindowFocus: false,
  });
  return {
    ...query,
    refresh: () =>
      queryClient.fetchQuery({
        queryKey: [
          "weather",
          location.id,
          location.latitude,
          location.longitude,
          provider,
        ],
        queryFn: () =>
          getWeatherBundle(location, { forceRefresh: true, prefer: provider }),
        staleTime: 0,
      }),
  };
}

export function useAirQuality(location: WeatherLocation) {
  return useQuery({
    queryKey: ["air-quality", location.id, location.latitude, location.longitude],
    queryFn: () => fetchOpenMeteoAirQuality(location),
    staleTime: TEN_MIN,
    gcTime: FORTY_FIVE_MIN,
    placeholderData: keepPreviousData,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useArchive(location: WeatherLocation, years = 10, enabled = true) {
  return useQuery({
    queryKey: ["archive", location.id, location.latitude, location.longitude, years],
    queryFn: () => fetchOpenMeteoArchive(location, years),
    staleTime: DAY,
    gcTime: 2 * DAY,
    enabled,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useGeocodeSearch(term: string) {
  const query = term.trim();
  return useQuery({
    queryKey: ["geocode", query.toLowerCase()],
    queryFn: () => searchOpenMeteoLocations(query, 8),
    enabled: query.length >= 2,
    staleTime: DAY,
    gcTime: DAY,
    retry: 1,
    placeholderData: keepPreviousData,
  });
}

/** Compare N locations — one independent query each. */
export function useCompareBundles(locations: WeatherLocation[]) {
  const provider = useClimateStore((s) => s.settings.provider);
  return useQueries({
    queries: locations.map((location) => ({
      queryKey: [
        "weather",
        location.id,
        location.latitude,
        location.longitude,
        provider,
      ],
      queryFn: () => getWeatherBundle(location, { prefer: provider }),
      staleTime: TEN_MIN,
      gcTime: FORTY_FIVE_MIN,
      retry: false,
    })),
  });
}

export function useCompareAirQuality(locations: WeatherLocation[]) {
  return useQueries({
    queries: locations.map((location) => ({
      queryKey: ["air-quality", location.id, location.latitude, location.longitude],
      queryFn: () => fetchOpenMeteoAirQuality(location),
      staleTime: TEN_MIN,
      gcTime: FORTY_FIVE_MIN,
      retry: 1,
    })),
  });
}
