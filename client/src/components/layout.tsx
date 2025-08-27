import { useState, useEffect } from "react";
import Sidebar from "./sidebar";
import Header from "./header";
import logoImage from "@assets/ATE solutions AFAS logo verticaal_1756322897372.jpg";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('nl-NL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Logo Bar */}
      <div className="bg-white border-b border-border px-6 py-4 flex items-center justify-between">
        <img 
          src={logoImage} 
          alt="ATE Solutions B.V." 
          className="h-20 w-auto object-contain"
          data-testid="top-logo-bar"
        />
        
        {/* User Info */}
        <div className="text-right">
          <div className="text-lg font-semibold text-foreground" data-testid="user-name">
            Admin Gebruiker
          </div>
          <div className="text-sm text-muted-foreground" data-testid="current-date">
            {formatDate(currentTime)}
          </div>
          <div className="text-sm font-mono text-muted-foreground" data-testid="current-time">
            {formatTime(currentTime)}
          </div>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
