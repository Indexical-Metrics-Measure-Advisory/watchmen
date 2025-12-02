
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Search, Plus, Bell, User, LogIn, LogOut, Settings, ChevronDown, UserCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
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

  const isAuthenticated = !!user;
  
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Smart Console';
      case '/hypotheses':
        return 'Hypothesis';
      case '/metrics':
        return 'Metrics Hub';
      case '/analysis':
        return 'AI Analysis';
      case '/chat':
        return 'AI Chat Analyst';
      case '/login':
        return 'Sign In';
      case '/settings':
        return 'Settings';
      default:
        return 'Data Analysis System';
    }
  };

  return (
    <header className="w-full bg-white/80 dark:bg-card/80 backdrop-blur-md border-b border-border/50 py-3 px-6 flex items-center justify-between z-[9997]">
      <h1 className="text-xl font-medium">{getPageTitle()}</h1>
      
      <div className="flex items-center gap-4">
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
        
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate('/settings')}>
          <Settings className="h-5 w-5" />
        </Button>
        
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
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="py-2">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <UserCircle className="h-4 w-4" />
                    Profile Settings
                  </button>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Account Settings
                  </button>
                </div>
                
                <div className="border-t border-border py-2">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
            <LogIn className="h-4 w-4 mr-2" />
            Login
          </Button>
        )}
      </div>
    </header>
  );
};

export default Header;
