
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import {
  LayoutDashboard,
  Lightbulb,
  BarChart3,
  BrainCircuit,
  Settings,
  HelpCircle,
  FileQuestion,
  Target,
  Folder,
  ChevronLeft,
  ChevronDown,
  ChevronRight, MessageSquare,
  ClipboardCheck,
  Database,
  TestTube,
  GitBranch,
  TrendingUp,
  FolderOpen,
  Sliders
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Sidebar group visibility from environment variables (default to true)
const SHOW_SMART_CONSOLE = (import.meta.env.VITE_SHOW_SMART_CONSOLE ?? 'true') === 'true';
const SHOW_BUSINESS_CHALLENGE = (import.meta.env.VITE_SHOW_BUSINESS_CHALLENGE ?? 'true') === 'true';
const SHOW_METRICS = (import.meta.env.VITE_SHOW_METRICS ?? 'true') === 'true';
const SHOW_DATA_CATALOG = (import.meta.env.VITE_SHOW_DATA_CATALOG ?? 'true') === 'true';
const SHOW_EVALUATION = (import.meta.env.VITE_SHOW_EVALUATION ?? 'true') === 'true';
const SHOW_METRIC_AI_AGENT = (import.meta.env.VITE_SHOW_METRIC_AI_AGENT ?? 'true') === 'true';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed?: boolean;
  isSubItem?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, collapsed, isSubItem = false }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      className={cn(
        "flex items-center gap-3 py-2 rounded-lg text-sidebar-foreground/80 transition-all duration-200",
        isSubItem ? "px-8 ml-2" : "px-4",
        isActive 
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
          : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
      )}
    >
      <div className={cn(
        "w-5 h-5 flex items-center justify-center",
        isActive ? "text-primary" : "text-sidebar-foreground/70"
      )}>
        {icon}
      </div>
      {!collapsed && <span className={isSubItem ? "text-sm" : ""}>{label}</span>}
    </Link>
  );
};

interface NavGroupProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  collapsed?: boolean;
  defaultExpanded?: boolean;
}

const NavGroup: React.FC<NavGroupProps> = ({ icon, label, children, collapsed, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  if (collapsed) {
    return (
      <div className="relative group">
        <div className="flex items-center justify-center px-4 py-3 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-all duration-200">
          <div className="w-6 h-6 flex items-center justify-center text-sidebar-foreground/70">
            {icon}
          </div>
        </div>
        <div className="absolute left-full top-0 ml-2 bg-popover border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-48">
          <div className="p-2">
            <div className="font-medium text-sm px-3 py-2 text-sidebar-foreground">{label}</div>
            <div className="space-y-1">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-all duration-200"
      >
        <div className="w-6 h-6 flex items-center justify-center text-sidebar-foreground/70">
          {icon}
        </div>
        <span className="flex-1 text-left">{label}</span>
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {isExpanded && (
        <div className="mt-1 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
};

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const { collapsed, toggleSidebar } = useSidebar();

  return (
    <aside className={cn(
      "h-screen bg-sidebar fixed top-0 left-0 border-r border-border/50 flex flex-col transition-all duration-300 z-50",
      collapsed ? "w-20" : "w-56",
      className
    )}>
      <div className="p-4 border-b border-border/50 relative">
        <div className={cn(
          "text-lg font-medium flex items-center gap-2 px-2",
          collapsed && "justify-center"
        )}>
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <BrainCircuit className="h-4 w-4 text-white" />
          </div>
          {!collapsed && <span>{import.meta.env.VITE_APP_TITLE || 'Watchmen'}</span>}
        </div>
        <button
          onClick={toggleSidebar}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-sidebar-accent/50 text-sidebar-foreground/70"
        >
          <ChevronLeft className={cn(
            "h-4 w-4 transition-transform duration-300",
            collapsed && "rotate-180"
          )} />
        </button>
      </div>
      
      <nav className="flex-1 px-2 py-4 space-y-2">
        {SHOW_SMART_CONSOLE && (
          <NavItem to="/" icon={<LayoutDashboard size={18} />} label="Smart Console" collapsed={collapsed} />
        )}
        
        {SHOW_BUSINESS_CHALLENGE && (
        <NavGroup 
          icon={<Lightbulb size={18} />} 
          label="Data Insights" 
          collapsed={collapsed}
          defaultExpanded={true}
        >
          <NavItem to="/challenges" icon={<Target size={16} />} label="Challenges" collapsed={collapsed} isSubItem={true} />
          <NavItem to="/problems" icon={<FileQuestion size={16} />} label="Problems" collapsed={collapsed} isSubItem={true} />
          <NavItem to="/hypotheses" icon={<Lightbulb size={16} />} label="Hypothesis" collapsed={collapsed} isSubItem={true} />
        </NavGroup>
        )}
        
        {SHOW_METRICS && (
        <NavGroup 
          icon={<BarChart3 size={18} />} 
          label="Metrics" 
          collapsed={collapsed}
          defaultExpanded={true}
        >
          {/* <NavItem to="/metrics" icon={<BarChart3 size={16} />} label="Metrics Hub" collapsed={collapsed} isSubItem={true} /> */}
          {SHOW_METRIC_AI_AGENT && (
            <NavItem to="/chat" icon={<MessageSquare size={16} />} label="Smart Metrics Chat" collapsed={collapsed} isSubItem={true} />
          )}
          <NavItem to="/metrics/bi-analysis" icon={<BarChart3 size={16} />} label="Metrics Analysis" collapsed={collapsed} isSubItem={true} />
          <NavItem to="/metrics/semantic-models" icon={<GitBranch size={16} />} label="Semantic Model Management" collapsed={collapsed} isSubItem={true} />
          <NavItem to="/metrics/management" icon={<TrendingUp size={16} />} label="Metrics Management" collapsed={collapsed} isSubItem={true} />
          {SHOW_METRIC_AI_AGENT && (
            <NavItem to="/metrics/assistant-config" icon={<Sliders size={16} />} label="Assistant Config" collapsed={collapsed} isSubItem={true} />
          )}
          {/* <NavItem to="/data-profiles" icon={<Database size={16} />} label="Data Profile Management" collapsed={collapsed} isSubItem={true} /> */}
        </NavGroup>
        )}
        
        {SHOW_DATA_CATALOG && (
        <NavGroup 
          icon={<Database size={18} />} 
          label="Data Catalog" 
          collapsed={collapsed}
          defaultExpanded={true}
        >
          <NavItem to="/data-catalog" icon={<FolderOpen size={16} />} label="Data Catalog" collapsed={collapsed} isSubItem={true} />
          {/* <NavItem to="/data-profiles" icon={<Database size={16} />} label="Data Profile Management" collapsed={collapsed} isSubItem={true} /> */}
          
        </NavGroup>
        )}
        
        {SHOW_EVALUATION && (
        <NavGroup 
          icon={<ClipboardCheck size={18} />} 
          label="Evaluation" 
          collapsed={collapsed}
          defaultExpanded={true}
        >
          <NavItem to="/evaluation/offline" icon={<Database size={16} />} label="Offline Evaluation" collapsed={collapsed} isSubItem={true} />
          <NavItem to="/evaluation/datasets" icon={<Database size={16} />} label="Dataset Management" collapsed={collapsed} isSubItem={true} />
          {/* <NavItem to="/evaluation/online" icon={<TestTube size={16} />} label="Online Evaluation" collapsed={collapsed} isSubItem={true} /> */}
          <NavItem to="/evaluation/scenarios" icon={<TestTube size={16} />} label="Scenario Evaluation" collapsed={collapsed} isSubItem={true} />
        </NavGroup>
        )}
      </nav>
      
      <div className="p-4 border-t border-border/50 space-y-1">
        <NavItem to="/settings" icon={<Settings size={18} />} label="Settings" collapsed={collapsed} />
        <NavItem to="/help" icon={<HelpCircle size={18} />} label="Help" collapsed={collapsed} />
      </div>
    </aside>
  );
};

export default Sidebar;
