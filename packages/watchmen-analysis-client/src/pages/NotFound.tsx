import React from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <div className="min-h-screen transition-all duration-300">
        <main className="container py-6 flex flex-col items-center justify-center">
          <div className="text-center max-w-md mx-auto py-12">
            <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-6">Oops! The page you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/')} className="mb-4">
          Return to Dashboard
        </Button>
           </div>
         </main>
        </div>
      </div>
    );
};

export default NotFound;
