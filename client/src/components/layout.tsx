import Sidebar from "./sidebar";
import Header from "./header";
import logoImage from "@assets/ATE solutions AFAS logo verticaal_1756322897372.jpg";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Logo Bar */}
      <div className="bg-white border-b border-border px-6 py-4 flex items-center justify-start">
        <img 
          src={logoImage} 
          alt="ATE Solutions B.V." 
          className="h-20 w-auto object-contain"
          data-testid="top-logo-bar"
        />
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
