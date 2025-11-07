// Data discovery models for database dictionary visualization

// Database entity types
export enum EntityType {
  TABLE = 'table',
  VIEW = 'view',
  PROCEDURE = 'procedure',
  FUNCTION = 'function'
}

// Relationship types between database entities
export enum RelationshipType {
  ONE_TO_ONE = 'one-to-one',
  ONE_TO_MANY = 'one-to-many',
  MANY_TO_MANY = 'many-to-many'
}

// Column data type information
export interface ColumnType {
  name: string;        // e.g., 'varchar', 'integer', etc.
  size?: number;       // e.g., varchar(255) -> size: 255
  precision?: number;  // For numeric types
  scale?: number;      // For numeric types
}

// Database column definition
export interface Column {
  id: string;
  name: string;
  description?: string;
  type: ColumnType;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isNullable: boolean;
  defaultValue?: string;
  referencedColumn?: ColumnReference;
}

// Reference to another column (for foreign keys)
export interface ColumnReference {
  tableId: string;
  tableName: string;
  columnId: string;
  columnName: string;
}

// Database table or view definition
export interface DatabaseEntity {
  id: string;
  name: string;
  schema: string;
  type: EntityType;
  description?: string;
  columns: Column[];
  relationships?: Relationship[];
}

// Relationship between database entities
export interface Relationship {
  id: string;
  name?: string;
  type: RelationshipType;
  sourceEntityId: string;
  targetEntityId: string;
  sourceColumns: string[];
  targetColumns: string[];
}

// Node representation for ReactFlow
export interface EntityNode {
  id: string;
  type: 'entity';
  data: {
    entity: DatabaseEntity;
    selected?: boolean;
  };
  position: { x: number; y: number };
}

// Edge representation for ReactFlow
export interface RelationshipEdge {
  id: string;
  source: string;
  target: string;
  type: 'relationship';
  data: {
    relationship: Relationship;
  };
}

// AI-generated insight about database structure
export interface DatabaseInsight {
  id: string;
  type: 'suggestion' | 'warning' | 'info';
  title: string;
  description: string;
  relatedEntities?: string[];
  confidence: number; // 0-1 value indicating AI confidence
}

// Discovery analysis result
export interface DiscoveryResult {
  entities: DatabaseEntity[];
  relationships: Relationship[];
  insights: DatabaseInsight[];
  timestamp: string;
}