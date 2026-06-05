import { useState } from "react";
import { Sidebar } from "./components/new/Sidebar";
import { Dashboard } from "./components/new/Dashboard";
import { DataCatalog } from "./components/new/DataCatalog";
import { DataProducts } from "./components/new/DataProducts";
import { DataLineage } from "./components/new/DataLineage";
import { BusinessGlossary } from "./components/new/BusinessGlossary";
import { DataGovernance } from "./components/new/DataGovernance";
import { DataQuality } from "./components/new/DataQuality";
import { SemanticLayer } from "./components/new/SemanticLayer";

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'catalog':
        return <DataCatalog />;
      case 'products':
        return <DataProducts />;
      case 'lineage':
        return <DataLineage />;
      case 'glossary':
        return <BusinessGlossary />;
      case 'governance':
        return <DataGovernance />;
      case 'quality':
        return <DataQuality />;
      case 'semantic':
        return <SemanticLayer />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 min-w-0 overflow-auto bg-slate-50">
        {renderContent()}
      </main>
    </div>
  );
}
