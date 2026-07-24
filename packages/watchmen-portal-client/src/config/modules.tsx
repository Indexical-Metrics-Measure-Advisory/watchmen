import {
  Code2,
  Database,
  BarChart3,
  Server,
  type LucideIcon,
} from "lucide-react";

export type ModuleStatus = "available" | "coming-soon";

export interface PortalModule {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  status: ModuleStatus;
  url?: string;
  lastAccessed?: string;
}

/**
 * Portal module configuration.
 * Available modules navigate to their respective client URLs.
 * Coming-soon modules are displayed in a disabled state.
 *
 * Update `url` fields to match your deployment routes.
 * `lastAccessed` is populated at runtime from local tracking, not configured here.
 */
export const portalModules: PortalModule[] = [
  {
    id: "admin",
    title: "Data Development",
    subtitle: "Web Client",
    description:
      "For data developers — build and manage data pipelines, data models, and data assets",
    icon: Code2,
    status: "available",
    url: "/admin",
  },
  {
    id: "ingest",
    title: "Data Ingestion",
    subtitle: "Ingest Client",
    description:
      "Configure data sources, manage ingestion tasks and data access workflows",
    icon: Database,
    status: "available",
    url: "/ingest",
  },
  {
    id: "analysis",
    title: "Data Analysis",
    subtitle: "Analysis Client",
    description:
      "Explore data, build metric frameworks, and create visual analytics",
    icon: BarChart3,
    status: "available",
    url: "/analysis",
  },
  {
    id: "ops",
    title: "Data Operations",
    subtitle: "Monitor Client",
    description:
      "Monitor platform health, manage alerts, and automate operations",
    icon: Server,
    status: "available",
    url: "/monitor",
  },
  // {
  //   id: "ai-perception",
  //   title: "AI Perception",
  //   subtitle: "Intelligence Layer",
  //   description:
  //     "AI-powered data quality sensing, anomaly detection, and intelligent insights",
  //   icon: Sparkles,
  //   status: "coming-soon",
  // },
];

export const availableCount = portalModules.filter(
  (m) => m.status === "available"
).length;

export const comingSoonCount = portalModules.filter(
  (m) => m.status === "coming-soon"
).length;
