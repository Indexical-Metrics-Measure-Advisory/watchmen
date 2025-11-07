import apiService from './api';
import { ApiResponse } from '../models/api.models';
import { DatabaseEntity, Relationship, DiscoveryResult, DatabaseInsight } from '../models/discovery.models';

// Discovery service class for database dictionary visualization
class DiscoveryService {
  private baseUrl = '/discovery';
  
  // Get all database entities (tables, views, etc.)
  public async getDatabaseEntities(): Promise<ApiResponse<DatabaseEntity[]>> {
    return apiService.get<DatabaseEntity[]>(`${this.baseUrl}/entities`);
  }
  
  // Get a specific database entity by ID
  public async getDatabaseEntity(id: string): Promise<ApiResponse<DatabaseEntity>> {
    return apiService.get<DatabaseEntity>(`${this.baseUrl}/entities/${id}`);
  }
  
  // Get all relationships between database entities
  public async getRelationships(): Promise<ApiResponse<Relationship[]>> {
    return apiService.get<Relationship[]>(`${this.baseUrl}/relationships`);
  }
  
  // Get relationships for a specific entity
  public async getEntityRelationships(entityId: string): Promise<ApiResponse<Relationship[]>> {
    return apiService.get<Relationship[]>(`${this.baseUrl}/entities/${entityId}/relationships`);
  }
  
  // Run AI analysis on database structure
  public async analyzeDatabase(): Promise<ApiResponse<DiscoveryResult>> {
    return apiService.post<DiscoveryResult>(`${this.baseUrl}/analyze`);
  }
  
  // Get AI-generated insights for database structure
  public async getDatabaseInsights(): Promise<ApiResponse<DatabaseInsight[]>> {
    return apiService.get<DatabaseInsight[]>(`${this.baseUrl}/insights`);
  }
  
  // Get AI-generated insights for a specific entity
  public async getEntityInsights(entityId: string): Promise<ApiResponse<DatabaseInsight[]>> {
    return apiService.get<DatabaseInsight[]>(`${this.baseUrl}/entities/${entityId}/insights`);
  }
  
  // Mock data for development and testing
  public getMockDatabaseEntities(): DatabaseEntity[] {
    return [
      {
        id: 'table1',
        name: 'customers',
        schema: 'public',
        type: 'table' as any,
        description: 'Customer information',
        columns: [
          {
            id: 'col1',
            name: 'id',
            type: { name: 'integer' },
            isPrimaryKey: true,
            isForeignKey: false,
            isNullable: false
          },
          {
            id: 'col2',
            name: 'name',
            type: { name: 'varchar', size: 255 },
            isPrimaryKey: false,
            isForeignKey: false,
            isNullable: false
          },
          {
            id: 'col3',
            name: 'email',
            type: { name: 'varchar', size: 255 },
            isPrimaryKey: false,
            isForeignKey: false,
            isNullable: true
          }
        ]
      },
      {
        id: 'table2',
        name: 'orders',
        schema: 'public',
        type: 'table' as any,
        description: 'Customer orders',
        columns: [
          {
            id: 'col4',
            name: 'id',
            type: { name: 'integer' },
            isPrimaryKey: true,
            isForeignKey: false,
            isNullable: false
          },
          {
            id: 'col5',
            name: 'customer_id',
            type: { name: 'integer' },
            isPrimaryKey: false,
            isForeignKey: true,
            isNullable: false,
            referencedColumn: {
              tableId: 'table1',
              tableName: 'customers',
              columnId: 'col1',
              columnName: 'id'
            }
          },
          {
            id: 'col6',
            name: 'order_date',
            type: { name: 'timestamp' },
            isPrimaryKey: false,
            isForeignKey: false,
            isNullable: false
          }
        ]
      },
      {
        id: 'table3',
        name: 'products',
        schema: 'public',
        type: 'table' as any,
        description: 'Product catalog',
        columns: [
          {
            id: 'col7',
            name: 'id',
            type: { name: 'integer' },
            isPrimaryKey: true,
            isForeignKey: false,
            isNullable: false
          },
          {
            id: 'col8',
            name: 'name',
            type: { name: 'varchar', size: 255 },
            isPrimaryKey: false,
            isForeignKey: false,
            isNullable: false
          },
          {
            id: 'col9',
            name: 'price',
            type: { name: 'decimal', precision: 10, scale: 2 },
            isPrimaryKey: false,
            isForeignKey: false,
            isNullable: false
          }
        ]
      },
      {
        id: 'table4',
        name: 'order_items',
        schema: 'public',
        type: 'table' as any,
        description: 'Order line items',
        columns: [
          {
            id: 'col10',
            name: 'id',
            type: { name: 'integer' },
            isPrimaryKey: true,
            isForeignKey: false,
            isNullable: false
          },
          {
            id: 'col11',
            name: 'order_id',
            type: { name: 'integer' },
            isPrimaryKey: false,
            isForeignKey: true,
            isNullable: false,
            referencedColumn: {
              tableId: 'table2',
              tableName: 'orders',
              columnId: 'col4',
              columnName: 'id'
            }
          },
          {
            id: 'col12',
            name: 'product_id',
            type: { name: 'integer' },
            isPrimaryKey: false,
            isForeignKey: true,
            isNullable: false,
            referencedColumn: {
              tableId: 'table3',
              tableName: 'products',
              columnId: 'col7',
              columnName: 'id'
            }
          },
          {
            id: 'col13',
            name: 'quantity',
            type: { name: 'integer' },
            isPrimaryKey: false,
            isForeignKey: false,
            isNullable: false
          }
        ]
      }
    ];
  }
  
  // Mock relationships for development and testing
  public getMockRelationships(): Relationship[] {
    return [
      {
        id: 'rel1',
        name: 'customers_orders',
        type: 'one-to-many' as any,
        sourceEntityId: 'table1',
        targetEntityId: 'table2',
        sourceColumns: ['col1'],
        targetColumns: ['col5']
      },
      {
        id: 'rel2',
        name: 'orders_order_items',
        type: 'one-to-many' as any,
        sourceEntityId: 'table2',
        targetEntityId: 'table4',
        sourceColumns: ['col4'],
        targetColumns: ['col11']
      },
      {
        id: 'rel3',
        name: 'products_order_items',
        type: 'one-to-many' as any,
        sourceEntityId: 'table3',
        targetEntityId: 'table4',
        sourceColumns: ['col7'],
        targetColumns: ['col12']
      }
    ];
  }
  
  // Mock insights for development and testing
  public getMockInsights(): DatabaseInsight[] {
    return [
      {
        id: 'insight1',
        type: 'suggestion',
        title: 'Add index to frequently queried column',
        description: 'Consider adding an index to the "order_date" column in the "orders" table to improve query performance.',
        relatedEntities: ['table2'],
        confidence: 0.85
      },
      {
        id: 'insight2',
        type: 'warning',
        title: 'Missing foreign key constraint',
        description: 'The relationship between "products" and "order_items" tables is not enforced by a foreign key constraint.',
        relatedEntities: ['table3', 'table4'],
        confidence: 0.92
      },
      {
        id: 'insight3',
        type: 'info',
        title: 'Potential data normalization issue',
        description: 'The "customers" table might benefit from being split into separate tables for personal and contact information.',
        relatedEntities: ['table1'],
        confidence: 0.78
      }
    ];
  }
}

// Export a singleton instance
const discoveryService = new DiscoveryService();
export default discoveryService;