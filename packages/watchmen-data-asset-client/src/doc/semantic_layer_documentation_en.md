# Insurance Business Semantic Layer Design Document - Wide Table Summary Layer Architecture

## 1. Wide Table Summary Layer Overview

### 1.1 Design Philosophy
The wide table summary layer adopts a business scenario-oriented design approach, abandoning traditional star schema and snowflake models to directly construct wide table structures containing complete business information. Each wide table is optimized for specific business analysis scenarios, ensuring that business users can directly obtain all required analytical data from a single table without complex multi-table join operations.

### 1.2 Core Value
- **Query-Ready**: Business users can directly query without understanding complex table relationships to obtain complete business views
- **Performance Optimization**: Pre-aggregation and pre-joining significantly improve query performance, supporting real-time business analysis
- **Scenario-Oriented**: Each wide table is designed for specific business scenarios, ensuring perfect alignment between data structure and business requirements
- **Lower Barriers**: Simplifies data usage complexity, enabling business personnel to easily perform data analysis
- **Decision Support**: Directly supports business decisions without additional data processing and transformation

### 1.3 Applicable Scenarios
This wide table summary layer is specifically designed for the following 6 core insurance business scenarios:
1. **Customer 360 View** - Comprehensive customer profiling and behavior analysis
2. **Sales Performance Summary** - Sales team and channel performance management
3. **Claims Analysis** - Claims efficiency and risk control analysis
4. **Product Profitability** - Product line profitability and competitiveness analysis
5. **Risk Model Assessment** - Underwriting risk and pricing model evaluation
6. **Policy Lifecycle Management** - Complete policy management from underwriting to termination

## 2. Wide Table Architecture Design

### 2.1 Overall Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Business Application Layer                │
│    BI Dashboard | Business Reports | Data Analytics Platform |   │
│    Risk Management System | Decision Support System             │
└─────────────────────────────────────────────────────────────────┘x
                                ↑
┌─────────────────────────────────────────────────────────────────┐
│                      Wide Table Layer                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │Customer 360 │ │Sales Summary│ │Claims       │ │Product      │ │
│  │Wide Table   │ │Wide Table   │ │Analysis     │ │Profitability│ │
│  │customer_360 │ │sales_summary│ │Wide Table   │ │Wide Table   │ │
│  │_wide        │ │_wide        │ │claim_analysis│ │product_     │ │
│  │             │ │             │ │_wide        │ │profitability│ │
│  │             │ │             │ │             │ │_wide        │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
│  ┌─────────────┐ ┌─────────────┐                                │
│  │Risk         │ │Policy       │                                │
│  │Assessment   │ │Lifecycle    │                                │
│  │Wide Table   │ │Wide Table   │                                │
│  │risk_        │ │policy_      │                                │
│  │evaluation   │ │lifecycle    │                                │
│  │_wide        │ │_wide        │                                │
│  └─────────────┘ └─────────────┘                                │
└─────────────────────────────────────────────────────────────────┘
                                ↑
┌─────────────────────────────────────────────────────────────────┐
│                        Source Data Layer                         │
│  BCP Financial Data | CLM Claims Data | PA Policy Data |         │
│  PRD Product Data | PTY Customer Data | SC Channel Data |        │
│  CD Code Data | PROP Property Data | UW Underwriting Data |     │
│  ILP Investment-Linked Data | PAC Account Data                  │
└─────────────────────────────────────────────────────────────────┘
```



### 2.2 Wide Table Design Principles

#### 2.2.1 Business Completeness Principle
- Each wide table contains all data elements required for specific business scenarios
- Avoids cross-table join queries during business analysis
- Ensures completeness and consistency of business logic

#### 2.2.2 Performance Optimization Principle
- Adopts pre-aggregation strategy to calculate common metrics in advance
- Properly sets partitions and indexes to optimize query performance
- Controls the number of wide table fields to avoid excessive widening

#### 2.2.3 Maintainability Principle
- Establishes clear data update mechanisms and scheduling strategies
- Designs flexible extension interfaces to support new fields and metrics
- Establishes comprehensive data quality monitoring systems

## 3. Core Business Scenario Wide Table Design

### 3.1 Customer 360 View Wide Table (customer_360_wide)

#### 3.1.1 Business Scenario Description
Provides comprehensive customer views for customer managers, marketing teams, and risk control personnel, including basic information, policy holdings, claims history, payment behavior, risk ratings, etc., supporting precision marketing, customer service, and risk management.

#### 3.1.2 Aggregation Period Design
- **Daily Aggregation (daily)**: Supports real-time monitoring of customer behavior, such as daily payments, claims applications, etc.
- **Weekly Aggregation (weekly)**: Suitable for customer activity analysis and short-term behavior trend observation
- **Monthly Aggregation (monthly)**: Mainly used for customer value assessment, monthly performance analysis, and risk monitoring
- **Quarterly Aggregation (quarterly)**: Supports quarterly customer segmentation, product preference analysis, and marketing strategy formulation
- **Annual Aggregation (yearly)**: Used for customer lifetime value analysis and annual customer profile updates

#### 3.1.3 Table Structure Design

| Field Category | Field Name | Data Type | Field Description | Business Meaning |
|----------------|------------|-----------|-------------------|------------------|
| **Time Dimension** | stat_date | DATE | Statistical Date | Data statistics cutoff date |
| | stat_year | INT | Statistical Year | Data statistics year |
| | stat_quarter | INT | Statistical Quarter | Data statistics quarter (1-4) |
| | stat_month | INT | Statistical Month | Data statistics month (1-12) |
| | stat_week | INT | Statistical Week | Data statistics week (1-53) |
| | aggregation_period | VARCHAR(20) | Aggregation Period | daily/weekly/monthly/quarterly/yearly |
| **Customer Basic Information** | customer_id | VARCHAR(20) | Customer Unique ID | Customer primary key |
| | customer_name | VARCHAR(100) | Customer Name | Customer real name |
| | id_card_no | VARCHAR(18) | ID Card Number | Customer ID card number |
| | gender | VARCHAR(10) | Gender | Male/Female |
| | birth_date | DATE | Birth Date | Customer birthday |
| | age | INT | Current Age | Calculated age |
| | age_group | VARCHAR(20) | Age Group | 18-30/31-45/46-60/60+ |
| | marital_status | VARCHAR(20) | Marital Status | Single/Married/Divorced/Widowed |
| | education_level | VARCHAR(30) | Education Level | High School/College/Bachelor/Master/PhD |
| | occupation | VARCHAR(50) | Occupation | Specific occupation description |
| | occupation_category | VARCHAR(30) | Occupation Category | Office Worker/Sales/Technical, etc. |
| | annual_income | DECIMAL(12,2) | Annual Income | Customer annual income amount |
| | income_level | VARCHAR(20) | Income Level | Low/Medium/High income |
| **Contact Information** | mobile_phone | VARCHAR(20) | Mobile Phone | Primary contact method |
| | email | VARCHAR(100) | Email | Email address |
| | address | VARCHAR(200) | Contact Address | Detailed address |
| | city | VARCHAR(50) | City | City name |
| | province | VARCHAR(50) | Province | Province name |
| | region | VARCHAR(50) | Region | East China/South China/North China, etc. |
| **Policy Holdings** | total_policies | INT | Total Policies Held | Number of valid policies |
| | active_policies | INT | Active Policies | Currently active policies |
| | lapsed_policies | INT | Lapsed Policies | Lapsed policies |
| | surrendered_policies | INT | Surrendered Policies | Surrendered policies |
| | first_policy_date | DATE | First Policy Date | First policy effective date |
| | latest_policy_date | DATE | Latest Policy Date | Latest policy effective date |
| | customer_tenure_years | DECIMAL(5,2) | Customer Tenure Years | Years as customer |
| | total_sum_assured | DECIMAL(15,2) | Total Sum Assured | Total sum assured of all policies |
| | total_annual_premium | DECIMAL(12,2) | Total Annual Premium | Total annual premium of all policies |
| | avg_policy_premium | DECIMAL(12,2) | Average Policy Premium | Average premium per policy |
| **Product Preferences** | life_insurance_policies | INT | Life Insurance Policies | Number of life insurance policies |
| | health_insurance_policies | INT | Health Insurance Policies | Number of health insurance policies |
| | accident_insurance_policies | INT | Accident Insurance Policies | Number of accident insurance policies |
| | annuity_policies | INT | Annuity Policies | Number of annuity policies |
| | preferred_product_type | VARCHAR(50) | Preferred Product Type | Most purchased product type |
| | preferred_payment_period | VARCHAR(20) | Preferred Payment Period | Commonly chosen payment period |
| **Payment Behavior** | total_premiums_paid | DECIMAL(15,2) | Total Premiums Paid | Historical total premium payments |
| | current_year_premium | DECIMAL(12,2) | Current Year Premium Due | Premium due this year |
| | current_year_paid | DECIMAL(12,2) | Current Year Premium Paid | Premium paid this year |
| | payment_completion_rate | DECIMAL(5,2) | Payment Completion Rate | Paid/Due ratio |
| | overdue_premium | DECIMAL(12,2) | Overdue Premium | Overdue unpaid amount |
| | overdue_days | INT | Overdue Days | Maximum overdue days |
| | preferred_payment_method | VARCHAR(30) | Preferred Payment Method | Bank transfer/Credit card, etc. |
| | auto_pay_enabled | BOOLEAN | Auto Pay Enabled | true/false |
| **Claims History** | total_claims | INT | Total Claims | Historical claims cases |
| | successful_claims | INT | Successful Claims | Cases with payouts |
| | rejected_claims | INT | Rejected Claims | Rejected claims cases |
| | pending_claims | INT | Pending Claims | Cases under processing |
| | total_claim_amount | DECIMAL(15,2) | Total Claim Amount | Historical total claim amount |
| | avg_claim_amount | DECIMAL(12,2) | Average Claim Amount | Average amount per claim |
| | claim_frequency | DECIMAL(5,2) | Claim Frequency | Annual average claims |
| | last_claim_date | DATE | Last Claim Date | Date of last claim |
| | claim_types | VARCHAR(200) | Claim Types Distribution | Statistics of various claim types |
| **ILP Investment Status** | ilp_policies_count | INT | ILP Policies Count | Number of investment-linked policies |
| | ilp_total_fund_value | DECIMAL(15,2) | ILP Total Fund Value | Total value of ILP funds |
| | ilp_total_investment | DECIMAL(15,2) | ILP Total Investment | Total historical investment amount |
| | ilp_total_gain_loss | DECIMAL(15,2) | ILP Total Gain/Loss | Total investment gain or loss |
| | ilp_gain_loss_rate | DECIMAL(5,2) | ILP Gain/Loss Rate | Investment return rate percentage |
| | ilp_active_funds_count | INT | ILP Active Funds Count | Number of active funds held |
| | ilp_last_transaction_date | DATE | ILP Last Transaction Date | Date of last fund transaction |
| | ilp_total_dividend | DECIMAL(12,2) | ILP Total Dividend | Total historical dividend received |
| | ilp_preferred_fund_type | VARCHAR(50) | Preferred Fund Type | Most invested fund type |
| **Policy Account Management** | pac_account_count | INT | PAC Account Count | Total number of policy accounts |
| | pac_total_account_value | DECIMAL(15,2) | PAC Total Account Value | Sum of all policy account values |
| | pac_total_bonus | DECIMAL(12,2) | Total Bonus | Historical total bonus amount |
| | pac_current_year_bonus | DECIMAL(12,2) | Current Year Bonus | Bonus received this year |
| | pac_total_transactions | INT | Total Transactions | Historical number of account transactions |
| | pac_last_transaction_date | DATE | Last Transaction Date | Date of last account transaction |
| | pac_outstanding_payable | DECIMAL(12,2) | Outstanding Payable | Current unsettled payables |
| | pac_preferred_bonus_option | VARCHAR(30) | Preferred Bonus Option | Cash/Accumulation etc. |
| | pac_account_status | VARCHAR(20) | Account Status | Active/Frozen/Terminated etc. |
| **Risk Assessment** | risk_level | VARCHAR(20) | Risk Level | Low Risk/Medium Risk/High Risk |
| | uw_total_applications | INT | Total UW Applications | Historical underwriting application count |
| | uw_approved_count | INT | UW Approved Count | Number of approved applications |
| | uw_rejected_count | INT | UW Rejected Count | Number of rejected applications |
| | uw_approval_rate | DECIMAL(5,2) | UW Approval Rate | Underwriting approval rate percentage |
| | uw_avg_processing_days | DECIMAL(5,2) | Avg UW Processing Days | Average underwriting processing time |
| | uw_last_decision_date | DATE | Last UW Decision Date | Date of last underwriting decision |
| | uw_risk_score | DECIMAL(5,2) | UW Risk Score | Comprehensive underwriting risk score |
| | uw_premium_loading_rate | DECIMAL(5,2) | Avg Premium Loading Rate | Historical average premium loading ratio |
| | uw_exclusion_count | INT | Exclusion Count | Number of underwriting exclusions |
| | uw_preferred_risk_class | VARCHAR(30) | Preferred Risk Class | Most frequently assigned risk class |
| **Customer Value** | customer_segment | VARCHAR(30) | Customer Segment | High Value/Medium Value/Low Value |
| **Channel Information** | acquisition_channel | VARCHAR(50) | Acquisition Channel | First policy channel |
| | primary_agent_id | VARCHAR(20) | Primary Agent ID | Service agent |
| | primary_agent_name | VARCHAR(50) | Primary Agent Name | Agent name |
| | branch_code | VARCHAR(20) | Branch Code | Affiliated branch |
| | branch_name | VARCHAR(50) | Branch Name | Branch name |
| **Data Update Information** | data_date | DATE | Data Date | Data statistics cutoff date |
| | last_update_time | TIMESTAMP | Last Update Time | Data last update time |
| **Data Update Information** | data_date | DATE | Data Date | Data statistics cutoff date |
| | last_update_time | TIMESTAMP | Last Update Time | Data last update time |

#### 3.1.4 Core Business Indicators
- **Customer Value Indicators**: Customer lifetime value, annual premium contribution, cross-selling potential
- **Risk Control Indicators**: Comprehensive risk score, claim frequency, fraud risk indicators
- **Customer Behavior Indicators**: Payment punctuality, policy holding years, product preferences
- **Investment Management Indicators**: ILP fund performance, account value growth, investment diversification
- **Account Management Indicators**: Account balance trends, transaction frequency, bonus accumulation
- **Marketing Support Indicators**: Customer segmentation, recommended products, churn risk score

### 3.2 Sales Performance Summary Wide Table (sales_performance_wide)

#### 3.2.1 Business Scenarios
The sales performance summary wide table is designed to support comprehensive sales performance analysis and management, including:
- **Agent Performance Management**: Individual agent performance evaluation, ranking analysis, and target achievement monitoring
- **Team Performance Analysis**: Team performance comparison, organizational efficiency evaluation, and management effectiveness assessment
- **Sales Target Management**: Target setting, achievement tracking, and performance gap analysis
- **Commission Calculation**: Commission calculation, incentive plan execution, and compensation management
- **Business Development Analysis**: New business development, customer acquisition, and market expansion analysis
- **Quality Management**: Business quality monitoring, persistency analysis, and service quality evaluation

#### 3.2.2 Aggregation Cycles
- **Daily Summary (daily)**: Suitable for daily performance tracking, activity monitoring, and real-time business insights
- **Weekly Summary (weekly)**: Suitable for weekly performance review, activity analysis, and short-term target monitoring
- **Monthly Summary (monthly)**: Mainly used for monthly performance assessment, commission calculation, and sales ranking statistics
- **Quarterly Summary (quarterly)**: Supports quarterly performance evaluation, incentive plan development, and team performance analysis
- **Annual Summary (yearly)**: Used for annual performance summary, agent level assessment, and long-term development planning

#### 3.2.3 Table Structure Design

| Field Category | Field Name | Data Type | Field Description | Business Meaning |
|----------------|------------|-----------|-------------------|------------------|
| **Time Dimension** | stat_date | DATE | Statistical date | Performance statistics date |
| | stat_year | INT | Statistical year | Performance year |
| | stat_quarter | INT | Statistical quarter | Performance quarter (1-4) |
| | stat_month | INT | Statistical month | Performance month (1-12) |
| | stat_week | INT | Statistical week | Performance week (1-53) |
| | aggregation_period | VARCHAR(20) | Aggregation period | daily/weekly/monthly/quarterly/yearly |
| **Agent Information** | agent_id | VARCHAR(20) | Agent ID | Agent unique identifier |
| | agent_name | VARCHAR(50) | Agent name | Agent real name |
| | agent_code | VARCHAR(20) | Agent code | Agent employee number |
| | agent_level | VARCHAR(30) | Agent level | Junior/Intermediate/Senior/Expert |
| | agent_type | VARCHAR(30) | Agent type | Individual agent/Team manager |
| | license_no | VARCHAR(30) | License number | Agent license certificate number |
| | join_date | DATE | Join date | Agent joining date |
| | service_years | DECIMAL(5,2) | Service years | Years of service |
| **Organizational Structure** | branch_code | VARCHAR(20) | Branch code | Affiliated branch code |
| | branch_name | VARCHAR(50) | Branch name | Affiliated branch name |
| | region_code | VARCHAR(20) | Region code | Affiliated region code |
| | region_name | VARCHAR(50) | Region name | Affiliated region name |
| | team_code | VARCHAR(20) | Team code | Affiliated team code |
| | team_name | VARCHAR(50) | Team name | Affiliated team name |
| | manager_id | VARCHAR(20) | Direct manager ID | Direct supervisor ID |
| | manager_name | VARCHAR(50) | Direct manager name | Direct supervisor name |
| **New Business Performance** | new_policies_count | INT | New policies count | Current period new underwritten policies |
| | new_business_premium | DECIMAL(15,2) | New business premium | Current period new business first year premium |
| | new_business_fyc | DECIMAL(15,2) | New business FYC | New business first year commission |
| | new_sum_assured | DECIMAL(18,2) | New sum assured | Total new business sum assured |
| | avg_new_policy_premium | DECIMAL(12,2) | Average new policy premium | Average premium per new policy |
| | large_case_count | INT | Large case count | Number of large cases above threshold |
| | large_case_premium | DECIMAL(15,2) | Large case premium | Total large case premium |
| | large_case_rate | DECIMAL(5,2) | Large case rate | Large case premium ratio |
| **Renewal Performance** | renewal_policies_count | INT | Renewal policies count | Number of renewal policies |
| | renewal_premium | DECIMAL(15,2) | Renewal premium | Renewal premium income |
| | renewal_commission | DECIMAL(12,2) | Renewal commission | Renewal commission income |
| | persistency_rate_13m | DECIMAL(5,2) | 13-month persistency rate | 13-month policy persistency rate |
| | persistency_rate_25m | DECIMAL(5,2) | 25-month persistency rate | 25-month policy persistency rate |
| **Total Performance** | total_premium | DECIMAL(15,2) | Total premium | New business + renewal total premium |
| | total_commission | DECIMAL(15,2) | Total commission | New business + renewal total commission |
| | total_policies | INT | Total policies | New business + renewal total policies |
| **Product Mix** | life_insurance_premium | DECIMAL(15,2) | Life insurance premium | Life insurance product premium |
| | health_insurance_premium | DECIMAL(15,2) | Health insurance premium | Health insurance product premium |
| | accident_insurance_premium | DECIMAL(15,2) | Accident insurance premium | Accident insurance product premium |
| | annuity_premium | DECIMAL(15,2) | Annuity premium | Annuity product premium |
| | traditional_product_premium | DECIMAL(15,2) | Traditional product premium | Traditional product premium |
| | universal_product_premium | DECIMAL(15,2) | Universal product premium | Universal product premium |
| | investment_linked_premium | DECIMAL(15,2) | Investment-linked premium | Investment-linked product premium |
| **Customer Development** | new_customers_count | INT | New customers count | Current period new customers acquired |
| | total_customers_count | INT | Total customers count | Cumulative customers served |
| | customer_retention_rate | DECIMAL(5,2) | Customer retention rate | Customer retention ratio |
| | cross_sell_count | INT | Cross-sell count | New policies sold to existing customers |
| | cross_sell_rate | DECIMAL(5,2) | Cross-sell rate | Cross-selling success rate |
| | referral_count | INT | Referral count | Successful customer referrals |
| | referral_rate | DECIMAL(5,2) | Referral rate | Referral success rate |
| **Activity Metrics** | visits_count | INT | Visits count | Customer visit count |
| | effective_visits_count | INT | Effective visits count | Effective customer visits |
| | proposals_count | INT | Proposals count | Number of proposals created |
| | proposal_success_rate | DECIMAL(5,2) | Proposal success rate | Proposal conversion rate |
| | phone_calls_count | INT | Phone calls count | Customer phone contact count |
| | meetings_count | INT | Meetings count | Face-to-face meeting count |
| **Performance Rankings** | branch_premium_rank | INT | Branch premium rank | Premium ranking within branch |
| | region_premium_rank | INT | Region premium rank | Premium ranking within region |
| | company_premium_rank | INT | Company premium rank | Premium ranking within company |
| | branch_fyc_rank | INT | Branch FYC rank | FYC ranking within branch |
| | region_fyc_rank | INT | Region FYC rank | FYC ranking within region |
| **Target Achievement** | premium_target | DECIMAL(15,2) | Premium target | Current period premium target |
| | premium_achievement_rate | DECIMAL(5,2) | Premium achievement rate | Premium completion ratio |
| | fyc_target | DECIMAL(15,2) | FYC target | Current period FYC target |
| | fyc_achievement_rate | DECIMAL(5,2) | FYC achievement rate | FYC completion ratio |
| | policies_target | INT | Policies target | Current period policies target |
| | policies_achievement_rate | DECIMAL(5,2) | Policies achievement rate | Policies completion ratio |
| **Growth Indicators** | premium_growth_rate | DECIMAL(5,2) | Premium growth rate | Year-over-year premium growth rate |
| | fyc_growth_rate | DECIMAL(5,2) | FYC growth rate | Year-over-year FYC growth rate |
| | policies_growth_rate | DECIMAL(5,2) | Policies growth rate | Year-over-year policies growth rate |
| | customer_growth_rate | DECIMAL(5,2) | Customer growth rate | Year-over-year customer growth rate |
| **Quality Indicators** | policy_lapse_rate | DECIMAL(5,2) | Policy lapse rate | Policy lapse ratio |
| | surrender_rate | DECIMAL(5,2) | Surrender rate | Policy surrender ratio |
| | complaint_count | INT | Complaint count | Customer complaint count |
| | service_satisfaction_score | DECIMAL(5,2) | Service satisfaction score | Customer satisfaction rating |
| | uw_submission_count | INT | UW submission count | Underwriting submissions |
| | uw_approval_count | INT | UW approval count | Underwriting approvals |
| | uw_approval_rate | DECIMAL(5,2) | UW approval rate | Underwriting approval rate percentage |
| | uw_avg_processing_days | DECIMAL(5,2) | Average UW processing days | Average underwriting processing days |
| | uw_premium_loading_rate | DECIMAL(5,2) | Average premium loading rate | Average underwriting premium loading ratio |
| **Data Update Information** | data_date | DATE | Data date | Data statistics cutoff date |
| | last_update_time | TIMESTAMP | Last update time | Data last update time |

#### 3.2.4 Core Business Indicators
- **Performance Indicators**: New business premium, renewal premium, total commission, average premium per policy
- **Quality Indicators**: Persistency rate, lapse rate, customer satisfaction, complaint rate, underwriting approval rate, underwriting processing efficiency
- **Efficiency Indicators**: Visit success rate, proposal conversion rate, cross-selling rate
- **Development Indicators**: Customer growth rate, performance growth rate, target achievement rate

### 3.3 Claims Analysis Wide Table (claim_analysis_wide)

#### 3.3.1 Business Scenario Description
Provides comprehensive claims analysis views for claims managers, risk control specialists, and actuaries, including claim case details, processing workflows, payment situations, and risk analysis, supporting claims efficiency improvement, risk control, and anti-fraud management.

#### 3.3.2 Aggregation Cycle Design
- **Daily Summary (daily)**: Supports real-time monitoring of claims cases, such as daily reporting, acceptance, and investigation progress
- **Weekly Summary (weekly)**: Suitable for claims processing efficiency analysis and case backlog monitoring
- **Monthly Summary (monthly)**: Mainly used for claims statistical analysis, loss ratio calculation, and risk trend assessment
- **Quarterly Summary (quarterly)**: Supports quarterly claims performance evaluation, anti-fraud analysis, and risk control strategy adjustment
- **Annual Summary (yearly)**: Used for annual claims summary, actuarial analysis, and product risk assessment

#### 3.3.3 Table Structure Design

| Field Category | Field Name | Data Type | Field Description | Business Meaning |
|----------------|------------|-----------|-------------------|------------------|
| **Time Dimension** | stat_date | DATE | Statistical date | Claims data statistics cutoff date |
| | stat_year | INT | Statistical year | Claims data statistics year |
| | stat_quarter | INT | Statistical quarter | Claims data statistics quarter (1-4) |
| | stat_month | INT | Statistical month | Claims data statistics month (1-12) |
| | stat_week | INT | Statistical week | Claims data statistics week (1-53) |
| | aggregation_period | VARCHAR(20) | Aggregation period | daily/weekly/monthly/quarterly/yearly |
| **Case Basic Information** | claim_id | VARCHAR(20) | Claim case ID | Claim case unique identifier |
| | case_no | VARCHAR(30) | Case number | Claim case number |
| | policy_id | VARCHAR(20) | Policy ID | Associated policy identifier |
| | policy_no | VARCHAR(30) | Policy number | Policy number |
| | customer_id | VARCHAR(20) | Customer ID | Customer unique identifier |
| | customer_name | VARCHAR(100) | Customer name | Insured person name |
| | insured_name | VARCHAR(100) | Insured name | Insured person real name |
| | beneficiary_name | VARCHAR(100) | Beneficiary name | Beneficiary real name |
| **Product Information** | product_id | VARCHAR(20) | Product ID | Product unique identifier |
| | product_name | VARCHAR(100) | Product name | Insurance product name |
| | product_type | VARCHAR(50) | Product type | Life/Health/Accident insurance |
| | coverage_type | VARCHAR(50) | Coverage type | Death/Disease/Medical/Accident |
| | sum_assured | DECIMAL(15,2) | Sum assured | Policy sum assured |
| | annual_premium | DECIMAL(12,2) | Annual premium | Policy annual premium |
| | policy_effective_date | DATE | Policy effective date | Policy start effective date |
| **Claim Event Information** | incident_date | DATE | Incident date | Insurance accident occurrence date |
| | report_date | DATE | Report date | Customer report date |
| | report_channel | VARCHAR(30) | Report channel | Phone/Online/Counter/Agent |
| | claim_type | VARCHAR(50) | Claim type | Death/Disease/Medical/Accident |
| | claim_cause | VARCHAR(100) | Claim cause | Specific incident cause description |
| | incident_location | VARCHAR(100) | Incident location | Accident occurrence location |
| | hospital_name | VARCHAR(100) | Hospital name | Treatment hospital name |
| | diagnosis | VARCHAR(200) | Diagnosis result | Hospital diagnosis result |
| **Claim Amount** | claim_amount | DECIMAL(15,2) | Claimed amount | Customer claimed amount |
| | approved_amount | DECIMAL(15,2) | Approved amount | Company approved claim amount |
| | paid_amount | DECIMAL(15,2) | Paid amount | Actually paid claim amount |
| | deductible_amount | DECIMAL(12,2) | Deductible amount | Policy deductible amount |
| | copay_amount | DECIMAL(12,2) | Copay amount | Customer copay portion |
| | adjustment_amount | DECIMAL(12,2) | Adjustment amount | Claim amount adjustment |
| | expense_amount | DECIMAL(12,2) | Expense amount | Claim processing expenses |
| **Processing Workflow** | accept_date | DATE | Accept date | Formal case acceptance date |
| | investigation_start_date | DATE | Investigation start date | Investigation start date |
| | investigation_end_date | DATE | Investigation end date | Investigation completion date |
| | review_date | DATE | Review date | Claim review date |
| | approval_date | DATE | Approval date | Claim approval date |
| | payment_date | DATE | Payment date | Actual payment date |
| | close_date | DATE | Close date | Case closure date |
| | current_status | VARCHAR(30) | Current status | Reported/Accepted/Investigating/Reviewing/Paid/Closed |
| **Processing Timeliness** | report_to_accept_days | INT | Report to accept days | Days from report to acceptance |
| | accept_to_investigate_days | INT | Accept to investigate days | Days from acceptance to investigation start |
| | investigation_days | INT | Investigation days | Days spent on investigation |
| | review_days | INT | Review days | Days spent on review |
| | approval_to_payment_days | INT | Approval to payment days | Days from approval to actual payment |
| | total_processing_days | INT | Total processing days | Total days from report to closure |
| | sla_target_days | INT | SLA target days | Service level agreement target days |
| | sla_compliance | BOOLEAN | SLA compliance | Whether completed within SLA time |
| **Processing Personnel** | reporter_id | VARCHAR(20) | Reporter ID | Reporter identifier |
| | reporter_name | VARCHAR(50) | Reporter name | Reporter name |
| | handler_id | VARCHAR(20) | Handler ID | Primary handler identifier |
| | handler_name | VARCHAR(50) | Handler name | Primary handler name |
| | investigator_id | VARCHAR(20) | Investigator ID | Investigator identifier |
| | investigator_name | VARCHAR(50) | Investigator name | Investigator name |
| | reviewer_id | VARCHAR(20) | Reviewer ID | Reviewer identifier |
| | reviewer_name | VARCHAR(50) | Reviewer name | Reviewer name |
| **Risk Assessment** | risk_level | VARCHAR(20) | Risk level | Low/Medium/High risk |
| | fraud_indicators | VARCHAR(500) | Fraud risk indicators | Specific risk indicator descriptions |
| | investigation_required | BOOLEAN | Investigation required | Whether deep investigation required |
| | medical_review_required | BOOLEAN | Medical review required | Whether medical professional review required |
| | legal_review_required | BOOLEAN | Legal review required | Whether legal review required |
| **Underwriting History Information** | original_uw_decision | VARCHAR(30) | Original UW decision | Underwriting decision at policy issuance |
| | original_uw_risk_score | DECIMAL(5,2) | Original UW risk score | Risk score at underwriting |
| | original_premium_loading | DECIMAL(5,2) | Original premium loading | Premium loading ratio at underwriting |
| | original_exclusions | VARCHAR(500) | Original exclusions | Exclusions set at underwriting |
| | uw_medical_exam_flag | BOOLEAN | UW medical exam flag | Whether medical exam conducted at underwriting |
| | uw_special_conditions | VARCHAR(500) | UW special conditions | Special underwriting conditions |
| | claim_vs_uw_consistency | VARCHAR(50) | Claim vs UW consistency | Consistency between claim cause and UW assessment |
| **Claim Result** | claim_decision | VARCHAR(30) | Claim decision | Full payment/Partial payment/Denial |
| | rejection_reason | VARCHAR(200) | Rejection reason | Specific reason for denial |
| | reduction_reason | VARCHAR(200) | Reduction reason | Reason for reduced payment |
| | claim_ratio | DECIMAL(5,2) | Claim ratio | Paid amount/Claimed amount |
| | is_reopened | BOOLEAN | Is reopened | Whether case was reopened |
| | reopen_count | INT | Reopen count | Number of case reopenings |
| **Customer Information** | customer_age | INT | Customer age | Customer age at incident |
| | customer_gender | VARCHAR(10) | Customer gender | Customer gender |
| | customer_occupation | VARCHAR(50) | Customer occupation | Customer occupation |
| | policy_duration_months | INT | Policy duration months | Months from effective to incident |
| | premium_paid_total | DECIMAL(15,2) | Total premium paid | Cumulative premium paid before incident |
| | is_first_claim | BOOLEAN | Is first claim | Whether customer's first claim |
| | customer_claim_history_count | INT | Customer claim history count | Customer's historical claim count |
| **Channel Information** | sales_channel | VARCHAR(50) | Sales channel | Policy sales channel |
| | agent_id | VARCHAR(20) | Agent ID | Sales agent ID |
| | agent_name | VARCHAR(50) | Agent name | Sales agent name |
| | branch_code | VARCHAR(20) | Branch code | Sales branch code |
| | branch_name | VARCHAR(50) | Branch name | Sales branch name |
| **Statistical Analysis** | loss_ratio | DECIMAL(5,2) | Loss ratio | Claim amount/Premium income |
| | claim_frequency | DECIMAL(8,4) | Claim frequency | Claim count/Policy count |
| | average_claim_amount | DECIMAL(12,2) | Average claim amount | Average payment for similar cases |
| | claim_severity | DECIMAL(5,2) | Claim severity | Claim amount/Sum assured |
| | seasonal_factor | DECIMAL(5,2) | Seasonal factor | Seasonal influence factor |
| **Data Update Information** | data_date | DATE | Data date | Data statistics cutoff date |
| | last_update_time | TIMESTAMP | Last update time | Data last update time |

#### 3.3.4 Core Business Indicators
- **Efficiency Indicators**: Average processing time, SLA compliance rate, case processing volume
- **Quality Indicators**: Payment accuracy rate, customer satisfaction, complaint rate
- **Risk Indicators**: Fraud case identification rate, risk case ratio, investigation accuracy rate, underwriting risk prediction accuracy
- **Cost Indicators**: Claims expense ratio, per capita processing cost, investigation cost
- **Underwriting Correlation Indicators**: Claims vs underwriting consistency, loaded premium policy claim rate, exclusion effectiveness

### 3.4 Product Profitability Wide Table (product_profit_wide)

#### 3.4.1 Business Scenario Description
Provides comprehensive product profitability analysis views for product managers, actuaries, and management, including premium income, claims expenditure, expense allocation, and profit contribution, supporting product pricing, product optimization, and investment decisions.

#### 3.4.2 Aggregation Cycle Design
- **Monthly Summary (monthly)**: Mainly used for monthly product profitability analysis, expense allocation, and cash flow monitoring
- **Quarterly Summary (quarterly)**: Supports quarterly product performance evaluation, profitability comparison, and investment return analysis
- **Annual Summary (yearly)**: Used for annual product profitability summary, actuarial assumption validation, and product lifecycle analysis

#### 3.4.3 Table Structure Design

| Field Category | Field Name | Data Type | Field Description | Business Meaning |
|----------------|------------|-----------|-------------------|------------------|
| **Time Dimension** | stat_date | DATE | Statistical date | Data statistics date |
| | stat_year | INT | Statistical year | Statistical year |
| | stat_quarter | INT | Statistical quarter | Statistical quarter (1-4) |
| | stat_month | INT | Statistical month | Statistical month (1-12) |
| | stat_week | INT | Statistical week | Statistical week (1-53) |
| | aggregation_period | VARCHAR(20) | Aggregation period | weekly/monthly/quarterly/yearly |
| **Product Information** | product_id | VARCHAR(20) | Product ID | Product unique identifier |
| | product_code | VARCHAR(20) | Product code | Product code |
| | product_name | VARCHAR(100) | Product name | Product full name |
| | product_type | VARCHAR(50) | Product type | Life/Health/Accident/Annuity insurance |
| | product_category | VARCHAR(50) | Product category | Traditional/Universal/Investment-linked |
| | launch_date | DATE | Launch date | Product launch date |
| | product_status | VARCHAR(20) | Product status | Active/Discontinued/In preparation |
| | target_market | VARCHAR(50) | Target market | Individual/Group/High-end customers |
| **Business Scale** | active_policies_count | INT | Active policies count | Current active policies count |
| | new_policies_count | INT | New policies count | Current period new policies count |
| | lapsed_policies_count | INT | Lapsed policies count | Current period lapsed policies count |
| | surrendered_policies_count | INT | Surrendered policies count | Current period surrendered policies count |
| | total_sum_assured | DECIMAL(18,2) | Total sum assured | Total sum assured of active policies |
| | avg_sum_assured | DECIMAL(15,2) | Average sum assured | Average sum assured per policy |
| | policy_growth_rate | DECIMAL(5,2) | Policy growth rate | Year-over-year policy count growth rate |
| **Premium Income** | gross_premium | DECIMAL(18,2) | Gross premium income | Total premium income |
| | net_premium | DECIMAL(18,2) | Net premium income | Premium after reinsurance deduction |
| | first_year_premium | DECIMAL(18,2) | First year premium | New business first year premium |
| | renewal_premium | DECIMAL(18,2) | Renewal premium | Renewal premium income |
| | single_premium | DECIMAL(18,2) | Single premium | One-time payment premium |
| | regular_premium | DECIMAL(18,2) | Regular premium | Installment payment premium |
| | avg_premium_per_policy | DECIMAL(12,2) | Average premium per policy | Average premium per policy |
| | premium_growth_rate | DECIMAL(5,2) | Premium growth rate | Year-over-year premium income growth rate |
| **Claims Expenditure** | gross_claims_paid | DECIMAL(15,2) | Gross claims paid | Total claims expenditure |
| | net_claims_paid | DECIMAL(15,2) | Net claims paid | Claims expenditure after reinsurance |
| | death_claims | DECIMAL(15,2) | Death claims | Death benefit claims expenditure |
| | disability_claims | DECIMAL(15,2) | Disability claims | Disability benefit claims expenditure |
| | medical_claims | DECIMAL(15,2) | Medical claims | Medical benefit claims expenditure |
| | maturity_benefits | DECIMAL(15,2) | Maturity benefits | Maturity benefit expenditure |
| | surrender_benefits | DECIMAL(15,2) | Surrender benefits | Surrender benefit expenditure |
| | claims_count | INT | Claims count | Number of claims cases |
| | avg_claim_amount | DECIMAL(12,2) | Average claim amount | Average claim amount per case |
| **Expense Expenditure** | acquisition_costs | DECIMAL(15,2) | Acquisition costs | New business acquisition costs |
| | commission_expense | DECIMAL(15,2) | Commission expense | Agent commission expenditure |
| | underwriting_expense | DECIMAL(12,2) | Underwriting expense | Underwriting related expenses |
| | uw_processing_cost | DECIMAL(12,2) | UW processing cost | Underwriting personnel and system costs |
| | uw_medical_exam_cost | DECIMAL(12,2) | UW medical exam cost | Medical exam costs required by underwriting |
| | uw_risk_assessment_cost | DECIMAL(12,2) | UW risk assessment cost | Risk assessment related costs |
| | uw_reinsurance_cost | DECIMAL(12,2) | UW reinsurance cost | Reinsurance costs due to underwriting |
| | policy_maintenance_expense | DECIMAL(12,2) | Policy maintenance expense | Policy management expenses |
| | claim_handling_expense | DECIMAL(12,2) | Claim handling expense | Claims related expenses |
| | reinsurance_premium | DECIMAL(15,2) | Reinsurance premium | Reinsurance premium expenditure |
| | investment_management_fee | DECIMAL(12,2) | Investment management fee | Investment management related fees |
| | total_expenses | DECIMAL(15,2) | Total expenses | Sum of all expenses |
| **Reserves** | unearned_premium_reserve | DECIMAL(15,2) | Unearned premium reserve | Unearned premium reserve |
| | outstanding_claims_reserve | DECIMAL(15,2) | Outstanding claims reserve | Outstanding claims reserve |
| | life_insurance_reserve | DECIMAL(15,2) | Life insurance reserve | Life insurance liability reserve |
| | total_reserves | DECIMAL(15,2) | Total reserves | Sum of all reserves |
| | reserve_change | DECIMAL(15,2) | Reserve change | Current period reserve change |
| **Investment Income** | investment_income | DECIMAL(15,2) | Investment income | Product related investment income |
| | realized_gains | DECIMAL(15,2) | Realized gains | Realized investment gains |
| | unrealized_gains | DECIMAL(15,2) | Unrealized gains | Unrealized investment gains |
| | investment_yield | DECIMAL(5,2) | Investment yield | Investment yield rate |
| **ILP Business Indicators** | ilp_premium_income | DECIMAL(15,2) | ILP premium income | Investment-linked product premium income |
| | ilp_fund_management_fee | DECIMAL(12,2) | ILP fund management fee | Fund management fee income |
| | ilp_policy_management_fee | DECIMAL(12,2) | ILP policy management fee | Policy management fee income |
| | ilp_total_fund_value | DECIMAL(18,2) | ILP total fund value | Total value of all ILP funds |
| | ilp_net_fund_flow | DECIMAL(15,2) | ILP net fund flow | Net amount of subscriptions minus redemptions |
| | ilp_average_fund_return | DECIMAL(5,2) | ILP average fund return | Weighted average fund return rate |
| | ilp_surrender_rate | DECIMAL(5,2) | ILP surrender rate | Investment-linked product surrender rate |
| **Policy Account Business Indicators** | pac_account_premium | DECIMAL(15,2) | PAC account premium | Policy account related premium |
| | pac_account_fee_income | DECIMAL(12,2) | PAC account fee income | Account management fee income |
| | pac_total_account_value | DECIMAL(18,2) | PAC total account value | Total value of all policy accounts |
| | pac_bonus_distributed | DECIMAL(15,2) | PAC bonus distributed | Current period bonus distribution total |
| | pac_bonus_rate | DECIMAL(5,2) | PAC bonus rate | Bonus/account value ratio |
| | pac_withdrawal_rate | DECIMAL(5,2) | PAC withdrawal rate | Withdrawal amount/account value |
| | pac_account_growth_rate | DECIMAL(5,2) | PAC account growth rate | Account value growth rate |
| **Profitability Analysis** | gross_profit | DECIMAL(15,2) | Gross profit | Premium income - claims expenditure |
| | operating_profit | DECIMAL(15,2) | Operating profit | Gross profit - operating expenses |
| | net_profit | DECIMAL(15,2) | Net profit | Operating profit + investment income |
| | profit_margin | DECIMAL(5,2) | Profit margin | Net profit/premium income |
| | roe | DECIMAL(5,2) | Return on equity | Net profit/net assets |
| | embedded_value | DECIMAL(15,2) | Embedded value | Product embedded value |
| | new_business_value | DECIMAL(15,2) | New business value | New business value |
| **Key Ratios** | loss_ratio | DECIMAL(5,2) | Loss ratio | Claims expenditure/premium income |
| | expense_ratio | DECIMAL(5,2) | Expense ratio | Expense expenditure/premium income |
| | combined_ratio | DECIMAL(5,2) | Combined ratio | Loss ratio + expense ratio |
| | lapse_rate | DECIMAL(5,2) | Lapse rate | Lapsed policies/active policies |
| | surrender_rate | DECIMAL(5,2) | Surrender rate | Surrendered policies/active policies |
| | persistency_rate_13m | DECIMAL(5,2) | 13-month persistency rate | 13-month policy persistency rate |
| | persistency_rate_25m | DECIMAL(5,2) | 25-month persistency rate | 25-month policy persistency rate |
| **Market Performance** | market_share | DECIMAL(5,2) | Market share | Share in similar products |
| | competitive_position | VARCHAR(20) | Competitive position | Leading/Following/Lagging |
| | price_competitiveness | DECIMAL(5,2) | Price competitiveness | Relative to market price level |
| | customer_satisfaction | DECIMAL(5,2) | Customer satisfaction | Customer satisfaction score |
| | nps_score | DECIMAL(5,2) | NPS score | Net Promoter Score |
| **Risk Indicators** | concentration_risk | DECIMAL(5,2) | Concentration risk | Business concentration risk |
| | mortality_deviation | DECIMAL(5,2) | Mortality deviation | Actual vs expected mortality rate |
| | morbidity_deviation | DECIMAL(5,2) | Morbidity deviation | Actual vs expected morbidity rate |
| | lapse_deviation | DECIMAL(5,2) | Lapse deviation | Actual vs expected lapse rate |
| | expense_deviation | DECIMAL(5,2) | Expense deviation | Actual vs expected expense rate |
| | uw_approval_rate | DECIMAL(5,2) | UW approval rate | Underwriting approval ratio |
| | uw_avg_processing_days | DECIMAL(5,2) | UW average processing days | Average underwriting processing days |
| | uw_premium_loading_avg | DECIMAL(5,2) | UW average premium loading | Average underwriting premium loading ratio |
| | uw_risk_score_avg | DECIMAL(5,2) | UW average risk score | Average underwriting risk score |
| **Channel Analysis** | individual_agent_premium | DECIMAL(15,2) | Individual agent premium | Individual agent channel premium |
| | bancassurance_premium | DECIMAL(15,2) | Bancassurance premium | Bancassurance channel premium |
| | online_premium | DECIMAL(15,2) | Online premium | Online channel premium |
| | group_premium | DECIMAL(15,2) | Group premium | Group insurance channel premium |
| | channel_diversification | DECIMAL(5,2) | Channel diversification | Channel diversification index |
| **Data Update Information** | data_date | DATE | Data date | Data statistics cutoff date |
| | last_update_time | TIMESTAMP | Last update time | Data last update time |

#### 3.4.4 Core Business Indicators
- **Profitability Indicators**: Net profit, profit margin, new business value, embedded value
- **Efficiency Indicators**: Combined ratio, expense ratio, investment yield
- **Quality Indicators**: Persistency rate, lapse rate, customer satisfaction
- **Risk Indicators**: Loss ratio, concentration risk, various deviation rates, underwriting approval rate, underwriting risk score
- **Underwriting Indicators**: Underwriting processing efficiency, premium loading level, risk assessment costs

### 3.5 Risk Model Assessment Wide Table (risk_assessment_wide)

#### 3.5.1 Business Scenario Description
Provides comprehensive risk assessment views for underwriters, risk managers, and actuaries, including customer risk factors, product risk factors, geographical risk factors, and behavioral risk factors, supporting underwriting decisions, risk pricing, and risk management.

#### 3.5.2 Aggregation Cycle Design
- **Monthly Summary (monthly)**: Mainly used for monthly risk assessment analysis, risk factor monitoring, and underwriting performance evaluation
- **Quarterly Summary (quarterly)**: Supports quarterly risk model validation, risk factor effectiveness analysis, and underwriting strategy adjustment
- **Annual Summary (yearly)**: Used for annual risk assessment summary, model performance evaluation, and long-term risk trend analysis

#### 3.5.3 Table Structure Design

| Field Category | Field Name | Data Type | Field Description | Business Meaning |
|----------------|------------|-----------|-------------------|------------------|
| **Time Dimension** | stat_date | DATE | Statistical date | Data statistics date |
| | stat_year | INT | Statistical year | Statistical year |
| | stat_quarter | INT | Statistical quarter | Statistical quarter (1-4) |
| | stat_month | INT | Statistical month | Statistical month (1-12) |
| | aggregation_period | VARCHAR(20) | Aggregation period | monthly/quarterly/yearly |
| **Assessment Basic Information** | assessment_id | VARCHAR(20) | Assessment ID | Risk assessment unique identifier |
| | assessment_date | DATE | Assessment date | Risk assessment date |
| | assessment_type | VARCHAR(30) | Assessment type | New business/Renewal/Claim/Regular review |
| | assessment_result | VARCHAR(30) | Assessment result | Accept/Decline/Refer/Conditional accept |
| | risk_level | VARCHAR(20) | Risk level | Low/Medium/High/Very high |
| | overall_risk_score | DECIMAL(5,2) | Overall risk score | Comprehensive risk score (1-10) |
| **Assessed Object** | customer_id | VARCHAR(20) | Customer ID | Customer unique identifier |
| | policy_id | VARCHAR(20) | Policy ID | Related policy ID |
| | product_id | VARCHAR(20) | Product ID | Related product ID |
| | application_id | VARCHAR(20) | Application ID | Related application ID |
| | assessment_purpose | VARCHAR(50) | Assessment purpose | Assessment objective |
| **Customer Risk Factors** | age | INT | Age | Customer age |
| | gender | VARCHAR(10) | Gender | Male/Female |
| | occupation | VARCHAR(100) | Occupation | Customer occupation |
| | occupation_risk_level | VARCHAR(20) | Occupation risk level | Occupation risk classification |
| | income_level | VARCHAR(30) | Income level | Annual income range |
| | education_level | VARCHAR(30) | Education level | Education background |
| | marital_status | VARCHAR(20) | Marital status | Single/Married/Divorced/Widowed |
| | health_status | VARCHAR(30) | Health status | Health condition assessment |
| | smoking_status | VARCHAR(20) | Smoking status | Non-smoker/Smoker/Ex-smoker |
| | drinking_habits | VARCHAR(30) | Drinking habits | Drinking frequency and amount |
| | exercise_habits | VARCHAR(30) | Exercise habits | Exercise frequency and intensity |
| | family_medical_history | VARCHAR(500) | Family medical history | Family disease history |
| | personal_medical_history | VARCHAR(500) | Personal medical history | Personal disease history |
| **Financial Risk Factors** | annual_income | DECIMAL(12,2) | Annual income | Customer annual income |
| | net_worth | DECIMAL(15,2) | Net worth | Customer net worth |
| | debt_to_income_ratio | DECIMAL(5,2) | Debt-to-income ratio | Debt/income ratio |
| | credit_score | INT | Credit score | Credit rating score |
| | employment_stability | VARCHAR(30) | Employment stability | Employment stability assessment |
| | income_source | VARCHAR(100) | Income source | Primary income source |
| | financial_obligations | DECIMAL(12,2) | Financial obligations | Monthly financial obligations |
| | insurance_coverage_ratio | DECIMAL(5,2) | Insurance coverage ratio | Insurance amount/income ratio |
| **Behavioral Risk Factors** | policy_count | INT | Policy count | Number of policies held |
| | claim_history_count | INT | Historical claim count | Number of historical claims |
| | claim_frequency | DECIMAL(5,2) | Claim frequency | Annual average claim frequency |
| | premium_payment_history | VARCHAR(20) | Premium payment history | On-time/Overdue/Lapsed |
| | policy_lapse_history | INT | Policy lapse history | Number of historical lapsed policies |
| | application_frequency | DECIMAL(5,2) | Application frequency | Annual average application frequency |
| | channel_preference | VARCHAR(30) | Channel preference | Preferred purchase channel |
| **Product Risk Factors** | product_type | VARCHAR(50) | Product type | Product risk type |
| | coverage_amount | DECIMAL(15,2) | Coverage amount | Insurance amount |
| | premium_amount | DECIMAL(12,2) | Premium amount | Annual premium amount |
| | policy_term | INT | Policy term | Policy term in years |
| | payment_period | INT | Payment period | Payment period in years |
| | waiting_period | INT | Waiting period | Waiting period in days |
| | benefit_structure | VARCHAR(100) | Benefit structure | Benefit payment structure |
| | product_complexity | VARCHAR(20) | Product complexity | Simple/Medium/Complex |
| **Geographical Risk Factors** | residence_province | VARCHAR(50) | Residence province | Province of residence |
| | residence_city | VARCHAR(50) | Residence city | City of residence |
| | region_risk_level | VARCHAR(20) | Regional risk level | Regional risk level |
| | natural_disaster_risk | DECIMAL(5,2) | Natural disaster risk | Regional natural disaster risk |
| | economic_development_level | VARCHAR(20) | Economic development level | Regional economic level |
| | healthcare_level | VARCHAR(20) | Healthcare level | Regional healthcare level |
| | coverage_exclusions | VARCHAR(500) | Coverage exclusions | Exclusion clauses |
| **Data Update Information** | data_date | DATE | Data date | Data statistics cutoff date |
| | last_update_time | TIMESTAMP | Last update time | Data last update time |

#### 3.5.4 Core Business Indicators
- **Customer Basic Information**: Age, gender, occupation, health status, income level
- **Risk Factor Indicators**: Occupation risk level, regional risk level, natural disaster risk
- **Behavioral Characteristic Indicators**: Policy count, claim frequency, payment history, application frequency
- **Product Characteristic Indicators**: Product type, coverage amount, policy term, product complexity

> **Note**: The original risk scoring, model performance, underwriting decision, and predictive capability related indicators have been migrated to Chapter 9 "Machine Learning Prediction Attribute Centralized Management".

### 3.6 Policy Lifecycle Management Wide Table (policy_lifecycle_wide)

#### 3.6.1 Business Scenario Description
Provides comprehensive policy lifecycle views for policy administrators, customer service personnel, and business analysts, including policy status changes, payment records, claim history, value changes, etc., supporting policy services, customer care, and business analysis.

#### 3.6.2 Aggregation Cycle Design
- **Daily Summary (daily)**: Supports real-time policy status monitoring and customer service response
- **Weekly Summary (weekly)**: Suitable for policy business operation analysis and customer care activities
- **Monthly Summary (monthly)**: Mainly used for policy portfolio analysis, renewal management, and business performance evaluation
- **Quarterly Summary (quarterly)**: Supports policy value analysis, product performance evaluation, and business strategy adjustment
- **Annual Summary (yearly)**: Used for annual policy reports, customer lifetime value analysis, and long-term business planning

#### 3.6.3 Table Structure Design

| Field Category | Field Name | Data Type | Field Description | Business Meaning |
|----------------|------------|-----------|-------------------|------------------|
| **Time Dimension** | stat_date | DATE | Statistical date | Data statistics date |
| | stat_year | INT | Statistical year | Statistical year |
| | stat_quarter | INT | Statistical quarter | Statistical quarter (1-4) |
| | stat_month | INT | Statistical month | Statistical month (1-12) |
| | stat_week | INT | Statistical week | Statistical week (1-53) |
| | aggregation_period | VARCHAR(20) | Aggregation period | daily/weekly/monthly/quarterly/yearly |
| **Policy Basic Information** | policy_id | VARCHAR(20) | Policy ID | Policy unique identifier |
| | policy_no | VARCHAR(30) | Policy number | Policy number |
| | application_no | VARCHAR(30) | Application number | Application number |
| | customer_id | VARCHAR(20) | Customer ID | Policyholder identifier |
| | customer_name | VARCHAR(100) | Customer name | Policyholder name |
| | insured_id | VARCHAR(20) | Insured ID | Insured person identifier |
| | insured_name | VARCHAR(100) | Insured name | Insured person name |
| | beneficiary_name | VARCHAR(100) | Beneficiary name | Beneficiary name |
| **Product Information** | product_id | VARCHAR(20) | Product ID | Product identifier |
| | product_code | VARCHAR(20) | Product code | Product code |
| | product_name | VARCHAR(100) | Product name | Product full name |
| | product_type | VARCHAR(50) | Product type | Life/Health/Accident/Annuity insurance |
| | product_category | VARCHAR(50) | Product category | Traditional/Universal/Investment-linked |
| | main_coverage | VARCHAR(100) | Main coverage | Main insurance coverage |
| | additional_coverages | VARCHAR(500) | Additional coverages | Additional insurance coverage |
| **Policy Terms** | sum_assured | DECIMAL(15,2) | Sum assured | Basic insurance amount |
| | annual_premium | DECIMAL(12,2) | Annual premium | Annual premium amount |
| | premium_frequency | VARCHAR(20) | Premium frequency | Annual/Semi-annual/Quarterly/Monthly |
| | policy_term | INT | Policy term | Policy term in years |
| | payment_period | INT | Payment period | Payment period in years |
| | grace_period | INT | Grace period | Grace period in days |
| | waiting_period | INT | Waiting period | Waiting period in days |
| | policy_currency | VARCHAR(10) | Policy currency | Policy currency type |
| **Important Dates** | application_date | DATE | Application date | Application date |
| | underwriting_date | DATE | Underwriting date | Underwriting completion date |
| | issue_date | DATE | Issue date | Policy issue date |
| | effective_date | DATE | Effective date | Policy effective date |
| | maturity_date | DATE | Maturity date | Policy maturity date |
| | next_premium_due_date | DATE | Next premium due date | Next premium due date |
| | last_premium_paid_date | DATE | Last premium paid date | Last premium payment date |
| | termination_date | DATE | Termination date | Policy termination date |
| **Policy Status** | current_status | VARCHAR(30) | Current status | Active/Lapsed/Surrendered/Matured/Claim terminated |
| | status_change_date | DATE | Status change date | Latest status change date |
| | status_change_reason | VARCHAR(100) | Status change reason | Specific reason for status change |
| | policy_duration_days | INT | Policy duration days | Days from effective to current |
| | policy_duration_years | DECIMAL(5,2) | Policy duration years | Years from effective to current |
| | is_inforce | BOOLEAN | Is in force | Whether policy is currently active |
| | lapse_date | DATE | Lapse date | Policy lapse date |
| | reinstatement_date | DATE | Reinstatement date | Policy reinstatement date |
| | surrender_date | DATE | Surrender date | Policy surrender date |
| **Payment Information** | total_premiums_due | DECIMAL(15,2) | Total premiums due | Total historical premiums due |
| | total_premiums_paid | DECIMAL(15,2) | Total premiums paid | Total historical premiums paid |
| | outstanding_premium | DECIMAL(12,2) | Outstanding premium | Current outstanding premium |
| | overdue_premium | DECIMAL(12,2) | Overdue premium | Overdue unpaid premium |
| | overdue_days | INT | Overdue days | Premium overdue days |
| | payment_completion_rate | DECIMAL(5,2) | Payment completion rate | Paid/due ratio |
| | auto_pay_enabled | BOOLEAN | Auto pay enabled | Whether auto-pay is enabled |
| | payment_method | VARCHAR(30) | Payment method | Bank transfer/Cash/Credit card |
| | last_payment_amount | DECIMAL(12,2) | Last payment amount | Last payment amount |
| **Policy Value** | cash_value | DECIMAL(15,2) | Cash value | Current cash value |
| | surrender_value | DECIMAL(15,2) | Surrender value | Current surrender value |
| | loan_value | DECIMAL(15,2) | Loan value | Available loan amount |
| | dividend_accumulated | DECIMAL(12,2) | Accumulated dividend | Accumulated dividend amount |
| | account_value | DECIMAL(15,2) | Account value | Universal life account value |
| | investment_return | DECIMAL(12,2) | Investment return | Investment-linked investment return |
| | guaranteed_value | DECIMAL(15,2) | Guaranteed value | Guaranteed benefit value |

#### 3.6.4 Core Business Indicators
- **Lifecycle Indicators**: Policy duration years, payment completion rate, status change frequency
- **Value Indicators**: Cash value, accumulated premiums, profit contribution, lifetime value
- **Service Indicators**: Customer satisfaction, service frequency, complaint handling, online service usage
- **Risk Indicators**: Lapse risk, fraud risk, predicted claim probability, underwriting risk score
- **Underwriting Indicators**: Underwriting processing efficiency, underwriting decision type, loading rate level, exclusion conditions

## 4. Time Dimension Design Principles and Best Practices

### 4.1 Time Dimension Design Principles

#### 4.1.1 Uniformity Principle
All wide tables adopt consistent time dimension design to ensure data comparability and analysis consistency across different business scenarios.

**Standard Time Fields**:
- `stat_date`: Statistical date (YYYY-MM-DD format)
- `stat_week`: Statistical week (YYYY-WW format)
- `stat_month`: Statistical month (YYYY-MM format)
- `stat_quarter`: Statistical quarter (YYYY-QQ format)
- `stat_year`: Statistical year (YYYY format)

#### 4.1.2 Completeness Principle
Time dimension covers all business cycles to support comprehensive historical analysis and trend forecasting.

**Time Coverage Requirements**:
- Daily data: Minimum 2 years of historical data
- Weekly data: Minimum 3 years of historical data
- Monthly data: Minimum 5 years of historical data
- Quarterly data: Minimum 10 years of historical data
- Annual data: Complete historical data since system inception

#### 4.1.3 Flexibility Principle
Time dimension design supports flexible aggregation and drill-down analysis to meet diverse business analysis needs.

**Aggregation Support**:
- Support aggregation from daily to weekly, monthly, quarterly, and annual levels
- Support custom time period analysis (e.g., last 30 days, last 12 months)
- Support fiscal year and calendar year dual-track analysis

### 4.2 Time Dimension Best Practices

#### 4.2.1 Daily Aggregation Best Practices
- **Data Freshness**: Daily data updated by 8:00 AM next day
- **Business Day Handling**: Distinguish between business days and calendar days
- **Holiday Processing**: Special handling for holidays and weekends
- **Cutoff Time**: Unified daily cutoff time (23:59:59)

#### 4.2.2 Weekly Aggregation Best Practices
- **Week Definition**: Monday to Sunday as one week
- **Cross-Month Weeks**: Weeks spanning months allocated to the month containing more days
- **Week Numbering**: ISO 8601 standard week numbering
- **Partial Week Handling**: Special processing for year-end partial weeks

#### 4.2.3 Monthly Aggregation Best Practices
- **Month-End Processing**: Special handling for month-end business
- **Leap Year Handling**: Proper handling of February in leap years
- **Month-to-Date**: Support month-to-date analysis
- **Seasonal Adjustment**: Consider seasonal factors in monthly data

#### 4.2.4 Quarterly Aggregation Best Practices
- **Quarter Definition**: Q1(Jan-Mar), Q2(Apr-Jun), Q3(Jul-Sep), Q4(Oct-Dec)
- **Quarter-End Effects**: Consider quarter-end business surge effects
- **Year-over-Year Comparison**: Support same quarter comparison across years
- **Quarterly Trends**: Identify and analyze quarterly business trends

#### 4.2.5 Annual Aggregation Best Practices
- **Fiscal Year Support**: Support both calendar year and fiscal year
- **Annual Targets**: Align with annual business targets and budgets
- **Long-term Trends**: Support multi-year trend analysis
- **Annual Comparisons**: Provide year-over-year growth analysis

## 5. Wide Table Data Update Strategy

### 5.1 Data Update Frequency

#### 5.1.1 Real-time Update Tables
**Update Frequency**: Real-time or near real-time (within 15 minutes)

**Applicable Tables**:
- `customer_360_wide`: Customer real-time status updates
- `policy_lifecycle_wide`: Policy status real-time changes

**Update Triggers**:
- Policy status changes
- Payment transactions
- Customer information updates
- Service interactions

#### 5.1.2 Daily Update Tables
**Update Frequency**: Daily batch processing (completed by 6:00 AM)

**Applicable Tables**:
- `sales_summary_wide`: Daily sales performance
- `claim_analysis_wide`: Daily claim processing
- `risk_evaluation_wide`: Daily risk assessment updates

**Update Process**:
- Extract previous day's transaction data
- Perform data validation and cleansing
- Execute aggregation calculations
- Update wide table records

#### 5.1.3 Monthly Update Tables
**Update Frequency**: Monthly batch processing (completed by 5th of following month)

**Applicable Tables**:
- `product_profitability_wide`: Monthly profitability analysis

**Update Process**:
- Collect complete monthly financial data
- Perform complex profitability calculations
- Update monthly aggregation records
- Generate monthly analysis reports

### 5.2 Source Data Dependencies

#### 5.2.1 Customer 360 Wide Table Dependencies
**Primary Source Tables**:
```
DM_PTY_PERSON_HIS (Customer Information) → customer_360_wide
DM_PA_POLICY_HIS (Policy Information) → customer_360_wide
DM_CLM_CLAIM_HIS (Claim History) → customer_360_wide
DM_SC_AGENT_HIS (Agent Information) → customer_360_wide
DM_BCP_ARAP_HIS (Payment Information) → customer_360_wide
```

#### 5.2.2 Sales Summary Wide Table Dependencies
**Primary Source Tables**:
```
DM_SC_AGENT_HIS (Agent Information) → sales_summary_wide
DM_PA_POLICY_HIS (Policy Information) → sales_summary_wide
DM_BCP_ARAP_HIS (Payment Information) → sales_summary_wide
DM_PTY_PERSON_HIS (Customer Information) → sales_summary_wide
```

#### 5.2.3 Claim Analysis Wide Table Dependencies
**Primary Source Tables**:
```
DM_CLM_CLAIM_HIS (Claim Information) → claim_analysis_wide
DM_PA_POLICY_HIS (Policy Information) → claim_analysis_wide
DM_PTY_PERSON_HIS (Customer Information) → claim_analysis_wide
```

#### 5.2.4 Product Profitability Wide Table Dependencies
**Primary Source Tables**:
```
DM_PRD_PRODUCT_HIS (Product Information) → product_profitability_wide
DM_PA_POLICY_HIS (Policy Information) → product_profitability_wide
DM_CLM_CLAIM_HIS (Claim Information) → product_profitability_wide
DM_BCP_ARAP_HIS (Financial Information) → product_profitability_wide
DM_SC_AGENT_HIS (Sales Information) → product_profitability_wide
```

#### 5.2.5 Risk Evaluation Wide Table Dependencies
**Primary Source Tables**:
```
DM_PA_POLICY_HIS (Policy Information) → risk_evaluation_wide
DM_PTY_PERSON_HIS (Customer Information) → risk_evaluation_wide
DM_CLM_CLAIM_HIS (Claim Information) → risk_evaluation_wide
DM_CD_RISK_MODEL_HIS (Risk Model) → risk_evaluation_wide
```

#### 5.2.6 Policy Lifecycle Wide Table Dependencies
**Primary Source Tables**:
```
DM_PA_POLICY_HIS (Policy Information) → policy_lifecycle_wide
DM_PTY_PERSON_HIS (Customer Information) → policy_lifecycle_wide
DM_CLM_CLAIM_HIS (Claim Information) → policy_lifecycle_wide
DM_BCP_ARAP_HIS (Financial Information) → policy_lifecycle_wide
DM_SC_AGENT_HIS (Agent Information) → policy_lifecycle_wide
DM_BCP_BANK_TRANSFER_HIS (Bank Transfer) → policy_lifecycle_wide
```

## 6. Wide Table Query Optimization Strategy

### 6.1 Partitioning Strategy

#### 6.1.1 Time-based Partitioning
- Store historical data partitioned by month
- Separate partition for current month data to optimize query performance
- Archive historical data by year to reduce storage costs

#### 6.1.2 Business-based Partitioning
- Partition by region to support regional analysis
- Partition by product type to optimize product analysis queries
- Partition by customer tier to support customer segmentation analysis

### 6.2 Indexing Strategy

#### 6.2.1 Primary Key Indexes
- Establish unique primary key indexes for each wide table
- Composite primary keys ensure data uniqueness
- Primary key fields optimize query performance

#### 6.2.2 Business Indexes
- Create indexes on high-frequency query fields
- Composite indexes support multi-condition queries
- Covering indexes reduce data access

### 6.3 Pre-aggregation Strategy

#### 6.3.1 Common Metrics Pre-calculation
- Pre-calculate monthly, quarterly, and annual summary metrics
- Build metric snapshot tables to support historical comparisons
- Separate real-time metrics from batch metrics processing

#### 6.3.2 Multi-dimensional Pre-aggregation
- Pre-aggregate data by different dimension combinations
- Build OLAP cubes to support multi-dimensional analysis
- Intelligently recommend optimal aggregation granularity

## 7. Wide Table Application Scenario Examples

### 7.1 Customer 360 View Applications

#### 7.1.1 Precision Marketing Scenario
```sql
-- Find cross-selling opportunities among high-value customers
SELECT 
    customer_id,
    customer_name,
    customer_value_score,
    total_annual_premium,
    cross_sell_potential,
    next_best_product
FROM customer_360_wide 
WHERE customer_segment = 'High Value Customer'
    AND cross_sell_potential >= 7.0
    AND total_policies < 3
ORDER BY cross_sell_potential DESC
LIMIT 100;
```

#### 7.1.2 Risk Warning Scenario
```sql
-- Identify high-risk customers for focused attention
SELECT 
    customer_id,
    customer_name,
    risk_score,
    churn_risk_score,
    payment_punctuality_score,
    overdue_premium
FROM customer_360_wide 
WHERE risk_score >= 8.0 
    OR churn_risk_score >= 7.0
    OR overdue_days > 30
ORDER BY risk_score DESC;
```

### 7.2 Sales Performance Analysis Applications

#### 7.2.1 Performance Ranking Analysis
```sql
-- Analyze agent performance rankings within region
SELECT 
    region_name,
    agent_name,
    new_business_premium,
    renewal_premium,
    total_premium,
    region_premium_rank,
    premium_achievement_rate
FROM sales_summary_wide 
WHERE stat_month = 202403
    AND region_name = 'East China'
ORDER BY region_premium_rank;
```

#### 7.2.2 Product Mix Analysis
```sql
-- Analyze agent product sales structure
SELECT 
    agent_name,
    life_insurance_premium,
    health_insurance_premium,
    accident_insurance_premium,
    annuity_premium,
    ROUND(life_insurance_premium/total_premium*100, 2) as life_ratio,
    ROUND(health_insurance_premium/total_premium*100, 2) as health_ratio
FROM sales_summary_wide 
WHERE stat_month = 202403
    AND total_premium > 100000
ORDER BY total_premium DESC;
```

### 7.3 Claims Efficiency Analysis Applications

#### 7.3.1 Claims Processing Time Analysis
```sql
-- Analyze claims processing time compliance
SELECT 
    claim_type,
    COUNT(*) as total_cases,
    AVG(total_processing_days) as avg_processing_days,
    SUM(CASE WHEN sla_compliance = true THEN 1 ELSE 0 END) as sla_compliant_cases,
    ROUND(SUM(CASE WHEN sla_compliance = true THEN 1 ELSE 0 END)*100.0/COUNT(*), 2) as sla_compliance_rate
FROM claim_analysis_wide 
WHERE close_date >= '2024-01-01'
    AND close_date < '2024-04-01'
GROUP BY claim_type
ORDER BY avg_processing_days;
```

#### 7.3.2 Fraud Risk Identification
```sql
-- Identify high fraud risk claim cases
SELECT 
    claim_id,
    case_no,
    customer_name,
    claim_amount,
    fraud_risk_score,
    fraud_indicators,
    investigation_required
FROM claim_analysis_wide 
WHERE fraud_risk_score >= 8.0
    AND current_status IN ('Investigation', 'Review')
ORDER BY fraud_risk_score DESC;
```

## 8. Summary

This wide table summary layer design document adopts a business scenario-oriented design philosophy, constructing 6 core business wide tables that comprehensively cover the main analytical needs of insurance business. Through the wide table approach, we have achieved:

### 8.1 Core Advantages
1. **Simplified Data Usage**: Business users can directly query single tables to obtain complete analytical views
2. **Enhanced Query Performance**: Pre-aggregation and pre-joining significantly improve analytical efficiency
3. **Lowered Usage Barriers**: No need for complex multi-table joins, reducing data usage complexity
4. **Business Decision Support**: Directly oriented towards business scenarios, quickly supporting decision-making needs

### 8.2 Design Features
1. **Business Completeness**: Each wide table contains all data elements for specific scenarios
2. **Scenario Targeting**: Closely aligned with 6 core business analysis scenarios
3. **Extension Flexibility**: Supports flexible extension of new fields and new metrics
4. **Performance Optimization**: Reasonable partitioning, indexing, and pre-aggregation strategies

### 8.3 Application Value
1. **Customer Insights**: 360-degree customer view supports precision marketing and risk management
2. **Sales Management**: Comprehensive performance analysis supports sales team management and incentives
3. **Operational Efficiency**: Claims analysis optimizes operational processes and service quality
4. **Product Optimization**: Profitability analysis guides product strategy and pricing decisions
5. **Risk Control**: Risk assessment supports underwriting decisions and risk management
6. **Customer Service**: Lifecycle management enhances customer service experience

Through the construction of this wide table summary layer, we will build powerful data analysis capabilities for insurance companies, directly supporting data-driven decision-making across all business lines, and improving overall business efficiency and competitiveness.

## 9. Machine Learning Prediction Attributes Centralized Management

### 9.1 Prediction Attributes Overview

Since the current project does not have a machine learning team, this chapter centralizes the management of all attributes that need to be obtained through machine learning model predictions, so that future machine learning teams can quickly understand and implement these prediction functions when they take over.

### 9.2 Prediction Attributes Classification System

#### 9.2.1 Customer Value Prediction Category

**Business Objective**: Predict customer commercial value and potential contribution to support precision marketing and customer segmentation management.

| Attribute Name | Data Type | Prediction Target | Input Features | Business Application |
|----------------|-----------|-------------------|----------------|---------------------|
| customer_value_score | DECIMAL(5,2) | Customer value score (1-10 points) | Policy count, premium amount, payment history, claim records, customer basic info | Customer segmentation, resource allocation |
| lifetime_value | DECIMAL(15,2) | Customer lifetime value | Age, income, policy portfolio, payment capacity, churn probability | Customer acquisition cost control, customer investment decisions |
| cross_sell_potential | DECIMAL(5,2) | Cross-selling potential (1-10 points) | Existing policies, customer profile, purchase behavior, product preferences | Product recommendation, sales strategy |
| next_best_product | VARCHAR(50) | Recommended product | Customer needs analysis, product correlation, purchase history | Precision marketing, product recommendation |

**Model Recommendations**:
- Customer value scoring: Use Random Forest or Gradient Boosting models
- Lifetime value: Use regression models combined with survival analysis
- Cross-selling potential: Use collaborative filtering or deep learning recommendation models

#### 9.2.2 Risk Assessment Prediction Category

**Business Objective**: Assess customer risk levels across various dimensions to support underwriting decisions and risk management.

| Attribute Name | Data Type | Prediction Target | Input Features | Business Application |
|----------------|-----------|-------------------|----------------|---------------------|
| risk_score | DECIMAL(5,2) | Comprehensive risk score (1-10 points) | Health status, occupation, age, lifestyle, financial status | Underwriting decisions, pricing strategy |
| health_risk_score | DECIMAL(5,2) | Health risk score (1-10 points) | Medical reports, medical history, family history, lifestyle | Health insurance underwriting, medical cost prediction |
| financial_risk_score | DECIMAL(5,2) | Financial risk score (1-10 points) | Income level, asset status, debt ratio, credit record | Coverage review, payment capacity assessment |
| behavior_risk_score | DECIMAL(5,2) | Behavioral risk score (1-10 points) | Payment behavior, claim history, application frequency, channel preference | Customer behavior analysis, risk warning |
| fraud_risk_indicator | VARCHAR(20) | Fraud risk level | Application information consistency, behavioral anomalies, association analysis | Anti-fraud, claim review |
| churn_risk_score | DECIMAL(5,2) | Churn risk score (1-10 points) | Payment behavior, service interactions, satisfaction, competitor analysis | Customer retention, service improvement |

**Model Recommendations**:
- Comprehensive risk scoring: Use ensemble learning models (XGBoost/LightGBM)
- Fraud risk identification: Use anomaly detection algorithms (Isolation Forest/One-Class SVM)
- Churn risk prediction: Use logistic regression or neural networks

#### 9.2.3 Business Behavior Prediction Category

**Business Objective**: Predict customer business behavior patterns to support operational decisions and service optimization.

| Attribute Name | Data Type | Prediction Target | Input Features | Business Application |
|----------------|-----------|-------------------|----------------|---------------------|
| payment_punctuality_score | DECIMAL(5,2) | Payment punctuality score (1-10 points) | Historical payment records, income stability, automatic payment setup | Payment reminders, risk warning |
| lapse_risk_score | DECIMAL(5,2) | Lapse risk score (1-10 points) | Payment behavior, policy value, customer satisfaction | Policy maintenance, customer retention |
| predicted_lapse_probability | DECIMAL(5,2) | Predicted lapse probability | Policy duration, payment pressure, market environment, customer changes | Lapse warning, intervention strategy |
| predicted_claim_probability | DECIMAL(5,2) | Predicted claim probability | Health status, occupational risk, age, coverage type | Reserve calculation, risk pricing |

**Model Recommendations**:
- Payment behavior prediction: Use time series analysis (ARIMA/LSTM)
- Lapse probability prediction: Use survival analysis models (Cox regression)
- Claim probability prediction: Use logistic regression or random forest

#### 9.2.4 Actuarial Model Prediction Category

**Business Objective**: Predict key actuarial indicators based on actuarial principles and historical data to support pricing and reserve management.

| Attribute Name | Data Type | Prediction Target | Input Features | Business Application |
|----------------|-----------|-------------------|----------------|---------------------|
| predicted_mortality_rate | DECIMAL(8,4) | Predicted mortality rate | Age, gender, health status, occupation, region | Life insurance pricing, reserve calculation |
| predicted_morbidity_rate | DECIMAL(8,4) | Predicted morbidity rate | Health indicators, lifestyle, environmental factors, genetic factors | Health insurance pricing, medical cost prediction |
| predicted_claim_amount | DECIMAL(12,2) | Predicted claim amount | Coverage type, coverage amount, customer characteristics, historical claims | Reserve calculation, reinsurance arrangement |
| predicted_profit_margin | DECIMAL(5,2) | Predicted profit margin | Product characteristics, customer mix, market environment, cost structure | Product pricing, profitability analysis |

**Model Recommendations**:
- Mortality rate prediction: Use life table models combined with machine learning
- Morbidity rate prediction: Use medical statistical models and deep learning
- Claim amount prediction: Use regression models and time series analysis

#### 9.2.5 Intelligent Decision Recommendation Category

**Business Objective**: Provide intelligent business decision recommendations based on comprehensive analysis to improve business efficiency and decision quality.

| Attribute Name | Data Type | Prediction Target | Input Features | Business Application |
|----------------|-----------|-------------------|----------------|---------------------|
| next_best_action | VARCHAR(100) | Recommended next action | Customer status, business scenario, historical effectiveness, best practices | Customer service, marketing activities |
| underwriting_decision | VARCHAR(30) | Underwriting decision recommendation | Risk assessment results, company policy, market strategy | Underwriting review, decision support |
| premium_loading | DECIMAL(5,2) | Premium loading recommendation | Risk level, competitive environment, profit target | Personalized pricing, risk adjustment |

**Model Recommendations**:
- Decision recommendation: Use reinforcement learning or expert systems
- Underwriting decisions: Use decision trees or rule engines
- Pricing recommendations: Use optimization algorithms combined with business rules

### 9.3 Model Development Guidelines

#### 9.3.1 Data Preparation Requirements

**Data Quality Standards**:
- Data completeness: Key feature missing rate not exceeding 5%
- Data consistency: Maintain consistency across systems
- Data timeliness: Training data not exceeding 2 years, validation data not exceeding 6 months

**Feature Engineering Recommendations**:
- Time features: Extract seasonal and cyclical features
- Interaction features: Build interaction terms between features
- Aggregation features: Statistical features based on time windows
- Encoding features: Reasonable encoding of categorical variables

#### 9.3.2 Model Evaluation Standards

**Performance Metrics**:
- Classification models: AUC > 0.75, Precision > 0.70, Recall > 0.65
- Regression models: RMSE < 90% of baseline model, R² > 0.60
- Ranking models: NDCG > 0.70, MAP > 0.65

**Stability Requirements**:
- Model performance standard deviation on validation set < 0.05
- Performance degradation across time periods < 10%
- Feature importance ranking stability > 0.80

### 9.4 Implementation Considerations

#### 9.4.1 Data Privacy Protection
- Strictly comply with data protection regulations
- Implement data anonymization and encryption measures
- Establish data access permission controls

#### 9.4.2 Model Interpretability
- Provide model decision explanation mechanisms
- Establish feature importance analysis
- Support business personnel understanding of model logic

Through this prediction attributes management framework, future machine learning teams can systematically develop and deploy various prediction models, providing powerful intelligent support for insurance business.