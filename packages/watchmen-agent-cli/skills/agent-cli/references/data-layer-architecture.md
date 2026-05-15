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
| `source_insurance_quotation_raw` | Raw quotation data from insurance system |
| `raw_pipeline_monitor_log` | Pipeline execution logs |
| `dqc_raw_rule_result` | Data quality check raw results |
| `broker_commission_transaction` | Raw commission transactions |

---

### Layer 2: Silver/ODS

**Purpose:** Store transactional business events with full detail and traceability.

**Characteristics:**
- `type: distinct`
- Cleaned and normalized data
- Full business event details preserved
- Business keys for join/lookup
- Single source of truth per entity

**Important: Sub-Object Handling**
- **DO NOT** embed child object fields (array-type factors) into the parent topic
- **Each sub-object should be a separate independent topic** (type: distinct)
- Parent topic only contains the main entity fields + foreign keys for linking
- Sub-objects are linked via their `aid_root` field pointing to parent's `aid_me`
- Use Pipeline with **loop mapping** to iterate and write sub-object records

**Example:**
| Topic Name | Role | Fields |
|------------|------|--------|
| `customer` | Parent | customer_id, name, risk_level, audit fields |
| `crm_address` | Child (sub-object) | aid_me, aid_root, address_id, customer_id, city, detail_addr |

**Naming:** `{business_entity}`

**Examples:**
| Topic Name | Description |
|------------|-------------|
| `policy_policy` | Insurance policy records |
| `quotation_main` | Quotation master records |
| `claims_fnol` | First Notice of Loss records |
| `party_individual_customer` | Individual customer records |
| `common_producer` | Producer/agent records |
| `policy_vehicle` | Vehicle sub-entity linked to policy via aid_root |
| `claim_item` | Claim line item sub-entity linked to claim via aid_root |

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
| `party_customer_policy` | Customer-policy relationship |
| `datamart_claim_value` | Claim value analysis |

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
| `broker_commission_statement` | Broker pending commission summary |
| `quotation_premium_agg` | Quotation premium by dimension |
| `query_performance_summary` | Query performance metrics |
| `policy_performance_summary` | Policy performance metrics |

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
│  │ • InsureMO          │  │ • Policy DB         │  │ • Kafka Topics      │  │
│  │ • External API      │  │ • Claims DB        │  │ • Webhook Events    │  │
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
│                         ┌───────────►│  • policy_*        │                  │
│                         │            │  • quotation_*     │                  │
│                         │            │  • claims_*        │                  │
│                         │            │  • party_*         │                  │
│                         │            └──────────┬──────────┘                  │
│                         │                       │                             │
│                         │            ┌──────────┴──────────┐                │
│                         │            │                     │                │
│                         │            ▼                     ▼                │
│                         │   ┌────────────────┐    ┌────────────────┐       │
│                         │   │ policy_policy │    │ claims_fnol    │       │
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
│                         │            │  • party_*          │                  │
│                         │            │  • datamart_*       │                  │
│                         │            └──────────┬──────────┘                  │
│                         │                       │                             │
│                         │            ┌──────────┴──────────┐                │
│                         │            │                     │                │
│                         │            ▼                     ▼                │
│                         │   ┌────────────────┐    ┌────────────────┐       │
│                         │   │customer_360   │    │party_customer  │       │
│                         │   │_wide          │    │_policy         │       │
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
│                         │   │broker_commiss- │    │quotation_prem-  │       │
│                         │   │ion_statement   │    │ium_agg         │       │
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

## Example: Commission DataMart Architecture

### Bronze Layer
```yaml
# broker_commission_transaction__raw.yml
topicId: null
name: broker_commission_transaction
type: raw
kind: business
factors:
- factorId: null
  type: text
  name: transaction_id
- factorId: null
  type: enum
  name: source_system     # INSUREMO / EXTERNAL
# ...
```

### Silver Layer
```yaml
# policy_policy__existing.yml
topicId: '1083070031199647744'
name: policy_policy
type: distinct
kind: business
# Policy transaction records
```

### Gold Layer
```yaml
# party_individual_customer__existing.yml
topicId: '1083070021775046656'
name: party_individual_customer
type: distinct
kind: business
# Customer domain entity
```

### Datamart Layer
```yaml
# broker_commission_statement__new.yml
topicId: null
name: broker_commission_statement
type: aggregate
kind: business
factors:
- factorId: null
  type: text
  name: broker_id
- factorId: null
  type: number
  name: pending_amount_sum
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
Target: ODS Topic (Parent)
    ↓
Pipeline: Loop through array fields, write sub-objects
    ↓
Target: ODS Topic (Child/Sub-object)
```

### Loop Pipeline Pattern for Sub-Objects
```
Bronze Raw Topic
    │
    ├── Parent fields → ODS Parent Topic
    │
    └── Array (sub-object) fields
              │
              └── Pipeline with loop/iterate action
                        │
                        └── Sub-Object Topic (aid_root = parent.aid_me)
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
- **ODS topics:** `{business_entity}` (e.g., `policy_policy`, `claims_fnol`)
- **Domain topics:** `{domain_entity}` (e.g., `customer_360_wide`)
- **Datamart topics:** `{subject_area}_{metric_type}` (e.g., `broker_commission_statement`)

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