# Data Layer Architecture Guide

## Overview

DataMo uses a **four-layer data architecture** to organize topics:

1. **Bronze/Raw Layer** - Raw data ingestion
2. **Silver/ODS Layer** - Transactional data
3. **Gold/Domain Layer** - Business domain entities
4. **Datamart Layer** - Business-oriented wide tables

---

## Layer Definitions

### Layer 1: Bronze/Raw

**Purpose:** Ingest raw data from external systems without transformation.

**Characteristics:**
- `type: raw`
- Minimal schema enforcement
- Preserves original data format
- One topic per source system/table
- No business logic applied

**Naming:** `{source_system}_{raw_table_name}`

**Examples:**
| Topic Name | Description |
|------------|-------------|
| `source_crm_lead_raw` | Raw lead data from CRM system |
| `raw_pipeline_monitor_log` | Pipeline execution logs |
| `dqc_raw_rule_result` | Data quality check raw results |
| `crm_activity_event` | Raw CRM activity events |

---

### Layer 2: Silver/ODS

**Purpose:** Store transactional business events with full detail and traceability.

**Characteristics:**
- `type: distinct`
- Cleaned and normalized data
- Full business event details preserved
- Business keys for join/lookup
- Single source of truth per entity

**Naming:** `{business_entity}`

**Examples:**
| Topic Name | Description |
|------------|-------------|
| `crm_lead` | CRM lead records |
| `crm_opportunity` | Sales opportunity records |
| `crm_contact` | Customer contact records |
| `crm_account` | Customer account records |
| `crm_owner` | Sales owner records |

---

### Layer 3: Gold/Domain

**Purpose:** Domain-specific aggregates combining related business entities.

**Characteristics:**
- `type: distinct`
- Joined data from multiple Silver topics
- Domain-specific semantic layer
- Enriched with business context
- Business-ready for analysis

**Naming:** `{domain_entity}`

**Examples:**
| Topic Name | Description |
|------------|-------------|
| `customer_360_wide` | 360-degree customer view |
| `customer_account_relationship` | Customer-account relationship |
| `customer_lifecycle_value` | Customer lifecycle value analysis |

---

### Layer 4: Datamart

**Purpose:** Query-optimized wide tables for specific business use cases.

**Characteristics:**
- `type: aggregate` or `distinct` (wide table)
- Pre-aggregated metrics
- Denormalized structure
- Optimized for BI/reporting
- May combine multiple domains

**Naming:** `{datamart_name}`

**Examples:**
| Topic Name | Description |
|------------|-------------|
| `sales_pipeline_summary` | Sales pipeline summary by stage |
| `lead_conversion_agg` | Lead conversion metrics by dimension |
| `query_performance_summary` | Query performance metrics |
| `sales_performance_summary` | Sales performance metrics |

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW ARCHITECTURE                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  BRONZE/RAW LAYER                                                           │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  │
│  │ External Systems    │  │ Source Databases   │  │ Event Streams       │  │
│  │ • CRM Platform      │  │ • Customer DB       │  │ • Kafka Topics      │  │
│  │ • External API      │  │ • Sales DB          │  │ • Webhook Events    │  │
│  └──────────┬──────────┘  └──────────┬──────────┘  └──────────┬──────────┘  │
│             │                        │                        │            │
│             └────────────────────────┬┴────────────────────────┘            │
│                                     ▼                                         │
│                         ┌─────────────────────┐                              │
│                         │  Raw Topics         │                              │
│                         │  (type: raw)        │                              │
│                         │  • source_*          │                              │
│                         │  • *_raw             │                              │
│                         │  • *_log             │                              │
│                         └──────────┬──────────┘                              │
└─────────────────────────────────────┼────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  SILVER/ODS LAYER                                                           │
│                                     ┌─────────────────────┐                  │
│                                     │  ODS Topics        │                  │
│                                     │  (type: distinct)  │                  │
│                         ┌───────────►│  • crm_lead_*      │                  │
│                         │            │  • crm_account_*   │                  │
│                         │            │  • crm_contact_*   │                  │
│                         │            │  • crm_owner_*     │                  │
│                         │            └──────────┬──────────┘                  │
│                         │                       │                             │
│                         │            ┌──────────┴──────────┐                │
│                         │            │                     │                │
│                         │            ▼                     ▼                │
│                         │   ┌────────────────┐    ┌────────────────┐       │
│                         │   │ crm_lead      │    │ crm_contact    │       │
│                         │   └────────────────┘    └────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  GOLD/DOMAIN LAYER                                                          │
│                                     ┌─────────────────────┐                  │
│                                     │  Domain Topics      │                  │
│                                     │  (type: distinct)   │                  │
│                         ┌───────────│  • customer_360_*   │                  │
│                         │            │  • customer_*       │                  │
│                         │            │  • sales_*          │                  │
│                         │            └──────────┬──────────┘                  │
│                         │                       │                             │
│                         │            ┌──────────┴──────────┐                │
│                         │            │                     │                │
│                         │            ▼                     ▼                │
│                         │   ┌────────────────┐    ┌────────────────┐       │
│                         │   │customer_360   │    │customer_accoun-│       │
│                         │   │_wide          │    │t_relationship  │       │
│                         │   └────────────────┘    └────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  DATAMART LAYER                                                             │
│                                     ┌─────────────────────┐                  │
│                                     │  Datamart Topics    │                  │
│                                     │  (type: aggregate)  │                  │
│                         ┌───────────│  • *_summary        │                  │
│                         │            │  • *_statement      │                  │
│                         │            │  • *_agg             │                  │
│                         │            └──────────┬──────────┘                  │
│                         │                       │                             │
│                         │            ┌──────────┴──────────┐                │
│                         │            │                     │                │
│                         │            ▼                     ▼                │
│                         │   ┌────────────────┐    ┌────────────────┐       │
│                         │   │sales_pipeline- │    │lead_conversio- │       │
│                         │   │summary         │    │n_agg           │       │
│                         │   └────────────────┘    └────────────────┘       │
│                         │                                                     │
│                         │                    ┌─────────────────────┐        │
│                         │                    │  External Systems   │        │
│                         │                    │  • BI Tools         │        │
│                         │                    │  • Financial Systems│        │
│                         │                    │  • API Consumers    │        │
│                         │                    └─────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Topic Type Reference

| Type | Description | Typical Layer |
|------|-------------|---------------|
| `raw` | Unprocessed data from source systems | Bronze |
| `distinct` | Unique business entities with full detail | Silver, Gold, Datamart |
| `aggregate` | Pre-computed aggregated metrics | Datamart |

---

## Example: CRM Revenue DataMart Architecture

### Bronze Layer
```yaml
# crm_activity_event__raw.yml
topicId: null
name: crm_activity_event
type: raw
kind: business
factors:
- factorId: null
  type: text
  name: activity_id
- factorId: null
  type: enum
  name: source_system     # CRM / EXTERNAL
# ...
```

### Silver Layer
```yaml
# crm_opportunity__existing.yml
topicId: '1083070031199647744'
name: crm_opportunity
type: distinct
kind: business
# Opportunity transaction records
```

### Gold Layer
```yaml
# customer_profile__existing.yml
topicId: '1083070021775046656'
name: customer_profile
type: distinct
kind: business
# Customer domain entity
```

### Datamart Layer
```yaml
# sales_pipeline_summary__new.yml
topicId: null
name: sales_pipeline_summary
type: aggregate
kind: business
factors:
- factorId: null
  type: text
  name: sales_owner_id
- factorId: null
  type: number
  name: pipeline_amount_sum
# ...
```

---

## Pipeline Patterns by Layer

### Bronze → Silver (ETL Ingestion)
```
Source: External System
    ↓
Pipeline: Data cleansing, type conversion, schema validation
    ↓
Target: Raw Topic
    ↓
Pipeline: Normalization, key mapping
    ↓
Target: ODS Topic
```

### Silver → Gold (Domain Aggregation)
```
Source: ODS Topic A
Source: ODS Topic B
    ↓
Pipeline: Join, enrich with business context
    ↓
Target: Gold Domain Topic
```

### Gold/ODS → Datamart (Mart Build)
```
Source: Gold Domain Topic
Source: ODS Topic
    ↓
Pipeline: Aggregate, pivot, time-period grouping
    ↓
Target: Datamart Topic
```

---

## Best Practices

### 1. Naming Convention
- **Raw topics:** `{source_system}_{table_name}_raw` or `{source_system}_{entity}`
- **ODS topics:** `{business_entity}` (e.g., `crm_lead`, `crm_contact`)
- **Domain topics:** `{domain_entity}` (e.g., `customer_360_wide`)
- **Datamart topics:** `{subject_area}_{metric_type}` (e.g., `sales_pipeline_summary`)

### 2. Topic Type Selection
- Use `raw` for incoming data that has not been cleaned
- Use `distinct` for business entities that should be uniquely identifiable
- Use `aggregate` for pre-computed metrics that are queried frequently

### 3. Pipeline Design
- Keep ingestion pipelines (Bronze→Silver) simple and focused on data quality
- Build enrichment pipelines (Silver→Gold) to create reusable domain entities
- Design datamart pipelines (Gold/ODS→Datamart) based on query patterns

### 4. ID Management
- When creating new topics, always use `null` for IDs (topicId, factorId)
- Server will assign real IDs on push
- Always pull topic after push to get server-assigned factor IDs
- See `references/id-management-guide.md` for details

---

## Quick Reference

| Scenario | Topic Type | Layer | Naming Pattern |
|----------|------------|-------|----------------|
| Ingest from external API | `raw` | Bronze | `source_*` |
| Store transaction records | `distinct` | Silver | `{entity}_*` |
| Business domain entity | `distinct` | Gold | `{domain}_*` |
| Pre-aggregated metrics | `aggregate` | Datamart | `*_summary` |
| Wide table for BI | `distinct` | Datamart | `*_statement` |

---

*Last Updated: 2026-05-14*
