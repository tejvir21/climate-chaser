import { describe, it, expect, beforeEach } from "vitest";
import {
  useClimateStore,
  DEFAULT_LOCATION,
  DEFAULT_SETTINGS,
} from "./useClimateStore";
import type { WeatherLocation } from "@/types/weather";

const delhi: WeatherLocation = {
  id: "delhi-1",
  name: "Delhi",
  country: "India",
  countryCode: "IN",
  latitude: 28.65,
  longitude: 77.23,
};

const mumbai: WeatherLocation = {
  id: "mumbai-1",
  name: "Mumbai",
  country: "India",
  countryCode: "IN",
  latitude: 19.07,
  longitude: 72.88,
};

beforeEach(() => {
  localStorage.clear();
  useClimateStore.setState({
    settings: { ...DEFAULT_SETTINGS },
    location: { ...DEFAULT_LOCATION },
    favorites: [],
    recents: [],
  });
});

describe("useClimateStore", () => {
  it("defaults to Noida with India conventions", () => {
    const state = useClimateStore.getState();
    expect(state.location.name).toBe("Noida");
    expect(state.settings.unit).toBe("c");
    expect(state.settings.windUnit).toBe("kmh");
    expect(state.settings.timeFormat).toBe("24h");
  });

  it("toggleFavorite adds and removes a location", () => {
    useClimateStore.getState().toggleFavorite(delhi);
    expect(useClimateStore.getState().favorites).toHaveLength(1);
    expect(useClimateStore.getState().isFavorite(delhi.id)).toBe(true);

    useClimateStore.getState().toggleFavorite(delhi);
    expect(useClimateStore.getState().favorites).toHaveLength(0);
  });

  it("setLocation records recents, newest first, de-duplicated", () => {
    const { setLocation } = useClimateStore.getState();
    setLocation(delhi);
    setLocation(mumbai);
    setLocation(delhi); // re-visit — should bubble to front without duplicating
    const recents = useClimateStore.getState().recents;
    expect(recents.map((r) => r.id)).toEqual([delhi.id, mumbai.id]);
    expect(recents).toHaveLength(2);
  });

  it("setLocation can skip recording a recent (e.g. map pan)", () => {
    useClimateStore.getState().setLocation(delhi, { addToRecents: false });
    expect(useClimateStore.getState().recents).toHaveLength(0);
  });

  it("clearRecents empties the list", () => {
    useClimateStore.getState().setLocation(delhi);
    useClimateStore.getState().clearRecents();
    expect(useClimateStore.getState().recents).toEqual([]);
  });

  it("setSetting updates a single setting", () => {
    useClimateStore.getState().setSetting("unit", "f");
    expect(useClimateStore.getState().settings.unit).toBe("f");
    expect(useClimateStore.getState().settings.timeFormat).toBe("24h");
  });
});
