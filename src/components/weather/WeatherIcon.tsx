import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudMoon,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudHail,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import { wmoInfo } from "@/services/weather/wmo";

const ICONS: Record<string, LucideIcon> = {
  sun: Sun,
  moon: Moon,
  cloud: Cloud,
  "cloud-sun": CloudSun,
  "cloud-moon": CloudMoon,
  "cloud-fog": CloudFog,
  "cloud-drizzle": CloudDrizzle,
  "cloud-rain": CloudRain,
  "cloud-snow": CloudSnow,
  "cloud-lightning": CloudLightning,
  "cloud-hail": CloudHail,
};

export function WeatherIcon({
  code,
  isDay = true,
  size = 24,
  className = "",
}: {
  code?: number | null;
  isDay?: boolean;
  size?: number;
  className?: string;
}) {
  const info = wmoInfo(code, isDay);
  const Icon = ICONS[info.icon] ?? HelpCircle;
  return (
    <Icon
      size={size}
      className={className}
      aria-hidden="true"
      strokeWidth={1.6}
    />
  );
}
