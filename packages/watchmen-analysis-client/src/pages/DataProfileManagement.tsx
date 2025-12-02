import React, { useState, useEffect } from 'react';
import { Database, TestTube, Download, Upload, Eye, EyeOff, Save } from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { DataProfile, DatabaseType } from '@/model/dataProfile';
import {
  getAllDataProfiles,
  createDataProfile,
  updateDataProfile,
  testDatabaseConnection,
  getTenantDataProfile
} from '@/services/dataProfileService';
import DataService, { DataProfileFormData, ConnectionResult } from '@/services/dataService';

const DataProfileManagement: React.FC = () => {
  const { collapsed } = useSidebar();
  const [currentProfile, setCurrentProfile] = useState<DataProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<DataProfileFormData>(DataService.getDefaultFormData());
  const [showPassword, setShowPassword] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<ConnectionResult | null>(null);

  useEffect(() => {
    loadCurrentProfile();
  }, []);

  const loadCurrentProfile = async () => {
    try {
      setLoading(true);
      const profile = await getTenantDataProfile();
      if (profile) {
        setCurrentProfile(profile);
        setFormData(DataService.profileToFormData(profile));
      } else {
        setCurrentProfile(null);
        setFormData(DataService.getDefaultFormData());
      }
    } catch (error) {
      console.error('Failed to load profiles:', error);
      setConnectionResult(DataService.formatConnectionResult(false, 'Failed to load profiles'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // 验证表单数据
    const validation = DataService.validateFormData(formData);
    if (!validation.isValid) {
      setConnectionResult(DataService.formatConnectionResult(false, validation.errors.join(', ')));
      return;
    }

    try {
      setSaving(true);
      const profileData = DataService.formDataToProfile(formData);
      
      if (currentProfile) {
        const updatedProfile = await updateDataProfile(currentProfile.id, profileData);
        setCurrentProfile(updatedProfile);
      } else {
        const newProfile = await createDataProfile(profileData);
        setCurrentProfile(newProfile);
      }
      
      setConnectionResult(DataService.formatConnectionResult(true, 'Profile saved successfully!'));
    } catch (error) {
      console.error('Failed to save profile:', error);
      setConnectionResult(DataService.formatConnectionResult(false, 'Failed to save profile'));
    } finally {
      setSaving(false);
    }
  };

  const updateOutput = (field: string, value: any) => {
    setFormData(DataService.updateFormOutput(formData, field, value));
  };



  const testConnection = async () => {
    setTestingConnection(true);
    try {
      const result = await testDatabaseConnection(formData.output);
      setConnectionResult(result);
    } catch (error) {
      setConnectionResult(DataService.formatConnectionResult(false, 'Connection test failed'));
    } finally {
      setTestingConnection(false);
    }
  };

  const exportProfile = () => {
    if (!currentProfile) return;
    DataService.downloadProfile(currentProfile);
  };

  const importProfile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const importedFormData = await DataService.importProfileFromFile(file);
        setFormData(importedFormData);
      } catch (error) {
        alert((error as Error).message);
      }
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className={cn(
      "min-h-screen flex flex-col transition-all duration-300",
      collapsed ? "ml-[80px]" : "ml-[224px]"
    )}>
      <Sidebar />
      <Header />
      
      <main className="flex-1 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Data Profile Configuration</h1>
                <p className="text-gray-600 mt-1">Configure your database connection settings</p>
              </div>
              {/* <div className="flex gap-2">
                <label className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer">
                  <Upload className="h-4 w-4" />
                  Import
                  <input
                    type="file"
                    accept=".json"
                    onChange={importProfile}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={exportProfile}
                  disabled={!currentProfile}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
              </div> */}
            </div>

            {/* Configuration Form */}
            <div className="bg-white rounded-lg shadow border p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Enter profile name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Environment
                  </label>
                  <input
                    type="text"
                    value={formData.target}
                    onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., dev, prod"
                  />
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Database Configuration</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={testConnection}
                      disabled={testingConnection}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                    >
                      <TestTube className="h-4 w-4" />
                      {testingConnection ? 'Testing...' : 'Test Connection'}
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {saving ? 'Saving...' : currentProfile ? 'Update Profile' : 'Create Profile'}
                    </button>
                  </div>
                </div>
                
                {connectionResult && (
                  <div className={`mb-4 p-3 rounded-lg text-sm ${
                    connectionResult.success 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {connectionResult.message}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Database Type
                    </label>
                    <select
                      value={formData.output.type}
                      onChange={(e) => {
                        const template = DataService.getDefaultTemplate(e.target.value as DatabaseType);
                        setFormData({
                          ...formData,
                          output: template
                        });
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      {Object.values(DatabaseType).map(type => (
                        <option key={type} value={type}>{DataService.getDatabaseDisplayName(type)}</option>
                      ))}
                    </select>
                  </div>
                  
                  {!DataService.isFileDatabase(formData.output.type) && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Host
                        </label>
                        <input
                          type="text"
                          value={formData.output.host || ''}
                          onChange={(e) => updateOutput('host', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                          placeholder="localhost"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Port
                        </label>
                        <input
                          type="number"
                          value={formData.output.port || ''}
                          onChange={(e) => updateOutput('port', parseInt(e.target.value))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                          placeholder="5432"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Username
                        </label>
                        <input
                          type="text"
                          value={formData.output.user || ''}
                          onChange={(e) => updateOutput('user', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                          placeholder="postgres"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={formData.output.password || ''}
                            onChange={(e) => updateOutput('password', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10"
                            placeholder="Enter password"
                          />
                          <button
                            type="button"
                            onClick={togglePasswordVisibility}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Database Name
                        </label>
                        <input
                          type="text"
                          value={formData.output.dbname || ''}
                          onChange={(e) => updateOutput('dbname', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                          placeholder="postgres"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Schema
                        </label>
                        <input
                          type="text"
                          value={formData.output.schema || ''}
                          onChange={(e) => updateOutput('schema', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                          placeholder="public"
                        />
                      </div>
                    </>
                  )}
                  
                  {DataService.isFileDatabase(formData.output.type) && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        File Path
                      </label>
                      <input
                        type="text"
                        value={formData.output.path || ''}
                        onChange={(e) => updateOutput('path', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="./data/database.duckdb"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default DataProfileManagement;