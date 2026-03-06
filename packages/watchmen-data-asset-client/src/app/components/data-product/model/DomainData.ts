import { Catalog } from './BusinessDomain';

export const INITIAL_CATALOGS: Catalog[] = [
    {
      id: 'cat-001',
      name: 'Policy Business Management (PA)',
      description: 'Manages the entire lifecycle of policies from underwriting to termination, including policy information, changes, renewals, etc.',
      owner: 'Insurance Business Team',
      technicalOwner: 'Data Platform Team',
      tags: ['Core Business', 'PII Sensitive', 'High Value', 'PA'],
      status: 'active',
      sensitivity: 'confidential',
      topics: [
        {
          id: 'topic-pa-001',
          name: 'DM_PA_POLICY_HIS',
          description: 'Policy Basic Information - Records basic information and status of policies',
          type: 'entity',
          fields: 45,
          relationships: ['DM_PA_POLICY_ROLE_HIS', 'DM_PA_POLICY_COVERAGE_HIS']
        },
        {
          id: 'topic-pa-002',
          name: 'DM_PA_POLICY_COVERAGE_HIS',
          description: 'Policy Coverage Records - Records specific coverage content included in policies',
          type: 'entity',
          fields: 32,
          relationships: ['DM_PA_POLICY_HIS', 'DM_PA_COVERAGE_PREM_HIS']
        },
        {
          id: 'topic-pa-003',
          name: 'DM_PA_POLICY_CHANGE_HIS',
          description: 'Policy Change Records - Records various change operations on policies',
          type: 'event',
          fields: 28,
          relationships: ['DM_PA_POLICY_HIS']
        },
        {
          id: 'topic-pa-004',
          name: 'DM_PA_APPL_COVERAGE_HIS',
          description: 'Application Coverage Records - Records insurance coverage content applied by customers',
          type: 'entity',
          fields: 25,
          relationships: ['DM_PROP_PROPOSAL_HIS']
        },
        {
          id: 'topic-pa-005',
          name: 'DM_PA_PREM_DISCNT_HIS',
          description: 'Premium Discount Records - Records various discounts and offers on premiums',
          type: 'event',
          fields: 15,
          relationships: ['DM_PA_POLICY_HIS']
        }
      ],
      relatedSpaces: [
        {
          id: 'space-pa-001',
          name: 'Policy_Lifecycle_Wide',
          description: 'Complete policy management from underwriting to termination (Semantic Layer)',
          type: 'connected',
          topics: ['DM_PA_POLICY_HIS', 'DM_PA_POLICY_CHANGE_HIS', 'DM_PTY_PERSON_HIS'],
          subjects: 8
        },
        {
          id: 'space-pa-002',
          name: 'Policy_Portfolio_View',
          description: 'Wide table with pre-joined policy, customer, and vehicle information',
          type: 'connected',
          topics: ['DM_PA_POLICY_HIS', 'DM_PTY_PERSON_HIS'],
          subjects: 3
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
      description: 'Manages customer claims services after incidents, from reporting to payment completion.',
      owner: 'Claims Operations Team',
      technicalOwner: 'Data Engineering Team',
      tags: ['Core Business', 'Financial Critical', 'Real-time', 'CLM'],
      status: 'active',
      sensitivity: 'restricted',
      topics: [
        {
          id: 'topic-clm-001',
          name: 'DM_CLM_CLAIM_CASE_HIS',
          description: 'Claims Case Records - Records basic information and processing status of claim cases',
          type: 'entity',
          fields: 38,
          relationships: ['DM_PA_POLICY_HIS', 'DM_PTY_PERSON_HIS']
        },
        {
          id: 'topic-clm-002',
          name: 'DM_CLM_ASSESSMENT_HIS',
          description: 'Claims Assessment Records - Records assessment process and results of claim cases',
          type: 'aggregate',
          fields: 25,
          relationships: ['DM_CLM_CLAIM_CASE_HIS']
        },
        {
          id: 'topic-clm-003',
          name: 'DM_CLM_MEDICAL_FEE_HIS',
          description: 'Medical Expense Records - Records medical expense details involved in claims',
          type: 'event',
          fields: 20,
          relationships: ['DM_CLM_CLAIM_CASE_HIS']
        },
        {
          id: 'topic-clm-004',
          name: 'DM_CLM_CLAIM_COVERAGE_HIS',
          description: 'Claims Coverage Records - Records insurance liabilities and coverage scope involved in claims',
          type: 'entity',
          fields: 18,
          relationships: ['DM_CLM_CLAIM_CASE_HIS', 'DM_PA_POLICY_COVERAGE_HIS']
        }
      ],
      relatedSpaces: [
        {
          id: 'space-clm-001',
          name: 'Claims_Analysis_Wide',
          description: 'Claims efficiency and risk control analysis (Semantic Layer)',
          type: 'data_mart',
          topics: ['DM_CLM_CLAIM_CASE_HIS', 'DM_CLM_ASSESSMENT_HIS', 'DM_PA_POLICY_HIS'],
          subjects: 6
        },
        {
          id: 'space-clm-002',
          name: 'Claims_Efficiency_Report',
          description: 'Daily report on claims processing speed and accuracy',
          type: 'data_mart',
          topics: ['DM_CLM_CLAIM_CASE_HIS'],
          subjects: 4
        }
      ],
      relatedDomains: [
        { domainId: 'cat-001', relationshipType: 'Depends on' }
      ],
      createdAt: '2024-02-10',
      updatedAt: '2024-12-18'
    },
    {
      id: 'cat-003',
      name: 'Customer Information Management (PTY)',
      description: 'Manages basic information of all customers, including individual and corporate customers.',
      owner: 'CRM Team',
      technicalOwner: 'Data Platform Team',
      tags: ['Core Business', 'PII Sensitive', 'Master Data', 'PTY'],
      status: 'active',
      sensitivity: 'confidential',
      topics: [
        {
          id: 'topic-pty-001',
          name: 'DM_PTY_PERSON_HIS',
          description: 'Individual Customer Information - Records basic data of individual customers',
          type: 'entity',
          fields: 52,
          relationships: ['DM_PTY_ADDRESS_HIS', 'DM_PTY_CONTACT_HIS']
        },
        {
          id: 'topic-pty-002',
          name: 'DM_PTY_ORG_HIS',
          description: 'Corporate Customer Information - Records basic data of corporate customers',
          type: 'entity',
          fields: 45,
          relationships: ['DM_PTY_ADDRESS_HIS', 'DM_PTY_CONTACT_HIS']
        },
        {
          id: 'topic-pty-003',
          name: 'DM_PTY_CONTACT_HIS',
          description: 'Customer Contact Information - Records customer contact methods',
          type: 'entity',
          fields: 15,
          relationships: ['DM_PTY_PERSON_HIS', 'DM_PTY_ORG_HIS']
        },
        {
          id: 'topic-pty-004',
          name: 'DM_PTY_ADDRESS_HIS',
          description: 'Customer Address Information - Records customer address information',
          type: 'entity',
          fields: 20,
          relationships: ['DM_PTY_PERSON_HIS', 'DM_PTY_ORG_HIS']
        }
      ],
      relatedSpaces: [
        {
          id: 'space-pty-001',
          name: 'Customer_360_Wide',
          description: 'Comprehensive customer profiling and behavior analysis (Semantic Layer)',
          type: 'connected',
          topics: ['DM_PTY_PERSON_HIS', 'DM_PA_POLICY_HIS', 'DM_CLM_CLAIM_CASE_HIS'],
          subjects: 5
        },
        {
          id: 'space-pty-002',
          name: 'Marketing_Analytics',
          description: 'Marketing analysis data mart for customer acquisition and retention',
          type: 'data_mart',
          topics: ['DM_PTY_PERSON_HIS', 'DM_PA_POLICY_HIS'],
          subjects: 7
        }
      ],
      relatedDomains: [],
      createdAt: '2024-01-20',
      updatedAt: '2024-12-22'
    },
    {
      id: 'cat-004',
      name: 'Financial Collection & Payment (BCP)',
      description: 'Manages all money-related business of the company, including customer premium payments, company claim payments, bank transfers, etc.',
      owner: 'Finance Team',
      technicalOwner: 'Financial Systems Team',
      tags: ['Financial Critical', 'Audit Required', 'Regulatory', 'BCP'],
      status: 'active',
      sensitivity: 'restricted',
      topics: [
        {
          id: 'topic-bcp-001',
          name: 'DM_BCP_BIZ_TRANS_HIS',
          description: 'Business Transaction Records - Records all fund transactions generated by insurance business',
          type: 'event',
          fields: 35,
          relationships: ['DM_PA_POLICY_HIS', 'DM_CLM_CLAIM_CASE_HIS']
        },
        {
          id: 'topic-bcp-002',
          name: 'DM_BCP_COLLECTION_HIS',
          description: 'Collection Business Records - Records premium collection from customers',
          type: 'event',
          fields: 28,
          relationships: ['DM_BCP_BIZ_TRANS_HIS', 'DM_PTY_PERSON_HIS']
        },
        {
          id: 'topic-bcp-003',
          name: 'DM_BCP_PAYMENT_HIS',
          description: 'Payment Business Records - Records company payments to customers or third parties',
          type: 'event',
          fields: 28,
          relationships: ['DM_BCP_BIZ_TRANS_HIS', 'DM_CLM_CLAIM_CASE_HIS']
        },
        {
          id: 'topic-bcp-004',
          name: 'DM_BCP_ARAP_HIS',
          description: 'Accounts Receivable/Payable Records - Records various fees the company should collect or pay',
          type: 'aggregate',
          fields: 25,
          relationships: ['DM_BCP_BIZ_TRANS_HIS']
        }
      ],
      relatedSpaces: [
        {
          id: 'space-bcp-001',
          name: 'Financial_Reporting',
          description: 'Financial reporting data mart for regulatory and management reporting',
          type: 'data_mart',
          topics: ['DM_BCP_BIZ_TRANS_HIS', 'DM_BCP_ARAP_HIS'],
          subjects: 12
        },
        {
          id: 'space-bcp-002',
          name: 'Cash_Flow_Analysis',
          description: 'Analysis of daily cash inflows and outflows',
          type: 'data_mart',
          topics: ['DM_BCP_COLLECTION_HIS', 'DM_BCP_PAYMENT_HIS'],
          subjects: 5
        }
      ],
      relatedDomains: [
        { domainId: 'cat-001', relationshipType: 'Depends on' },
        { domainId: 'cat-002', relationshipType: 'Provides data to' }
      ],
      createdAt: '2024-03-05',
      updatedAt: '2024-12-19'
    },
    {
      id: 'cat-005',
      name: 'Product Management (PRD)',
      description: 'Manages the company\'s insurance product design, including product definitions, liability clauses, etc.',
      owner: 'Product Management Team',
      technicalOwner: 'Product Systems Team',
      tags: ['Product Management', 'Configuration', 'Business Rules', 'PRD'],
      status: 'active',
      sensitivity: 'internal',
      topics: [
        {
          id: 'topic-prd-001',
          name: 'DM_PRD_PRODUCT_HIS',
          description: 'Product Basic Information - Records basic information and attributes of insurance products',
          type: 'entity',
          fields: 40,
          relationships: ['DM_PRD_PRODUCT_LIAB_HIS']
        },
        {
          id: 'topic-prd-002',
          name: 'DM_PRD_LIABILITY_HIS',
          description: 'Product Liability Definitions - Records various insurance liabilities of insurance products',
          type: 'entity',
          fields: 33,
          relationships: ['DM_PRD_PRODUCT_LIAB_HIS']
        },
        {
          id: 'topic-prd-003',
          name: 'DM_PRD_PRODUCT_LIAB_HIS',
          description: 'Product Liability Associations - Records associations between products and liabilities',
          type: 'entity',
          fields: 10,
          relationships: ['DM_PRD_PRODUCT_HIS', 'DM_PRD_LIABILITY_HIS']
        }
      ],
      relatedSpaces: [
        {
          id: 'space-prd-001',
          name: 'Product_Profitability_Wide',
          description: 'Product line profitability and competitiveness analysis (Semantic Layer)',
          type: 'data_mart',
          topics: ['DM_PRD_PRODUCT_HIS', 'DM_PA_POLICY_HIS', 'DM_CLM_CLAIM_CASE_HIS'],
          subjects: 9
        },
        {
          id: 'space-prd-002',
          name: 'Product_Definition_Mart',
          description: 'Centralized product catalog for sales systems',
          type: 'data_mart',
          topics: ['DM_PRD_PRODUCT_HIS', 'DM_PRD_LIABILITY_HIS'],
          subjects: 3
        }
      ],
      createdAt: '2024-02-28',
      updatedAt: '2024-12-21'
    },
    {
      id: 'cat-006',
      name: 'Sales Channel Management (SC)',
      description: 'Manages the company\'s sales channels, including agents, branches, etc.',
      owner: 'Sales Operations Team',
      technicalOwner: 'Sales Systems Team',
      tags: ['Sales', 'Performance', 'SC'],
      status: 'active',
      sensitivity: 'internal',
      topics: [
        {
          id: 'topic-sc-001',
          name: 'DM_SC_AGENT_HIS',
          description: 'Agent Information - Records basic information and performance of agents',
          type: 'entity',
          fields: 42,
          relationships: ['DM_SC_BRANCH_HIS', 'DM_PA_PRODUCER_HIS']
        },
        {
          id: 'topic-sc-002',
          name: 'DM_SC_BRANCH_HIS',
          description: 'Branch Information - Records basic information of various branches',
          type: 'entity',
          fields: 15,
          relationships: ['DM_SC_ORGANIZATION_HIS']
        },
        {
          id: 'topic-sc-003',
          name: 'DM_SC_ORGANIZATION_HIS',
          description: 'Sales Organization Structure - Records hierarchical relationships of sales organizations',
          type: 'entity',
          fields: 12,
          relationships: ['DM_SC_BRANCH_HIS']
        }
      ],
      relatedSpaces: [
        {
          id: 'space-sc-001',
          name: 'Sales_Performance_Wide',
          description: 'Sales team and channel performance management (Semantic Layer)',
          type: 'data_mart',
          topics: ['DM_SC_AGENT_HIS', 'DM_PA_POLICY_HIS', 'DM_BCP_BIZ_TRANS_HIS'],
          subjects: 15
        },
        {
          id: 'space-sc-002',
          name: 'Channel_Hierarchy_View',
          description: 'Recursive view of sales organization structure',
          type: 'data_mart',
          topics: ['DM_SC_ORGANIZATION_HIS', 'DM_SC_BRANCH_HIS'],
          subjects: 4
        }
      ],
      createdAt: '2024-03-10',
      updatedAt: '2024-12-23'
    },
    {
      id: 'cat-007',
      name: 'Underwriting Management (UW)',
      description: 'Manages the complete underwriting process for insurance, including risk assessment, underwriting decisions, condition setting, etc.',
      owner: 'Underwriting Team',
      technicalOwner: 'Core Systems Team',
      tags: ['Risk', 'Core Business', 'UW'],
      status: 'active',
      sensitivity: 'confidential',
      topics: [
        {
          id: 'topic-uw-001',
          name: 'UW_POLICY',
          description: 'Underwriting Policy Records - Records basic information and underwriting decision results',
          type: 'entity',
          fields: 55,
          relationships: ['DM_PA_POLICY_HIS', 'UW_MEDICAL_INFO']
        },
        {
          id: 'topic-uw-002',
          name: 'UW_MEDICAL_INFO',
          description: 'Underwriting Medical Information Records - Records medical examinations and health information',
          type: 'entity',
          fields: 60,
          relationships: ['UW_POLICY', 'DM_PTY_PERSON_HIS']
        },
        {
          id: 'topic-uw-003',
          name: 'UW_CONDITION',
          description: 'Underwriting Condition Records - Records various policy conditions set during underwriting',
          type: 'entity',
          fields: 20,
          relationships: ['UW_POLICY']
        },
        {
          id: 'topic-uw-004',
          name: 'UW_EXTRA_LOADING',
          description: 'Underwriting Extra Loading Records - Records additional premium loadings due to risk factors',
          type: 'entity',
          fields: 15,
          relationships: ['UW_POLICY']
        }
      ],
      relatedSpaces: [
        {
          id: 'space-uw-001',
          name: 'Risk_Assessment_Wide',
          description: 'Underwriting risk and pricing model evaluation (Semantic Layer)',
          type: 'data_mart',
          topics: ['UW_POLICY', 'DM_CLM_CLAIM_CASE_HIS', 'DM_PTY_PERSON_HIS'],
          subjects: 10
        },
        {
          id: 'space-uw-002',
          name: 'Underwriting_Efficiency_Dashboard',
          description: 'Monitoring underwriting turnaround time and decision rates',
          type: 'data_mart',
          topics: ['UW_POLICY'],
          subjects: 5
        }
      ],
      createdAt: '2024-03-15',
      updatedAt: '2024-12-20'
    },
    {
      id: 'cat-008',
      name: 'Investment-Linked Management (ILP)',
      description: 'Manages investment-linked insurance business: fund transactions, price management, dividend distribution, etc.',
      owner: 'Investment Team',
      technicalOwner: 'Investment Systems Team',
      tags: ['Investment', 'Finance', 'ILP'],
      status: 'active',
      sensitivity: 'restricted',
      topics: [
        {
          id: 'topic-ilp-001',
          name: 'ILP_TRANS',
          description: 'Fund Transaction Records - Records details of actual completed fund buy/sell transactions',
          type: 'event',
          fields: 30,
          relationships: ['DM_PA_POLICY_HIS', 'ILP_FUND_PRICE']
        },
        {
          id: 'topic-ilp-002',
          name: 'ILP_FUND_PRICE',
          description: 'Fund Price Records - Records fund price information such as bid price, ask price',
          type: 'entity',
          fields: 12,
          relationships: ['ILP_TRANS']
        },
        {
          id: 'topic-ilp-003',
          name: 'ILP_COUPON',
          description: 'Fund Dividend Records - Records dividend information and dividend rates announced by fund companies',
          type: 'event',
          fields: 15,
          relationships: ['ILP_FUND_PRICE']
        }
      ],
      relatedSpaces: [
        {
          id: 'space-ilp-001',
          name: 'Investment_Performance_Analysis',
          description: 'Investment performance and fund analysis',
          type: 'data_mart',
          topics: ['ILP_TRANS', 'ILP_FUND_PRICE'],
          subjects: 8
        },
        {
          id: 'space-ilp-002',
          name: 'Fund_Transaction_Mart',
          description: 'Daily fund transaction reconciliation',
          type: 'data_mart',
          topics: ['ILP_TRANS', 'DM_BCP_BIZ_TRANS_HIS'],
          subjects: 4
        }
      ],
      createdAt: '2024-04-01',
      updatedAt: '2024-12-22'
    },
    {
      id: 'cat-009',
      name: 'Policy Account Management (PAC)',
      description: 'Manages core business related to policy accounts, including dividend distribution, account transactions, payable management, etc.',
      owner: 'Policy Admin Team',
      technicalOwner: 'Core Systems Team',
      tags: ['Account', 'Finance', 'PAC'],
      status: 'active',
      sensitivity: 'confidential',
      topics: [
        {
          id: 'topic-pac-001',
          name: 'PAC_POL_ACC_TRANS',
          description: 'Policy Account Transactions - Records various transaction activities of policy accounts',
          type: 'event',
          fields: 25,
          relationships: ['DM_PA_POLICY_HIS', 'PAC_BONUS_ALLOCATE']
        },
        {
          id: 'topic-pac-002',
          name: 'PAC_BONUS_ALLOCATE',
          description: 'Dividend Allocation Records - Records policy dividend allocation situations and dividend options',
          type: 'event',
          fields: 18,
          relationships: ['PAC_POL_ACC_TRANS']
        },
        {
          id: 'topic-pac-003',
          name: 'PAC_PAY_DUE',
          description: 'Policy Payables - Records various amounts due for payment upon policy maturity',
          type: 'event',
          fields: 20,
          relationships: ['DM_PA_POLICY_HIS']
        }
      ],
      relatedSpaces: [
        {
          id: 'space-pac-001',
          name: 'Account_Value_Analysis',
          description: 'Policy account value and dividend analysis',
          type: 'data_mart',
          topics: ['PAC_POL_ACC_TRANS', 'PAC_BONUS_ALLOCATE'],
          subjects: 5
        },
        {
          id: 'space-pac-002',
          name: 'Liability_Valuation_Mart',
          description: 'Data for actuarial liability valuation',
          type: 'data_mart',
          topics: ['PAC_POL_ACC_TRANS', 'PAC_PAY_DUE'],
          subjects: 4
        }
      ],
      createdAt: '2024-04-10',
      updatedAt: '2024-12-18'
    },
    {
      id: 'cat-010',
      name: 'Proposal Application Management (PROP)',
      description: 'Manages customer proposal applications and underwriting review processes.',
      owner: 'New Business Team',
      technicalOwner: 'Core Systems Team',
      tags: ['New Business', 'Underwriting', 'PROP'],
      status: 'active',
      sensitivity: 'confidential',
      topics: [
        {
          id: 'topic-prop-001',
          name: 'DM_PROP_PROPOSAL_HIS',
          description: 'Proposal Applications - Records customer proposal application information',
          type: 'entity',
          fields: 48,
          relationships: ['DM_PTY_PERSON_HIS', 'DM_PROP_COVERAGE_HIS']
        },
        {
          id: 'topic-prop-002',
          name: 'DM_PROP_COVERAGE_HIS',
          description: 'Proposal Coverage Content - Records coverage content in proposal applications',
          type: 'entity',
          fields: 22,
          relationships: ['DM_PROP_PROPOSAL_HIS', 'DM_PRD_PRODUCT_HIS']
        }
      ],
      relatedSpaces: [
        {
          id: 'space-prop-001',
          name: 'New_Business_Pipeline',
          description: 'New business application pipeline analysis',
          type: 'data_mart',
          topics: ['DM_PROP_PROPOSAL_HIS', 'DM_PTY_PERSON_HIS', 'DM_SC_AGENT_HIS'],
          subjects: 7
        }
      ],
      createdAt: '2024-04-15',
      updatedAt: '2024-12-24'
    },
    {
      id: 'cat-011',
      name: 'Basic Code Management (CD)',
      description: 'Manages various code tables and dictionary data used in the system.',
      owner: 'IT Architecture Team',
      technicalOwner: 'Architecture Team',
      tags: ['System', 'Reference Data', 'CD'],
      status: 'active',
      sensitivity: 'internal',
      topics: [
        {
          id: 'topic-cd-001',
          name: 'DM_CD_CODE_RECORD_HIS',
          description: 'Code Records - Records various code values used in the system',
          type: 'entity',
          fields: 10,
          relationships: []
        }
      ],
      relatedSpaces: [
        {
          id: 'space-cd-001',
          name: 'Reference_Data_Mart',
          description: 'Centralized reference data management',
          type: 'data_mart',
          topics: ['DM_CD_CODE_RECORD_HIS'],
          subjects: 2
        }
      ],
      createdAt: '2024-01-01',
      updatedAt: '2024-12-01'
    },
    {
      id: 'cat-012',
      name: 'Accounting Management (ACC)',
      description: 'Manages accounting rules, original events, ledger data, and data archiving.',
      owner: 'Finance Team',
      technicalOwner: 'Financial Systems Team',
      tags: ['Finance', 'Accounting', 'ACC'],
      status: 'active',
      sensitivity: 'restricted',
      topics: [
        {
          id: 'topic-acc-001',
          name: 'DM_ACC_ENTRY_HIS',
          description: 'Accounting Entries - Records detailed accounting entries',
          type: 'event',
          fields: 40,
          relationships: ['DM_ACC_LEDGER_HIS', 'DM_BCP_BIZ_TRANS_HIS']
        },
        {
          id: 'topic-acc-002',
          name: 'DM_ACC_LEDGER_HIS',
          description: 'Ledger Data - Records accounting ledger information',
          type: 'aggregate',
          fields: 35,
          relationships: ['DM_ACC_ENTRY_HIS']
        },
        {
          id: 'topic-acc-003',
          name: 'DM_ACC_RULE_DEF_HIS',
          description: 'Accounting Rules - Records accounting rule definitions',
          type: 'entity',
          fields: 15,
          relationships: []
        }
      ],
      relatedSpaces: [
        {
          id: 'space-acc-001',
          name: 'Financial_Accounting_Mart',
          description: 'General ledger and sub-ledger analysis',
          type: 'data_mart',
          topics: ['DM_ACC_ENTRY_HIS', 'DM_ACC_LEDGER_HIS'],
          subjects: 12
        },
        {
          id: 'space-acc-002',
          name: 'GL_Reconciliation_View',
          description: 'Reconciliation between business transactions and GL entries',
          type: 'data_mart',
          topics: ['DM_ACC_ENTRY_HIS', 'DM_BCP_BIZ_TRANS_HIS'],
          subjects: 6
        }
      ],
      createdAt: '2024-03-20',
      updatedAt: '2024-12-20'
    },
    {
      id: 'cat-013',
      name: 'Integration Management (INT)',
      description: 'Manages regulatory reporting, AML, and other non-core integration data.',
      owner: 'Compliance Team',
      technicalOwner: 'Integration Team',
      tags: ['Compliance', 'Regulatory', 'INT'],
      status: 'active',
      sensitivity: 'restricted',
      topics: [
        {
          id: 'topic-int-001',
          name: 'DM_INT_REG_REPORT_HIS',
          description: 'Regulatory Reports - Records data submitted for regulatory reporting',
          type: 'entity',
          fields: 50,
          relationships: ['DM_BCP_BIZ_TRANS_HIS', 'DM_PA_POLICY_HIS']
        },
        {
          id: 'topic-int-002',
          name: 'DM_INT_AML_CHECK_HIS',
          description: 'AML Checks - Records anti-money laundering check results',
          type: 'event',
          fields: 25,
          relationships: ['DM_PTY_PERSON_HIS', 'DM_BCP_BIZ_TRANS_HIS']
        }
      ],
      relatedSpaces: [
        {
          id: 'space-int-001',
          name: 'Compliance_Reporting',
          description: 'Regulatory compliance and reporting data mart',
          type: 'data_mart',
          topics: ['DM_INT_REG_REPORT_HIS', 'DM_INT_AML_CHECK_HIS'],
          subjects: 6
        }
      ],
      createdAt: '2024-04-05',
      updatedAt: '2024-12-23'
    }
  ];