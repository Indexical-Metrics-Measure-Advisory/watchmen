from watchmen_metricflow.model.business_glossary import (
    Glossary, GlossaryBundle, Category, Term, GlossaryStatus, TermStatus
)


# ============================================================================
# EAST — 中国银保监会 EAST 报送规范
# ============================================================================

east_glossary = Glossary(
    id='east',
    name='EAST',
    display_name='EAST 人身保险公司版',
    description='银保监会监管数据标准化报送规范，涵盖 12 个业务领域、46 张数据表、20 个业务代码表。',
    language='zh',
    status=GlossaryStatus.ACTIVE,
    tags=['Insurance', 'Banking', '监管', '报送', '中国银保监会'],
    tenantId='1',
)

east_categories = [
    Category(id='east-c1', name='公共信息', qualified_name='公共信息@EAST', description='公司治理与组织架构的基础信息', glossary_id='east', order_index=0),
    Category(id='east-c2', name='财务信息', qualified_name='财务信息@EAST', description='财务核算与费用管理信息', glossary_id='east', order_index=1),
    Category(id='east-c3', name='客户信息', qualified_name='客户信息@EAST', description='客户身份标识及与保单的关联关系', glossary_id='east', order_index=2),
    Category(id='east-c4', name='产品与保单', qualified_name='产品与保单@EAST', description='产品定义与保单生命周期管理', glossary_id='east', order_index=3),
    Category(id='east-c5', name='销售与渠道', qualified_name='销售与渠道@EAST', description='销售过程管理与渠道追溯', glossary_id='east', order_index=4),
    Category(id='east-c6', name='保费与支付', qualified_name='保费与支付@EAST', description='保费收入与保险金支付', glossary_id='east', order_index=5),
    Category(id='east-c7', name='再保险', qualified_name='再保险@EAST', description='再保险分出与分入管理', glossary_id='east', order_index=6),
    Category(id='east-c8', name='理赔', qualified_name='理赔@EAST', description='保险事故核定与赔付处理', glossary_id='east', order_index=7),
    Category(id='east-c9', name='年金', qualified_name='年金@EAST', description='年金计划全生命周期管理', glossary_id='east', order_index=8),
    Category(id='east-c10', name='养老保障', qualified_name='养老保障@EAST', description='养老保障产品的业务与产品信息', glossary_id='east', order_index=9),
    Category(id='east-c11', name='投资', qualified_name='投资@EAST', description='保险资金运用管理', glossary_id='east', order_index=10),
    Category(id='east-c12', name='关联交易', qualified_name='关联交易@EAST', description='关联方识别与交易披露', glossary_id='east', order_index=11),
]

east_terms = [
    Term(id='east-tm1', name='保险机构代码', qualified_name='保险机构代码@EAST', description='保险公司在全国范围内唯一的机构编码，由中国银保监会统一分配。', short_description='保险公司唯一机构编码', status=TermStatus.ACTIVE, glossary_id='east', category_ids=['east-c1'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='east-tm2', name='分支机构', qualified_name='分支机构@EAST', description='保险公司在各地设立的省级、市级分公司及支公司。', short_description='各级分公司及支公司', status=TermStatus.ACTIVE, glossary_id='east', category_ids=['east-c1'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='east-tm3', name='保单号', qualified_name='保单号@EAST', description='保险合同的唯一标识编码，是连接保费、理赔、客户等环节的核心主键。', short_description='保险合同唯一标识', status=TermStatus.ACTIVE, glossary_id='east', category_ids=['east-c4'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='east-tm4', name='被保险人', qualified_name='被保险人@EAST', description='受保险合同保障、享有保险金请求权的人。', short_description='受保险合同保障的人', status=TermStatus.ACTIVE, glossary_id='east', category_ids=['east-c4'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='east-tm5', name='投保人', qualified_name='投保人@EAST', description='与保险人订立保险合同，并按照合同约定负有支付保险费义务的人。', short_description='支付保险费的人', status=TermStatus.ACTIVE, glossary_id='east', category_ids=['east-c4'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='east-tm6', name='个人客户', qualified_name='个人客户@EAST', description='以自然人身份购买保险产品的客户。', short_description='自然人身份保险客户', status=TermStatus.ACTIVE, glossary_id='east', category_ids=['east-c3'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='east-tm7', name='团体客户', qualified_name='团体客户@EAST', description='以法人或其他组织身份购买团体保险的客户。', short_description='法人/组织团体保险客户', status=TermStatus.ACTIVE, glossary_id='east', category_ids=['east-c3'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='east-tm8', name='险种', qualified_name='险种@EAST', description='保险产品的分类，如寿险、健康险、意外险、年金险等。', short_description='保险产品分类', status=TermStatus.ACTIVE, glossary_id='east', category_ids=['east-c4'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='east-tm9', name='保单佣金', qualified_name='保单佣金@EAST', description='保险公司支付给销售人员或中介机构的业务报酬，按保费比例计算。', short_description='销售业务报酬', status=TermStatus.ACTIVE, glossary_id='east', category_ids=['east-c5'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='east-tm10', name='保费', qualified_name='保费@EAST', description='投保人根据保险合同约定向保险公司支付的费用。', short_description='投保人支付的费用', status=TermStatus.ACTIVE, glossary_id='east', category_ids=['east-c6'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='east-tm11', name='付费', qualified_name='付费@EAST', description='保险公司根据合同约定向投保人或受益人支付的款项。', short_description='保险公司支付的款项', status=TermStatus.ACTIVE, glossary_id='east', category_ids=['east-c6'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='east-tm12', name='再保险', qualified_name='再保险@EAST', description='保险公司将其承保的风险部分转移给其他保险公司的行为。', short_description='风险转移给其他保险公司', status=TermStatus.ACTIVE, glossary_id='east', category_ids=['east-c7'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='east-tm13', name='理赔', qualified_name='理赔@EAST', description='保险人根据合同约定对保险事故进行核定并给付保险金的过程。', short_description='核定并给付保险金', status=TermStatus.ACTIVE, glossary_id='east', category_ids=['east-c8'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='east-tm14', name='年金计划', qualified_name='年金计划@EAST', description='保险公司为团体或个人设立的养老金或年金管理计划。', short_description='养老金或年金管理计划', status=TermStatus.ACTIVE, glossary_id='east', category_ids=['east-c9'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='east-tm15', name='关联交易', qualified_name='关联交易@EAST', description='保险公司与关联方之间发生的交易。', short_description='与关联方的交易', status=TermStatus.ACTIVE, glossary_id='east', category_ids=['east-c12'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='east-tm16', name='董监高', qualified_name='董监高@EAST', description='董事、监事、高级管理人员的统称。', short_description='董事、监事、高管', status=TermStatus.ACTIVE, glossary_id='east', category_ids=['east-c1'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='east-tm17', name='销售人员', qualified_name='销售人员@EAST', description='从事保险产品销售的个人。', short_description='保险产品销售个人', status=TermStatus.ACTIVE, glossary_id='east', category_ids=['east-c5'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='east-tm18', name='中介机构', qualified_name='中介机构@EAST', description='为保险公司提供销售、理赔、公估等专业服务的第三方机构。', short_description='第三方保险服务机构', status=TermStatus.ACTIVE, glossary_id='east', category_ids=['east-c1'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='east-tm19', name='EAST报送', qualified_name='EAST报送@EAST', description='Examination and Analysis System Technology 的缩写，银保监会要求的监管数据标准化报送系统。', short_description='监管数据标准化报送', status=TermStatus.ACTIVE, glossary_id='east', category_ids=['east-c1'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='east-tm20', name='联合主键', qualified_name='联合主键@EAST', description='由多个字段共同组成的主键，用于唯一标识表中的一条记录。', short_description='多字段组成的主键', status=TermStatus.ACTIVE, glossary_id='east', category_ids=['east-c1'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
]

EAST_BUNDLE = GlossaryBundle(glossary=east_glossary, categories=east_categories, terms=east_terms)


# ============================================================================
# IDM — Insurance Data Model (OMG)
# ============================================================================

idm_glossary = Glossary(
    id='idm',
    name='IDM',
    display_name='Insurance Data Model',
    description='OMG Insurance Data Model — ontology-based standard for insurance domain entities, attributes, and relationships.',
    language='en',
    status=GlossaryStatus.ACTIVE,
    tags=['insurance', 'ontology', 'OMG', 'data model'],
    tenantId='1',
)

idm_categories = [
    Category(id='idm-c1', name='Core Insurance', qualified_name='Core Insurance@IDM', description='Central insurance domain entities and relationships', glossary_id='idm', order_index=0),
    Category(id='idm-c2', name='Policy Subtypes', qualified_name='Policy Subtypes@IDM', description='Proposed insurance policy subtypes', glossary_id='idm', order_index=1),
    Category(id='idm-c3', name='FIB-DM Foundation', qualified_name='FIB-DM Foundation@IDM', description='FIB-DM foundational entities relevant to insurance', glossary_id='idm', order_index=2),
    Category(id='idm-c4', name='Regulatory Compliance', qualified_name='Regulatory Compliance@IDM', description='EU insurance regulatory framework and requirements', glossary_id='idm', order_index=3),
    Category(id='idm-c5', name='Semantic Web', qualified_name='Semantic Web@IDM', description='Semantic web technologies and ontologies for insurance', glossary_id='idm', order_index=4),
]

idm_terms = [
    Term(id='idm-tm1', name='Insurance Policy', qualified_name='Insurance Policy@IDM', description="A Contract issued by an Insurer to a Policyholder; the primary insurance instrument that defines coverage terms, conditions, premiums, and obligations.", short_description='Primary insurance instrument', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c1'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm2', name='Bond Insurance', qualified_name='Bond Insurance@IDM', description='A specialized Insurance Policy subtype that guarantees payment of principal and interest on a bond in the event of default.', short_description='Guarantees bond principal/interest', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c1'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm3', name='Insurer', qualified_name='Insurer@IDM', description='The party (legal entity) that issues Insurance Policies and Letters of Credit, assuming the financial risk defined in the contract.', short_description='Entity that issues policies', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c1'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm4', name='Policyholder', qualified_name='Policyholder@IDM', description='The counterparty to the Insurance Policy contract; the entity that purchases coverage and pays premiums.', short_description='Purchaser of coverage', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c1'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm5', name='Insurance Company', qualified_name='Insurance Company@IDM', description='A named entity in FIB-DM serving as an organizational anchor for insurance-specific content and extensions.', short_description='Organizational anchor in FIB-DM', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c1'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm6', name='Claim', qualified_name='Claim@IDM', description='A demand by the Policyholder (or beneficiary) for payment under the terms of an Insurance Policy following a covered loss event.', short_description='Demand for payment after loss', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c1'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm7', name='Letter of Credit', qualified_name='Letter of Credit@IDM', description='A financial instrument issued by Insurers that serves as an insurance-backed or collateralized Guarantee.', short_description='Insurance-backed guarantee', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c1'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm8', name='Life Insurance Policy', qualified_name='Life Insurance Policy@IDM', description="A policy providing a death benefit to beneficiaries upon the insured's death; may include savings/investment components.", short_description='Death benefit policy', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c2'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm9', name='Car Insurance Policy', qualified_name='Car Insurance Policy@IDM', description='A policy covering vehicles against physical damage, bodily injury, and third-party liability arising from traffic collisions.', short_description='Vehicle coverage policy', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c2'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm10', name='Property Insurance Policy', qualified_name='Property Insurance Policy@IDM', description='A policy providing protection against risks to property, including fire, theft, and natural disasters.', short_description='Property risk coverage', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c2'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm11', name='Commercial Insurance Policy', qualified_name='Commercial Insurance Policy@IDM', description='A policy designed to cover businesses against operational risks, including liability, property damage, business interruption, and workers compensation.', short_description='Business operational risk coverage', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c2'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm12', name='Solvency II', qualified_name='Solvency II@IDM', description='The prudential regulatory regime for insurance and reinsurance undertakings in the European Union, effective from January 1, 2016.', short_description='EU prudential regulatory regime', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c4'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm13', name='Insurance Undertaking', qualified_name='Insurance Undertaking@IDM', description='A legal entity licensed to conduct insurance business under Solvency II.', short_description='Licensed insurance entity', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c4'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm14', name='Reinsurance Undertaking', qualified_name='Reinsurance Undertaking@IDM', description='A legal entity licensed to conduct reinsurance business under Solvency II.', short_description='Licensed reinsurance entity', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c4'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm15', name='EIOPA', qualified_name='EIOPA@IDM', description='European Insurance and Occupational Pensions Authority — the EU-level supervisory authority for insurance and pensions.', short_description='EU insurance supervisory authority', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c4'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm16', name='Solvency Capital Requirement', qualified_name='Solvency Capital Requirement@IDM', description='The capital required to ensure an (re)insurance undertaking can meet its obligations over the next 12 months with 99.5% confidence.', short_description='99.5% confidence capital requirement', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c4'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm17', name='Minimum Capital Requirement', qualified_name='Minimum Capital Requirement@IDM', description='The minimum level of capital below which policyholders would be exposed to unacceptable risk.', short_description='Minimum acceptable capital level', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c4'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm18', name='Technical Provisions', qualified_name='Technical Provisions@IDM', description='The amount an (re)insurance undertaking must hold to meet its insurance obligations as they fall due.', short_description='Obligation reserve amount', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c4'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm19', name='Own Risk and Solvency Assessment', qualified_name='Own Risk and Solvency Assessment@IDM', description='An internal process by which the undertaking assesses its overall solvency needs given its risk profile.', short_description='Internal solvency assessment', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c4'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm20', name='FIBO', qualified_name='FIBO@IDM', description='Financial Industry Business Ontology — an open standard ontology for the financial industry, defining business concepts, their properties, and relationships.', short_description='Financial industry ontology', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c5'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm21', name='FIB-DM', qualified_name='FIB-DM@IDM', description='Financial Industry Business Data Model — a relational/logical data model derived from FIBO, providing implementable database schemas.', short_description='Relational data model from FIBO', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c5'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm22', name='RDF', qualified_name='RDF@IDM', description='Resource Description Framework — a W3C standard for representing information as subject-predicate-object triples.', short_description='W3C triples standard', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c5'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm23', name='OWL', qualified_name='OWL@IDM', description='Web Ontology Language — a W3C standard extending RDF with formal semantics for classes, properties, and individuals.', short_description='W3C ontology language', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c5'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm24', name='SPARQL', qualified_name='SPARQL@IDM', description='SPARQL Protocol and RDF Query Language — the standard query language for RDF data.', short_description='RDF query language', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c5'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm25', name='Semantic Compliance', qualified_name='Semantic Compliance@IDM', description='A Web 3.0-based architecture for regulatory reporting that stores all metadata as RDF/OWL triples within a unified ontology.', short_description='Web 3.0 regulatory reporting', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c5'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm26', name='Financial Regulation Ontology', qualified_name='Financial Regulation Ontology@IDM', description='An ontology that aligns FIBO (finance) with LKIF (legal), linking financial data to legal/regulatory requirements.', short_description='FIBO + LKIF alignment', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c5'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm27', name='Insurance Regulation Ontology', qualified_name='Insurance Regulation Ontology@IDM', description='An operational implementation of FRO specific to insurance; extends FIBO and LKIF with insurance-specific regulatory concepts.', short_description='Insurance-specific FRO', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c5'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm28', name='Contract', qualified_name='Contract@IDM', description='A legally binding agreement between two or more parties in FIB-DM Foundation.', short_description='Legally binding agreement', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c3'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm29', name='Legal Entity', qualified_name='Legal Entity@IDM', description='An entity that is recognized as having legal rights and obligations in FIB-DM Foundation.', short_description='Entity with legal rights', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c3'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='idm-tm30', name='Jurisdiction', qualified_name='Jurisdiction@IDM', description='A geographic or regulatory area within which a legal entity operates or is regulated.', short_description='Regulatory operating area', status=TermStatus.ACTIVE, glossary_id='idm', category_ids=['idm-c3'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
]

IDM_BUNDLE = GlossaryBundle(glossary=idm_glossary, categories=idm_categories, terms=idm_terms)


# ============================================================================
# Common Insurance Business Terms — from data-asset-client + dqc-client mocks
# ============================================================================

common_glossary = Glossary(
    id='common-insurance',
    name='Common Insurance Terms',
    display_name='Common Insurance Business Terms',
    description='Frequently used insurance business terms collected from various client modules.',
    language='en',
    status=GlossaryStatus.ACTIVE,
    tags=['insurance', 'business', 'common terms'],
    tenantId='1',
)

common_categories = [
    Category(id='com-c1', name='Financial Metric', qualified_name='Financial Metric@Common Insurance Terms', glossary_id='common-insurance', order_index=0),
    Category(id='com-c2', name='Risk Metric', qualified_name='Risk Metric@Common Insurance Terms', glossary_id='common-insurance', order_index=1),
    Category(id='com-c3', name='Business Entity', qualified_name='Business Entity@Common Insurance Terms', glossary_id='common-insurance', order_index=2),
    Category(id='com-c4', name='Finance', qualified_name='Finance@Common Insurance Terms', glossary_id='common-insurance', order_index=3),
    Category(id='com-c5', name='Claims', qualified_name='Claims@Common Insurance Terms', glossary_id='common-insurance', order_index=4),
    Category(id='com-c6', name='Policy', qualified_name='Policy@Common Insurance Terms', glossary_id='common-insurance', order_index=5),
    Category(id='com-c7', name='Customer', qualified_name='Customer@Common Insurance Terms', glossary_id='common-insurance', order_index=6),
    Category(id='com-c8', name='Broker', qualified_name='Broker@Common Insurance Terms', glossary_id='common-insurance', order_index=7),
]

common_terms = [
    Term(id='com-tm1', name='Gross Premium', qualified_name='Gross Premium@Common Insurance Terms', description='Total premium income before deducting reinsurance, commissions, or taxes.', short_description='Total premium before deductions', status=TermStatus.ACTIVE, glossary_id='common-insurance', category_ids=['com-c4'], synonyms=[], related_terms=['com-tm2'], antonyms=[], is_a=[]),
    Term(id='com-tm2', name='Net Premium', qualified_name='Net Premium@Common Insurance Terms', description='Premium income after deducting reinsurance cessions but before commissions and taxes.', short_description='Premium after reinsurance', status=TermStatus.ACTIVE, glossary_id='common-insurance', category_ids=['com-c4'], synonyms=[], related_terms=['com-tm1'], antonyms=[], is_a=[]),
    Term(id='com-tm3', name='Loss Ratio', qualified_name='Loss Ratio@Common Insurance Terms', description='The ratio of total incurred losses to total earned premiums, indicating underwriting profitability.', short_description='Losses / Earned premiums', status=TermStatus.ACTIVE, glossary_id='common-insurance', category_ids=['com-c1'], synonyms=[], related_terms=['com-tm9'], antonyms=[], is_a=[]),
    Term(id='com-tm4', name='Renewal Rate', qualified_name='Renewal Rate@Common Insurance Terms', description='The percentage of policies that are renewed at expiration, indicating customer retention.', short_description='Policy renewal percentage', status=TermStatus.ACTIVE, glossary_id='common-insurance', category_ids=['com-c6'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='com-tm5', name='Customer Lifetime Value', qualified_name='Customer Lifetime Value@Common Insurance Terms', description='The projected total revenue a customer will generate over the entire relationship with the insurer.', short_description='Projected total customer revenue', status=TermStatus.DRAFT, glossary_id='common-insurance', category_ids=['com-c7'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='com-tm6', name='Commission Rate', qualified_name='Commission Rate@Common Insurance Terms', description='The percentage of premium paid to intermediaries or agents as compensation for selling insurance policies.', short_description='Intermediary compensation %', status=TermStatus.ACTIVE, glossary_id='common-insurance', category_ids=['com-c8'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='com-tm7', name='GWP', qualified_name='GWP@Common Insurance Terms', description='Gross Written Premium — the total premium written on insurance policies during a specific period before deductions.', short_description='Gross Written Premium', status=TermStatus.ACTIVE, glossary_id='common-insurance', category_ids=['com-c1'], synonyms=['com-tm1'], related_terms=[], antonyms=[], is_a=[]),
    Term(id='com-tm8', name='NWP', qualified_name='NWP@Common Insurance Terms', description='Net Written Premium — gross written premium less reinsurance ceded.', short_description='Net Written Premium', status=TermStatus.ACTIVE, glossary_id='common-insurance', category_ids=['com-c1'], synonyms=['com-tm2'], related_terms=[], antonyms=[], is_a=[]),
    Term(id='com-tm9', name='Combined Ratio', qualified_name='Combined Ratio@Common Insurance Terms', description='The sum of the loss ratio and expense ratio; a ratio below 100% indicates underwriting profitability.', short_description='Loss ratio + Expense ratio', status=TermStatus.ACTIVE, glossary_id='common-insurance', category_ids=['com-c1'], synonyms=[], related_terms=['com-tm3'], antonyms=[], is_a=[]),
    Term(id='com-tm10', name='Claim Frequency', qualified_name='Claim Frequency@Common Insurance Terms', description='The number of claims filed per policy or per exposure unit over a given period.', short_description='Claims per policy/exposure', status=TermStatus.ACTIVE, glossary_id='common-insurance', category_ids=['com-c2'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
    Term(id='com-tm11', name='Policyholder', qualified_name='Policyholder@Common Insurance Terms', description='The person or entity that owns an insurance policy and is entitled to its benefits.', short_description='Insurance policy owner', status=TermStatus.ACTIVE, glossary_id='common-insurance', category_ids=['com-c3'], synonyms=[], related_terms=[], antonyms=[], is_a=[]),
]

COMMON_BUNDLE = GlossaryBundle(glossary=common_glossary, categories=common_categories, terms=common_terms)


# ============================================================================
# All bundles
# ============================================================================

ALL_SEED_BUNDLES = [EAST_BUNDLE, IDM_BUNDLE, COMMON_BUNDLE]
