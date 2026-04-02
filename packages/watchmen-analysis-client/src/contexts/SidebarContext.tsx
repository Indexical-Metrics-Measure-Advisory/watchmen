import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  expandedGroups: Record<string, boolean>;
  setGroupExpanded: (group: string, expanded: boolean) => void;
  toggleGroup: (group: string) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);
const SIDEBAR_COLLAPSED_KEY = "sidebarCollapsed";
const SIDEBAR_GROUPS_KEY = "sidebarExpandedGroups";
const DEFAULT_EXPANDED_GROUPS: Record<string, boolean> = {
  dataInsights: true,
  metrics: true,
  dataCatalog: true,
  evaluation: true,
};

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const storedState = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return storedState ? JSON.parse(storedState) : false;
  });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return DEFAULT_EXPANDED_GROUPS;
    const storedGroups = window.localStorage.getItem(SIDEBAR_GROUPS_KEY);
    if (!storedGroups) return DEFAULT_EXPANDED_GROUPS;

    try {
      return {
        ...DEFAULT_EXPANDED_GROUPS,
        ...JSON.parse(storedGroups),
      };
    } catch {
      return DEFAULT_EXPANDED_GROUPS;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(collapsed));
  }, [collapsed]);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_GROUPS_KEY, JSON.stringify(expandedGroups));
  }, [expandedGroups]);

  const toggleSidebar = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const setGroupExpanded = useCallback((group: string, expanded: boolean) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: expanded,
    }));
  }, []);

  const toggleGroup = useCallback((group: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  }, []);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, toggleSidebar, expandedGroups, setGroupExpanded, toggleGroup }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = (): SidebarContextType => {
  const context = useContext(SidebarContext);
  
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  
  return context;
};
