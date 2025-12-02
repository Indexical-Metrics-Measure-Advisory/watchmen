/**
 * 数据目录服务层
 * 包含API调用和Mock数据
 */

import {
  DataProduct,
  DataCatalogQuery,
  DataCatalogResponse,
  DataCatalogStats,
  DataProductStatus,
  DataProductType,
  DataProductVisibility,
  DataProductArchetype,
  DataQualityLevel
} from '../model/DataCatalog';

// Mock数据
const mockDataProducts: DataProduct[] = [
  {
    product: {
      en: {
        name: "Customer Demographics Dataset",
        productID: "customer-demographics-001",
        visibility: DataProductVisibility.INTERNAL,
        status: DataProductStatus.ACTIVE,
        type: DataProductType.DATASET,
        description: "Comprehensive customer demographic data including age, location, and preferences",
        version: "1.2.0",
        archetype: DataProductArchetype.SOURCE_ALIGNED,
        owner: "Data Analytics Team",
        domain: "Customer Intelligence",
        tags: ["demographics", "customer", "analytics", "segmentation"]
      }
    },
    dataHolder: {
      name: "Alice Johnson",
      email: "alice.johnson@company.com",
      role: "Data Product Owner",
      telephone: "+1-555-0123"
    },
    outputPorts: [
      {
        id: "customer-demo-csv",
        name: "Customer Demographics CSV",
        description: "CSV export of customer demographic data",
        type: "CSV",
        status: DataProductStatus.ACTIVE,
        location: "s3://data-lake/customer-demographics/",
        containsPii: true,
        dataQuality: DataQualityLevel.GOLD,
        format: "CSV",
        tags: ["csv", "export"]
      },
      {
        id: "customer-demo-api",
        name: "Customer Demographics API",
        description: "REST API for accessing customer demographic data",
        type: "REST API",
        status: DataProductStatus.ACTIVE,
        location: "https://api.company.com/v1/customer-demographics",
        containsPii: true,
        dataQuality: DataQualityLevel.GOLD,
        format: "JSON",
        tags: ["api", "rest"]
      }
    ],
    sla: {
      availability: 99.9,
      responseTime: 200,
      throughput: 1000,
      healthStatus: 'healthy',
      lastUpdated: '2024-01-15T10:30:00Z'
    },
    pricingPlans: [
      {
        id: "basic",
        name: "Basic Access",
        description: "Limited access to customer demographics",
        price: 0,
        currency: "USD",
        billingPeriod: "free",
        features: ["Read-only access", "Up to 1000 records/month"]
      },
      {
        id: "premium",
        name: "Premium Access",
        description: "Full access to customer demographics with advanced features",
        price: 299,
        currency: "USD",
        billingPeriod: "monthly",
        features: ["Full read/write access", "Unlimited records", "Real-time updates", "Priority support"]
      }
    ],
    license: {
      name: "Internal Use Only",
      description: "Data is for internal company use only",
      permissions: ["read", "analyze"],
      limitations: ["no-redistribution", "internal-only"],
      conditions: ["attribution-required"]
    },
    links: {
      documentation: "https://docs.company.com/data-products/customer-demographics",
      repository: "https://github.com/company/customer-demographics-dp",
      support: "https://support.company.com/data-products"
    },
    createdAt: '2023-06-15T08:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  },
  {
    product: {
      en: {
        name: "Insurance Claims Prediction Model",
        productID: "claims-prediction-ml-001",
        visibility: DataProductVisibility.PRIVATE,
        status: DataProductStatus.ACTIVE,
        type: DataProductType.MODEL,
        description: "Machine learning model for predicting insurance claim likelihood and amounts",
        version: "2.1.0",
        archetype: DataProductArchetype.CONSUMER_ALIGNED,
        owner: "ML Engineering Team",
        domain: "Risk Assessment",
        tags: ["machine-learning", "prediction", "claims", "risk-assessment"]
      }
    },
    dataHolder: {
      name: "Bob Chen",
      email: "bob.chen@company.com",
      role: "ML Engineer",
      telephone: "+1-555-0456"
    },
    outputPorts: [
      {
        id: "claims-prediction-api",
        name: "Claims Prediction API",
        description: "REST API for claims prediction inference",
        type: "ML API",
        status: DataProductStatus.ACTIVE,
        location: "https://ml-api.company.com/v2/claims-prediction",
        containsPii: false,
        dataQuality: DataQualityLevel.GOLD,
        format: "JSON",
        tags: ["ml", "api", "prediction"]
      }
    ],
    inputPorts: [
      {
        id: "claims-training-data",
        name: "Claims Training Data",
        description: "Historical claims data for model training",
        type: "Dataset",
        status: DataProductStatus.ACTIVE,
        location: "s3://ml-data/claims-training/",
        format: "Parquet",
        tags: ["training", "historical"]
      }
    ],
    sla: {
      availability: 99.95,
      responseTime: 150,
      throughput: 500,
      healthStatus: 'healthy',
      lastUpdated: '2024-01-16T14:20:00Z'
    },
    pricingPlans: [
      {
        id: "enterprise",
        name: "Enterprise ML Access",
        description: "Full access to ML prediction models",
        price: 1999,
        currency: "USD",
        billingPeriod: "monthly",
        features: ["Unlimited predictions", "Custom model training", "24/7 support", "SLA guarantee"]
      }
    ],
    license: {
      name: "Proprietary",
      description: "Proprietary machine learning model",
      permissions: ["inference"],
      limitations: ["no-reverse-engineering", "no-redistribution"],
      conditions: ["commercial-use-only"]
    },
    createdAt: '2023-09-20T12:00:00Z',
    updatedAt: '2024-01-16T14:20:00Z'
  },
  {
    product: {
      en: {
        name: "Real-time Policy Events Stream",
        productID: "policy-events-stream-001",
        visibility: DataProductVisibility.INTERNAL,
        status: DataProductStatus.ACTIVE,
        type: DataProductType.STREAM,
        description: "Real-time stream of policy lifecycle events including creation, updates, and cancellations",
        version: "1.0.0",
        archetype: DataProductArchetype.SOURCE_ALIGNED,
        owner: "Platform Engineering Team",
        domain: "Policy Management",
        tags: ["real-time", "events", "policy", "streaming"]
      }
    },
    dataHolder: {
      name: "Carol Davis",
      email: "carol.davis@company.com",
      role: "Platform Engineer"
    },
    outputPorts: [
      {
        id: "policy-events-kafka",
        name: "Policy Events Kafka Topic",
        description: "Kafka topic containing real-time policy events",
        type: "Kafka",
        status: DataProductStatus.ACTIVE,
        location: "kafka://kafka.company.com:9092/policy-events",
        containsPii: true,
        dataQuality: DataQualityLevel.SILVER,
        format: "Avro",
        tags: ["kafka", "streaming", "avro"]
      }
    ],
    sla: {
      availability: 99.99,
      responseTime: 50,
      throughput: 10000,
      healthStatus: 'healthy',
      lastUpdated: '2024-01-16T16:45:00Z'
    },
    createdAt: '2023-11-10T09:30:00Z',
    updatedAt: '2024-01-16T16:45:00Z'
  },
  {
    product: {
      en: {
        name: "Market Research API",
        productID: "market-research-api-001",
        visibility: DataProductVisibility.PUBLIC,
        status: DataProductStatus.ACTIVE,
        type: DataProductType.API,
        description: "Public API providing insurance market trends and competitive analysis",
        version: "1.5.0",
        archetype: DataProductArchetype.CONSUMER_ALIGNED,
        owner: "Business Intelligence Team",
        domain: "Market Intelligence",
        tags: ["market-research", "trends", "competitive-analysis", "public"]
      }
    },
    dataHolder: {
      name: "David Wilson",
      email: "david.wilson@company.com",
      role: "BI Analyst"
    },
    outputPorts: [
      {
        id: "market-trends-api",
        name: "Market Trends API",
        description: "REST API for market trends data",
        type: "REST API",
        status: DataProductStatus.ACTIVE,
        location: "https://public-api.company.com/v1/market-trends",
        containsPii: false,
        dataQuality: DataQualityLevel.SILVER,
        format: "JSON",
        tags: ["api", "public", "trends"]
      }
    ],
    sla: {
      availability: 99.5,
      responseTime: 300,
      throughput: 2000,
      healthStatus: 'healthy',
      lastUpdated: '2024-01-16T11:15:00Z'
    },
    pricingPlans: [
      {
        id: "free-tier",
        name: "Free Tier",
        description: "Limited access to market research data",
        price: 0,
        currency: "USD",
        billingPeriod: "free",
        features: ["100 API calls/day", "Basic market trends"]
      },
      {
        id: "professional",
        name: "Professional",
        description: "Enhanced access with detailed analytics",
        price: 99,
        currency: "USD",
        billingPeriod: "monthly",
        features: ["10,000 API calls/day", "Detailed analytics", "Historical data"]
      }
    ],
    license: {
      name: "Creative Commons Attribution",
      url: "https://creativecommons.org/licenses/by/4.0/",
      description: "Data can be used with attribution",
      permissions: ["read", "distribute", "modify"],
      conditions: ["attribution-required"]
    },
    createdAt: '2023-08-05T14:20:00Z',
    updatedAt: '2024-01-16T11:15:00Z'
  },
  {
    product: {
      en: {
        name: "Legacy Claims Database",
        productID: "legacy-claims-db-001",
        visibility: DataProductVisibility.INTERNAL,
        status: DataProductStatus.DEPRECATED,
        type: DataProductType.DATASET,
        description: "Legacy claims database - being migrated to new system",
        version: "0.9.0",
        archetype: DataProductArchetype.SOURCE_ALIGNED,
        owner: "Legacy Systems Team",
        domain: "Claims Processing",
        tags: ["legacy", "claims", "deprecated", "migration"]
      }
    },
    dataHolder: {
      name: "Eve Martinez",
      email: "eve.martinez@company.com",
      role: "Legacy Systems Maintainer"
    },
    outputPorts: [
      {
        id: "legacy-claims-export",
        name: "Legacy Claims Export",
        description: "Batch export from legacy claims system",
        type: "Database Export",
        status: DataProductStatus.DEPRECATED,
        location: "ftp://legacy.company.com/claims-export/",
        containsPii: true,
        dataQuality: DataQualityLevel.BRONZE,
        format: "XML",
        tags: ["legacy", "batch", "xml"]
      }
    ],
    sla: {
      availability: 95.0,
      responseTime: 5000,
      throughput: 10,
      healthStatus: 'degraded',
      lastUpdated: '2024-01-10T08:00:00Z'
    },
    createdAt: '2020-03-15T10:00:00Z',
    updatedAt: '2024-01-10T08:00:00Z'
  }
];

// 模拟统计数据
const mockStats: DataCatalogStats = {
  totalProducts: mockDataProducts.length,
  activeProducts: mockDataProducts.filter(p => p.product.en.status === DataProductStatus.ACTIVE).length,
  totalDomains: [...new Set(mockDataProducts.map(p => p.product.en.domain).filter(Boolean))].length,
  totalOwners: [...new Set(mockDataProducts.map(p => p.product.en.owner).filter(Boolean))].length,
  productsByType: {
    [DataProductType.DATASET]: mockDataProducts.filter(p => p.product.en.type === DataProductType.DATASET).length,
    [DataProductType.API]: mockDataProducts.filter(p => p.product.en.type === DataProductType.API).length,
    [DataProductType.STREAM]: mockDataProducts.filter(p => p.product.en.type === DataProductType.STREAM).length,
    [DataProductType.MODEL]: mockDataProducts.filter(p => p.product.en.type === DataProductType.MODEL).length,
  },
  productsByStatus: {
    [DataProductStatus.DRAFT]: mockDataProducts.filter(p => p.product.en.status === DataProductStatus.DRAFT).length,
    [DataProductStatus.ACTIVE]: mockDataProducts.filter(p => p.product.en.status === DataProductStatus.ACTIVE).length,
    [DataProductStatus.DEPRECATED]: mockDataProducts.filter(p => p.product.en.status === DataProductStatus.DEPRECATED).length,
    [DataProductStatus.RETIRED]: mockDataProducts.filter(p => p.product.en.status === DataProductStatus.RETIRED).length,
  },
  productsByQuality: {
    [DataQualityLevel.BRONZE]: 1,
    [DataQualityLevel.SILVER]: 2,
    [DataQualityLevel.GOLD]: 2,
  }
};

/**
 * 数据目录服务类
 */
export class DataCatalogService {
  private baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3030';

  /**
   * 获取数据产品列表
   */
  async getDataProducts(query?: DataCatalogQuery): Promise<DataCatalogResponse> {
    try {
      // 在实际环境中，这里会调用真实的API
      // const response = await fetch(`${this.baseUrl}/api/data-catalog/products`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(query)
      // });
      // return await response.json();

      // 模拟API延迟
      await new Promise(resolve => setTimeout(resolve, 500));

      // 应用过滤器
      let filteredProducts = [...mockDataProducts];
      
      if (query?.filter) {
        const { filter } = query;
        
        if (filter.status?.length) {
          filteredProducts = filteredProducts.filter(p => 
            filter.status!.includes(p.product.en.status)
          );
        }
        
        if (filter.type?.length) {
          filteredProducts = filteredProducts.filter(p => 
            filter.type!.includes(p.product.en.type)
          );
        }
        
        if (filter.domain?.length) {
          filteredProducts = filteredProducts.filter(p => 
            p.product.en.domain && filter.domain!.includes(p.product.en.domain)
          );
        }
        
        if (filter.owner?.length) {
          filteredProducts = filteredProducts.filter(p => 
            p.product.en.owner && filter.owner!.includes(p.product.en.owner)
          );
        }
        
        if (filter.visibility?.length) {
          filteredProducts = filteredProducts.filter(p => 
            filter.visibility!.includes(p.product.en.visibility)
          );
        }
        
        if (filter.tags?.length) {
          filteredProducts = filteredProducts.filter(p => 
            p.product.en.tags?.some(tag => filter.tags!.includes(tag))
          );
        }
        
        if (filter.searchQuery) {
          const searchLower = filter.searchQuery.toLowerCase();
          filteredProducts = filteredProducts.filter(p => 
            p.product.en.name.toLowerCase().includes(searchLower) ||
            p.product.en.description?.toLowerCase().includes(searchLower) ||
            p.product.en.tags?.some(tag => tag.toLowerCase().includes(searchLower))
          );
        }
      }

      // 应用排序
      if (query?.sort) {
        const { field, direction } = query.sort;
        filteredProducts.sort((a, b) => {
          let aValue: any, bValue: any;
          
          switch (field) {
            case 'name':
              aValue = a.product.en.name;
              bValue = b.product.en.name;
              break;
            case 'createdAt':
              aValue = new Date(a.createdAt || 0);
              bValue = new Date(b.createdAt || 0);
              break;
            case 'updatedAt':
              aValue = new Date(a.updatedAt || 0);
              bValue = new Date(b.updatedAt || 0);
              break;
            default:
              aValue = a.product.en.name;
              bValue = b.product.en.name;
          }
          
          if (direction === 'desc') {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
          } else {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
          }
        });
      }

      // 应用分页
      const page = query?.pagination?.page || 1;
      const pageSize = query?.pagination?.pageSize || 10;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

      // 生成facets
      const facets = {
        domains: this.generateFacets(filteredProducts, p => p.product.en.domain),
        owners: this.generateFacets(filteredProducts, p => p.product.en.owner),
        types: this.generateTypeFacets(filteredProducts),
        tags: this.generateTagFacets(filteredProducts)
      };

      return {
        products: paginatedProducts,
        pagination: {
          page,
          pageSize,
          total: filteredProducts.length
        },
        facets
      };
    } catch (error) {
      console.error('Error fetching data products:', error);
      throw new Error('Failed to fetch data products');
    }
  }

  /**
   * 根据ID获取单个数据产品
   */
  async getDataProduct(productId: string): Promise<DataProduct | null> {
    try {
      // 在实际环境中调用API
      // const response = await fetch(`${this.baseUrl}/api/data-catalog/products/${productId}`);
      // return await response.json();

      // 模拟API延迟
      await new Promise(resolve => setTimeout(resolve, 300));

      const product = mockDataProducts.find(p => p.product.en.productID === productId);
      return product || null;
    } catch (error) {
      console.error('Error fetching data product:', error);
      throw new Error('Failed to fetch data product');
    }
  }

  /**
   * 更新数据产品
   */
  async updateDataProduct(productId: string, updateData: Partial<DataProduct>): Promise<DataProduct> {
    try {
      // 在实际环境中调用API
      // const response = await fetch(`${this.baseUrl}/api/data-catalog/products/${productId}`, {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(updateData),
      // });
      // if (!response.ok) {
      //   throw new Error(`HTTP error! status: ${response.status}`);
      // }
      // return await response.json();

      // 模拟API延迟
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock实现
      const productIndex = mockDataProducts.findIndex(p => p.product.en.productID === productId);
      if (productIndex === -1) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      // 深度合并更新数据与现有产品
      const existingProduct = mockDataProducts[productIndex];
      const updatedProduct = {
        ...existingProduct,
        ...updateData,
        product: {
          ...existingProduct.product,
          en: {
            ...existingProduct.product.en,
            ...(updateData.product?.en || {})
          }
        },
        dataHolder: {
          ...existingProduct.dataHolder,
          ...(updateData.dataHolder || {})
        },
        links: {
          ...existingProduct.links,
          ...(updateData.links || {})
        },
        updatedAt: new Date().toISOString()
      };

      // 更新mock数据
      mockDataProducts[productIndex] = updatedProduct;

      return updatedProduct;
    } catch (error) {
      console.error('Error updating data product:', error);
      throw new Error('Failed to update data product');
    }
  }

  /**
   * 获取数据目录统计信息
   */
  async getDataCatalogStats(): Promise<DataCatalogStats> {
    try {
      // 在实际环境中调用API
      // const response = await fetch(`${this.baseUrl}/api/data-catalog/stats`);
      // return await response.json();

      // 模拟API延迟
      await new Promise(resolve => setTimeout(resolve, 200));

      return mockStats;
    } catch (error) {
      console.error('Error fetching data catalog stats:', error);
      throw new Error('Failed to fetch data catalog stats');
    }
  }

  /**
   * 搜索数据产品
   */
  async searchDataProducts(searchQuery: string): Promise<DataProduct[]> {
    const query: DataCatalogQuery = {
        filter: { searchQuery },
        pagination: { page: 1, pageSize: 50, total: 0 }
      };
    
    const response = await this.getDataProducts(query);
    return response.products;
  }

  /**
   * 生成facets统计
   */
  private generateFacets<T>(products: DataProduct[], extractor: (p: DataProduct) => T | undefined): Array<{ name: string; count: number }> {
    const counts = new Map<string, number>();
    
    products.forEach(product => {
      const value = extractor(product);
      if (value) {
        const key = String(value);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });
    
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * 生成类型facets
   */
  private generateTypeFacets(products: DataProduct[]): Array<{ type: DataProductType; count: number }> {
    const typeCounts = new Map<DataProductType, number>();
    
    products.forEach(product => {
      const type = product.product.en.type;
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    });
    
    return Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * 生成标签facets
   */
  private generateTagFacets(products: DataProduct[]): Array<{ tag: string; count: number }> {
    const tagCounts = new Map<string, number>();
    
    products.forEach(product => {
      product.product.en.tags?.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });
    
    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }
}

// 导出服务实例
export const dataCatalogService = new DataCatalogService();