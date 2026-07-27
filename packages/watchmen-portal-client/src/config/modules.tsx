import {
  Code2,
  Database,
  BarChart3,
  Server,
  type LucideIcon,
} from 'lucide-react';

export type ModuleStatus = 'available' | 'coming-soon';

export interface PortalModule {
  id: string;
  /**
   * Display text is resolved from the i18n bundle under `modules.<id>`
   * (title / subtitle / description). These fields are kept optional for
   * backward compatibility and as a fallback when a translation is missing.
   */
  title?: string;
  subtitle?: string;
  description?: string;
  icon: LucideIcon;
  status: ModuleStatus;
  url?: string;
  /** When set, only users whose role is included can see this module */
  requiredRoles?: string[];
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
    id: 'admin',
    icon: Code2,
    status: 'available',
    url: '/admin/',
    requiredRoles: ['admin', 'superadmin'],
  },
  {
    id: 'ingest',
    icon: Database,
    status: 'available',
    url: '/ingest/',
  },
  {
    id: 'analysis',
    icon: BarChart3,
    status: 'available',
    url: '/analysis/',
  },
  {
    id: 'ops',
    icon: Server,
    status: 'available',
    url: '/monitor/',
    requiredRoles: ['admin', 'superadmin'],
  },
  // {
  //   id: 'ai-perception',
  //   title: 'AI Perception',
  //   subtitle: 'Intelligence Layer',
  //   description:
  //     'AI-powered data quality sensing, anomaly detection, and intelligent insights',
  //   icon: Sparkles,
  //   status: 'coming-soon',
  // },
];

/** Check if a user role has access to a module */
export const hasModuleAccess = (role: string, module: PortalModule): boolean => {
  if (!module.requiredRoles || module.requiredRoles.length === 0) {
    return true;
  }
  return module.requiredRoles.includes(role);
};

export const availableCount = portalModules.filter(
  (m) => m.status === 'available'
).length;

export const comingSoonCount = portalModules.filter(
  (m) => m.status === 'coming-soon'
).length;
