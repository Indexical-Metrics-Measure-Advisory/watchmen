/**
 * Interface representing a Business Topic.
 */
export interface Topic {
  /** Unique identifier for the topic */
  id: string;
  /** Display name of the topic */
  name: string;
  /** Description of the topic */
  description: string;
  /** Type of the topic */
  type: 'entity' | 'event' | 'aggregate';
  /** Number of fields in the topic */
  fields: number;
  /** List of relationships to other topics */
  relationships: string[];
}

/**
 * Interface representing a Data Space.
 */
export interface Space {
  /** Unique identifier for the space */
  id: string;
  /** Display name of the space */
  name: string;
  /** Description of the space */
  description: string;
  /** Type of the space */
  type: 'connected' | 'data_mart';
  /** List of topics included in the space */
  topics: string[];
  /** Number of subjects in the space */
  subjects: number;
}

/**
 * Interface representing a Data Catalog.
 */
export interface Catalog {
  /** Unique identifier for the catalog */
  id: string;
  /** Display name of the catalog */
  name: string;
  /** Description of the catalog */
  description: string;
  /** Business owner of the catalog */
  owner: string;
  /** Technical owner of the catalog */
  technicalOwner: string;
  /** List of tags associated with the catalog */
  tags: string[];
  /** List of topics within the catalog */
  topics: Topic[];
  /** List of related spaces */
  relatedSpaces: Space[];
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Status of the catalog */
  status: 'active' | 'deprecated';
  /** Sensitivity level of the data in the catalog */
  sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
  /** List of related domain relationships */
  relatedDomains?: DomainRelationship[];
}

/**
 * Interface representing a relationship to another Business Domain.
 */
export interface DomainRelationship {
  /** The ID of the related domain */
  domainId: string;
  /** The name/type of the relationship (e.g., "Depends on", "Upstream") */
  relationshipType: string;
  /** Optional description of the relationship */
  description?: string;
}
