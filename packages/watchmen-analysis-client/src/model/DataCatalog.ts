/**
 * 数据目录相关的数据模型
 * 参考 Open Data Product Specification (ODPS) 2.1
 */

// 数据产品状态枚举
export enum DataProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  DEPRECATED = 'deprecated',
  RETIRED = 'retired'
}

// 数据产品可见性枚举
export enum DataProductVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  INTERNAL = 'internal'
}

// 数据产品类型枚举
export enum DataProductType {
  DATASET = 'dataset',
  API = 'api',
  STREAM = 'stream',
  MODEL = 'model'
}

// 数据产品架构类型
export enum DataProductArchetype {
  SOURCE_ALIGNED = 'source-aligned',
  CONSUMER_ALIGNED = 'consumer-aligned',
  AGGREGATE = 'aggregate'
}

// 数据质量等级
export enum DataQualityLevel {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold'
}

// 数据产品基本信息接口
export interface DataProductInfo {
  name: string;
  productID: string;
  
  visibility: DataProductVisibility;
  status: DataProductStatus;
  type: DataProductType;
  description?: string;
  version?: string;
  archetype?: DataProductArchetype;
  owner?: string;
  domain?: string;
  tags?: string[];
}

// 数据产品联系人信息
export interface DataProductContact {
  name: string;
  email: string;
  role?: string;
  telephone?: string;
}

// 数据产品链接信息
export interface DataProductLinks {
  documentation?: string;
  repository?: string;
  support?: string;
  homepage?: string;
  [key: string]: string | undefined;
}

// 数据产品输出端口
export interface DataProductOutputPort {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: DataProductStatus;
  location?: string;
  containsPii: boolean;
  dataQuality?: DataQualityLevel;
  format?: string;
  schema?: any;
  links?: DataProductLinks;
  tags?: string[];
  custom?: Record<string, any>;
}

// 数据产品输入端口
export interface DataProductInputPort {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: DataProductStatus;
  location?: string;
  format?: string;
  schema?: any;
  tags?: string[];
}

// 数据产品SLA信息
export interface DataProductSLA {
  availability?: number; // 可用性百分比
  responseTime?: number; // 响应时间（毫秒）
  throughput?: number; // 吞吐量
  healthStatus?: 'healthy' | 'degraded' | 'unhealthy';
  lastUpdated?: string;
}

// 数据产品定价计划
export interface DataProductPricingPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  billingPeriod: 'monthly' | 'yearly' | 'usage-based' | 'free';
  features?: string[];
  limitations?: Record<string, any>;
}

// 数据产品许可证信息
export interface DataProductLicense {
  name: string;
  url?: string;
  description?: string;
  permissions?: string[];
  limitations?: string[];
  conditions?: string[];
}

// 完整的数据产品模型
export interface DataProduct {
  // 基本信息（多语言支持）
  product: {
    [languageCode: string]: DataProductInfo;
  };
  
  // 联系人信息
  dataHolder?: DataProductContact;
  dataController?: DataProductContact;
  
  // 技术信息
  inputPorts?: DataProductInputPort[];
  outputPorts?: DataProductOutputPort[];
  
  // 服务级别协议
  sla?: DataProductSLA;
  
  // 定价信息
  pricingPlans?: DataProductPricingPlan[];
  
  // 许可证信息
  license?: DataProductLicense;
  
  // 链接信息
  links?: DataProductLinks;
  
  // 自定义属性
  custom?: Record<string, any>;
  
  // 创建和更新时间
  createdAt?: string;
  updatedAt?: string;
}

// 数据目录过滤器
export interface DataCatalogFilter {
  status?: DataProductStatus[];
  type?: DataProductType[];
  domain?: string[];
  owner?: string[];
  tags?: string[];
  visibility?: DataProductVisibility[];
  dataQuality?: DataQualityLevel[];
  searchQuery?: string;
}

// 数据目录排序选项
export interface DataCatalogSort {
  field: 'name' | 'createdAt' | 'updatedAt' | 'popularity';
  direction: 'asc' | 'desc';
}

// 数据目录分页信息
export interface DataCatalogPagination {
  page: number;
  pageSize: number;
  total: number;
}

// 数据目录查询参数
export interface DataCatalogQuery {
  filter?: DataCatalogFilter;
  sort?: DataCatalogSort;
  pagination?: DataCatalogPagination;
}

// 数据目录响应
export interface DataCatalogResponse {
  products: DataProduct[];
  pagination: DataCatalogPagination;
  facets?: {
    domains: Array<{ name: string; count: number }>;
    owners: Array<{ name: string; count: number }>;
    types: Array<{ type: DataProductType; count: number }>;
    tags: Array<{ tag: string; count: number }>;
  };
}

// 数据产品统计信息
export interface DataCatalogStats {
  totalProducts: number;
  activeProducts: number;
  totalDomains: number;
  totalOwners: number;
  productsByType: Record<DataProductType, number>;
  productsByStatus: Record<DataProductStatus, number>;
  productsByQuality: Record<DataQualityLevel, number>;
}

// ==================== UI 组件相关模型 ====================

// 侧边栏菜单项类型
export enum SidebarItemType {
  LINK = 'link',
  CATEGORY = 'category',
  DIVIDER = 'divider'
}

// 侧边栏菜单项
export interface SidebarMenuItem {
  id: string;
  type: SidebarItemType;
  label?: string;
  icon?: string;
  path?: string;
  badge?: string | number;
  children?: SidebarMenuItem[];
  isActive?: boolean;
  isExpanded?: boolean;
  permissions?: string[];
}

// 侧边栏配置
export interface DataCatalogSidebarConfig {
  title: string;
  logo?: string;
  menuItems: SidebarMenuItem[];
  isCollapsed?: boolean;
  showSearch?: boolean;
  searchPlaceholder?: string;
  footer?: {
    text?: string;
    links?: Array<{ label: string; url: string }>;
  };
}

// 头部导航项
export interface HeaderNavItem {
  id: string;
  label: string;
  path?: string;
  icon?: string;
  badge?: string | number;
  children?: HeaderNavItem[];
  isActive?: boolean;
  permissions?: string[];
}

// 用户信息
export interface HeaderUserInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  department?: string;
  permissions?: string[];
}

// 头部通知项
export interface HeaderNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

// 头部配置
export interface DataCatalogHeaderConfig {
  title: string;
  logo?: string;
  navigation: HeaderNavItem[];
  showSearch?: boolean;
  searchPlaceholder?: string;
  showNotifications?: boolean;
  showUserMenu?: boolean;
  userInfo?: HeaderUserInfo;
  notifications?: HeaderNotification[];
  maxNotifications?: number;
  theme?: 'light' | 'dark' | 'auto';
}

// 数据目录布局配置
export interface DataCatalogLayoutConfig {
  header: DataCatalogHeaderConfig;
  sidebar: DataCatalogSidebarConfig;
  content: {
    showBreadcrumb?: boolean;
    showPageTitle?: boolean;
    showStats?: boolean;
    defaultView?: 'grid' | 'list';
    itemsPerPage?: number;
  };
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
  };
}