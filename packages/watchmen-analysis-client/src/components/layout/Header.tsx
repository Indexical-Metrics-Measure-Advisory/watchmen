
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, Settings, ChevronDown, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/i18n/hooks/use-locale';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isConsoleUser } = useAuth();
  const { openMobile, closeMobile } = useSidebar();
  const { t } = useTranslation(['common', 'layout']);
  const { language, setLanguage } = useLocale();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close the mobile drawer whenever navigation happens
  useEffect(() => {
    closeMobile();
  }, [location.pathname, closeMobile]);

  const isAuthenticated = !!user;
  
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return t('layout:pageTitle.smartConsole');
      case '/challenges':
        return t('layout:pageTitle.challenges');
      case '/hypotheses':
        return t('layout:pageTitle.hypothesis');
      case '/metrics/semantic-models':
        return t('layout:pageTitle.semanticModelManagement');
      case '/metrics/management':
        return t('layout:pageTitle.metricsManagement');
      case '/metrics/materialization':
        return t('layout:pageTitle.materialization');
      case '/metrics/materialization/runs':
        return t('layout:pageTitle.materializationRuns');
      case '/metrics/compute-flow':
        return t('layout:pageTitle.computeFlow');
      case '/metrics/user-groups':
        return t('layout:pageTitle.userGroupMetrics');
      case '/metrics/assistant-config':
        return t('layout:pageTitle.assistantConfig');
      case '/metrics/bi-analysis':
      case '/bi-analysis':
        return t('layout:pageTitle.metricsAnalysis');
      case '/metrics/tree':
        return t('layout:pageTitle.metricDependencyTree');
      case '/metrics/lineage':
        return t('layout:pageTitle.metricLineage');
      case '/metrics/alert-configuration':
        return t('layout:pageTitle.alertConfiguration');
      case '/metrics/data-profiles':
        return t('layout:pageTitle.dataProfiles');
      case '/data-catalog/domain-map':
        return t('layout:pageTitle.businessOntology');
      case '/data-catalog/ontology-tester':
        return t('layout:pageTitle.ontologyDataTester');
      case '/data-asset/products':
        return t('layout:pageTitle.dataProduct');
      case '/data-asset/map':
        return t('layout:pageTitle.assetMap');
      case '/data-asset/graph':
        return t('layout:pageTitle.dataProductGraph');
      case '/data-asset/business-glossary':
        return t('layout:pageTitle.businessGlossary');
      case '/analysis':
        return t('layout:pageTitle.aiAnalysis');
      case '/ai-analysis-workflow':
        return t('layout:pageTitle.aiAnalysisWorkflow');
      case '/challenge-analysis':
        return t('layout:pageTitle.challengeAnalysis');
      case '/graph':
        return t('layout:pageTitle.graphView');
      case '/learning':
        return t('layout:pageTitle.learning');
      case '/ai-monitoring':
        return t('layout:pageTitle.aiMonitoring');
      case '/ai-agent-management':
        return t('layout:pageTitle.aiAgentManagement');
      case '/retrieval-testing':
        return t('layout:pageTitle.retrievalTesting');
      case '/evaluation/offline':
        return t('layout:pageTitle.offlineEvaluation');
      case '/evaluation/datasets':
        return t('layout:pageTitle.datasetManagement');
      case '/chat':
        return t('layout:pageTitle.aiChatAnalyst');
      case '/login':
        return t('layout:pageTitle.signIn');
      case '/settings':
        return t('layout:pageTitle.settings');
      default:
        return t('layout:pageTitle.dataAnalysisSystem');
    }
  };

  return (
    <header className="relative w-full bg-white/80 dark:bg-card/80 backdrop-blur-md border-b border-border/50 py-3 px-4 md:px-6 flex items-center justify-between z-40">
      <div className="flex items-center gap-2 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0"
          onClick={openMobile}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-medium truncate">{getPageTitle()}</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{t('common:language')}</span>
          <select
            value={language}
            onChange={(event) => void setLanguage(event.target.value as 'en' | 'zh-CN' | 'zh-TW')}
            className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
            aria-label={t('common:language')}
          >
            <option value="en">{t('common:english')}</option>
            <option value="zh-CN">{t('common:simplifiedChinese')}</option>
            <option value="zh-TW">{t('common:traditionalChinese')}</option>
          </select>
        </label>
        {/* <div className="relative w-64">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <input 
            type="search" 
            className="block w-full py-2 pl-10 pr-3 rounded-lg bg-muted/70 border-none focus:ring-2 focus:ring-primary/20 text-sm transition-all"
            placeholder="Search..."
          />
        </div>
        
        <Button variant="outline" size="sm" className="hover-float" onClick={() => navigate('/hypotheses')}>
          <Plus className="h-4 w-4 mr-2" />
          New Hypothesis
        </Button> */}
        
        {/* <Button variant="ghost" size="icon" className="rounded-full">
          <Bell className="h-5 w-5" />
        </Button> */}
        
        {!isConsoleUser && (
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate('/settings')}>
            <Settings className="h-5 w-5" />
          </Button>
        )}
        
        {isAuthenticated ? (
          <div className="relative z-[9998]" ref={userMenuRef}>
            <div 
              className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2 transition-colors"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            >
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-medium text-foreground">
                  {user?.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {user?.role} {user?.email && `• ${user.email}`}
                </span>
              </div>
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* User Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-card border border-border rounded-lg shadow-lg z-[99999]">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-lg">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user?.name}
                      </p>
                      {user?.email && (
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {user?.role}
                        </span>
                        {user?.isActive && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            {t('layout:active')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {!isConsoleUser && (
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        navigate('/settings');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      {t('layout:accountSettings')}
                    </button>
                  </div>
                )}
                
                <div className="border-t border-border py-2">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    {t('layout:signOut')}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
            <LogIn className="h-4 w-4 mr-2" />
            {t('layout:login')}
          </Button>
        )}
      </div>
    </header>
  );
};

export default Header;
