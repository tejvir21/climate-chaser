import {
  LayoutDashboard,
  CalendarRange,
  Map,
  Wind,
  TrendingUp,
  GitCompareArrows,
  Plane,
  Lightbulb,
  TriangleAlert,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/forecast", label: "Forecast", icon: CalendarRange },
  { to: "/maps", label: "Maps", icon: Map },
  { to: "/air-quality", label: "Air Quality", icon: Wind },
  { to: "/climate", label: "Climate", icon: TrendingUp },
  { to: "/compare", label: "Compare", icon: GitCompareArrows },
  { to: "/travel", label: "Travel", icon: Plane },
  { to: "/insights", label: "Insights", icon: Lightbulb },
  { to: "/alerts", label: "Alerts", icon: TriangleAlert },
  { to: "/settings", label: "Settings", icon: Settings },
];
