// import React, { useState, useEffect } from 'react';
// import { useLocation, useNavigate } from 'react-router-dom';
// import { ArrowLeft, Info, Calendar, Tag, BarChart, TrendingUp, Layers, Target, AlertTriangle, Edit, Save, X } from 'lucide-react';
// import { useSidebar } from '@/contexts/SidebarContext';
// import { Loader2 } from 'lucide-react';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import Header from '@/components/layout/Header';
// import Sidebar from '@/components/layout/Sidebar';
// import { MetricDimension, MetricMetadata, MetricType, MetricUsage } from '@/model/Metric';
// import { metricsService } from '@/services/metricsService';
// import { getCategories } from '@/services/metricsManagementService';
// import { AlertIndicator } from '@/components/metrics/AlertIndicator';
// import { Badge } from '@/components/ui/badge';
// import { Separator } from '@/components/ui/separator';
// import { Input } from '@/components/ui/input';
// import { Textarea } from '@/components/ui/textarea';
// import { toast } from '@/components/ui/use-toast';
// import { Label } from '@/components/ui/label';


// const MetricDetail: React.FC = () => {
//   const { collapsed } = useSidebar();
//   const location = useLocation();
//   const navigate = useNavigate();
//   const [metric, setMetric] = useState<MetricType | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [dimensions, setDimensions] = useState<MetricDimension[]>([]);
//   const [usages, setUsages] = useState<MetricUsage[]>([]);
//   const [metadata, setMetadata] = useState<MetricMetadata | null>(null);
  
//   // Edit mode states
//   const [isEditingOverview, setIsEditingOverview] = useState(false);
//   const [isEditingDimensions, setIsEditingDimensions] = useState(false);
//   const [isEditingUsage, setIsEditingUsage] = useState(false);
//   const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  
//   // Editable data states
//   const [editedMetadata, setEditedMetadata] = useState<MetricMetadata | null>(null);
//   const [editedDimensions, setEditedDimensions] = useState<MetricDimension[]>([]);
//   const [editedUsages, setEditedUsages] = useState<MetricUsage[]>([]);
//   const [editedOverview, setEditedOverview] = useState({
//     definition: '',
//     businessImpact: '',
//     notes: ''
//   });
  
//   // Saving state
//   const [isSaving, setIsSaving] = useState(false);

//   // Handle saving all changes
//   const handleSaveChanges = async () => {
//     try {
//       setIsSaving(true);
      
//       // In a real application, you would call an API to update the data
//       // For now, we'll just update the local state
      
//       if (isEditingOverview) {
//         // Update metadata with the new definition
//         if (metadata && editedOverview.definition) {
//           setMetadata({
//             ...metadata,
//             definition: editedOverview.definition
//           });
//         }
//         setIsEditingOverview(false);
//       }
      
//       if (isEditingDimensions && editedDimensions.length > 0) {
//         setDimensions(editedDimensions);
//         setIsEditingDimensions(false);
//       }
      
//       if (isEditingUsage && editedUsages.length > 0) {
//         setUsages(editedUsages);
//         setIsEditingUsage(false);
//       }
      
//       if (isEditingMetadata && editedMetadata) {
//         setMetadata(editedMetadata);
//         setIsEditingMetadata(false);
//       }
      
//       toast({
//         title: "Changes saved",
//         description: "Metric information has been updated successfully.",
//       });
//     } catch (error) {
//       console.error('Error saving changes:', error);
//       toast({
//         title: "Error saving changes",
//         description: "There was a problem saving your changes. Please try again.",
//         variant: "destructive"
//       });
//     } finally {
//       setIsSaving(false);
//     }
//   };
  
//   // Handle canceling edits
//   const handleCancelEdit = (section: 'overview' | 'dimensions' | 'usage' | 'metadata') => {
//     switch (section) {
//       case 'overview':
//         setIsEditingOverview(false);
//         break;
//       case 'dimensions':
//         setIsEditingDimensions(false);
//         setEditedDimensions(dimensions);
//         break;
//       case 'usage':
//         setIsEditingUsage(false);
//         setEditedUsages(usages);
//         break;
//       case 'metadata':
//         setIsEditingMetadata(false);
//         setEditedMetadata(metadata);
//         break;
//     }
//   };
  
//   // Handle dimension changes
//   const handleDimensionChange = (index: number, field: keyof MetricDimension, value: string | number) => {
//     const updatedDimensions = [...editedDimensions];
//     updatedDimensions[index] = {
//       ...updatedDimensions[index],
//       [field]: field === 'importance' ? Number(value) : value
//     };
//     setEditedDimensions(updatedDimensions);
//   };
  
//   // Handle usage changes
//   const handleUsageChange = (index: number, field: keyof MetricUsage, value: string) => {
//     const updatedUsages = [...editedUsages];
//     updatedUsages[index] = {
//       ...updatedUsages[index],
//       [field]: value
//     };
//     setEditedUsages(updatedUsages);
//   };
  
//   // Handle metadata changes
//   const handleMetadataChange = (field: keyof MetricMetadata, value: string) => {
//     if (editedMetadata) {
//       setEditedMetadata({
//         ...editedMetadata,
//         [field]: value
//       });
//     }
//   };
  
//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         setLoading(true);
//         setError(null);
//         const searchParams = new URLSearchParams(location.search);
//         const metricId = searchParams.get('metric');

//         if (!metricId) {
//           setError('Metric ID not found');
//           return;
//         }

//         const metricDetial = await metricsService.getMetricById(metricId);
//         const foundMetric = metricDetial.metric
//         if (!foundMetric) {
//           setError('Metric data not found');
//           return;
//         }

//         let categoryName = foundMetric.category;
//         if (foundMetric.categoryId) {
//           try {
//             const categories = await getCategories();
//             const cat = categories.find(c => c.id === foundMetric.categoryId);
//             if (cat) {
//               categoryName = cat.name;
//             }
//           } catch (e) {
//             console.error("Failed to fetch categories", e);
//           }
//         }
        
//         // Mock metric dimension data
//         const mockDimensions: MetricDimension[] = [
//           {
//             id: 'customer_age',
//             name: 'Customer Age Distribution',
//             description: 'Analyze customer distribution and purchasing behavior by age group',
//             importance: 85,
//             type: 'number',
//             unit: 'years',
//             range: {
//               min: 18,
//               max: 80
//             }
//           },
//           {
//             id: 'purchase_time',
//             name: 'Purchase Time Analysis',
//             description: 'Analyze customer purchase time patterns, including seasonality and time period distribution',
//             importance: 80,
//             type: 'time',
//             format: 'YYYY-MM-DD HH:mm'
//           },
//           {
//             id: 'region',
//             name: 'Regional Distribution',
//             description: 'Analyze customer characteristics and product preferences across different regions',
//             importance: 75,
//             type: 'text'
//           },
//           {
//             id: 'premium',
//             name: 'Premium Range',
//             description: 'Analyze product distribution and customer choices across different premium ranges',
//             importance: 70,
//             type: 'number',
//             unit: '¥',
//             range: {
//               min: 0,
//               max: 100000
//             }
//           },
//           {
//             id: 'channel',
//             name: 'Sales Channel',
//             description: 'Analyze performance and customer preferences across various sales channels',
//             importance: 65,
//             type: 'text'
//           }
//         ];

//         // 模拟指标用途数据
//         const mockUsages: MetricUsage[] = [
//           {
//             id: 'strategic',
//             name: 'Strategic Decision-making',
//             description: 'Evaluates business strategy effectiveness and guides executive decisions'
//           },
//           {
//             id: 'operational',
//             name: 'Operational Optimization',
//             description: 'Identifies process bottlenecks and improvement opportunities'
//           },
//           {
//             id: 'performance',
//             name: 'Performance Evaluation',
//             description: 'Measures business unit and individual performance metrics'
//           },
//           {
//             id: 'forecasting',
//             name: 'Predictive Analysis',
//             description: 'Forecasts future trends and identifies potential risks'
//           }
//         ];

//         // 模拟指标元数据
//         const mockMetadata: MetricMetadata = {
//           definition: `${foundMetric.name} is a key metric measuring ${categoryName} in insurance business, used to evaluate ${foundMetric.description || 'business performance'}`,
//           calculation: `Formula based on ${categoryName}-related data with weighted average of multiple factors`,
//           dataSource: 'Enterprise Data Warehouse, Transaction Systems, and CRM',
//           updateFrequency: 'Daily updates with monthly audits',
//           owner: 'Business Analytics Department',
//           relatedMetrics: [
//             { id: 'metric-1', name: 'Customer Satisfaction' },
//             { id: 'metric-2', name: 'Policy Renewal Rate' },
//             { id: 'metric-3', name: 'Customer Acquisition Cost' }
//           ]
//         };

//         const dimensions = metricDetial.dimensions;
//         setMetric(foundMetric);
//         setDimensions(dimensions);
//         setUsages(mockUsages);
//         setMetadata(mockMetadata);
        
//         // Initialize editable states
//         setEditedDimensions(mockDimensions);
//         setEditedUsages(mockUsages);
//         setEditedMetadata(mockMetadata);
//         setEditedOverview({
//           definition: mockMetadata.definition,
//           businessImpact: 'This metric primarily impacts customer satisfaction, product competitiveness and market share. The ' + 
//             (foundMetric.status === 'positive' ? 'upward' : foundMetric.status === 'negative' ? 'downward' : 'stable') + 
//             ' trend indicates our business is ' + 
//             (foundMetric.status === 'positive' ? 'developing positively' : foundMetric.status === 'negative' ? 'facing challenges' : 'remaining stable') + '.',
//           notes: 'Seasonal factors should be considered when interpreting this metric. Recommend comparative analysis with historical data. External factors including market environment and macroeconomic conditions may also influence this metric.'
//         });
//       } catch (err) {
//         setError('Failed to load metric data. Please try again later.');
//         console.error('Error loading metric:', err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, [location.search]);

//   return (
//     <div className="min-h-screen bg-background">
//       <Sidebar />
      
//       <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300`}>
//         <Header />
        
//         <main className="container py-6">
//           <div className="flex justify-between items-center mb-6">
//             <div className="flex items-center gap-4">
//               <Button
//                 variant="ghost"
//                 size="icon"
//                 onClick={() => navigate('/metrics')}
//                 className="hover:bg-accent"
//               >
//                 <ArrowLeft className="h-4 w-4" />
//               </Button>

              
//               <h1 className="text-2xl font-semibold">Metric Details</h1>
//             </div>
//           </div>
          
//           {loading ? (
//             <div className="flex items-center justify-center h-[60vh]">
//               <Loader2 className="h-8 w-8 animate-spin text-primary" />
//             </div>
//           ) : error ? (
//             <div className="flex items-center justify-center h-[60vh]">
//               <div className="text-center text-red-500">
//                 <p>{error}</p>
//                 <Button
//                   variant="outline"
//                   className="mt-4"
//                   onClick={() => window.location.reload()}
//                 >
//                   Retry
//                 </Button>
//               </div>
//             </div>
//           ) : metric ? (
//             <Card className="glass-card">
//               <CardHeader>
//                 <div className="flex items-center justify-between gap-4">
//                   <CardTitle className="text-lg">{metric.description}</CardTitle>
//                   <div className="flex items-center gap-2">
//                     {(isEditingOverview || isEditingDimensions || isEditingUsage || isEditingMetadata) && (
//                       <Button 
//                         size="sm" 
//                         onClick={handleSaveChanges}
//                         disabled={isSaving}
//                         className="h-8"
//                       >
//                         {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
//                         Update Metric
//                       </Button>
//                     )}
//                     <AlertIndicator
//                       metricId={metric?.id || ''}
//                       metricName={metric?.description || ''}
//                       currentValue={typeof metric?.value === 'number' ? metric?.value : 0}
//                       unit={metric?.unit}
//                     />
//                   </div>
//                 </div>
//                 <CardDescription className="mt-2">{metric.description}</CardDescription>
//               </CardHeader>
              
//               <CardContent>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
//                   <div className="flex items-center space-x-4 bg-muted/30 p-4 rounded-lg">
//                     <div className="bg-primary/10 p-3 rounded-full">
//                       <TrendingUp className="h-6 w-6 text-primary" />
//                     </div>
//                     <div>
//                       <div className="text-2xl font-bold">{metric.valueReadable || metric.value}{metric.unit}</div>
//                       <div className="flex items-center space-x-2">
//                         <span className={`text-sm ${metric.status === 'positive' ? 'text-green-500' : metric.status === 'negative' ? 'text-red-500' : 'text-gray-500'}`}>
//                           {metric.change > 0 ? '+' : ''}{metric.changeReadable || metric.change}%
//                         </span>
//                         <span className="text-sm text-muted-foreground">vs previous period</span>
//                       </div>
//                     </div>
//                   </div>
                  
//                   <div className="flex flex-col justify-center bg-muted/30 p-4 rounded-lg">
//                     <div className="flex items-center space-x-2 mb-2">
//                       <Tag className="h-4 w-4 text-primary" />
//                       <span className="text-sm font-medium">Metric Category</span>
//                     </div>
//                     <div className="flex flex-wrap gap-2">
//                       <Badge variant="outline" className="bg-primary/10">{metric.category}</Badge>
//                       <Badge variant="outline" className="bg-primary/10">{metric.status === 'positive' ? 'Positive' : metric.status === 'negative' ? 'Negative' : 'Neutral'}</Badge>
//                       <Badge variant="outline" className="bg-primary/10">Core Metric</Badge>
//                     </div>
//                   </div>
//                 </div>
                
//                 <Tabs defaultValue="overview">
//                   <TabsList className="mb-4">
//                     <TabsTrigger value="overview">Overview</TabsTrigger>
//                     <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
//                     <TabsTrigger value="usage">Usage</TabsTrigger>
//                     <TabsTrigger value="metadata">Metadata</TabsTrigger>
//                   </TabsList>
                  
//                   {/* Overview Tab */}
//                   <TabsContent value="overview" className="mt-0">
//                     <div className="space-y-4">
//                       <div className="bg-card p-4 rounded-lg border">
//                         <div className="flex items-center justify-between mb-2">
//                           <div className="flex items-center space-x-2">
//                             <Info className="h-4 w-4 text-primary" />
//                             <h3 className="text-sm font-medium">Definition</h3>
//                           </div>
//                           {!isEditingOverview ? (
//                             <Button 
//                               variant="ghost" 
//                               size="sm" 
//                               onClick={() => setIsEditingOverview(true)}
//                               className="h-8 px-2"
//                             >
//                               <Edit className="h-3.5 w-3.5 mr-1" />
//                               Edit
//                             </Button>
//                           ) : (
//                             <div className="flex space-x-2">
//                               <Button 
//                                 variant="ghost" 
//                                 size="sm" 
//                                 onClick={() => handleCancelEdit('overview')}
//                                 className="h-8 px-2"
//                               >
//                                 <X className="h-3.5 w-3.5 mr-1" />
//                                 Cancel
//                               </Button>
//                               <Button 
//                                 variant="default" 
//                                 size="sm" 
//                                 onClick={handleSaveChanges}
//                                 className="h-8 px-2"
//                                 disabled={isSaving}
//                               >
//                                 {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
//                                 Save
//                               </Button>
//                             </div>
//                           )}
//                         </div>
//                         {!isEditingOverview ? (
//                           <p className="text-sm text-muted-foreground">
//                             {metadata?.definition || `${metric.name} is a key metric measuring ${metric.category}, ${metric.description || 'used for business analysis and decision-making support'}`}
//                           </p>
//                         ) : (
//                           <Textarea
//                             value={editedOverview.definition}
//                             onChange={(e) => setEditedOverview({...editedOverview, definition: e.target.value})}
//                             className="mt-2 text-sm"
//                             rows={3}
//                           />
//                         )}
//                       </div>
                      
//                       <div className="bg-card p-4 rounded-lg border">
//                         <div className="flex items-center justify-between mb-2">
//                           <div className="flex items-center space-x-2">
//                             <BarChart className="h-4 w-4 text-primary" />
//                             <h3 className="text-sm font-medium">Business Impact</h3>
//                           </div>
//                         </div>
//                         {!isEditingOverview ? (
//                           <p className="text-sm text-muted-foreground">
//                             This metric primarily impacts customer satisfaction, product competitiveness and market share. The {metric.status === 'positive' ? 'upward' : metric.status === 'negative' ? 'downward' : 'stable'} trend indicates our business is {metric.status === 'positive' ? 'developing positively' : metric.status === 'negative' ? 'facing challenges' : 'remaining stable'}.
//                           </p>
//                         ) : (
//                           <Textarea
//                             value={editedOverview.businessImpact}
//                             onChange={(e) => setEditedOverview({...editedOverview, businessImpact: e.target.value})}
//                             className="mt-2 text-sm"
//                             rows={3}
//                           />
//                         )}
//                       </div>
                      
//                       <div className="bg-card p-4 rounded-lg border">
//                         <div className="flex items-center justify-between mb-2">
//                           <div className="flex items-center space-x-2">
//                             <AlertTriangle className="h-4 w-4 text-amber-500" />
//                             <h3 className="text-sm font-medium">Notes</h3>
//                           </div>
//                         </div>
//                         {!isEditingOverview ? (
//                           <p className="text-sm text-muted-foreground">
//                             Seasonal factors should be considered when interpreting this metric. Recommend comparative analysis with historical data. External factors including market environment and macroeconomic conditions may also influence this metric.
//                           </p>
//                         ) : (
//                           <Textarea
//                             value={editedOverview.notes}
//                             onChange={(e) => setEditedOverview({...editedOverview, notes: e.target.value})}
//                             className="mt-2 text-sm"
//                             rows={3}
//                           />
//                         )}
//                       </div>
//                     </div>
//                   </TabsContent>
                  
//                   {/* Dimensions Tab */}
//                   <TabsContent value="dimensions" className="mt-0">
//                     <div className="space-y-4">
//                       <div className="bg-card p-4 rounded-lg border">
//                         <div className="flex items-center justify-between mb-4">
//                           <div className="flex items-center space-x-2">
//                             <Layers className="h-4 w-4 text-primary" />
//                             <h3 className="text-sm font-medium">Dimension Analysis Overview</h3>
//                           </div>
//                           {!isEditingDimensions ? (
//                             <Button 
//                               variant="ghost" 
//                               size="sm" 
//                               onClick={() => setIsEditingDimensions(true)}
//                               className="h-8 px-2"
//                             >
//                               <Edit className="h-3.5 w-3.5 mr-1" />
//                               Edit
//                             </Button>
//                           ) : (
//                             <div className="flex space-x-2">
//                               <Button 
//                                 variant="ghost" 
//                                 size="sm" 
//                                 onClick={() => handleCancelEdit('dimensions')}
//                                 className="h-8 px-2"
//                               >
//                                 <X className="h-3.5 w-3.5 mr-1" />
//                                 Cancel
//                               </Button>
//                               <Button 
//                                 variant="default" 
//                                 size="sm" 
//                                 onClick={handleSaveChanges}
//                                 className="h-8 px-2"
//                                 disabled={isSaving}
//                               >
//                                 {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
//                                 Save
//                               </Button>
//                             </div>
//                           )}
//                         </div>
//                         <p className="text-sm text-muted-foreground mb-4">
//                           {metric.name} can be analyzed from multiple dimensions. Below are the main analytical dimensions sorted by importance.
//                           Multi-dimensional analysis provides deep insights into key factors influencing this metric and potential optimization opportunities.
//                         </p>
                        
//                         <div className="space-y-3">
//                           {(isEditingDimensions ? editedDimensions : dimensions)
//                             .sort((a, b) => b.importance - a.importance)
//                             .map((dimension, index) => (
//                               <div key={dimension.id} className="border-l-2 border-primary pl-4 py-2">
//                                 {!isEditingDimensions ? (
//                                   <>
//                                     <div className="flex justify-between items-center gap-2">
//                                       <div className="flex items-center gap-2">
//                                         {dimension.type === 'time' && <Calendar className="h-4 w-4 text-blue-500" />}
//                                         {dimension.type === 'number' && <BarChart className="h-4 w-4 text-green-500" />}
//                                         {dimension.type === 'text' && <Layers className="h-4 w-4 text-purple-500" />}
//                                         <h4 className="text-sm font-medium">{dimension.name}</h4>
//                                       </div>
//                                       <div className="flex items-center gap-2">
//                                         <Badge variant="outline" className="bg-primary/5">
//                                           {dimension.type === 'time' && 'Time Dimension'}
//                                           {dimension.type === 'number' && 'Numeric Dimension'}
//                                           {dimension.type === 'text' && 'Text Dimension'}
//                                         </Badge>
//                                         <Badge variant="outline">{dimension.importance}%</Badge>
//                                       </div>
//                                     </div>
//                                     <p className="text-xs text-muted-foreground mt-1">{dimension.description}</p>
//                                     {dimension.type === 'number' && dimension.range && (
//                                       <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
//                                         <span>取值范围: {dimension.range.min} - {dimension.range.max} {dimension.unit}</span>
//                                       </div>
//                                     )}
//                                     {dimension.type === 'time' && dimension.format && (
//                                       <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
//                                         <span>时间格式: {dimension.format}</span>
//                                       </div>
//                                     )}
//                                   </>
//                                 ) : (
//                                   <div className="space-y-2">
//                                     <div className="flex justify-between items-center gap-2">
//                                       <Input
//                                         value={dimension.name}
//                                         onChange={(e) => handleDimensionChange(index, 'name', e.target.value)}
//                                         className="text-sm"
//                                       />
//                                       <Input
//                                         type="number"
//                                         min="0"
//                                         max="100"
//                                         value={dimension.importance}
//                                         onChange={(e) => handleDimensionChange(index, 'importance', e.target.value)}
//                                         className="text-sm w-20"
//                                       />
//                                     </div>
//                                     <Textarea
//                                       value={dimension.description}
//                                       onChange={(e) => handleDimensionChange(index, 'description', e.target.value)}
//                                       className="text-xs"
//                                       rows={2}
//                                     />
//                                   </div>
//                                 )}
//                               </div>
//                           ))}
//                         </div>
//                       </div>
//                     </div>
//                   </TabsContent>
                  
//                   {/* Usage Tab */}
//                   <TabsContent value="usage" className="mt-0">
//                     <div className="space-y-4">
//                       <div className="bg-card p-4 rounded-lg border">
//                         <div className="flex items-center justify-between mb-4">
//                           <div className="flex items-center space-x-2">
//                             <Target className="h-4 w-4 text-primary" />
//                             <h3 className="text-sm font-medium">Business Applications</h3>
//                           </div>
//                           {!isEditingUsage ? (
//                             <Button 
//                               variant="ghost" 
//                               size="sm" 
//                               onClick={() => setIsEditingUsage(true)}
//                               className="h-8 px-2"
//                             >
//                               <Edit className="h-3.5 w-3.5 mr-1" />
//                               Edit
//                             </Button>
//                           ) : (
//                             <div className="flex space-x-2">
//                               <Button 
//                                 variant="ghost" 
//                                 size="sm" 
//                                 onClick={() => handleCancelEdit('usage')}
//                                 className="h-8 px-2"
//                               >
//                                 <X className="h-3.5 w-3.5 mr-1" />
//                                 Cancel
//                               </Button>
//                               <Button 
//                                 variant="default" 
//                                 size="sm" 
//                                 onClick={handleSaveChanges}
//                                 className="h-8 px-2"
//                                 disabled={isSaving}
//                               >
//                                 {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
//                                 Save
//                               </Button>
//                             </div>
//                           )}
//                         </div>
//                         <p className="text-sm text-muted-foreground mb-4">
//                           {metric.name} has multiple application scenarios in business operations. Below are the primary use case descriptions.
//                         </p>
                        
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                           {(isEditingUsage ? editedUsages : usages).map((usage, index) => (
//                             <div key={usage.id} className="bg-muted/30 p-3 rounded-lg">
//                               {!isEditingUsage ? (
//                                 <>
//                                   <h4 className="text-sm font-medium mb-1">{usage.name}</h4>
//                                   <p className="text-xs text-muted-foreground">{usage.description}</p>
//                                 </>
//                               ) : (
//                                 <div className="space-y-2">
//                                   <Input
//                                     value={usage.name}
//                                     onChange={(e) => handleUsageChange(index, 'name', e.target.value)}
//                                     className="text-sm mb-2"
//                                     placeholder="Usage name"
//                                   />
//                                   <Textarea
//                                     value={usage.description}
//                                     onChange={(e) => handleUsageChange(index, 'description', e.target.value)}
//                                     className="text-xs"
//                                     rows={2}
//                                     placeholder="Usage description"
//                                   />
//                                 </div>
//                               )}
//                             </div>
//                           ))}
//                         </div>
//                       </div>
//                     </div>
//                   </TabsContent>

//                   {/* Metadata Tab */}
//                   <TabsContent value="metadata" className="mt-0">
//                     <div className="space-y-4">
//                       <div className="bg-card p-4 rounded-lg border">
//                         <div className="flex items-center justify-between mb-4">
//                           <div className="flex items-center space-x-2">
//                             <Info className="h-4 w-4 text-primary" />
//                             <h3 className="text-sm font-medium">Metric Metadata</h3>
//                           </div>
//                           {!isEditingMetadata ? (
//                             <Button 
//                               variant="ghost" 
//                               size="sm" 
//                               onClick={() => setIsEditingMetadata(true)}
//                               className="h-8 px-2"
//                             >
//                               <Edit className="h-3.5 w-3.5 mr-1" />
//                               Edit
//                             </Button>
//                           ) : (
//                             <div className="flex space-x-2">
//                               <Button 
//                                 variant="ghost" 
//                                 size="sm" 
//                                 onClick={() => handleCancelEdit('metadata')}
//                                 className="h-8 px-2"
//                               >
//                                 <X className="h-3.5 w-3.5 mr-1" />
//                                 Cancel
//                               </Button>
//                               <Button 
//                                 variant="default" 
//                                 size="sm" 
//                                 onClick={handleSaveChanges}
//                                 className="h-8 px-2"
//                                 disabled={isSaving}
//                               >
//                                 {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
//                                 Save
//                               </Button>
//                             </div>
//                           )}
//                         </div>
                        
//                         <div className="space-y-3">
//                           <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
//                             <div className="text-xs font-medium">Calculation Method</div>
//                             {!isEditingMetadata ? (
//                               <div className="text-xs text-muted-foreground md:col-span-2">{metadata?.calculation}</div>
//                             ) : (
//                               <div className="md:col-span-2">
//                                 <Textarea
//                                   value={editedMetadata?.calculation}
//                                   onChange={(e) => handleMetadataChange('calculation', e.target.value)}
//                                   className="text-xs"
//                                   rows={2}
//                                 />
//                               </div>
//                             )}
//                           </div>
//                           <Separator />
                          
//                           <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
//                             <div className="text-xs font-medium">Data Source</div>
//                             {!isEditingMetadata ? (
//                               <div className="text-xs text-muted-foreground md:col-span-2">{metadata?.dataSource}</div>
//                             ) : (
//                               <div className="md:col-span-2">
//                                 <Input
//                                   value={editedMetadata?.dataSource}
//                                   onChange={(e) => handleMetadataChange('dataSource', e.target.value)}
//                                   className="text-xs"
//                                 />
//                               </div>
//                             )}
//                           </div>
//                           <Separator />
                          
//                           <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
//                             <div className="text-xs font-medium">Update Frequency</div>
//                             {!isEditingMetadata ? (
//                               <div className="text-xs text-muted-foreground md:col-span-2">{metadata?.updateFrequency}</div>
//                             ) : (
//                               <div className="md:col-span-2">
//                                 <Input
//                                   value={editedMetadata?.updateFrequency}
//                                   onChange={(e) => handleMetadataChange('updateFrequency', e.target.value)}
//                                   className="text-xs"
//                                 />
//                               </div>
//                             )}
//                           </div>
//                           <Separator />
                          
//                           <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
//                             <div className="text-xs font-medium">Metric Owner</div>
//                             {!isEditingMetadata ? (
//                               <div className="text-xs text-muted-foreground md:col-span-2">{metadata?.owner}</div>
//                             ) : (
//                               <div className="md:col-span-2">
//                                 <Input
//                                   value={editedMetadata?.owner}
//                                   onChange={(e) => handleMetadataChange('owner', e.target.value)}
//                                   className="text-xs"
//                                 />
//                               </div>
//                             )}
//                           </div>
//                           <Separator />
                          
//                           <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
//                             <div className="text-xs font-medium">Related Metrics</div>
//                             <div className="text-xs text-muted-foreground md:col-span-2 flex flex-wrap gap-1">
//                               {metadata?.relatedMetrics.map((relatedMetric) => (
//                                 <Badge key={relatedMetric.id} variant="outline" className="bg-primary/5">
//                                   {relatedMetric.name}
//                                 </Badge>
//                               ))}
//                             </div>
//                           </div>
//                           <Separator />
                          
//                           <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
//                             <div className="text-xs font-medium">Last Updated</div>
//                             <div className="text-xs text-muted-foreground md:col-span-2 flex items-center gap-1">
//                               <Calendar className="h-3 w-3" />
//                               {metric.lastUpdated}
//                             </div>
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   </TabsContent>
//                 </Tabs>
//               </CardContent>
//             </Card>
//           ) : null}
//         </main>
//       </div>
//     </div>
//   );
// };

// export default MetricDetail;