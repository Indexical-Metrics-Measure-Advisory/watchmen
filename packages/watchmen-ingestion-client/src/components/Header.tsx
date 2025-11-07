
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, LogOut, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface HeaderProps {
  title: string;
  description?: string;
  showAIBadge?: boolean;
  showUserInfo?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  title, 
  description, 
  showAIBadge = false,
  showUserInfo = false
}) => {
  const { user, logout } = useAuth();

  // Generate user avatar letters
  const getUserAvatar = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex flex-col space-y-2 mb-6">
      {/* User info section - only show if showUserInfo is true and user exists */}
      {showUserInfo && user && (
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-3 bg-white rounded-lg shadow-sm border p-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              {getUserAvatar(user.name)}
            </div>
            <div className="text-sm">
              <p className="font-medium text-gray-900">{user.name}</p>
              <p className="text-gray-500">{user.email || user.role}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-gray-500 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Welcome section with user info - only show if showUserInfo is true and user exists */}
      {showUserInfo && user && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
              {getUserAvatar(user.name)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.name}!</h1>
              <p className="text-gray-600">{user.role} • {user.isActive ? 'Active' : 'Inactive'}</p>
            </div>
          </div>
          <div className="text-right">
            <Badge variant="outline" className="mt-1">
              <User className="h-3 w-3 mr-1" />
              {user.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
      )}

      {/* Regular header section */}
      <div className="flex items-center gap-3">
        {/* <h1 className="text-3xl font-bold tracking-tight">{title}</h1> */}
        {showAIBadge && (
          <Badge variant="outline" className="bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0 flex items-center gap-1 px-3 py-1 h-6">
            <Sparkles className="h-3.5 w-3.5" />
            AI Enhanced
          </Badge>
        )}
      </div>
      {/* {description && (
        <p className="text-muted-foreground">{description}</p>
      )} */}
    </div>
  );
};

export default Header;
