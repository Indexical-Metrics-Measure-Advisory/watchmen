import { useState } from "react";
import { Sidebar } from "./components/data-product/Sidebar";
import { Dashboard } from "./components/data-product/Dashboard";
import { DataProductCatalog } from "./components/data-product/DataProductCatalog";
import { QualityManagement } from "./components/data-product/QualityManagement";
import { TenantManagement } from "./components/data-product/TenantManagement";
import { CustomizationExtractor } from "./components/data-product/CustomizationExtractor";
import { MergeVisualizer } from "./components/data-product/MergeVisualizer";
import { AssetMap } from "./components/data-product/AssetMap";
import { DataLineageMap } from "./components/data-product/DataLineageMap";
import { BusinessDomainMap } from "./components/data-product/BusinessDomainMap";
import { LifecycleManagement } from "./components/data-product/LifecycleManagement";
import { Settings } from "./components/data-product/Settings";
import { Login } from "./components/Login";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('domain');

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }


  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'catalog':
        return <DataProductCatalog />;
      case 'lineage':
        return <DataLineageMap />;
      case 'domain':
        return <BusinessDomainMap />;
      case 'lifecycle':
        return <LifecycleManagement />;
      case 'quality':
        return <QualityManagement />;
      case 'tenants':
        return <TenantManagement />;
      case 'customization':
        return <CustomizationExtractor />;
      case 'merge':
        return <MergeVisualizer />;
      case 'asset-map':
        return <AssetMap />;
      case 'settings':
        return <Settings />;
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
