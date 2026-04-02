export type OntologyConceptType = 'entity' | 'event' | 'aggregate';
export type SemanticViewType = 'connected' | 'data_mart';
export type OntologyStatus = 'active' | 'deprecated';
export type OntologySensitivity = 'public' | 'internal' | 'confidential' | 'restricted';

export interface OntologyConcept {
  id: string;
  name: string;
  description: string;
  type: OntologyConceptType;
  fields: number;
  relationships: string[];
}

export interface SemanticView {
  id: string;
  name: string;
  description: string;
  type: SemanticViewType;
  topics: string[];
  subjects: number;
}

export interface OntologyRelationship {
  domainId: string;
  relationshipType: string;
  description?: string;
}

export interface OntologyDomain {
  id: string;
  name: string;
  description: string;
  owner: string;
  technicalOwner: string;
  tags: string[];
  concepts: OntologyConcept[];
  semanticViews: SemanticView[];
  createdAt: string;
  updatedAt: string;
  status: OntologyStatus;
  sensitivity: OntologySensitivity;
  relatedDomains?: OntologyRelationship[];
}

export const sensitivityConfig: Record<OntologySensitivity, { label: string; className: string; icon: string }> = {
  public: { label: 'Public', className: 'bg-green-100 text-green-700', icon: '🌍' },
  internal: { label: 'Internal', className: 'bg-blue-100 text-blue-700', icon: '🏢' },
  confidential: { label: 'Confidential', className: 'bg-orange-100 text-orange-700', icon: '🔒' },
  restricted: { label: 'Restricted', className: 'bg-red-100 text-red-700', icon: '🚨' }
};

export const conceptTypeConfig: Record<OntologyConceptType, { label: string; className: string; icon: string }> = {
  entity: { label: 'Ontology Class', className: 'bg-blue-100 text-blue-700', icon: '📦' },
  event: { label: 'Ontology Event', className: 'bg-purple-100 text-purple-700', icon: '⚡' },
  aggregate: { label: 'Aggregate Concept', className: 'bg-green-100 text-green-700', icon: '📊' }
};

export const INITIAL_ONTOLOGY_DOMAINS: OntologyDomain[] = [
  {
    id: 'cat-001',
    name: 'Policy Business Management (PA)',
    description: 'Manages the ontology for the entire lifecycle of policies from underwriting to termination.',
    owner: 'Insurance Business Team',
    technicalOwner: 'Data Platform Team',
    tags: ['Core Business', 'PII Sensitive', 'High Value', 'PA'],
    status: 'active',
    sensitivity: 'confidential',
    concepts: [
      {
        id: 'topic-pa-001',
        name: 'DM_PA_POLICY_HIS',
        description: 'Core ontology class for policy basic information and status.',
        type: 'entity',
        fields: 45,
        relationships: ['DM_PTY_PERSON_HIS', 'DM_CLM_CLAIM_CASE_HIS']
      },
      {
        id: 'topic-pa-003',
        name: 'DM_PA_POLICY_CHANGE_HIS',
        description: 'Ontology event describing policy change lifecycle events.',
        type: 'event',
        fields: 28,
        relationships: ['DM_PA_POLICY_HIS']
      }
    ],
    semanticViews: [
      {
        id: 'space-pa-001',
        name: 'Policy_Lifecycle_Wide',
        description: 'Semantic view across the policy lifecycle.',
        type: 'connected',
        topics: ['DM_PA_POLICY_HIS', 'DM_PA_POLICY_CHANGE_HIS', 'DM_PTY_PERSON_HIS'],
        subjects: 8
      }
    ],
    relatedDomains: [
      { domainId: 'cat-003', relationshipType: 'Depends on' },
      { domainId: 'cat-002', relationshipType: 'Provides data to' }
    ],
    createdAt: '2024-01-15',
    updatedAt: '2024-12-20'
  },
  {
    id: 'cat-002',
    name: 'Claims Service Management (CLM)',
    description: 'Defines the claims ontology from reporting to payment completion.',
    owner: 'Claims Operations Team',
    technicalOwner: 'Data Engineering Team',
    tags: ['Core Business', 'Financial Critical', 'Real-time', 'CLM'],
    status: 'active',
    sensitivity: 'restricted',
    concepts: [
      {
        id: 'topic-clm-001',
        name: 'DM_CLM_CLAIM_CASE_HIS',
        description: 'Ontology class for claim case records and status.',
        type: 'entity',
        fields: 38,
        relationships: ['DM_PA_POLICY_HIS', 'DM_PTY_PERSON_HIS']
      },
      {
        id: 'topic-clm-002',
        name: 'DM_CLM_ASSESSMENT_HIS',
        description: 'Aggregate concept for claims assessment outcomes.',
        type: 'aggregate',
        fields: 25,
        relationships: ['DM_CLM_CLAIM_CASE_HIS']
      }
    ],
    semanticViews: [
      {
        id: 'space-clm-001',
        name: 'Claims_Analysis_Wide',
        description: 'Claims semantic analysis mart.',
        type: 'data_mart',
        topics: ['DM_CLM_CLAIM_CASE_HIS', 'DM_CLM_ASSESSMENT_HIS', 'DM_PA_POLICY_HIS'],
        subjects: 6
      }
    ],
    relatedDomains: [{ domainId: 'cat-001', relationshipType: 'Depends on' }],
    createdAt: '2024-02-10',
    updatedAt: '2024-12-18'
  },
  {
    id: 'cat-003',
    name: 'Customer Information Management (PTY)',
    description: 'Master ontology for individual and corporate customer data.',
    owner: 'CRM Team',
    technicalOwner: 'Data Platform Team',
    tags: ['Core Business', 'PII Sensitive', 'Master Data', 'PTY'],
    status: 'active',
    sensitivity: 'confidential',
    concepts: [
      {
        id: 'topic-pty-001',
        name: 'DM_PTY_PERSON_HIS',
        description: 'Ontology class for individual customer base data.',
        type: 'entity',
        fields: 52,
        relationships: ['DM_PA_POLICY_HIS', 'DM_CLM_CLAIM_CASE_HIS']
      }
    ],
    semanticViews: [
      {
        id: 'space-pty-001',
        name: 'Customer_360_Wide',
        description: 'Semantic view for the customer 360 perspective.',
        type: 'connected',
        topics: ['DM_PTY_PERSON_HIS', 'DM_PA_POLICY_HIS', 'DM_CLM_CLAIM_CASE_HIS'],
        subjects: 5
      }
    ],
    relatedDomains: [],
    createdAt: '2024-01-20',
    updatedAt: '2024-12-22'
  }
];
