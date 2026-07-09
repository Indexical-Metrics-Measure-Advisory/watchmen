// ============================================================================
// Business Glossary V2 Model
// Aligns with watchmen-metricflow backend Glossary/Category/Term model.
// ============================================================================

export type GlossaryStatus = 'active' | 'deprecated' | 'draft';
export type TermStatus = 'active' | 'deprecated' | 'draft';

export interface Glossary {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  language?: string;
  status: GlossaryStatus;
  owner?: string;
  tags?: string[];
  tenantId?: string;
}

export interface Category {
  id: string;
  name: string;
  qualified_name: string;
  description?: string;
  parent_category_id?: string;
  glossary_id?: string;
  order_index: number;
}

export interface TermEntityAssignment {
  entity_type: string;
  entity_id: string;
  entity_name?: string;
  relation_guid: string;
  confidence: number;
}

export interface Term {
  id: string;
  name: string;
  qualified_name: string;
  display_name?: string;
  description?: string;
  short_description?: string;
  abbreviation?: string;
  examples?: string[];
  status: TermStatus;
  glossary_id?: string;
  category_ids: string[];
  synonyms: string[];
  related_terms: string[];
  antonyms: string[];
  is_a: string[];
  assigned_entities: TermEntityAssignment[];
  owner?: string;
  steward?: string;
  source_url?: string;
}

export interface GlossaryBundle {
  glossary: Glossary;
  categories: Category[];
  terms: Term[];
}

// Upsert payloads
export interface GlossaryUpsert {
  id?: string;
  name: string;
  display_name?: string;
  description?: string;
  language?: string;
  status: GlossaryStatus;
  owner?: string;
  tags?: string[];
}

export interface CategoryUpsert {
  id?: string;
  name: string;
  description?: string;
  parent_category_id?: string;
  order_index: number;
}

export interface TermUpsert {
  id?: string;
  name: string;
  display_name?: string;
  description?: string;
  short_description?: string;
  abbreviation?: string;
  examples?: string[];
  status: TermStatus;
  category_ids: string[];
  synonyms: string[];
  related_terms: string[];
  antonyms: string[];
  is_a: string[];
  owner?: string;
  steward?: string;
  source_url?: string;
}

export interface TermEntityAssignmentUpsert {
  entity_type: string;
  entity_id: string;
  entity_name?: string;
  confidence: number;
}

export interface TermRelationUpsert {
  relation_type: 'synonym' | 'related' | 'antonym' | 'is_a';
  target_term_id: string;
}

export interface TermDeleteRequest {
  term_id: string;
}

export interface CategoryDeleteRequest {
  category_id: string;
}
