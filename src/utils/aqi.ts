/**
 * Air quality indices.
 *
 * - US AQI is passed through from Open-Meteo (model-based) and categorised
 *   with US EPA bands.
 * - Indian National AQI (CPCB) is COMPUTED here from modelled pollutant
 *   concentrations using the published CPCB breakpoints. Open-Meteo serves
 *   concentrations, not an official Indian AQI, so the value is a derived
 *   estimate â€” always labelled as such in the UI.
 *   Reference: CPCB, "National Air Quality Index" (2014), linear sub-index
 *   interpolation; AQI = max of available sub-indices.
 * - European AQI is shown as a raw model value only.
 */

export interface AqiReading {
  value: number;
  category: string;
  /** 1..6 severity band for colouring. */
  band: number;
  pollutant?: string;
}

interface Breakpoint {
  lo: number;
  hi: number;
  indexLo: number;
  indexHi: number;
}

/** CPCB breakpoints in Âµg/mÂ³ (CO in Âµg/mÂ³ too). */
const CPCB: Record<string, Breakpoint[]> = {
  pm25: [
    { lo: 0, hi: 30, indexLo: 0, indexHi: 50 },
    { lo: 30, hi: 60, indexLo: 51, indexHi: 100 },
    { lo: 60, hi: 90, indexLo: 101, indexHi: 200 },
    { lo: 90, hi: 120, indexLo: 201, indexHi: 300 },
    { lo: 120, hi: 250, indexLo: 301, indexHi: 400 },
    { lo: 250, hi: 500, indexLo: 401, indexHi: 500 },
  ],
  pm10: [
    { lo: 0, hi: 50, indexLo: 0, indexHi: 50 },
    { lo: 50, hi: 100, indexLo: 51, indexHi: 100 },
    { lo: 100, hi: 250, indexLo: 101, indexHi: 200 },
    { lo: 250, hi: 350, indexLo: 201, indexHi: 300 },
    { lo: 350, hi: 430, indexLo: 301, indexHi: 400 },
    { lo: 430, hi: 600, indexLo: 401, indexHi: 500 },
  ],
  no2: [
    { lo: 0, hi: 40, indexLo: 0, indexHi: 50 },
    { lo: 40, hi: 80, indexLo: 51, indexHi: 100 },
    { lo: 80, hi: 180, indexLo: 101, indexHi: 200 },
    { lo: 180, hi: 280, indexLo: 201, indexHi: 300 },
    { lo: 280, hi: 400, indexLo: 301, indexHi: 400 },
    { lo: 400, hi: 1300, indexLo: 401, indexHi: 500 },
  ],
  so2: [
    { lo: 0, hi: 40, indexLo: 0, indexHi: 50 },
    { lo: 40, hi: 80, indexLo: 51, indexHi: 100 },
    { lo: 80, hi: 380, indexLo: 101, indexHi: 200 },
    { lo: 380, hi: 800, indexLo: 201, indexHi: 300 },
    { lo: 800, hi: 1600, indexLo: 301, indexHi: 400 },
    { lo: 1600, hi: 2100, indexLo: 401, indexHi: 500 },
  ],
  co: [
    { lo: 0, hi: 1000, indexLo: 0, indexHi: 50 },
    { lo: 1000, hi: 2000, indexLo: 51, indexHi: 100 },
    { lo: 2000, hi: 10000, indexLo: 101, indexHi: 200 },
    { lo: 10000, hi: 17000, indexLo: 201, indexHi: 300 },
    { lo: 17000, hi: 34000, indexLo: 301, indexHi: 400 },
    { lo: 34000, hi: 50000, indexLo: 401, indexHi: 500 },
  ],
  o3: [
    { lo: 0, hi: 50, indexLo: 0, indexHi: 50 },
    { lo: 50, hi: 100, indexLo: 51, indexHi: 100 },
    { lo: 100, hi: 168, indexLo: 101, indexHi: 200 },
    { lo: 168, hi: 208, indexLo: 201, indexHi: 300 },
    { lo: 208, hi: 748, indexLo: 301, indexHi: 400 },
    { lo: 748, hi: 1000, indexLo: 401, indexHi: 500 },
  ],
};

const POLLUTANT_LABEL: Record<string, string> = {
  pm25: "PM2.5",
  pm10: "PM10",
  no2: "NOâ‚‚",
  so2: "SOâ‚‚",
  co: "CO",
  o3: "Ozone",
};

function subIndex(concentration: number, breakpoints: Breakpoint[]): number {
  for (const bp of breakpoints) {
    if (concentration <= bp.hi) {
      if (bp.hi === bp.lo) return bp.indexHi;
      const value =
        bp.indexLo +
        ((concentration - bp.lo) * (bp.indexHi - bp.indexLo)) / (bp.hi - bp.lo);
      return Math.round(value);
    }
  }
  return 500;
}

export interface IndiaAqiResult {
  aqi: number;
  category: string;
  band: number;
  dominantPollutant: string;
  subIndices: Partial<Record<string, number>>;
}

export function computeIndiaAqi(input: {
  pm25?: number;
  pm10?: number;
  nitrogenDioxide?: number;
  sulphurDioxide?: number;
  carbonMonoxide?: number;
  ozone?: number;
}): IndiaAqiResult | null {
  const pairs: Array<[string, number | undefined]> = [
    ["pm25", input.pm25],
    ["pm10", input.pm10],
    ["no2", input.nitrogenDioxide],
    ["so2", input.sulphurDioxide],
    ["co", input.carbonMonoxide],
    ["o3", input.ozone],
  ];
  const subIndices: Partial<Record<string, number>> = {};
  let max = -1;
  let dominant = "";
  for (const [key, value] of pairs) {
    if (value == null || !Number.isFinite(value) || value < 0) continue;
    const si = subIndex(value, CPCB[key]);
    subIndices[key] = si;
    if (si > max) {
      max = si;
      dominant = key;
    }
  }
  if (max < 0) return null;
  return {
    aqi: max,
    category: indiaCategory(max).label,
    band: indiaCategory(max).band,
    dominantPollutant: POLLUTANT_LABEL[dominant] ?? dominant,
    subIndices,
  };
}

export function indiaCategory(aqi: number): { label: string; band: number } {
  if (aqi <= 50) return { label: "Good", band: 1 };
  if (aqi <= 100) return { label: "Satisfactory", band: 2 };
  if (aqi <= 200) return { label: "Moderate", band: 3 };
  if (aqi <= 300) return { label: "Poor", band: 4 };
  if (aqi <= 400) return { label: "Very Poor", band: 5 };
  return { label: "Severe", band: 6 };
}

export function usAqiCategory(aqi: number): { label: string; band: number } {
  if (aqi <= 50) return { label: "Good", band: 1 };
  if (aqi <= 100) return { label: "Moderate", band: 2 };
  if (aqi <= 150) return { label: "Unhealthy for sensitive groups", band: 3 };
  if (aqi <= 200) return { label: "Unhealthy", band: 4 };
  if (aqi <= 300) return { label: "Very Unhealthy", band: 5 };
  return { label: "Hazardous", band: 6 };
}

export function aqiBandColor(band: number): string {
  switch (band) {
    case 1:
      return "#22c55e";
    case 2:
      return "#a3e635";
    case 3:
      return "#facc15";
    case 4:
      return "#fb923c";
    case 5:
      return "#ef4444";
    default:
      return "#a855f7";
  }
}

