// ----- Section identifiers -----
export type SectionId = "tables" | "fields" | "codes" | "terms" | "naming" | "dependencies" | "overview";

// ----- Domain types -----
export type StandardStatus = "active" | "deprecated" | "draft";

export interface Standard {
	id: string;
	abbreviation: string;
	name: string;
	description: string;
	version: string;
	status: StandardStatus;
	sourceUrl: string;
	tags: string[];
}

export interface TableEntry {
	id: string;
	domain: string;
	name: string;
	abbreviation: string;
	fieldCount: number;
}

export interface FieldCodeEntry {
	id: string;
	code: string;
	usedInTables: number;
	tables: string;
	description: string;
}

export interface CodeValueEntry {
	id: string;
	code: string;
	name: string;
	description: string;
	codeTable: string;
}

export interface TermEntry {
	id: string;
	index: number;
	term: string;
	relatedCode: string;
	definition: string;
}

export interface NamingEntry {
	id: string;
	prefix: string;
	meaning: string;
	example: string;
}

export interface DependencyEntry {
	id: string;
	level: number;
	description: string;
}

export interface OverviewEntry {
	id: string;
	domain: string;
	tableCount: number;
	coreEntities: string;
	description: string;
}

export type EntryMap = {
	tables: TableEntry[];
	fields: FieldCodeEntry[];
	codes: CodeValueEntry[];
	terms: TermEntry[];
	naming: NamingEntry[];
	dependencies: DependencyEntry[];
	overview: OverviewEntry[];
};

export interface StandardBundle {
	standard: Standard;
	entries: EntryMap;
}

// ----- Section metadata -----
export interface SectionMeta {
	id: SectionId;
	label: string;
	description: string;
}

export const SECTIONS: SectionMeta[] = [
	{ id: "overview", label: "Overview", description: "High-level summary of business domains" },
	{ id: "tables", label: "Data Tables", description: "Tables defined in the standard, grouped by domain" },
	{ id: "fields", label: "Field Codes", description: "Cross-table field codes and their meanings" },
	{ id: "codes", label: "Code Values", description: "Enumerated values for business code fields" },
	{ id: "terms", label: "Terms", description: "Core business term definitions" },
	{ id: "naming", label: "Naming", description: "Naming conventions for fields and tables" },
	{ id: "dependencies", label: "Dependencies", description: "Load order and inter-table dependencies" },
];

// ----- Edit dialog field definitions -----
export type FieldInputType = "text" | "textarea" | "number";

export interface FieldDef {
	key: string;
	label: string;
	type: FieldInputType;
	required?: boolean;
}

export const SECTION_FIELDS: Record<Exclude<SectionId, "overview">, FieldDef[]> = {
	tables: [
		{ key: "domain", label: "Domain", type: "text", required: true },
		{ key: "abbreviation", label: "Abbreviation", type: "text", required: true },
		{ key: "name", label: "Name (CN)", type: "text", required: true },
		{ key: "fieldCount", label: "Field Count", type: "number", required: true },
	],
	fields: [
		{ key: "code", label: "Code", type: "text", required: true },
		{ key: "usedInTables", label: "Used In (tables count)", type: "number", required: true },
		{ key: "tables", label: "Sample Tables", type: "text" },
		{ key: "description", label: "Description", type: "textarea" },
	],
	codes: [
		{ key: "codeTable", label: "Code Table", type: "text", required: true },
		{ key: "code", label: "Code", type: "text", required: true },
		{ key: "name", label: "Name", type: "text", required: true },
		{ key: "description", label: "Description", type: "textarea" },
	],
	terms: [
		{ key: "index", label: "Index", type: "number", required: true },
		{ key: "term", label: "Term", type: "text", required: true },
		{ key: "relatedCode", label: "Related Code", type: "text" },
		{ key: "definition", label: "Definition", type: "textarea" },
	],
	naming: [
		{ key: "prefix", label: "Prefix / Suffix", type: "text", required: true },
		{ key: "meaning", label: "Meaning", type: "text", required: true },
		{ key: "example", label: "Example", type: "text" },
	],
	dependencies: [
		{ key: "level", label: "Level", type: "number", required: true },
		{ key: "description", label: "Description", type: "textarea", required: true },
	],
};

export const OVERVIEW_FIELDS: FieldDef[] = [
	{ key: "domain", label: "Domain", type: "text", required: true },
	{ key: "tableCount", label: "Table Count", type: "number", required: true },
	{ key: "coreEntities", label: "Core Entities", type: "text" },
	{ key: "description", label: "Description", type: "textarea" },
];

export const SECTION_LABELS: Record<SectionId, string> = {
	overview: "Overview",
	tables: "Data Table",
	fields: "Field Code",
	codes: "Code Value",
	terms: "Term",
	naming: "Naming",
	dependencies: "Dependency",
};

export function getFieldsForSection(section: SectionId): FieldDef[] {
	return section === "overview" ? OVERVIEW_FIELDS : SECTION_FIELDS[section];
}

// ----- Status badge styling -----
export const STATUS_COLORS: Record<StandardStatus, string> = {
	active: "bg-green-100 text-green-800",
	deprecated: "bg-gray-100 text-gray-600",
	draft: "bg-yellow-100 text-yellow-800",
};
// Auto-generated from doc/ACORD_DB_Business_Glossary.md (ACORD Life Standards v2.49.00)
// Source: 30 tables, 2222 columns.

export const ACORD_TABLES: TableEntry[] = [
  {
    "id": "a-txlife",
    "domain": "Transaction",
    "name": "txlife",
    "abbreviation": "TXLIFE",
    "fieldCount": 9
  },
  {
    "id": "a-txlife_request",
    "domain": "Transaction",
    "name": "txlife_request",
    "abbreviation": "TXLIFE_REQUEST",
    "fieldCount": 47
  },
  {
    "id": "a-txlife_response",
    "domain": "Transaction",
    "name": "txlife_response",
    "abbreviation": "TXLIFE_RESPONSE",
    "fieldCount": 44
  },
  {
    "id": "a-party",
    "domain": "Party",
    "name": "party",
    "abbreviation": "PARTY",
    "fieldCount": 69
  },
  {
    "id": "a-address",
    "domain": "Party",
    "name": "address",
    "abbreviation": "ADDRESS",
    "fieldCount": 47
  },
  {
    "id": "a-phone",
    "domain": "Party",
    "name": "phone",
    "abbreviation": "PHONE",
    "fieldCount": 34
  },
  {
    "id": "a-email_address",
    "domain": "Party",
    "name": "email_address",
    "abbreviation": "EMAIL_ADDRESS",
    "fieldCount": 22
  },
  {
    "id": "a-policy",
    "domain": "Policy",
    "name": "policy",
    "abbreviation": "POLICY",
    "fieldCount": 168
  },
  {
    "id": "a-life",
    "domain": "Policy",
    "name": "life",
    "abbreviation": "LIFE",
    "fieldCount": 165
  },
  {
    "id": "a-annuity",
    "domain": "Policy",
    "name": "annuity",
    "abbreviation": "ANNUITY",
    "fieldCount": 134
  },
  {
    "id": "a-coverage",
    "domain": "Coverage",
    "name": "coverage",
    "abbreviation": "COVERAGE",
    "fieldCount": 194
  },
  {
    "id": "a-cov_option",
    "domain": "Coverage",
    "name": "cov_option",
    "abbreviation": "COV_OPTION",
    "fieldCount": 142
  },
  {
    "id": "a-life_participant",
    "domain": "Participant",
    "name": "life_participant",
    "abbreviation": "LIFE_PARTICIPANT",
    "fieldCount": 107
  },
  {
    "id": "a-relation",
    "domain": "Participant",
    "name": "relation",
    "abbreviation": "RELATION",
    "fieldCount": 57
  },
  {
    "id": "a-financial_activity",
    "domain": "Financial",
    "name": "financial_activity",
    "abbreviation": "FINANCIAL_ACTIVITY",
    "fieldCount": 91
  },
  {
    "id": "a-sub_account",
    "domain": "Financial",
    "name": "sub_account",
    "abbreviation": "SUB_ACCOUNT",
    "fieldCount": 196
  },
  {
    "id": "a-payment",
    "domain": "Payment",
    "name": "payment",
    "abbreviation": "PAYMENT",
    "fieldCount": 37
  },
  {
    "id": "a-medical_exam",
    "domain": "Underwriting",
    "name": "medical_exam",
    "abbreviation": "MEDICAL_EXAM",
    "fieldCount": 77
  },
  {
    "id": "a-producer",
    "domain": "Distribution",
    "name": "producer",
    "abbreviation": "PRODUCER",
    "fieldCount": 23
  },
  {
    "id": "a-loan",
    "domain": "Policy",
    "name": "loan",
    "abbreviation": "LOAN",
    "fieldCount": 67
  },
  {
    "id": "a-claim",
    "domain": "Claim",
    "name": "claim",
    "abbreviation": "CLAIM",
    "fieldCount": 40
  },
  {
    "id": "a-reinsurance_info",
    "domain": "Reinsurance",
    "name": "reinsurance_info",
    "abbreviation": "REINSURANCE_INFO",
    "fieldCount": 119
  },
  {
    "id": "a-transfer_info",
    "domain": "Reinsurance",
    "name": "transfer_info",
    "abbreviation": "TRANSFER_INFO",
    "fieldCount": 9
  },
  {
    "id": "a-form_instance",
    "domain": "Document",
    "name": "form_instance",
    "abbreviation": "FORM_INSTANCE",
    "fieldCount": 41
  },
  {
    "id": "a-attachment",
    "domain": "Document",
    "name": "attachment",
    "abbreviation": "ATTACHMENT",
    "fieldCount": 45
  },
  {
    "id": "a-holding",
    "domain": "Holding",
    "name": "holding",
    "abbreviation": "HOLDING",
    "fieldCount": 54
  },
  {
    "id": "a-application_info",
    "domain": "Application",
    "name": "application_info",
    "abbreviation": "APPLICATION_INFO",
    "fieldCount": 120
  },
  {
    "id": "a-signature_info",
    "domain": "Application",
    "name": "signature_info",
    "abbreviation": "SIGNATURE_INFO",
    "fieldCount": 30
  },
  {
    "id": "a-user_auth_request",
    "domain": "Security",
    "name": "user_auth_request",
    "abbreviation": "USER_AUTH_REQUEST",
    "fieldCount": 16
  },
  {
    "id": "a-system_message",
    "domain": "System",
    "name": "system_message",
    "abbreviation": "SYSTEM_MESSAGE",
    "fieldCount": 18
  }
];

export const ACORD_FIELDS: FieldCodeEntry[] = [
  {
    "id": "af1",
    "code": "txlife_id",
    "usedInTables": 1,
    "tables": "txlife",
    "description": "Primary key for TXLife Transaction."
  },
  {
    "id": "af2",
    "code": "user_auth_request",
    "usedInTables": 1,
    "tables": "txlife",
    "description": "The UserAuthRequest object is used for security checking. This object can be used in a number of different configurations to provide the security checking. The UserDomain, UserDate, and UserTime prope"
  },
  {
    "id": "af3",
    "code": "t_x_life_request",
    "usedInTables": 1,
    "tables": "txlife",
    "description": "This aggregate provides a container for a TXLife message request's details. Its complement is TXLifeResponse."
  },
  {
    "id": "af4",
    "code": "user_auth_response",
    "usedInTables": 1,
    "tables": "txlife",
    "description": "This aggregate provides details regarding the User (Sender) of a TXLife Msg."
  },
  {
    "id": "af5",
    "code": "t_x_life_response",
    "usedInTables": 1,
    "tables": "txlife",
    "description": "This aggregate provides a container for a TXLife message response's details. Its complement is TXLifeRequest."
  },
  {
    "id": "af6",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "txlife",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af7",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "txlife",
    "description": "Record creation timestamp."
  },
  {
    "id": "af8",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "txlife",
    "description": "Record last update timestamp."
  },
  {
    "id": "af9",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "txlife",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af10",
    "code": "txlife_request_id",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "Primary key for TXLife Request."
  },
  {
    "id": "af11",
    "code": "txlife_id",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "FK → txlife.txlife_id"
  },
  {
    "id": "af12",
    "code": "trans_ref_g_u_i_d",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "Universally unique identifier. Created by sending/client application. This ID provides a correlation between the request and all associated responses. It is expected to be echoed back in any subsequen"
  },
  {
    "id": "af13",
    "code": "trans_tracking_i_d",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "This element is valued by the provider for future reference to link responses together. For polling and retrieval purposes for pending responses - this element is used for handling pending responses i *(For the use case of pending responses, where final result is obtained via a polling and retrieval operation: On TXLifeRequest, it is valued on the polling/retrieval operation with the value that was p)*"
  },
  {
    "id": "af14",
    "code": "trans_type",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "Transaction Type name with associated attribute type code (tc)"
  },
  {
    "id": "af15",
    "code": "trans_sub_type",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "Transaction Sub Types provide additional granularity for their parent transactions. This aids in directing transactions for processing as well as defining expected objects and properties that may be d"
  },
  {
    "id": "af16",
    "code": "business_service",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "Provides information about a specific service supporting a business process. A business process is made up of one or more business services. Each business service then maps one-to-one to a specific me *(On TXLifeRequest, BusinessService specifies the service being requested.)*"
  },
  {
    "id": "af17",
    "code": "object_type_c_c",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "This aggregate defines the available Object Types for selection on the parent object. *(Although this object does not meet all of the rules of a CC as described in the \"Expressing Choice Collections\" section, it is still considered a CC and, as such, is subject to all restrictions applic)*"
  },
  {
    "id": "af18",
    "code": "trans_exe_date",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "Transaction Execution Date *(On TXLifeRequest, TransExeDate represents the date the transaction was submitted.)*"
  },
  {
    "id": "af19",
    "code": "trans_exe_time",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "Transaction Execution Time"
  },
  {
    "id": "af20",
    "code": "trans_eff_date",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "Effective Date for the action that was or will be taken *(On a TXLifeRequest, this is the date that the requester would like to make the transaction effective.)*"
  },
  {
    "id": "af21",
    "code": "trans_mode",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "Indicates the mode used to process this transaction type. Applies to transactions that initiate a business process that takes time to complete, (e.g. NB submission)."
  },
  {
    "id": "af22",
    "code": "inquiry_level",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "InquiryLevel indicates the level or amount of information either requested or returned (depending on context) in the associated message. InquiryLevel is only applicable for Inquiry and Search transact *(On TXLifeRequest, InquiryLevel indicates the level of information desired on the associated TXLifeResponse.)*"
  },
  {
    "id": "af23",
    "code": "inquiry_view",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "The aggregate contains information about the view that you are inquiring about. There is a key for predefined views and codes that can be filled in to determine a new view. This object contains inform *(On TXLifeRequest, if InquiryView is specified, the InquiryLevel MUST be set to 3)*"
  },
  {
    "id": "af24",
    "code": "max_records",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "Indicates the maximum number of records to return to a result set from a search. Use the MaxRecords property to limit the number of records the provider returns. The MaxRecords property is read/write"
  },
  {
    "id": "af25",
    "code": "next_record",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "Provides the value of the next record available for a subsequent query *(On TXLifeRequest, use StartRecord on TXLifeRequest to indicate the number of the first record to return in a search.)*"
  },
  {
    "id": "af26",
    "code": "start_record",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "Applies to searches. Indicates the number of the first record to return in a search. As the search progresses, the next record will usually be incremented by the MaxRecords to bump down through the se"
  },
  {
    "id": "af27",
    "code": "start_date",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "The start date is inclusive. The default is the beginning of time."
  },
  {
    "id": "af28",
    "code": "start_time",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "Start Time *(On TXLifeRequest, StartTime is used in conjunction with StartDate when a time parameter is needed.)*"
  },
  {
    "id": "af29",
    "code": "end_date",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "The last date for which the aggregate is available, effective or active. The end date is inclusive. For example, 2004-12-31 indicates that the aggregate is no longer available on or after January 1, 2"
  },
  {
    "id": "af30",
    "code": "end_time",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "End Time *(On TXLifeRequest, EndTime is used in conjunction with EndDate when a time parameter is needed.)*"
  },
  {
    "id": "af31",
    "code": "pending_response_o_k",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "TRUE indicates that it is ok to send a pending Response. FALSE indicates that it is not acceptable to pend the transaction. If it cannot immediately be processed, a failure Response should be sent. If"
  },
  {
    "id": "af32",
    "code": "no_response_o_k",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "TRUE indicates that a response is not needed to the message. This is particularly useful for the Transmittal Request messages. Default is FALSE, and if it is used, you must provide a response. This is"
  },
  {
    "id": "af33",
    "code": "test_indicator",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "TRUE indicates this is a test file. A test file should not be processed against live data. It is used to identify transactions that are in a test mode."
  },
  {
    "id": "af34",
    "code": "u_r_l_target_request_ind",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "True indicates notifying called system that the calling (client) application would like to get a URL that he could pass control to."
  },
  {
    "id": "af35",
    "code": "supress_notifications_ind",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "TRUE indicates that notifications attached to the response to a request are not desired. This is used to indicate that no other notifications regarding other messages can be returned in the response t"
  },
  {
    "id": "af36",
    "code": "case_status_on_response_ind",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "TRUE indicates that case status information should be returned as part of the response to this request."
  },
  {
    "id": "af37",
    "code": "benefits_inquiry_type",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "Identifies that the data being requested or returned is depicting in-network information, out-of-network information, or both."
  },
  {
    "id": "af38",
    "code": "primary_object_type",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "Type of top-level object being referenced. In some cases such as XTbML, PrimaryObjectType may also reference a root element. *(On TXLifeRequest, PrimaryObjectType describes the object referenced by the @PrimaryObjectID attribute. It may also describe the ensemble of objects referenced by the DistinguishedObject construct.)*"
  },
  {
    "id": "af39",
    "code": "transaction_context",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "Uniquely identifies a Search Context, Applies to searches. This identifier must be unique per session, since a session may have made multiple search requests. This identifier can expire at any time. *(On TXLifeRequest, TransactionContext is used in subsequent searches to refer to a specific Search Context. The TransactionContext must have been supplied as a response to a prior search request.)*"
  },
  {
    "id": "af40",
    "code": "correlation_g_u_i_d",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "A globally unique ID which creates a correlation between two or more TXLife transaction which are part of the same business process. It is the responsibility of the creator of the first TXLife in the"
  },
  {
    "id": "af41",
    "code": "correlation_g_u_i_d_state",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "When a CorrelationGUID is specified this companion property indicates if the CorrelationGUID is the initial (first time) response, part of an ongoing response or the last of a series of responses. Thi *(On TXLifeRequest, CorrelationGUIDState is used for scenarios where the same or related transactions can be sent multiple times or as part of a series of related (correlated) messages making up one act)*"
  },
  {
    "id": "af42",
    "code": "support_multiple_responses_ind",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "TRUE indicates that entities participating in this message (sender /receiver) support multiple messages: a pending Response message along with a later subsequent Response message if the Request messag"
  },
  {
    "id": "af43",
    "code": "criteria_expression",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "A collection of Logical Operators and Criteria to generate complex selections."
  },
  {
    "id": "af44",
    "code": "illustration_request",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "This is used to request an illustration, and includes all the necessary parameters used to guide processing. This transaction is used to request an illustration calculation engine to calculate and ret"
  },
  {
    "id": "af45",
    "code": "m_i_b_request",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "Used to request MIB information. The MIBRequest object contains a \"Start Group: XOR Required\" grouping containing the object <MIBServiceDescriptor> and the property <MIBServiceConfigurationID>. When u"
  },
  {
    "id": "af46",
    "code": "reinsurance_request",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "Used to request reinsurance information."
  },
  {
    "id": "af47",
    "code": "change_sub_type",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "Used to indicate that a specific change is being reported-by or requested in the associated transaction. *(On TXLifeRequest, ChangeSubType is used as a wrapper-level indicator of specific changes taking place in the body of the message in the absence of transaction-specific documentation. For example, a si)*"
  },
  {
    "id": "af48",
    "code": "form_instance_request",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "Used to request a document. This aggregate contains information about the document that is being requested."
  },
  {
    "id": "af49",
    "code": "distinguished_object",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "A principal object among an ensemble of objects that provides a starting point for navigation, especially when there can be multiple ensembles, each ensemble needing to identify a starting object for  *(On TXLifeRequest, the DistinguishedObject collection is qualified by the PrimaryObjectType element. This assumes that all Distinguished Objects in a transaction will be of the same type. In a transact)*"
  },
  {
    "id": "af50",
    "code": "processing_instruction",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "Contains the instructions for guiding processing. *(On TXLifeRequest, this object contains instructions for guiding the processing for this transaction. This may include automated as well as manual instructions.)*"
  },
  {
    "id": "af51",
    "code": "o_lif_e",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "OLifE is a \"Root\" element. This forms the basis of the business data for the ACORD Life and Annuity Standard. In OLifE, the SourceInfo object is an optional, singly occurring object and if it appears  *(On TXLifeRequest, OLifE provides a known fixed starting point for the Life Data Model for non XTbML related elements.)*"
  },
  {
    "id": "af52",
    "code": "x_tb_m_l",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "The aggregates for XTbML, which is used to define the Society of Actuaries (SOA) ACORD tabular standard."
  },
  {
    "id": "af53",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af54",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "Record creation timestamp."
  },
  {
    "id": "af55",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "Record last update timestamp."
  },
  {
    "id": "af56",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "txlife_request",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af57",
    "code": "txlife_response_id",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "Primary key for TXLife Response."
  },
  {
    "id": "af58",
    "code": "txlife_id",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "FK → txlife.txlife_id"
  },
  {
    "id": "af59",
    "code": "trans_ref_g_u_i_d",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "Universally unique identifier. Created by sending/client application. This ID provides a correlation between the request and all associated responses. It is expected to be echoed back in any subsequen"
  },
  {
    "id": "af60",
    "code": "trans_tracking_i_d",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "This element is valued by the provider for future reference to link responses together. For polling and retrieval purposes for pending responses - this element is used for handling pending responses i *(For the use case of pending responses, where final result is obtained via a polling and retrieval operation: On TXLifeResponse, this TransTrackingID is applicable when final state responses following )*"
  },
  {
    "id": "af61",
    "code": "trans_type",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "Transaction Type name with associated attribute type code (tc)"
  },
  {
    "id": "af62",
    "code": "trans_sub_type",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "Transaction Sub Types provide additional granularity for their parent transactions. This aids in directing transactions for processing as well as defining expected objects and properties that may be d"
  },
  {
    "id": "af63",
    "code": "business_service",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "Provides information about a specific service supporting a business process. A business process is made up of one or more business services. Each business service then maps one-to-one to a specific me *(On TXLifeResponse, BusinessService specifies the service being requested.)*"
  },
  {
    "id": "af64",
    "code": "trans_exe_date",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "Transaction Execution Date *(On TXLifeResponse, TransExeDate represents the server date on which the transaction was processed.)*"
  },
  {
    "id": "af65",
    "code": "trans_exe_time",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "Transaction Execution Time"
  },
  {
    "id": "af66",
    "code": "trans_mode",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "Indicates the mode used to process this transaction type. Applies to transactions that initiate a business process that takes time to complete, (e.g. NB submission)."
  },
  {
    "id": "af67",
    "code": "inquiry_level",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "InquiryLevel indicates the level or amount of information either requested or returned (depending on context) in the associated message. InquiryLevel is only applicable for Inquiry and Search transact *(On TXLifeResponse, InquiryLevel indicates the level of information specified on the request and included on the associated TXLifeResponse. Should correspond to the InquiryLevel specified on the relate)*"
  },
  {
    "id": "af68",
    "code": "inquiry_view",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "The aggregate contains information about the view that you are inquiring about. There is a key for predefined views and codes that can be filled in to determine a new view. This object contains inform *(On TXLifeResponse, this should always be echoed back in the response if sent in the request.)*"
  },
  {
    "id": "af69",
    "code": "max_records",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "Indicates the maximum number of records to return to a result set from a search. Use the MaxRecords property to limit the number of records the provider returns. The MaxRecords property is read/write"
  },
  {
    "id": "af70",
    "code": "next_record",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "Provides the value of the next record available for a subsequent query"
  },
  {
    "id": "af71",
    "code": "start_record",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "Applies to searches. Indicates the number of the first record to return in a search. As the search progresses, the next record will usually be incremented by the MaxRecords to bump down through the se"
  },
  {
    "id": "af72",
    "code": "start_date",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "The start date is inclusive. The default is the beginning of time."
  },
  {
    "id": "af73",
    "code": "start_time",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "Start Time *(On TXLifeResponse, StartTime is echoed back from TXLifeRequest.)*"
  },
  {
    "id": "af74",
    "code": "end_date",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "The last date for which the aggregate is available, effective or active. The end date is inclusive. For example, 2004-12-31 indicates that the aggregate is no longer available on or after January 1, 2"
  },
  {
    "id": "af75",
    "code": "end_time",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "End Time *(On TXLifeResponse, EndTime is echoed back from TXLifeRequest)*"
  },
  {
    "id": "af76",
    "code": "pending_response_o_k",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "TRUE indicates that it is ok to send a pending Response. FALSE indicates that it is not acceptable to pend the transaction. If it cannot immediately be processed, a failure Response should be sent. If"
  },
  {
    "id": "af77",
    "code": "no_response_o_k",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "TRUE indicates that a response is not needed to the message. This is particularly useful for the Transmittal Request messages. Default is FALSE, and if it is used, you must provide a response. This is"
  },
  {
    "id": "af78",
    "code": "test_indicator",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "TRUE indicates this is a test file. A test file should not be processed against live data. It is used to identify transactions that are in a test mode."
  },
  {
    "id": "af79",
    "code": "u_r_l_target_request_ind",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "True indicates notifying called system that the calling (client) application would like to get a URL that he could pass control to."
  },
  {
    "id": "af80",
    "code": "benefits_inquiry_type",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "Identifies that the data being requested or returned is depicting in-network information, out-of-network information, or both."
  },
  {
    "id": "af81",
    "code": "primary_object_type",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "Type of top-level object being referenced. In some cases such as XTbML, PrimaryObjectType may also reference a root element. *(On TXLifeResponse, PrimaryObjectType describes the object referenced by the @PrimaryObjectID attribute. It may also describe the ensemble of objects referenced by the DistinguishedObject construct.)*"
  },
  {
    "id": "af82",
    "code": "transaction_context",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "Uniquely identifies a Search Context, Applies to searches. This identifier must be unique per session, since a session may have made multiple search requests. This identifier can expire at any time. *(On TXLifeResponse, TransactionContext is returned as a reference in the response to a search request. It identifies a specific search context within a session, so that subsequent search requests may r)*"
  },
  {
    "id": "af83",
    "code": "correlation_g_u_i_d",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "A globally unique ID which creates a correlation between two or more TXLife transaction which are part of the same business process. It is the responsibility of the creator of the first TXLife in the"
  },
  {
    "id": "af84",
    "code": "correlation_g_u_i_d_state",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "When a CorrelationGUID is specified this companion property indicates if the CorrelationGUID is the initial (first time) response, part of an ongoing response or the last of a series of responses. Thi *(On TXLifeResponse, CorrelationGUIDState is intended to echo back the original state specified by the sender of the request.)*"
  },
  {
    "id": "af85",
    "code": "change_sub_type",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "Used to indicate that a specific change is being reported-by or requested in the associated transaction."
  },
  {
    "id": "af86",
    "code": "criteria_expression",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "A collection of Logical Operators and Criteria to generate complex selections."
  },
  {
    "id": "af87",
    "code": "illustration_request",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "This is used to request an illustration, and includes all the necessary parameters used to guide processing. This transaction is used to request an illustration calculation engine to calculate and ret"
  },
  {
    "id": "af88",
    "code": "illustration_result",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "This object provides the details of an illustration result. *(On TXLifeResponse, returned, in addition to the holding that represents the results of the illustration.)*"
  },
  {
    "id": "af89",
    "code": "m_i_b_request",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "Used to request MIB information. The MIBRequest object contains a \"Start Group: XOR Required\" grouping containing the object <MIBServiceDescriptor> and the property <MIBServiceConfigurationID>. When u"
  },
  {
    "id": "af90",
    "code": "trans_result",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "This aggregate provides transaction result details for a TXLife Response."
  },
  {
    "id": "af91",
    "code": "target_u_r_l",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "Defines the URL that is the target for a returning focus after one website passes control to another"
  },
  {
    "id": "af92",
    "code": "trans_eff_date",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "Effective Date for the action that was or will be taken *(On a TXLifeResponse, this is the date that the transaction was actually made effective.)*"
  },
  {
    "id": "af93",
    "code": "form_instance_request",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "Used to request a document. This aggregate contains information about the document that is being requested. *(On TXLifeResponse, FormInstanceRequest provides support when Party is included in OLifE to be the target of FormInstanceDestination/@MailToPartyID.)*"
  },
  {
    "id": "af94",
    "code": "distinguished_object",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "A principal object among an ensemble of objects that provides a starting point for navigation, especially when there can be multiple ensembles, each ensemble needing to identify a starting object for  *(On TXLifeResponse, the DistinguishedObject collection is qualified by the PrimaryObjectType element. This assumes that all Distinguished Objects in a transaction will be of the same type. In a transac)*"
  },
  {
    "id": "af95",
    "code": "o_lif_e",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "OLifE is a \"Root\" element. This forms the basis of the business data for the ACORD Life and Annuity Standard. In OLifE, the SourceInfo object is an optional, singly occurring object and if it appears  *(On TXLifeResponse, OLifE provides a known fixed starting point for the Life Data Model for non XTbML related elements and may or may not be included depending on the agreement between implementation p)*"
  },
  {
    "id": "af96",
    "code": "x_tb_m_l",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "The aggregates for XTbML, which is used to define the Society of Actuaries (SOA) ACORD tabular standard."
  },
  {
    "id": "af97",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af98",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "Record creation timestamp."
  },
  {
    "id": "af99",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "Record last update timestamp."
  },
  {
    "id": "af100",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "txlife_response",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af101",
    "code": "party_id",
    "usedInTables": 1,
    "tables": "party",
    "description": "Primary key for Party."
  },
  {
    "id": "af102",
    "code": "party_id",
    "usedInTables": 1,
    "tables": "party",
    "description": "FK → party.party_id"
  },
  {
    "id": "af103",
    "code": "party_type_code",
    "usedInTables": 1,
    "tables": "party",
    "description": "Type of party existing in the collection."
  },
  {
    "id": "af104",
    "code": "carrier_admin_system",
    "usedInTables": 1,
    "tables": "party",
    "description": "The carrier assigned system identification where the information resides or originated."
  },
  {
    "id": "af105",
    "code": "party_key",
    "usedInTables": 1,
    "tables": "party",
    "description": "Party Key"
  },
  {
    "id": "af106",
    "code": "party_sys_key",
    "usedInTables": 1,
    "tables": "party",
    "description": "Party System Key"
  },
  {
    "id": "af107",
    "code": "full_name",
    "usedInTables": 1,
    "tables": "party",
    "description": "This captures a full name for a party in whatever is the agreed upon format and/or in which it has been captured. *(On Party, FullName represents the name of the party as it was captured. Note that prior to 2.19 the usage was much more restrictive to specific formatting requirements, but were loosened up based on p)*"
  },
  {
    "id": "af108",
    "code": "govt_i_d",
    "usedInTables": 1,
    "tables": "party",
    "description": "Government Provided Identification Number. Data should be stored as a string with NO formatting. For instance, in the USA, a social security number is stored as 123554321. Any formatting should be don *(On Party, GovtID should be used to capture the Party's primary government issued identification number. In the U.S., for a person, this would typically be the individual's Social Security Number.)*"
  },
  {
    "id": "af109",
    "code": "govt_i_d_stat",
    "usedInTables": 1,
    "tables": "party",
    "description": "Status of Government ID verification. In version 2.29.00, the description of this element was updated to clarify that the status relates to the verification of the Government Identifier even though th *(On Party, GovtIDStat specifies the status of verifying the identification. If the verification reveals a need for backup withholding, use WithholdingRequiredInd to specify that status.)*"
  },
  {
    "id": "af110",
    "code": "govt_i_d_stat_reason",
    "usedInTables": 1,
    "tables": "party",
    "description": "Description or reason that further explains the Government ID Status."
  },
  {
    "id": "af111",
    "code": "govt_i_d_t_c",
    "usedInTables": 1,
    "tables": "party",
    "description": "Type Code describing the contents of the GovtID property. *(On Party, GovtIDTC describes the value in the GovtID property.)*"
  },
  {
    "id": "af112",
    "code": "govt_i_d_t_c_desc",
    "usedInTables": 1,
    "tables": "party",
    "description": "Used when additional details about the Government Identification are needed or when GovtIDTC is set to Other."
  },
  {
    "id": "af113",
    "code": "govt_i_d_certification_date",
    "usedInTables": 1,
    "tables": "party",
    "description": "Date on which a Government Indentification entered \"certified\" status. *(On Party, \"certified\" status is indicated by Party.GovtIDStat having a value of tc=1, OLI_GOVTIDSTAT_CERTIFIED.)*"
  },
  {
    "id": "af114",
    "code": "residence_state",
    "usedInTables": 1,
    "tables": "party",
    "description": "For individuals/persons the State/Province of residence. For organizations this is the domicile state/providence. This provides a direct method of indicating the Resident/Domicile State for an entity."
  },
  {
    "id": "af115",
    "code": "residence_country",
    "usedInTables": 1,
    "tables": "party",
    "description": "For individuals/persons, this is the country of residence. For organizations, this is the domicile country. This provides a direct method of indicating the Resident/Domicile Country for an entity."
  },
  {
    "id": "af116",
    "code": "residence_country_desc",
    "usedInTables": 1,
    "tables": "party",
    "description": "Description to further define the country of residence *(On Party, ResidenceCountryDesc may be used when the ResidenceCountry type is set to \"Other\".)*"
  },
  {
    "id": "af117",
    "code": "residence_country_duration",
    "usedInTables": 1,
    "tables": "party",
    "description": "This element outlines the duration in months a person has been a resident of the specified country. The duration captured here relates specifically to time in residence within the locale specified by"
  },
  {
    "id": "af118",
    "code": "residence_county",
    "usedInTables": 1,
    "tables": "party",
    "description": "For individuals/persons, this is the county of residence. For organizations, this is the domicile county. This provides a direct method of indicating the resident or domicile county for an entity. Thi"
  },
  {
    "id": "af119",
    "code": "residence_zip",
    "usedInTables": 1,
    "tables": "party",
    "description": "Residence ZIP code for Party"
  },
  {
    "id": "af120",
    "code": "tax_resident_ind",
    "usedInTables": 1,
    "tables": "party",
    "description": "This indicates if the party is considered a resident of the jurisidiction for which the GovtID is for. Nation is used to indicate if the party is a tax resident of the indicated country; Jurisdiction  *(On Party, TaxResidentInd applies to the specified ResidenceCountry and ResidenceState as applicable. For purposes of the The U.S. Internal Revenue Service (IRS) Foreign Account Tax Compliance Act (FAT)*"
  },
  {
    "id": "af121",
    "code": "est_net_worth",
    "usedInTables": 1,
    "tables": "party",
    "description": "Estimated net-worth as of date record was created. *(On Party, EstNetWorth represents \"Equity\" for a Party with a PartyTypeCode of 2 - Organization. For a Party with a PartyTypeCode of 1 - Person, this property is the person's estimated net worth.)*"
  },
  {
    "id": "af122",
    "code": "est_tot_liabilities_amt",
    "usedInTables": 1,
    "tables": "party",
    "description": "Estimated total liabilities as of date record was created."
  },
  {
    "id": "af123",
    "code": "currency_type_code",
    "usedInTables": 1,
    "tables": "party",
    "description": "The type of currency. It is assumed that all currency fields for this object (including sub-objects) are of the same currency type."
  },
  {
    "id": "af124",
    "code": "pref_comm",
    "usedInTables": 1,
    "tables": "party",
    "description": "Preferred means of communication"
  },
  {
    "id": "af125",
    "code": "best_time_to_call_from",
    "usedInTables": 1,
    "tables": "party",
    "description": "Preference to be called at or after this specific time. E.g. if best time to call is between 9am and 5pm, this would represent 9am. For schema purposes, 9am Eastern should appear in the format 09:00:0 *(Use with BestTimeToCallTo.)*"
  },
  {
    "id": "af126",
    "code": "best_time_to_call_to",
    "usedInTables": 1,
    "tables": "party",
    "description": "Indicates the preference to be called before this time. E.g. if best time to call is between 9am and 5pm, this would represent 5pm. For schema purposes, 5pm Eastern should appear in the format 17:00:0 *(Use with BestTimeToCallFrom.)*"
  },
  {
    "id": "af127",
    "code": "i_d_reference_no",
    "usedInTables": 1,
    "tables": "party",
    "description": "For an organization, this holds the company registration number or the close corporation number. For an individual, this would be the reference number, as indicated by IDReferenceType."
  },
  {
    "id": "af128",
    "code": "i_d_reference_type",
    "usedInTables": 1,
    "tables": "party",
    "description": "Type Of ID being used as a reference."
  },
  {
    "id": "af129",
    "code": "tax_office",
    "usedInTables": 1,
    "tables": "party",
    "description": "Tax Office"
  },
  {
    "id": "af130",
    "code": "liquid_net_worth_amt",
    "usedInTables": 1,
    "tables": "party",
    "description": "The liquid net worth (excluding residence) of the Party. A liquid asset is defined as an asset that can be converted into cash in a timely manner such a U.S. Treasury Bond."
  },
  {
    "id": "af131",
    "code": "non_liquid_net_worth_amt",
    "usedInTables": 1,
    "tables": "party",
    "description": "The non-liquid (a.k.a. illiquid) net worth of the Party. A non-liquid asset is defined as an asset that cannot readily be converted into cash such as a car, a television set, etc."
  },
  {
    "id": "af132",
    "code": "est_tot_assets_amt",
    "usedInTables": 1,
    "tables": "party",
    "description": "The estimated amount of total assets for a party as of date the record was created."
  },
  {
    "id": "af133",
    "code": "tot_liquid_assets_amt",
    "usedInTables": 1,
    "tables": "party",
    "description": "The total liquid assets for a party as of date the record was created."
  },
  {
    "id": "af134",
    "code": "business_asset_amt",
    "usedInTables": 1,
    "tables": "party",
    "description": "Total amount of business assets held by this Party (for all businesses)."
  },
  {
    "id": "af135",
    "code": "withholding_required_ind",
    "usedInTables": 1,
    "tables": "party",
    "description": "Indicates whether back-up withholding is required."
  },
  {
    "id": "af136",
    "code": "residence_county_t_c",
    "usedInTables": 1,
    "tables": "party",
    "description": "The county of the state in which the party resides."
  },
  {
    "id": "af137",
    "code": "f_a_t_c_a_reportable_status",
    "usedInTables": 1,
    "tables": "party",
    "description": "Status that defines whether the person is considered reportable based on the FATCA rules. The U.S. Foreign Account Tax Compliance Act (FATCA) requires foreign financial institutions to document & repo"
  },
  {
    "id": "af138",
    "code": "person",
    "usedInTables": 1,
    "tables": "party",
    "description": "A type of Party. If Party.PartyTypeCode = OLI_PT_PERSON, then the Person Object is required and the Person properties MAY BE valued in addition to those defined in the Party Object definition."
  },
  {
    "id": "af139",
    "code": "organization",
    "usedInTables": 1,
    "tables": "party",
    "description": "Organization is always a subset of Party. If Party/PartyTypeCode = OLI_PT_ORG, then the Organization object is required and the Organization properties MAY BE valued in addition to those defined in th"
  },
  {
    "id": "af140",
    "code": "address",
    "usedInTables": 1,
    "tables": "party",
    "description": "The collection of addresses represents the various addresses a party or group may have."
  },
  {
    "id": "af141",
    "code": "phone",
    "usedInTables": 1,
    "tables": "party",
    "description": "A collection of Phones represents all the phone number information pertaining to a party that has been collected."
  },
  {
    "id": "af142",
    "code": "attachment",
    "usedInTables": 1,
    "tables": "party",
    "description": "This contains a collection of attachments. Each attachment could contain any of the attachment Types defined. In the Attachment object the three items AttachmentData, AttachmentReference, and Attachme"
  },
  {
    "id": "af143",
    "code": "carrier",
    "usedInTables": 1,
    "tables": "party",
    "description": "Provides more detailed information about an insurance carrier or fund manager. *(On Party, additional details about a \"carrier\" is detailed here.)*"
  },
  {
    "id": "af144",
    "code": "client",
    "usedInTables": 1,
    "tables": "party",
    "description": "A client is someone who an agent is working with. This can be either a prospect or a client."
  },
  {
    "id": "af145",
    "code": "producer",
    "usedInTables": 1,
    "tables": "party",
    "description": "An Agent, Agency, Broker, Broker Dealer, or Distributor This captures the additional information you have on a commission earning party."
  },
  {
    "id": "af146",
    "code": "e_mail_address",
    "usedInTables": 1,
    "tables": "party",
    "description": "An e-mail address pertaining to the party."
  },
  {
    "id": "af147",
    "code": "u_r_l",
    "usedInTables": 1,
    "tables": "party",
    "description": "A URL (Uniform Resource Locator) or URI (Uniform Resource Identifier) used to identify the location of an Internet or Intranet site."
  },
  {
    "id": "af148",
    "code": "prior_name",
    "usedInTables": 1,
    "tables": "party",
    "description": "Any other name of the party. Originally, this object was time-bound and reflected only prior names for the associated Party. It has since evolved, and is now being used to capture any alternative name *(On Party, PriorName is used to represent a prior and/or alternate name used by a party, such as maiden names, aliases, previous business names, etc.)*"
  },
  {
    "id": "af149",
    "code": "risk",
    "usedInTables": 1,
    "tables": "party",
    "description": "The risk information associated with insuring a party. This contains the information that is captured on an application to help an insurance company determine risk of an applicant."
  },
  {
    "id": "af150",
    "code": "physician",
    "usedInTables": 1,
    "tables": "party",
    "description": "Information if the party is a Physician."
  },
  {
    "id": "af151",
    "code": "pharmacy",
    "usedInTables": 1,
    "tables": "party",
    "description": "Information if the Party is a Pharmacy"
  },
  {
    "id": "af152",
    "code": "employment",
    "usedInTables": 1,
    "tables": "party",
    "description": "Provides details regarding the Party's present, past or planned employment."
  },
  {
    "id": "af153",
    "code": "govt_i_d_info",
    "usedInTables": 1,
    "tables": "party",
    "description": "This is a collection of government identifiers and associated metadata such as status, expiration date, etc. These identifiers are issued by an authority or agency at any level of government. (e.g. Fe *(On Party, GovtIDInfo may be used redundantly with explicitly named elements such as PassportNo and GovtImmigrationNo on Person when additional details are needed such as status, expiration date, etc. )*"
  },
  {
    "id": "af154",
    "code": "rating_agency_info",
    "usedInTables": 1,
    "tables": "party",
    "description": "A collection of properties used to describe the ratings that various agencies have assigned. For a carrier or an investment, this would be rating agencies like Moody's, Duff & Phelps, Standard & Poor'"
  },
  {
    "id": "af155",
    "code": "partial_identification",
    "usedInTables": 1,
    "tables": "party",
    "description": "PartialIdentification is used to represent a partial identifying number or character string. *(On Party, PartialIdentification should not be used to uniquely identify a Party because it contains only a subset of information. Even when combined with other identifying information such as a Name o)*"
  },
  {
    "id": "af156",
    "code": "residence_state_duration",
    "usedInTables": 1,
    "tables": "party",
    "description": "This element outlines the duration in months a person has been a resident of the specified State. The duration captured here relates specifically to time in residence within the locale specified by th"
  },
  {
    "id": "af157",
    "code": "delivery_info",
    "usedInTables": 1,
    "tables": "party",
    "description": "Depending on usage, specifies available or selected preferences for the delivery of documents, notifications, security information, data capture/interviews, etc. *(On Party, DeliveryInfo indicates where all notifications and/or deliveries of the specified category should be sent for the Party. This is considered the default selection. In the case that both Party)*"
  },
  {
    "id": "af158",
    "code": "restriction_info",
    "usedInTables": 1,
    "tables": "party",
    "description": "Contains information relating to Restrictions. *(On Party, RestrictionInfo contains Party related restriction information.)*"
  },
  {
    "id": "af159",
    "code": "keyed_value",
    "usedInTables": 1,
    "tables": "party",
    "description": "Generic object used to extend object hierarchy for proprietary data requirements. Each proprietary data item is represented using a KeyedValue object. A collection of KeyedValue objects is utilized to"
  },
  {
    "id": "af160",
    "code": "party_x_lat",
    "usedInTables": 1,
    "tables": "party",
    "description": "The string fields for the data model are represented in the language specified by OLifE/CurrentLanguage. This object contains the string fields that were deemed pertinent to be presented in one or mor *(On Party, PartyXLat is used to represent string elements in a language other than the default language specified by OLifE/CurrentLanguage.)*"
  },
  {
    "id": "af161",
    "code": "designation_info",
    "usedInTables": 1,
    "tables": "party",
    "description": "Information regarding a party's professional designations. *(On Party, for designations that are not of interest due to a Party's role as a Producer, then Party/DesignationInfo should be used. For designations that are of interest due to a Party's role as a Pro)*"
  },
  {
    "id": "af162",
    "code": "availability",
    "usedInTables": 1,
    "tables": "party",
    "description": "Describes a duration (days or dates) and/or time period during which a Party is available for a particular task or event. For example, operating hours of a business or dates/times available for a tele"
  },
  {
    "id": "af163",
    "code": "security_credential",
    "usedInTables": 1,
    "tables": "party",
    "description": "Used to specify credentials for security and authentication purposes."
  },
  {
    "id": "af164",
    "code": "tax_withholding",
    "usedInTables": 1,
    "tables": "party",
    "description": "TaxWithholding contains the rules that indicate how taxes for the specified taxation entity were or should be calculated. *(On Party, TaxWithholding is used to provide tax withholding instructions such as those that might be specified on an Employee's Withholding Allowance Certificate (W4 Form) in the U.S.)*"
  },
  {
    "id": "af165",
    "code": "identity_verification",
    "usedInTables": 1,
    "tables": "party",
    "description": "This object is used to document that a person's identity has been verified. It includes the information relating to the type of identification used in the verification, audit information relating to t *(On Party, IdentityVerification applies when it is out of context of a single application or medical exam (or other business process). This allows the verification to be done and captured once for mult)*"
  },
  {
    "id": "af166",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "party",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af167",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "party",
    "description": "Record creation timestamp."
  },
  {
    "id": "af168",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "party",
    "description": "Record last update timestamp."
  },
  {
    "id": "af169",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "party",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af170",
    "code": "address_id",
    "usedInTables": 1,
    "tables": "address",
    "description": "Primary key for Address."
  },
  {
    "id": "af171",
    "code": "address_key",
    "usedInTables": 1,
    "tables": "address",
    "description": "Address Key"
  },
  {
    "id": "af172",
    "code": "address_sys_key",
    "usedInTables": 1,
    "tables": "address",
    "description": "Address System Key"
  },
  {
    "id": "af173",
    "code": "address_type_code",
    "usedInTables": 1,
    "tables": "address",
    "description": "Type of address"
  },
  {
    "id": "af174",
    "code": "attention_line",
    "usedInTables": 1,
    "tables": "address",
    "description": "Used to contain an attention or additional address line. It contains information such as a specific person or department to provide additional information, facilitating delivery. This field could also"
  },
  {
    "id": "af175",
    "code": "line1",
    "usedInTables": 1,
    "tables": "address",
    "description": "First line of the address. Should not include city, state, or zip code."
  },
  {
    "id": "af176",
    "code": "line2",
    "usedInTables": 1,
    "tables": "address",
    "description": "Second line of the address. Should not include city, state, or zip code."
  },
  {
    "id": "af177",
    "code": "line3",
    "usedInTables": 1,
    "tables": "address",
    "description": "Third line of the address. Should not include city, state, or zip code."
  },
  {
    "id": "af178",
    "code": "line4",
    "usedInTables": 1,
    "tables": "address",
    "description": "Fourth line of the address *(On Address, Line4 is used as defined by AddressFormatTC. AddressFormatTC can either be omitted, making no statement about the formatting of the address, or it can be applied as follows: OLI_OTHER to r)*"
  },
  {
    "id": "af179",
    "code": "line5",
    "usedInTables": 1,
    "tables": "address",
    "description": "Fifth line of the address *(On Address, Line5 is used as defined by AddressFormatTC. AddressFormatTC can either be omitted, making no statement about the formatting of the address, or it can be applied as follows: OLI_OTHER to r)*"
  },
  {
    "id": "af180",
    "code": "city",
    "usedInTables": 1,
    "tables": "address",
    "description": "City of the address"
  },
  {
    "id": "af181",
    "code": "city_code",
    "usedInTables": 1,
    "tables": "address",
    "description": "A numeric representation or alphanumeric abbreviation of the city in question. This code is assigned by the governing jurisdiction of which the city is a member. For example, in the US, CityCode would"
  },
  {
    "id": "af182",
    "code": "address_state",
    "usedInTables": 1,
    "tables": "address",
    "description": "This may be more than two characters, plus formatting, to accommodate all countries. For U.S. states, this should be the official 2-letter, upper case abbreviation. For Australia, this should be the A"
  },
  {
    "id": "af183",
    "code": "address_state_t_c",
    "usedInTables": 1,
    "tables": "address",
    "description": "Provides a numeric integer value for the address state *(The AddressStateTC is a compliment to AddressState allowing for easier computer manipulation.)*"
  },
  {
    "id": "af184",
    "code": "zip",
    "usedInTables": 1,
    "tables": "address",
    "description": "Zip code, postal code, etc. (country dependent). This may include formatting characters to accommodate all countries. U.S. zip codes should be 5 digits, zip + 4 should be 9 digits, and not include the"
  },
  {
    "id": "af185",
    "code": "address_country",
    "usedInTables": 1,
    "tables": "address",
    "description": "Country of the address"
  },
  {
    "id": "af186",
    "code": "address_country_t_c",
    "usedInTables": 1,
    "tables": "address",
    "description": "Country typecode of the Address. Uses the nation lookup for valid Address Country type codes."
  },
  {
    "id": "af187",
    "code": "pref_addr",
    "usedInTables": 1,
    "tables": "address",
    "description": "The purpose of the PrefAddr property was to give an application/system a predictable mechanism for selecting a single address (for example; to print on a form containing space for only a single addres"
  },
  {
    "id": "af188",
    "code": "solicitation_ind",
    "usedInTables": 1,
    "tables": "address",
    "description": "True indicates that this party wants to be solicited by this contact point."
  },
  {
    "id": "af189",
    "code": "end_date",
    "usedInTables": 1,
    "tables": "address",
    "description": "The last date for which the aggregate is available, effective or active. The end date is inclusive. For example, 2004-12-31 indicates that the aggregate is no longer available on or after January 1, 2 *(On Address, EndDate is used to specify the date on which the address ceases to apply to the parent Party or Grouping.)*"
  },
  {
    "id": "af190",
    "code": "start_date",
    "usedInTables": 1,
    "tables": "address",
    "description": "The start date is inclusive. The default is the beginning of time. *(On Address, StartDate is used to specify the date on which the address begins to apply to the parent Party or Grouping.)*"
  },
  {
    "id": "af191",
    "code": "last_update",
    "usedInTables": 1,
    "tables": "address",
    "description": "The date last modified. *(On Address, LastUpdate is used to indicate the last date the Address was modified.)*"
  },
  {
    "id": "af192",
    "code": "last_update_time",
    "usedInTables": 1,
    "tables": "address",
    "description": "The time of the last update date this activity was last modified. *(On Address, LastUpdateTime is used to indicate the last time the Address was modified.)*"
  },
  {
    "id": "af193",
    "code": "years_at_address",
    "usedInTables": 1,
    "tables": "address",
    "description": "Number of years lived or living at this address. Used in cases where start and end date are not known but # of years are known. If Start and end date are known, this element should be omitted."
  },
  {
    "id": "af194",
    "code": "recurring_end_mo_day",
    "usedInTables": 1,
    "tables": "address",
    "description": "Recurring End Date is the Month and Day (no year) on which the Party wishes this contact point to stop being used each year. Format is --MM-DD. *(On Address, RecurringStartMoDay and RecurringEndMoDay are used to specify a time period within each year during which this contact point should be used. For example, the Address may represent a vacati)*"
  },
  {
    "id": "af195",
    "code": "recurring_start_mo_day",
    "usedInTables": 1,
    "tables": "address",
    "description": "Recurring Start Date is the Month and Day (no year) on which the Party wishes this contact point to start being used each year. Format is --MM-DD. *(On Address, RecurringStartMoDay and RecurringEndMoDay are used to specify a time period within each year during which this contact point should be used. For example, the Address may represent a vacati)*"
  },
  {
    "id": "af196",
    "code": "postal_drop_code",
    "usedInTables": 1,
    "tables": "address",
    "description": "This is to account for zip+4+1+2 needed for barcoding, etc."
  },
  {
    "id": "af197",
    "code": "postal_carrier_route_code",
    "usedInTables": 1,
    "tables": "address",
    "description": "A code assigned to a group of addresses within a zip code that aids in mail delivery. Postal carrier route codes are often used with saturation mailings. In the U.S., a postal carrier route is the gro *(On Address, PostalCarrierRouteCodes used in the US represent carrier route codes and should be 9 digits, 5 position zip + 1-digit route type + 3-digit number, with no formatting.)*"
  },
  {
    "id": "af198",
    "code": "location_code",
    "usedInTables": 1,
    "tables": "address",
    "description": "An identifier used to specify the location of an address in the context of the parent Party or Grouping. For example, to represent an address on a carrier party."
  },
  {
    "id": "af199",
    "code": "returned_mail_ind",
    "usedInTables": 1,
    "tables": "address",
    "description": "TRUE indicates mail has been returned to the sending party. FALSE indicates mail has not been returned."
  },
  {
    "id": "af200",
    "code": "address_format_t_c",
    "usedInTables": 1,
    "tables": "address",
    "description": "Used to designate usage on how to format the entire Address based on US postal formats"
  },
  {
    "id": "af201",
    "code": "address_bar_code_ind",
    "usedInTables": 1,
    "tables": "address",
    "description": "yes to indicate if a barcode is being used in addition to the address formatting"
  },
  {
    "id": "af202",
    "code": "prevent_override_ind",
    "usedInTables": 1,
    "tables": "address",
    "description": "Should town name/postal code standardization be overridden for this address? Default is \"no\", but \"yes\" will prevent the post office standard name from overwriting the user-preferred name. Refers to c"
  },
  {
    "id": "af203",
    "code": "legal_address_ind",
    "usedInTables": 1,
    "tables": "address",
    "description": "Indicator whether the address is the legal residence."
  },
  {
    "id": "af204",
    "code": "language",
    "usedInTables": 1,
    "tables": "address",
    "description": "Language in which the information is presented. *(On Address, the Language property represents the language in which the content of the message is represented. In Canada Post, there is only one 'official address'. In Quebec, for instance, the address)*"
  },
  {
    "id": "af205",
    "code": "address_valid_ind",
    "usedInTables": 1,
    "tables": "address",
    "description": "TRUE means the address has been validated and is well formed. FALSE means the address has not been validated."
  },
  {
    "id": "af206",
    "code": "county_name",
    "usedInTables": 1,
    "tables": "address",
    "description": "County associated with a particular address."
  },
  {
    "id": "af207",
    "code": "county_code",
    "usedInTables": 1,
    "tables": "address",
    "description": "A numeric representation or alphanumeric abbreviation of the county in question. This code is assigned by the governing jurisdiction of which the county is a member. For example, in the US, CountyCode"
  },
  {
    "id": "af208",
    "code": "address_source",
    "usedInTables": 1,
    "tables": "address",
    "description": "Indicates the source system from which the address was obtained."
  },
  {
    "id": "af209",
    "code": "user_code",
    "usedInTables": 1,
    "tables": "address",
    "description": "The ID or reference number that identifies the customer service rep associated with the transaction. *(On Address, this is the User Code of the individual who made the last update to the Address record.)*"
  },
  {
    "id": "af210",
    "code": "redundancy_check",
    "usedInTables": 1,
    "tables": "address",
    "description": "A form of error checking used to see if the old file information for the record in question has changed prior to updating the record. (e.g. Check Digit)."
  },
  {
    "id": "af211",
    "code": "hash_value",
    "usedInTables": 1,
    "tables": "address",
    "description": "The hash result or digest used to verify the content of the record against data corruption."
  },
  {
    "id": "af212",
    "code": "hash_type",
    "usedInTables": 1,
    "tables": "address",
    "description": "The type of data hash algorithm which is used to verify the content of the record against data corruption. *(On Address, HashType is used to qualify the contents of HashValue.)*"
  },
  {
    "id": "af213",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "address",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af214",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "address",
    "description": "Record creation timestamp."
  },
  {
    "id": "af215",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "address",
    "description": "Record last update timestamp."
  },
  {
    "id": "af216",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "address",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af217",
    "code": "phone_id",
    "usedInTables": 1,
    "tables": "phone",
    "description": "Primary key for Phone."
  },
  {
    "id": "af218",
    "code": "phone_key",
    "usedInTables": 1,
    "tables": "phone",
    "description": "Phone Key"
  },
  {
    "id": "af219",
    "code": "phone_sys_key",
    "usedInTables": 1,
    "tables": "phone",
    "description": "Phone System Key"
  },
  {
    "id": "af220",
    "code": "phone_type_code",
    "usedInTables": 1,
    "tables": "phone",
    "description": "Type of phone"
  },
  {
    "id": "af221",
    "code": "phone_value",
    "usedInTables": 1,
    "tables": "phone",
    "description": "Used to supply a phone number when the components (CountryCode, AreaCode, DialNumber, AliasDialNumber, Ext) may not be individually specified. Formatting is allowed. *(On Phone, PhoneValue may be used to specify a phone number that can not be accurately modeled using the available explicitly named elements. If the individual components are known, they may be specifi)*"
  },
  {
    "id": "af222",
    "code": "country_code",
    "usedInTables": 1,
    "tables": "phone",
    "description": "For example, this may be the AT&T dialing country code or those defined by the Telecommunication Standardization Sector (ITU-T)."
  },
  {
    "id": "af223",
    "code": "area_code",
    "usedInTables": 1,
    "tables": "phone",
    "description": "Area code"
  },
  {
    "id": "af224",
    "code": "dial_number",
    "usedInTables": 1,
    "tables": "phone",
    "description": "Phone number. Does not include country code and area code. Data should be stored as a string with NO formatting. Any formatting should be done within the client applications."
  },
  {
    "id": "af225",
    "code": "alias_dial_number",
    "usedInTables": 1,
    "tables": "phone",
    "description": "Alphanumeric version format of a numeric DialNumber, usually expressed words or acronyms. This does not include the area code, which would typically be a toll free area code like 800. For example: 1-8 *(On Phone, the AliasDialNumber is an alternate version of the DialNumber in the same Phone instance.)*"
  },
  {
    "id": "af226",
    "code": "ext",
    "usedInTables": 1,
    "tables": "phone",
    "description": "Extension of the phone number (if any)"
  },
  {
    "id": "af227",
    "code": "pref_phone",
    "usedInTables": 1,
    "tables": "phone",
    "description": "Preferred phone indicator. The purpose of the PrefPhone property was to give an application/system a predictable mechanism for selecting a single phone number (for example; to print on a form containi"
  },
  {
    "id": "af228",
    "code": "best_time_to_call_from",
    "usedInTables": 1,
    "tables": "phone",
    "description": "Preference to be called at or after this specific time. E.g. if best time to call is between 9am and 5pm, this would represent 9am. For schema purposes, 9am Eastern should appear in the format 09:00:0"
  },
  {
    "id": "af229",
    "code": "best_time_to_call_to",
    "usedInTables": 1,
    "tables": "phone",
    "description": "Indicates the preference to be called before this time. E.g. if best time to call is between 9am and 5pm, this would represent 5pm. For schema purposes, 5pm Eastern should appear in the format 17:00:0"
  },
  {
    "id": "af230",
    "code": "invalid_ind",
    "usedInTables": 1,
    "tables": "phone",
    "description": "True means the phone number is invalid False means it is valid. This should be considered a 'permanent situation', like the phone has been disconnected and not meant for temporary situations. False is"
  },
  {
    "id": "af231",
    "code": "solicitation_ind",
    "usedInTables": 1,
    "tables": "phone",
    "description": "True indicates that this party wants to be solicited by this contact point."
  },
  {
    "id": "af232",
    "code": "start_date",
    "usedInTables": 1,
    "tables": "phone",
    "description": "The start date is inclusive. The default is the beginning of time. *(On Phone, StartDate is the start date of reachability at this phone number. E.g. If person lives in IL in summer and FL in winter.)*"
  },
  {
    "id": "af233",
    "code": "end_date",
    "usedInTables": 1,
    "tables": "phone",
    "description": "The last date for which the aggregate is available, effective or active. The end date is inclusive. For example, 2004-12-31 indicates that the aggregate is no longer available on or after January 1, 2 *(On Phone, EndDate is the end date of reachability at this phone number.)*"
  },
  {
    "id": "af234",
    "code": "last_update",
    "usedInTables": 1,
    "tables": "phone",
    "description": "The date last modified. *(On Phone, LastUpdate is used to indicate the last date the Phone was modified.)*"
  },
  {
    "id": "af235",
    "code": "last_update_time",
    "usedInTables": 1,
    "tables": "phone",
    "description": "The time of the last update date this activity was last modified. *(On Phone, LastUpdateTime is used to indicate the last time the Phone was modified)*"
  },
  {
    "id": "af236",
    "code": "recurring_end_mo_day",
    "usedInTables": 1,
    "tables": "phone",
    "description": "Recurring End Date is the Month and Day (no year) on which the Party wishes this contact point to stop being used each year. Format is --MM-DD. *(On Phone, RecurringStartMoDay and RecurringEndMoDay are used to specify a time period within each year during which this contact point should be used. For example, the Phone may represent a vacation h)*"
  },
  {
    "id": "af237",
    "code": "recurring_start_mo_day",
    "usedInTables": 1,
    "tables": "phone",
    "description": "Recurring Start Date is the Month and Day (no year) on which the Party wishes this contact point to start being used each year. Format is --MM-DD. *(On Phone, RecurringStartMoDay and RecurringEndMoDay are used to specify a time period within each year during which this contact point should be used. For example, the Phone may represent a vacation h)*"
  },
  {
    "id": "af238",
    "code": "phone_country_t_c",
    "usedInTables": 1,
    "tables": "phone",
    "description": "Country that the phone resides in. This is not the dial code."
  },
  {
    "id": "af239",
    "code": "t_t_y_ind",
    "usedInTables": 1,
    "tables": "phone",
    "description": "This will add support TTY(Teletypewriter), TDD (Telecommunications Device for the Deaf) for the hearing impaired."
  },
  {
    "id": "af240",
    "code": "sequence",
    "usedInTables": 1,
    "tables": "phone",
    "description": "This element is used for ordering and sorting purposes. Sequencing should start with \"1\". Nodes within the same object should not duplicate a Sequence that applies to any one application or policy unl *(On Phone, Sequence is used to show the priority of the phone number / type to be used. It is important to note that if you are currently using the PrefPhone, you can continue, it should relate to the )*"
  },
  {
    "id": "af241",
    "code": "user_code",
    "usedInTables": 1,
    "tables": "phone",
    "description": "The ID or reference number that identifies the customer service rep associated with the transaction. *(On Phone, this is the User Code of the individual who made the last update to the Phone record.)*"
  },
  {
    "id": "af242",
    "code": "redundancy_check",
    "usedInTables": 1,
    "tables": "phone",
    "description": "A form of error checking used to see if the old file information for the record in question has changed prior to updating the record. (e.g. Check Digit)."
  },
  {
    "id": "af243",
    "code": "hash_value",
    "usedInTables": 1,
    "tables": "phone",
    "description": "The hash result or digest used to verify the content of the record against data corruption."
  },
  {
    "id": "af244",
    "code": "hash_type",
    "usedInTables": 1,
    "tables": "phone",
    "description": "The type of data hash algorithm which is used to verify the content of the record against data corruption. *(On Phone, HashType is used to qualify the contents of HashValue.)*"
  },
  {
    "id": "af245",
    "code": "best_day_to_call_c_c",
    "usedInTables": 1,
    "tables": "phone",
    "description": "Preferred day of week to call Client's preferred day of week to be called, collected during apply process *(Although this object does not meet all of the rules of a CC as described in the \"Expressing Choice Collections\" section, it is still considered a CC and, as such, is subject to all restrictions applic)*"
  },
  {
    "id": "af246",
    "code": "speed_dial",
    "usedInTables": 1,
    "tables": "phone",
    "description": "Used to store abbreviated numbers for a given phone number."
  },
  {
    "id": "af247",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "phone",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af248",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "phone",
    "description": "Record creation timestamp."
  },
  {
    "id": "af249",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "phone",
    "description": "Record last update timestamp."
  },
  {
    "id": "af250",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "phone",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af251",
    "code": "email_address_id",
    "usedInTables": 1,
    "tables": "email_address",
    "description": "Primary key for Email Address."
  },
  {
    "id": "af252",
    "code": "e_mail_address_key",
    "usedInTables": 1,
    "tables": "email_address",
    "description": "EMailAddress Key"
  },
  {
    "id": "af253",
    "code": "e_mail_address_sys_key",
    "usedInTables": 1,
    "tables": "email_address",
    "description": "EMailAddress System Key"
  },
  {
    "id": "af254",
    "code": "e_mail_type",
    "usedInTables": 1,
    "tables": "email_address",
    "description": "Type of e-mail address"
  },
  {
    "id": "af255",
    "code": "addr_line",
    "usedInTables": 1,
    "tables": "email_address",
    "description": "String representing complete, usable e-mail address. This is correctly defined as the \"SMTP\" address."
  },
  {
    "id": "af256",
    "code": "pref_e_mail_addr",
    "usedInTables": 1,
    "tables": "email_address",
    "description": "Preferred e-mail address indicator. The purpose of the PrefEMailAddr property was to give an application/system a predictable mechanism for selecting a single email address (for example; to print on a"
  },
  {
    "id": "af257",
    "code": "attachment_ind",
    "usedInTables": 1,
    "tables": "email_address",
    "description": "Indicates whether a person can receive attachments at this address, TRUE if the person can, FALSE if not."
  },
  {
    "id": "af258",
    "code": "undeliverable_ind",
    "usedInTables": 1,
    "tables": "email_address",
    "description": "An indicator to denote that this address is an undeliverable address for this party"
  },
  {
    "id": "af259",
    "code": "solicitation_ind",
    "usedInTables": 1,
    "tables": "email_address",
    "description": "True indicates that this party wants to be solicited by this contact point."
  },
  {
    "id": "af260",
    "code": "start_date",
    "usedInTables": 1,
    "tables": "email_address",
    "description": "The start date is inclusive. The default is the beginning of time. *(On EMailAddress, StartDate is the start date of email address availability.)*"
  },
  {
    "id": "af261",
    "code": "end_date",
    "usedInTables": 1,
    "tables": "email_address",
    "description": "The last date for which the aggregate is available, effective or active. The end date is inclusive. For example, 2004-12-31 indicates that the aggregate is no longer available on or after January 1, 2 *(On EMailAddress, EndDate is the end date of email address availability.)*"
  },
  {
    "id": "af262",
    "code": "last_update",
    "usedInTables": 1,
    "tables": "email_address",
    "description": "The date last modified. *(On EMailAddress, LastUpdate is used to indicate the last date the EMailAddress was modified.)*"
  },
  {
    "id": "af263",
    "code": "last_update_time",
    "usedInTables": 1,
    "tables": "email_address",
    "description": "The time of the last update date this activity was last modified. *(On EMailAddress, LastUpdateTime is used to indicate the last time the EMailAddress was modified.)*"
  },
  {
    "id": "af264",
    "code": "language",
    "usedInTables": 1,
    "tables": "email_address",
    "description": "Language in which the information is presented. *(On EMailAddress, the Language property represents the language in which the content of the message is represented.)*"
  },
  {
    "id": "af265",
    "code": "user_code",
    "usedInTables": 1,
    "tables": "email_address",
    "description": "The ID or reference number that identifies the customer service rep associated with the transaction. *(On EMailAddress, this is the User Code of the individual who made the last update to the Email Address record.)*"
  },
  {
    "id": "af266",
    "code": "redundancy_check",
    "usedInTables": 1,
    "tables": "email_address",
    "description": "A form of error checking used to see if the old file information for the record in question has changed prior to updating the record. (e.g. Check Digit)."
  },
  {
    "id": "af267",
    "code": "hash_value",
    "usedInTables": 1,
    "tables": "email_address",
    "description": "The hash result or digest used to verify the content of the record against data corruption."
  },
  {
    "id": "af268",
    "code": "hash_type",
    "usedInTables": 1,
    "tables": "email_address",
    "description": "The type of data hash algorithm which is used to verify the content of the record against data corruption. *(On EMailAddress, HashType is used to qualify the contents of HashValue.)*"
  },
  {
    "id": "af269",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "email_address",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af270",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "email_address",
    "description": "Record creation timestamp."
  },
  {
    "id": "af271",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "email_address",
    "description": "Record last update timestamp."
  },
  {
    "id": "af272",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "email_address",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af273",
    "code": "policy_id",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Primary key for Policy."
  },
  {
    "id": "af274",
    "code": "policy_id",
    "usedInTables": 1,
    "tables": "policy",
    "description": "FK → policy.policy_id"
  },
  {
    "id": "af275",
    "code": "carrier_admin_system",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The carrier assigned system identification where the information resides or originated."
  },
  {
    "id": "af276",
    "code": "prior_carrier_admin_system",
    "usedInTables": 1,
    "tables": "policy",
    "description": "In the case of a system conversion, this is the prior administration system."
  },
  {
    "id": "af277",
    "code": "pol_number",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Policy Number"
  },
  {
    "id": "af278",
    "code": "certificate_no",
    "usedInTables": 1,
    "tables": "policy",
    "description": "On group policies, and individual's interest is not represented with a policy number (its the group policy that has a policy number). Instead, it is a certificate number."
  },
  {
    "id": "af279",
    "code": "line_of_business",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Line of business of the insurance. *(On Policy, LineOfBusiness determines which Line of Business sub-object can be attached. Only one of these sub-objects can be attached. See the individual code value mappings to determine which is appl)*"
  },
  {
    "id": "af280",
    "code": "product_type",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Whether the underlying insurance policy is a Life, DisabilityHealth, or an Annuity."
  },
  {
    "id": "af281",
    "code": "investment_only_ind",
    "usedInTables": 1,
    "tables": "policy",
    "description": "An investment-only product, typically a variable annuity, provides investors with a simple way to set aside taxable assets in a tax-deferred entity focused on investment. Unlike most traditional annui"
  },
  {
    "id": "af282",
    "code": "product_code",
    "usedInTables": 1,
    "tables": "policy",
    "description": "This is a carrier assigned code used to identify the object that contains this property. Because the code is assigned by a carrier, it is typically used in conjunction with a CarrierCode to create a u"
  },
  {
    "id": "af283",
    "code": "product_version_code",
    "usedInTables": 1,
    "tables": "policy",
    "description": "ProductVersionCode defines the version of a product, particularly when a company uses the same ProductCode across versions. Business users require the ability to vary product information without creat"
  },
  {
    "id": "af284",
    "code": "carrier_code",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Uniquely represents the manufacturer of the financial product, such as an insurance company or fund manager. Note that the CarrierCode on PolicyProduct may reference the unique identifier of an insura *(On Policy, CarrierCode may be used to identify the insurance company associated with the policy. For US implementations, the statutory carrier's NAIC Code is suggested to ensure interoperability betwe)*"
  },
  {
    "id": "af285",
    "code": "plan_name",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Full name of plan. This is the complete, official, and/or legal name used for this policy/coverage/option."
  },
  {
    "id": "af286",
    "code": "administering_carrier_code",
    "usedInTables": 1,
    "tables": "policy",
    "description": "In the case where a policy is administered by a different Carrier than the Issuing Carrier, this is the administering carrier."
  },
  {
    "id": "af287",
    "code": "short_name",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The abbreviated or short name. *(On Policy, ShortName references the PolicyProduct/ShortName. In the U.S., this would be an appropriate property to represent the NAIC Marketing Name.)*"
  },
  {
    "id": "af288",
    "code": "marketing_name",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The marketing name given by the carrier for this item. *(On Policy, MarketingName indicates the version marketing name associated with a product. MarketingName is the carriers marketing name associated with the ProductVersionCode.)*"
  },
  {
    "id": "af289",
    "code": "policy_status",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Type code for the status of the contract"
  },
  {
    "id": "af290",
    "code": "policy_status_desc",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Description to further define the status of policy *(On Policy, PolicyStatusDesc may be used when the PolicyStatus type is set to \"Other\".)*"
  },
  {
    "id": "af291",
    "code": "status_reason",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Reason for Status"
  },
  {
    "id": "af292",
    "code": "issue_nation",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The nation of issue. *(On Policy, IssueNation represents the nation in which the policy was issued. This element should only be used when the HoldingTypeCode is set to 2 for Policy, and would apply to the Investment compone)*"
  },
  {
    "id": "af293",
    "code": "issue_nation_desc",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Description to further define the nation of issue. *(On Policy, IssueNationDesc further describes the nation in which the policy was issued. IssueNationDesc may be used when the IssueNation type is set to \"Other\". This element should only be used when t)*"
  },
  {
    "id": "af294",
    "code": "issue_type",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The type of underwriting used for this policy. For example: Full Underwriting, Mass Underwriting, Reduced Underwriting, Simplified Underwriting, etc."
  },
  {
    "id": "af295",
    "code": "issue_sub_type",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Used to specify sub-categories of issue type. For example,\"Full Underwriting\" may be further refined into non-medical underwriting, paramedical underwriting, and full medical underwriting based on the *(On Policy, IssueSubType is used with IssueType to provide additional detail about the type of underwriting that was applied to the policy.)*"
  },
  {
    "id": "af296",
    "code": "jurisdiction",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The jurisdiction of the parent aggregate. In most cases, Jurisdiction is used to describe one of two situations. Jurisdiction is most often used to record A) a valid jurisdiction for the associated ag *(On Policy, Jurisdiction is used to specify the legal jurisdiction established for the policy once jurisdiction determination business rules have been applied.)*"
  },
  {
    "id": "af297",
    "code": "bill_number",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The unique billing reference number to a block of business. *(On Policy, BillNumber is used in List Bill, Government Allotment, and for family groups where payments are grouped together.)*"
  },
  {
    "id": "af298",
    "code": "reinsurance_ind",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Indicates that the risk of this policy is shared in whole or in part by another carrier. TRUE if risk is shared, FALSE if not."
  },
  {
    "id": "af299",
    "code": "portability_ind",
    "usedInTables": 1,
    "tables": "policy",
    "description": "True indicates if individual can remain a certificate holder under group policy if employee relationship terminated for some reason."
  },
  {
    "id": "af300",
    "code": "convert_to_private_ind",
    "usedInTables": 1,
    "tables": "policy",
    "description": "True indicates policy can be converted to private policy if employee relationship terminated for some reason"
  },
  {
    "id": "af301",
    "code": "tax_status",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Tax Status indicates the tax status of the parent entity."
  },
  {
    "id": "af302",
    "code": "tax_status_reason",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The reason for the Tax Status. For example, if the TaxStatus is 3 for Tax Exempt, the type of exemption (full time student, military spouse, etc.) may be specified here. *(On Policy, TaxStatusReason may be used to provide details regarding the reason for the TaxStatus.)*"
  },
  {
    "id": "af303",
    "code": "cusip_num",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Committee on Uniform Security Identification Procedures (CUSIP) number of insurance or investment product."
  },
  {
    "id": "af304",
    "code": "replacement_type",
    "usedInTables": 1,
    "tables": "policy",
    "description": "ReplacementType denotes the kind of replacement when the applied for policy is replacing an existing contract. *(On Policy, ReplacementType is used to describe the nature of the parent Holding. On a proposed policy, ReplacementType reflects in aggregate the ReplacementType(s) of all existing contracts that are b)*"
  },
  {
    "id": "af305",
    "code": "commission_option_selected",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The commission description which correlates to the commission code or compensation plan which the original writing agents choose to be compensated by when the policy was sold."
  },
  {
    "id": "af306",
    "code": "commission_roll_over_pct",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The value is this property represents the commission percentage payable on a rollover."
  },
  {
    "id": "af307",
    "code": "policy_value",
    "usedInTables": 1,
    "tables": "policy",
    "description": "This is the total gross value of the contract before any fees or charges are applied. Any outstanding loan balances have not been subtracted from this value. *(On Policy, PolicyValue represents the total gross value of the contract. For a Life Policy, use also the NetSurrValueAmt, CashValueAmt, DeathBenefitAmt, SurrenderChargeAmt, NetDeathBenefitAmt to fully)*"
  },
  {
    "id": "af308",
    "code": "policy_value_last_year",
    "usedInTables": 1,
    "tables": "policy",
    "description": "This value is the total gross value of the contract before any fees or charges are applied as of the end of the last calendar year. Any outstanding loans have not been subtracted from this value."
  },
  {
    "id": "af309",
    "code": "pol_fee",
    "usedInTables": 1,
    "tables": "policy",
    "description": "For Life policies, this is a flat amount added to the basic premium rate to reflect the cost of issuing a policy, establishing the required records, sending premium notices, and other related expenses"
  },
  {
    "id": "af310",
    "code": "duration",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Unless otherwise indicated by a duration qualifier, Duration is specified in years based on current point in time. Numerous calculations and financial statements require knowing the current duration t *(On Policy, Duration represents the year number (count) that indicates the duration of time that the Policy has been in effect in whole years, starting in year 1. For example, a Policy that was initial)*"
  },
  {
    "id": "af311",
    "code": "duration_design",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Duration for renewable, level and decreasing terms and duration of limited pay and graded premium whole life - represented in years as integer; if coverage is for life or not applicable, integer will  *(On Policy, DurationDesign reflects the duration design for the policy level ProductCode and PlanName. This is often the same as the equivalent properties on the base Coverage for life products, but th)*"
  },
  {
    "id": "af312",
    "code": "download_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Date of the download."
  },
  {
    "id": "af313",
    "code": "eff_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "This will usually indicate when an aggregate is effective (e.g. CommSchedule, LifeParticipant and Participant) or the actual effective date which may be used for the calculation of the anniversary dat *(On Policy, EffDate is the date on which an insurance policy goes into force. This date may be different from the Date of Issue. To request a specific policy effective date before a policy is issued, u)*"
  },
  {
    "id": "af314",
    "code": "eff_partial_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "This property can be used when only a partial effective date is allowed by the receiving system. *(On Policy, EffPartialDate is intended primarily for use in cases to document dates on prior or existing insurance where the full date is not known. Most commonly seen on applications for insurance.)*"
  },
  {
    "id": "af315",
    "code": "issue_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Date when an insurance company issues a policy or policy component. This is commonly the date the policy is printed. This date may be different from the date the insurance coverage becomes effective.  *(On Policy, IssueDate is a relatively unimportant date from a processing point. See EffDate for the date the policy went into effect and from which its anniversaries are marked.)*"
  },
  {
    "id": "af316",
    "code": "term_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Termination Date is the date the aggregate is no longer effective. *(On Policy, TermDate represents the date the policy is no longer in force.)*"
  },
  {
    "id": "af317",
    "code": "reinstatement_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "For policies that had lapsed, but were reinstated, this indicates the date on which they were reinstated."
  },
  {
    "id": "af318",
    "code": "status_change_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The date the parent object was changed to its current status. *(On Policy, StatusChangeDate is the date the policy status (PolicyStatus) last changed.)*"
  },
  {
    "id": "af319",
    "code": "paid_to_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The date to which the contract is currently funded. *(On Policy, PaidToDate is the date to which the contract is currently funded. For universal policies, this includes the date to which Cost of Insurance charges are paid.)*"
  },
  {
    "id": "af320",
    "code": "grace_period_end_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The last date the insurer allows for payment without penalty such as a fee or policy lapse. *(On Policy, GracePeriodEndDate is the date that the policy will lapse if a premium payment is not received. This date is typically set when the policy status is set to \"Grace Period\".)*"
  },
  {
    "id": "af321",
    "code": "final_payment_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "For inforce policies/coverages, this property contains the date the final premium payment is due. For terminated policies/coverages, this property contains the date the final premium payment was made. *(On Policy, FinalPaymentDate represents final payment date for the policy.)*"
  },
  {
    "id": "af322",
    "code": "payment_completion_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The payment completion date of the annuity contract or life insurance policy. Use Case 1: If there are multiple 1035 exchanges or qualified transfers coming in and need to identify the final transfer"
  },
  {
    "id": "af323",
    "code": "billed_to_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "This is the due date for this billing."
  },
  {
    "id": "af324",
    "code": "billing_stop_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The date that the billing notices should stop. This date can be requested by the owner if he/she doesn't want to receive any more billing notices because the policy is paid up or for any other reason."
  },
  {
    "id": "af325",
    "code": "last_c_o_i_anniv_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Last policy anniversary date that the Cost of Insurance and the Expenses were charged. For a traditional policy, this is the last anniversary date."
  },
  {
    "id": "af326",
    "code": "payment_mode",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The frequency of a payment. Typically annual, monthly, weekly, etc."
  },
  {
    "id": "af327",
    "code": "payment_amt",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Current amount of payment. PaymentAmt is neutral as to whether the payment is inbound or outbound, paid or intention of payment. Refer to usage details for more information. *(On Policy, PaymentAmt is used to specify the current modal premium/ payment amount. May also be known as billed premium amount. Represents the amount that the carrier expects to be paid.)*"
  },
  {
    "id": "af328",
    "code": "annual_payment_amt",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Annualized payment/premium amount *(On Policy, AnnualPaymentAmt includes all riders/coverages. May also be known as annualized billed premium amount.)*"
  },
  {
    "id": "af329",
    "code": "payment_method",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The business process by which payment is made which influences how the payment is billed. To express it in the reverse, there are internal business rules around each allowable Payment Method that usua"
  },
  {
    "id": "af330",
    "code": "account_number",
    "usedInTables": 1,
    "tables": "policy",
    "description": "A unique account number. The unique identifier of a subset of financial information. For example the identifier for one of the following: an investment account, a bank account, a credit card account,  *(On Policy, AccountNumber is used typically in scenarios where funds are transferred or billed either via \"electronic funds transfer\" or \"credit card billing\". This is the account number for either the)*"
  },
  {
    "id": "af331",
    "code": "routing_number",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The routing number for the bank account also the bank code used for wire transfers. The number used to sort paper checks by bank or bank branch as well as processing electronic funds transfer. This is *(On Policy, RoutingNumber is used typically in scenarios where funds are transferred or billed either via \"electronic funds transfer\" or \"credit card billing\". This is the account number for either the)*"
  },
  {
    "id": "af332",
    "code": "acct_holder_name",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The name of the holder of either the credit card or bank account associated with payments of either \"electronic funds transfer\" or \"credit card billing\". *(On Policy, AcctHolderName is used to specify the name of the holder of the account used to pay into the policy. The Banking object on another associated Holding referenced via Policy/@BankHoldingID is)*"
  },
  {
    "id": "af333",
    "code": "credit_card_exp_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The month and year that the associated credit card expires. *(On Policy, CreditCardExpDate is used to specify the expiration date for the credit card used to pay into the policy. The Banking object on another associated Holding referenced via Policy/@BankHolding)*"
  },
  {
    "id": "af334",
    "code": "credit_card_type",
    "usedInTables": 1,
    "tables": "policy",
    "description": "In the case that the PaymentMethod or PaymentForm is credit or debit card related, this is the type of card. *(On Policy, CreditCardType is used to specify the type of credit card used to pay into the policy. The Banking object on another associated Holding referenced via Policy/@BankHoldingID is the preferred)*"
  },
  {
    "id": "af335",
    "code": "bank_acct_type",
    "usedInTables": 1,
    "tables": "policy",
    "description": "This is the type associated with the bank account; for example checking or savings account. *(On Policy, BankAcctType is used to specify the type of bank account used to pay into the policy. The Banking object on another associated Holding referenced via Policy/@BankHoldingID is the preferred )*"
  },
  {
    "id": "af336",
    "code": "payment_draft_day",
    "usedInTables": 1,
    "tables": "policy",
    "description": "This is the day of the month (e.g. 15 to represent the 15th day of the month) that the payment will either be charged to a credit card or withdrawn from a bank account, when PaymentMethod is either 'c *(On Policy, PaymentDraftDay is ambiguously defined and restrictive to a single draft day for all payment sources. The preferred modeling is Arrangement/DayOfMonth.)*"
  },
  {
    "id": "af337",
    "code": "bank_name",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Name of parent bank associated with this account. *(On Policy, BankName is used to specify the name of the bank associated with the account used to pay into the policy. The Banking object on another associated Holding referenced via Policy/@BankHolding)*"
  },
  {
    "id": "af338",
    "code": "bank_branch_name",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The name of the branch of the bank where the account is established. *(On Policy, BankBranchName is used to specify the branch of the bank associated with the account used to pay into the policy. The Banking object on another associated Holding referenced via Policy/@Ban)*"
  },
  {
    "id": "af339",
    "code": "e_f_t_end_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "If the policy is being paid by an EFT transaction, then this property contains the date the EFT transactions are scheduled to stop. If the transaction was being paid by an EFT transaction but is no lo"
  },
  {
    "id": "af340",
    "code": "last_bank_change_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "This property contains the last date that the Banking information for an EFT transaction was changed."
  },
  {
    "id": "af341",
    "code": "payment_due_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Date the premium/payment is due."
  },
  {
    "id": "af342",
    "code": "last_notice_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The date that the last notice was sent."
  },
  {
    "id": "af343",
    "code": "last_notice_type",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The type of the last notice sent"
  },
  {
    "id": "af344",
    "code": "statement_basis",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Basis used for generating statement e.g. calendar date or anniversary date"
  },
  {
    "id": "af345",
    "code": "last_deducted_c_o_i_charges",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The amount of the Cost-of-Insurance charges made on the last policy month-i-versary."
  },
  {
    "id": "af346",
    "code": "last_deducted_expense_charges",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The amount of the policy's monthly expense charge made on the last month-i-versary. This does not include any Premium Expense Charges."
  },
  {
    "id": "af347",
    "code": "last_c_o_i_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Date Last Cost of Insurance and Expenses were charged. Associated with the Last Cost Of Insurance and Expense amounts."
  },
  {
    "id": "af348",
    "code": "last_no_good_check_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The last date the Company received a 'No Good' (NG) check indication back from the Bank."
  },
  {
    "id": "af349",
    "code": "last_no_good_check_reason",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The reason indicated by the bank that a 'No Good' (NG) check was received."
  },
  {
    "id": "af350",
    "code": "govt_allotment_suspense_acct_amt",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The amount in the special account used to hold the differences between the allotments received and the premiums due. If this amount is negative, it becomes a debit to the policy and any dividend paid"
  },
  {
    "id": "af351",
    "code": "lapse_taxable_gain",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The amount of gain that will be reportable as taxable income if the policy is lapsed."
  },
  {
    "id": "af352",
    "code": "non_std_comm_taken",
    "usedInTables": 1,
    "tables": "policy",
    "description": "TRUE indicates a nonstandard commission is taken. FALSE indicates a standard commission is taken. Australia specific - This supports the concept that allows an agent to select the desired commission r"
  },
  {
    "id": "af353",
    "code": "commission_annualized_ind",
    "usedInTables": 1,
    "tables": "policy",
    "description": "TRUE indicates the policy's commission is paid on an annualized basis. FALSE indicates the commission is not annualized and therefore paid as earned."
  },
  {
    "id": "af354",
    "code": "stamp_duty",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Amount of Stamp Duty Paid. This is stored as the actual dollar amount. On all premium/payment fields, it includes the amount of stamp duty paid."
  },
  {
    "id": "af355",
    "code": "owner_legal_name",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The legal name of the party associated as the owner of the contract. *(On Policy, OwnerLegalName is redundant with the name fields on the Party referenced via Relation, Participant, or LifeParticipant identifying the Owner. If additional information regarding the Owner i)*"
  },
  {
    "id": "af356",
    "code": "case_control_number_assuming",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The case number assigned by the assuming company."
  },
  {
    "id": "af357",
    "code": "beneficiary_ind",
    "usedInTables": 1,
    "tables": "policy",
    "description": "TRUE indicates there are beneficiaries on the contract. FALSE indicates there are not any beneficiaries on the contract. *(On Policy, BeneficiaryInd is redundant with identifying beneficiary parties via Relation, Participant, or LifeParticipant. This more robust modeling is the preferred method for specifying that the pol)*"
  },
  {
    "id": "af358",
    "code": "endorsement_ind",
    "usedInTables": 1,
    "tables": "policy",
    "description": "TRUE indicates there are active endorsements on the contract. FALSE indicates there are not any active endorsements on the contract. *(On Policy, EndorsementInd is redundant with the presence of one or more Endorsement objects. This more robust modeling is the preferred method for specifying that the policy has endorsements. The indi)*"
  },
  {
    "id": "af359",
    "code": "other_insured_ind",
    "usedInTables": 1,
    "tables": "policy",
    "description": "TRUE indicates there are other insureds on the contract. FALSE indicates there are not any other insureds on the contract. *(On Policy, OtherInsuredInd is redundant with identifying \"other insured\" parties via Relation, Participant, or LifeParticipant. This more robust modeling is the preferred method for specifying that th)*"
  },
  {
    "id": "af360",
    "code": "rated_ind",
    "usedInTables": 1,
    "tables": "policy",
    "description": "TRUE Indicates the contract (or any of its riders or benefits) are rated. FALSE indicates there are no ratings. *(On Policy, RatedInd is redundant with SubstandardRating and the various singly occurring fields on Participant, LifeParticipant, and CovOption. This more robust modeling is the preferred method for sp)*"
  },
  {
    "id": "af361",
    "code": "free_available_amt",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The amount of money that is available for surrender without any associated charges."
  },
  {
    "id": "af362",
    "code": "withdrawal_free_pct",
    "usedInTables": 1,
    "tables": "policy",
    "description": "This is the percentage of the account value that can be withdrawn without penalty."
  },
  {
    "id": "af363",
    "code": "surrender_charge_free_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The date on which the contract is free of all surrender charges based on the current premiums paid. If the surrender charge is based on individual premiums paid into the contract, this date may change *(On Policy, SurrenderChargeFreeDate can continue to be transmitted even though the date is in the past indicating policy is free of surrender charges. If future premium payments introduce new surrender)*"
  },
  {
    "id": "af364",
    "code": "surr_chg_modal_occs_remaining",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Number of remaining modal occurrences, typically years, for which surrender charges will apply."
  },
  {
    "id": "af365",
    "code": "surr_chg_modal_occs_remaining_mode",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Used to specify the mode for SurrChgModalOccsRemaining."
  },
  {
    "id": "af366",
    "code": "deduction_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The date used to establish the initial payroll deduction date for the contract."
  },
  {
    "id": "af367",
    "code": "contestability_end_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "ContestabilityEndDate is the date that the incontestability period starts. *(On Policy, ContestabilityEndDate is useful with term conversions.)*"
  },
  {
    "id": "af368",
    "code": "first_bill_skip_month",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Used to establish the month where billing will skip when billed. For instance, if your PaymentMode is 9thly or 10thly, this indicates the start month you skip billing. Billing will then resume at the  *(On Policy, FirstBillSkipMonth of March would be represented as --03.)*"
  },
  {
    "id": "af369",
    "code": "money_transfer_type",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Indicates the means of transferring money from one contract to another during replacement"
  },
  {
    "id": "af370",
    "code": "carrier_comm_code",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The carrier defined code for this specific commission option. The code defined is what should be passed back to the Carrier to indicate the selected commission option."
  },
  {
    "id": "af371",
    "code": "carrier_comm_code_desc",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Description of the value provided in the carrier commission code. *(On Policy, CarrierCommCodeDesc is used to provide additional detail about the value provided in CarrierCommCode.)*"
  },
  {
    "id": "af372",
    "code": "special_handling",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Indicates the type of special handling required. *(On Policy, SpecialHandling specifies the special handling associated with the policy.)*"
  },
  {
    "id": "af373",
    "code": "form_no",
    "usedInTables": 1,
    "tables": "policy",
    "description": "This is the home office form number associated when a form is applicable."
  },
  {
    "id": "af374",
    "code": "filed_form_number",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The 'Policy Form Number' for this Coverage, as filed with the State (in the U.S.) or other appropriate regulating jurisdiction"
  },
  {
    "id": "af375",
    "code": "illustrated_maturity_high",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The Life Offices' Association (LOA) of South Africa prescribes two rates, an upper and a lower rate, at which all South African life carriers are obliged to illustrate maturity benefits. IllustratedMa *(On Policy, IllustratedMaturityHigh documents the maximum interest rate allowed at the time the policy was sold.)*"
  },
  {
    "id": "af376",
    "code": "illustrated_maturity_low",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The Life Offices' Association (LOA) of South Africa prescribes two rates, an upper and a lower rate, at which all South African life carriers are obliged to illustrate maturity benefits. IllustratedMa *(On Policy, IllustratedMaturityLow documents the minimum interest rate allowed at the time the policy was sold.)*"
  },
  {
    "id": "af377",
    "code": "premium_index_rate",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Contracted annual growth rate on the total premium for the overall policy, including any premiums associated with coverages/riders/options. The growth rate may be linked to an index, or be a fixed con *(On Policy, PremiumIndexRate documents the premium index rate allowed at the time the policy was sold.)*"
  },
  {
    "id": "af378",
    "code": "prior_policy_status",
    "usedInTables": 1,
    "tables": "policy",
    "description": "This is the Policy Status effective immediately prior to the current Policy Status."
  },
  {
    "id": "af379",
    "code": "advancing_rejected_ind",
    "usedInTables": 1,
    "tables": "policy",
    "description": "True indicates that the carrier or producer has elected to reject advancing on this particular Policy"
  },
  {
    "id": "af380",
    "code": "netting_elected_ind",
    "usedInTables": 1,
    "tables": "policy",
    "description": "TRUE indicates the election of netting on the case. FALSE indicates netting is not elected. The election overrides the indicators on the producer and product. If absent follow the rules on the produce"
  },
  {
    "id": "af381",
    "code": "i_r_s_trigger_type",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Identifies the associated IRS Trigger Type if the contract has an active triggering event. An IRS Trigger will result in disabling the IRS withdrawal restrictions, control the entry of specific transa"
  },
  {
    "id": "af382",
    "code": "i_r_s_trigger_ind",
    "usedInTables": 1,
    "tables": "policy",
    "description": "An indicator to identify if the contract has an event that results in disabling the IRS withdrawal restrictions. This field is similar to the IRSTriggerType, but instead of specifying the specific IRS"
  },
  {
    "id": "af383",
    "code": "renewal_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Renewal Date associated with this particular item. *(On Policy, RenewalDate represents the date on which a renewable policy's renewal comes due. For example: on a 10yr. Renewal term, this date will be 10yrs after the policy effective date.)*"
  },
  {
    "id": "af384",
    "code": "min_premium_initial_amt",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Defines the minimum initial premium allowed. A null value will be interpreted the same as 0. *(On Policy, MinPremiumInitialAmt may or may not be equal to the MinPremAmt. For example, MinPremiumInitialAmt could be three months worth of monthly premiums, which may be more than MinPremAmt.)*"
  },
  {
    "id": "af385",
    "code": "invest_rule",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The Free Look Provision investment rule indicates how funds are to be invested during the Free Look period."
  },
  {
    "id": "af386",
    "code": "invest_rule_user_election_ind",
    "usedInTables": 1,
    "tables": "policy",
    "description": "For those states that have passed regulations where the premium for a variable annuity may be invested only in Safe Harbor funds during the free-look period, this indicator will be set to \"True\" when  *(On Policy, InvestRuleUserElectionInd is an indicator that reflects client instructions to immediately invest premium into initial allocation during the free-look or cancellation period. The desired pr)*"
  },
  {
    "id": "af387",
    "code": "face_increase_effective_dt",
    "usedInTables": 1,
    "tables": "policy",
    "description": "This is the effective date of the face amount last increase."
  },
  {
    "id": "af388",
    "code": "face_increase_net_amt",
    "usedInTables": 1,
    "tables": "policy",
    "description": "This is the total amount of the last net increase to the face amount, across all Coverages, Riders, and Participants."
  },
  {
    "id": "af389",
    "code": "parent_carrier_code",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The carrier code for the parent of the issuing company."
  },
  {
    "id": "af390",
    "code": "weighted_avg_int_rate",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Weighted Average Interest Rate is a point in time average of all the different buckets of money - weighted according to the balance in each bucket. Interest being paid on the policy is based on the am"
  },
  {
    "id": "af391",
    "code": "prior_carrier_code",
    "usedInTables": 1,
    "tables": "policy",
    "description": "In the case of a conversion, replacement, exchange or reissue, this is the original carrier that issued the policy. *(On Policy, PriorCarrierCode, PriorEffDate, and PriorPolNumber are a set of denormalized properties added for reinsurance transactions. The properties are provided by the direct carrier to the reinsure)*"
  },
  {
    "id": "af392",
    "code": "prior_eff_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "In the case of a conversion, replacement, exchange or reissue, this is the original effective date of the plan. *(On Policy, PriorCarrierCode, PriorEffDate, and PriorPolNumber are a set of denormalized properties added for reinsurance transactions. The properties are provided by the direct carrier to the reinsure)*"
  },
  {
    "id": "af393",
    "code": "prior_pol_number",
    "usedInTables": 1,
    "tables": "policy",
    "description": "In the case of a conversion, replacement, exchange or reissue, this is the original policy number of the policy. *(On Policy, PriorCarrierCode, PriorEffDate, and PriorPolNumber are a set of denormalized properties added for reinsurance transactions. The properties are provided by the direct carrier to the reinsure)*"
  },
  {
    "id": "af394",
    "code": "charge_total_amt",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The sum of the policy's Cost of Insurance charges and the monthly expense charges made on the policy's last month-i-versary as determined by plan."
  },
  {
    "id": "af395",
    "code": "fin_reporting_carrier_code",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Carrier Code for the Financial Company. This is the statutory reporting company code. It is used for the Insurance Company's Annual Statement (Blue Book) for accounting reporting purposes. While it is"
  },
  {
    "id": "af396",
    "code": "final_payment_amt",
    "usedInTables": 1,
    "tables": "policy",
    "description": "For policies, since the policy may end without a full payment due, this amount is the calculated final payment amount."
  },
  {
    "id": "af397",
    "code": "tot_comm_retained",
    "usedInTables": 1,
    "tables": "policy",
    "description": "This is the total amount of commissions retained by the producer in the scenario where commissions are netted and is a summation of all instances of FinancialActivity/RetainedCommissionAmt for this tr"
  },
  {
    "id": "af398",
    "code": "juvenile_policy_ind",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Policy which is issued on the life of a child. The policy may be owned by the child or, in most cases, by an adult. If the policy is owned by a child no rights could be exercised while he/she is a min"
  },
  {
    "id": "af399",
    "code": "prior_bill_number",
    "usedInTables": 1,
    "tables": "policy",
    "description": "In the case of group or list billing, this is the carrier bill number to which this policy was previously assigned. Current bill number is represented in Policy.BillNumber."
  },
  {
    "id": "af400",
    "code": "prior_issue_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Processing is different for issued policies which have a prior issue date."
  },
  {
    "id": "af401",
    "code": "tax_jurisdiction",
    "usedInTables": 1,
    "tables": "policy",
    "description": "State in which taxes are due. *(On Policy, TaxJurisdiction represents the current jurisdiction of this policy for tax purposes. It can be used for determining the jurisdiction that applies when calculating tax information for a poli)*"
  },
  {
    "id": "af402",
    "code": "tax_nation",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The nation or country for tax purposes. *(On Policy, TaxNation represents the current nation of this policy for tax purposes. It can be used for determining the nation that applies when calculating tax information for a policy when a nation i)*"
  },
  {
    "id": "af403",
    "code": "exchange_reason_code",
    "usedInTables": 1,
    "tables": "policy",
    "description": "When a policy (life or annuity) is exchanged or replaced for a different policy, the carrier needs to track the reason for the exchange or replacement. This code identifies the reason the policy was e *(On Policy, ExchangeReasonCode is used when only a single exchange reason is needed. If multiple reasons for the exchange must be expressed, use ExchangeReason aggregate instead.)*"
  },
  {
    "id": "af404",
    "code": "distribution_agreement_code",
    "usedInTables": 1,
    "tables": "policy",
    "description": "A character string created by the Carrier that uniquely identifies a DistributionAgreement object. The CarrierCode and DistributionAgreementCode together uniquely identify the DistributionAgreement in *(On Policy, DistributionAgreementCode represents the Distribution Agreement used by the CarrierCommCode.)*"
  },
  {
    "id": "af405",
    "code": "annual_index_type",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The type of Premium Increase chosen. *(On Policy, AnnualIndexType indicates the type of premium increase chosen by the client when only one annual index type is required. To indicate a combination of annual index types, use Policy/AnnualIn)*"
  },
  {
    "id": "af406",
    "code": "commission_extension",
    "usedInTables": 1,
    "tables": "policy",
    "description": "This string is used by carriers to tell distributors which variant of a commission rate table to reference for computing commissions. For instance, the rate for commission option A may change dependin"
  },
  {
    "id": "af407",
    "code": "billing_resume_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The date that the billing notices should resume. *(On Policy, BillingResumeDate is used to specify the date on which billing should resume. Note that BillingStopDate was added to Policy prior to the addition of BillingResumeDate. Thus, for compatibili)*"
  },
  {
    "id": "af408",
    "code": "replaced_policy_physical_status",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The physical status or state of a contract when it is a replacement. This indicates where the actual policy contract is (e.g. agent's or carrier's possession), or whether it is lost/stolen."
  },
  {
    "id": "af409",
    "code": "product_trans_ref_g_u_i_d",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Unique identifier of the product used to validate the transaction. This property stores the value pulled from the TransRefGUID on the 201 response or the 1201 transmission to uniquely tie the transact"
  },
  {
    "id": "af410",
    "code": "sponsoring_plan_code",
    "usedInTables": 1,
    "tables": "policy",
    "description": "This is the means of identifying the sponsoring plan for an employee benefit arrangement. *(On Policy, SponsoringPlanCode relates to sponsored employee benefit plans where the individual policies are identified using a policy number and their sponsoring Holding is identified using a Sponsori)*"
  },
  {
    "id": "af411",
    "code": "sponsoring_plan_name",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The name of the sponsoring plan for an employee benefit arrangement. *(On Policy, SponsoringPlanName relates to sponsored employee benefit plans where the individual policies are identified using a policy number and their sponsoring Holding is identified using a Sponsori)*"
  },
  {
    "id": "af412",
    "code": "sponsoring_plan_type",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Type of sponsoring plan *(On Policy, SponsoringPlanType describes the type of Sponsored Benefit plan to which this Holding belongs.)*"
  },
  {
    "id": "af413",
    "code": "sponsoring_plan_separation_date",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Represents the date on which this Holding terminated its association to a sponsoring plan. This will be valued in two scenarios: 1. When the sponsoring plan is terminated. 2. When this individual poli *(On Policy, SponsoringPlanSeparationDate is different from Relation\\EndDate because the relationship itself does not end when the individual policy drops out of the Plan. For tax reporting purposes, it)*"
  },
  {
    "id": "af414",
    "code": "territory",
    "usedInTables": 1,
    "tables": "policy",
    "description": "A carrier assigned territory used for routing or marketing purposes. *(On Policy, Territory represents the current carrier assigned territory in which the policy is maintained.)*"
  },
  {
    "id": "af415",
    "code": "participating_ind",
    "usedInTables": 1,
    "tables": "policy",
    "description": "TRUE indicates the product is designed to pay a dividend to the policy owner. FALSE indicates the product is not designed to pay a dividend to the policy owner. *(On Policy, ParticipatingInd represents whether the base policy is participating in dividends. The value specified on Policy/ParticipatingInd SHOULD match the value specified on the base Coverage. If t)*"
  },
  {
    "id": "af416",
    "code": "issued_as_applied_ind",
    "usedInTables": 1,
    "tables": "policy",
    "description": "TRUE means the coverage for this component or contract was issued as applied for. In this context a component is considered to be issued as applied for if no material change is made to the component d *(On Policy, IssuedAsAppliedInd is set to TRUE when no material changes were made to the policy as a whole prior to issue. When set to FALSE, IssuedAsAppliedInd on Coverage, CovOption, Participant and L)*"
  },
  {
    "id": "af417",
    "code": "total1st_year_addl_payment_amt",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The total amount of payments expected to be paid during policy year one, in addition to the billed premium amount. For example, if the annual billed premium (i.e. Policy.PaymentAmt for an annual mode)"
  },
  {
    "id": "af418",
    "code": "prem_refund_amt",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The amount of premium that would be refunded, such as in the event of a death or surrender, processed on the AsOfDate. For example, the amount of premium that would be refunded if a contract were surr"
  },
  {
    "id": "af419",
    "code": "cover_index_rate",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The percentage of annual benefit increase chosen. This is where the Cover increase is applicable to all benefits in the policy. Where there are different rates applicable to Coverages that can be deal *(On Policy, CoverIndexRate is used to specify the index rate for the policy. The type of increase for CoverIndexRate is specified in AnnualCoverlIndexType.)*"
  },
  {
    "id": "af420",
    "code": "annual_cover_index_type",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Specifies the type of coverage increase. *(On Policy, AnnualCoverIndexType specifies the type of increase for CoverIndexRate.)*"
  },
  {
    "id": "af421",
    "code": "life",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Object used to define the characteristics of a life insurance policy. If the policy is a life insurance policy, this object pertains."
  },
  {
    "id": "af422",
    "code": "annuity",
    "usedInTables": 1,
    "tables": "policy",
    "description": "This object contains the base information about the annuity. *(On Policy, Annuity is required if the Holding object is an annuity.)*"
  },
  {
    "id": "af423",
    "code": "disability_health",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Disability / Health / LTC Policy Object If a policy is either a disability, health or long term care product, this object pertains. It contains all the base information about the product."
  },
  {
    "id": "af424",
    "code": "propertyand_casualty",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Property and Casualty"
  },
  {
    "id": "af425",
    "code": "application_info",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Information related to the application for new insurance (all lines of business: annuities, life, long term care, etc...) as well the application data gathering and submission process. This is used to"
  },
  {
    "id": "af426",
    "code": "requirement_info",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Provides requested, outstanding and completed requirements associated with the issuance of a Policy, a Producers Appointments/Licenses/Registrations or Claims processing."
  },
  {
    "id": "af427",
    "code": "endorsement",
    "usedInTables": 1,
    "tables": "policy",
    "description": "This object describes any restriction of coverage due to suicide, hazardous activities, aviation, etc. *(On Policy, Endorsement is used to document restrictions relating to the coverage provided by the policy such as suicide provisions, aviation exclusions, etc. In order to restrict activities within a H)*"
  },
  {
    "id": "af428",
    "code": "financial_activity",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Reference to the financial activity collection for this policy. A FinancialActivity is one business event. One \"financial activity\" may adjust an account value and/or (if variable funds are involved)"
  },
  {
    "id": "af429",
    "code": "claim",
    "usedInTables": 1,
    "tables": "policy",
    "description": "This aggregate contains details regarding claim or contract benefits which have been applied for or provided under this contract (Holding)."
  },
  {
    "id": "af430",
    "code": "alt_prem_mode",
    "usedInTables": 1,
    "tables": "policy",
    "description": "This aggregate provides details about alternative payment mode, method and amounts. Note that this does not necessarily imply that these may be used in lieu of the currently selected premium mode. For *(On Policy, AltPremMode represents the aggregate payment amount for each mode and method. One possible use is for Illustrations and/or to obtain a quote.)*"
  },
  {
    "id": "af431",
    "code": "group_policy",
    "usedInTables": 1,
    "tables": "policy",
    "description": "If the policy being modeled is a group plan, then certain group insurance specific details will be stored here for convenience. *(On Policy, GroupPolicy is used on the group master Holding (when HoldingTypeCode = OLI_HOLDTYPE_GROUPMASTER) to define the parameters specific to this group of insureds.)*"
  },
  {
    "id": "af432",
    "code": "exchange_reason",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Collection of Exchange Reason Codes *(On Policy, ExchangeReason is used when multiple reasons for the exchange must be expressed. If only a single exchange reason is needed, use the ExchangeReasonCode property on Policy instead.)*"
  },
  {
    "id": "af433",
    "code": "annual_index_option",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Defines a combination of premium increases *(On Policy, AnnualIndexOption indicates a combination of client selected annual premium index types. For compatibility purposes if a single type of premium increase is chosen, sender MUST use AnnualInd)*"
  },
  {
    "id": "af434",
    "code": "policy_loan_summary",
    "usedInTables": 1,
    "tables": "policy",
    "description": "This object is used to summarize loan information for a given period based on common data elements such as loan type and loan status. *(On Policy, PolicyLoanSummary provides summary level information for all loans defined by the PolicyLoanSummary as of the Holding.AsOfDate.)*"
  },
  {
    "id": "af435",
    "code": "policy_x_lat",
    "usedInTables": 1,
    "tables": "policy",
    "description": "The string fields for the data model are represented in the language specified by OLifE/CurrentLanguage. This object contains the string fields that were deemed pertinent to be presented in one or mor *(On Policy, PolicyXLat is used to represent string elements in a language other than the default language specified by OLifE/CurrentLanguage.)*"
  },
  {
    "id": "af436",
    "code": "keyed_value",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Generic object used to extend object hierarchy for proprietary data requirements. Each proprietary data item is represented using a KeyedValue object. A collection of KeyedValue objects is utilized to"
  },
  {
    "id": "af437",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af438",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Record creation timestamp."
  },
  {
    "id": "af439",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Record last update timestamp."
  },
  {
    "id": "af440",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "policy",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af441",
    "code": "life_id",
    "usedInTables": 1,
    "tables": "life",
    "description": "Primary key for Life Insurance."
  },
  {
    "id": "af442",
    "code": "policy_id",
    "usedInTables": 1,
    "tables": "life",
    "description": "FK → policy.policy_id"
  },
  {
    "id": "af443",
    "code": "party_id",
    "usedInTables": 1,
    "tables": "life",
    "description": "FK → party.party_id"
  },
  {
    "id": "af444",
    "code": "life_key",
    "usedInTables": 1,
    "tables": "life",
    "description": "Life Key"
  },
  {
    "id": "af445",
    "code": "life_sys_key",
    "usedInTables": 1,
    "tables": "life",
    "description": "Life System Key"
  },
  {
    "id": "af446",
    "code": "non_fort_prov",
    "usedInTables": 1,
    "tables": "life",
    "description": "The various ways in which a policyowner may apply the cash value of a life insurance policy if the policy lapses. 1) To forfeit the policy for its cash surrender value. 2) To take reduced paid up insu"
  },
  {
    "id": "af447",
    "code": "qual_plan_type",
    "usedInTables": 1,
    "tables": "life",
    "description": "Plan type for this policy. Insurance products can be sold as tax qualified products. Use in conjunction with QualPlanSubType to fully define plan types. In the U.S., a plan is 'qualified' by conformin"
  },
  {
    "id": "af448",
    "code": "qual_plan_sub_type",
    "usedInTables": 1,
    "tables": "life",
    "description": "Qualified Plan Sub Type further refines the QualPlanType of this policy or account. Indicates the specific sub provision of the IRC code to which this Policy applies, such as a \"Stretch IRA\" or \"Solo"
  },
  {
    "id": "af449",
    "code": "qual_plan_origination_date",
    "usedInTables": 1,
    "tables": "life",
    "description": "This date represents when the qualified plan originated. For example, a 401k plan was created by the Smith Flower Shop in 1992 when the employer created a 401k plan option for their employees. The usa"
  },
  {
    "id": "af450",
    "code": "excess_prem_amt_a_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "Excess premium annual to date based on policy anniversary. The accumulated excess premium for this coverage During the current policy year."
  },
  {
    "id": "af451",
    "code": "gross_prem_amt_a_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "Total premium amount paid since the last anniversary date to keep the policy in force."
  },
  {
    "id": "af452",
    "code": "prem_duration_date",
    "usedInTables": 1,
    "tables": "life",
    "description": "The scheduled premium payment duration. This is the date scheduled premiums will be discontinued."
  },
  {
    "id": "af453",
    "code": "prem_offset_method",
    "usedInTables": 1,
    "tables": "life",
    "description": "Vanishing premium concept."
  },
  {
    "id": "af454",
    "code": "target_prem_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "The target premium is a carrier-defined specific value normally used in the calculation of commissions."
  },
  {
    "id": "af455",
    "code": "target2_prem_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "This is a second level of a target premium threshold from which commissions are paid. An example is a product which pays a specified commission rate up to target, then a second commission rate up to t"
  },
  {
    "id": "af456",
    "code": "excess_premium1st_year_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "Planned premium that was or will be received during a policy's first-year that exceeds the applicable target premium. This is adjusted to an annual amount (i.e., modal amount times the number of modes"
  },
  {
    "id": "af457",
    "code": "tot_cum_prem_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "Total invested in the contract to date. The total sum of the Gross premium payments made since the policy's inception to date. To conform with convention, this property should have been named GrossPre *(On Life, TotCumPremAmt represents the total gross premiums paid from the policy's inception to date. The preferred property to use is Life/GrossPremAmtITD.)*"
  },
  {
    "id": "af458",
    "code": "cum_min_prem_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "Cumulative amount of minimum premiums paid since policy inception (used to control no-lapse provisions). The sum of the minimum premium payments made to keep the policy inforce since the policy's ince"
  },
  {
    "id": "af459",
    "code": "cum_prem_amt_first_yr",
    "usedInTables": 1,
    "tables": "life",
    "description": "Total premium paid during the first policy year. Not necessarily limited to a twelve month period if administration system allows first year premium in later months. *(On Life, CumPremAmtFirstYr represents the total premium paid into the policy during the first policy year.)*"
  },
  {
    "id": "af460",
    "code": "last_prem_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "Dollar amount of the last premium payment."
  },
  {
    "id": "af461",
    "code": "last_prem_date",
    "usedInTables": 1,
    "tables": "life",
    "description": "Date on which last premium payment was applied."
  },
  {
    "id": "af462",
    "code": "suspense_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "Money that has been received and the company does not know how the owner intended for the money to be applied. SuspenseAmt is used when a company receives a payment that does not match a scheduled pay *(On Life, SuspenseAmt is used to track any suspense monies regardless of its origination. If you wish to specify the suspense money was submitted as part of a premium payment, use PremiumSuspenseAmt.)*"
  },
  {
    "id": "af463",
    "code": "last_prem_expense_charge",
    "usedInTables": 1,
    "tables": "life",
    "description": "Last Premium Expense Charge is the load for the premium. This charge can also include state and federal tax amounts on the premium. Tied to last premium date and charge."
  },
  {
    "id": "af464",
    "code": "min_prem_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "This is current no lapse guarantee premium for a policy, coverage, or coverage option. This premium is normally adjusted when changes in coverages occur such as an increase or decrease in coverage. If *(On Life, MinPremAmt represents the current No Lapse Guarantee Premium.)*"
  },
  {
    "id": "af465",
    "code": "init_deposit_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "Represents the initial lump sum made to this contract such as a rollover amount that is not treated preferentially. e.g. New Money."
  },
  {
    "id": "af466",
    "code": "init_deposit_date",
    "usedInTables": 1,
    "tables": "life",
    "description": "The date the lump sum was made to the contract."
  },
  {
    "id": "af467",
    "code": "g_d_b_date",
    "usedInTables": 1,
    "tables": "life",
    "description": "The date the guarantee period covered by the GDBPrem expires (aka No Lapse Guarantee). This is the first date the guarantee period does not provide coverage. This date is exclusive, meaning the death"
  },
  {
    "id": "af468",
    "code": "g_d_b_value",
    "usedInTables": 1,
    "tables": "life",
    "description": "The guaranteed minimum level of benefit payable for the policy (in total), or for a particular coverage or coverage option. This applies until the guaranteed date is reached For example, if the effect"
  },
  {
    "id": "af469",
    "code": "sum_g_d_b_life_prems",
    "usedInTables": 1,
    "tables": "life",
    "description": "Normally, in order to qualify for the guaranteed death benefit (GDB), the policy owner must have cumulatively paid premiums equal to a minimum amount. This amount would be the sum of month by month GD"
  },
  {
    "id": "af470",
    "code": "sum_g_d_b_lim_prems",
    "usedInTables": 1,
    "tables": "life",
    "description": "Same concept as SumGDBLifePrems, except some policies have two tiers of guarantees: one which guarantees the death benefit until the maturity age of the policy, and a more limited guarantee which last"
  },
  {
    "id": "af471",
    "code": "total_rollover_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "This is the total amount rolled over into this policy during the new process. In the U.S. it would include any 1035 exchange money as set forth in the U.S. IRS Tax Code 1035. The property LifeUSA/Amou"
  },
  {
    "id": "af472",
    "code": "premium_suspense_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "Used when additional money is submitted as part of a premium payment. The premium is applied and the balance is put into a suspense account. *(On Life, PremiumSuspenseAmt is used to record suspense money submitted as part of a premium payment. If wanting to track all suspense monies regardless of where they are coming from (e.g. may not be t)*"
  },
  {
    "id": "af473",
    "code": "premium_suspense_reason",
    "usedInTables": 1,
    "tables": "life",
    "description": "Premium Suspense Reason *(On Life, PremiumSuspenseReason documents the reason (if known) behind the premium suspense amount recorded in PremiumSuspenseAmt.)*"
  },
  {
    "id": "af474",
    "code": "gross_prem_amt_prior_ann_yr",
    "usedInTables": 1,
    "tables": "life",
    "description": "The total amount of premiums remitted in the previous policy anniversary year."
  },
  {
    "id": "af475",
    "code": "gross_prem_amt_i_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "Total gross premium received from policy issue."
  },
  {
    "id": "af476",
    "code": "gross_prem_amt_m_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "The total gross premium received month to date."
  },
  {
    "id": "af477",
    "code": "gross_prem_amt_y_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "The total gross premium received from last policy anniversary."
  },
  {
    "id": "af478",
    "code": "unsched_prem_amt_i_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "The amount of unscheduled premium paid (dump in amounts) into policy since inception."
  },
  {
    "id": "af479",
    "code": "last_unsched_prem_date",
    "usedInTables": 1,
    "tables": "life",
    "description": "The date the most recent unscheduled premium was paid into the policy."
  },
  {
    "id": "af480",
    "code": "unsched_prem_amt_a_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "Amount of unscheduled premium paid (dump in amounts) into policy anniversary to date."
  },
  {
    "id": "af481",
    "code": "non_comm_prem_annualized",
    "usedInTables": 1,
    "tables": "life",
    "description": "Based on planned premium (AnnualPaymentAmt), this is what is non-commissionable."
  },
  {
    "id": "af482",
    "code": "fully_comm_prem_annualized",
    "usedInTables": 1,
    "tables": "life",
    "description": "Based on planned premium (AnnualPaymentAmt), this is what is fully-commissionable."
  },
  {
    "id": "af483",
    "code": "initial_prem_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "This amount is the calculated initial premium required to put the policy or rider inforce. This is not meant to reflect any payments applied towards \"satisfying\" the initial premium. Actual premium th"
  },
  {
    "id": "af484",
    "code": "e_e_contrib_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "Amount of Salary contribution elected by the participant. When a participant applies for a salary reduction plan (e.g. 401(k)), they specify the amount of their salary that will be contributed from ea"
  },
  {
    "id": "af485",
    "code": "e_r_contrib_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "Amount of contribution by the employer."
  },
  {
    "id": "af486",
    "code": "e_e_contrib_pct",
    "usedInTables": 1,
    "tables": "life",
    "description": "Percentage of Salary contribution elected by the participant. When a participant applies for a salary reduction plan (e.g. 401(k)), they specify the percentage of their salary that will be contributed *(On Life, EEContribPct specifies the percentage of premium for which the employee pays for this particular policy.)*"
  },
  {
    "id": "af487",
    "code": "e_r_contrib_pct",
    "usedInTables": 1,
    "tables": "life",
    "description": "Percentage of contribution by the employer. *(On Life, ERContribPct specifies the percentage of premium for which the employer pays for this particular policy.)*"
  },
  {
    "id": "af488",
    "code": "last_loan_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "Amount of last policy loan taken on most recent loan date."
  },
  {
    "id": "af489",
    "code": "last_loan_date",
    "usedInTables": 1,
    "tables": "life",
    "description": "The date the last loan was taken out by the client, including anniversary date when interest is added to the outstanding loan if not paid by the owner."
  },
  {
    "id": "af490",
    "code": "loan_amt_a_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "The total of loan amounts taken since last anniversary."
  },
  {
    "id": "af491",
    "code": "loan_int_amt_a_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "Loan interest paid or accumulated since the last policy anniversary."
  },
  {
    "id": "af492",
    "code": "loan_int_paid_to_date",
    "usedInTables": 1,
    "tables": "life",
    "description": "The last date for which the loan interest has been paid into the policy. If not on the loan trailer, this is the earliest (soonest to occur) date of any loan aggregate."
  },
  {
    "id": "af493",
    "code": "regular_loan_balance",
    "usedInTables": 1,
    "tables": "life",
    "description": "The amount of regular loan remaining on the policy."
  },
  {
    "id": "af494",
    "code": "face_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "Base coverage amount of life insurance purchased at time of issue. *(On Life, FaceAmt represents the base policy face amount.)*"
  },
  {
    "id": "af495",
    "code": "face_units",
    "usedInTables": 1,
    "tables": "life",
    "description": "The number of units of the basic coverage for the policy."
  },
  {
    "id": "af496",
    "code": "value_per_unit",
    "usedInTables": 1,
    "tables": "life",
    "description": "The value per unit of the face units on the basic coverage on the policy. For coverages that are defined as units the value per unit is required in order for the total value to be calculated."
  },
  {
    "id": "af497",
    "code": "net_surr_value_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "Cash Surrender value (NET) available to the client if they were to surrender their contract. It is net of any surrender charges, loans, cash value adjustments or term dividends."
  },
  {
    "id": "af498",
    "code": "cash_value_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "The account value before surrender charges."
  },
  {
    "id": "af499",
    "code": "death_benefit_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "The total benefit that would be paid upon the death of the primary, or joint, insured. It is net of any prior surrender charges, loans, cash value adjustments or term dividends. Prior to version 2.22, *(On Life, DeathBenefitAmt represents the total benefit that would be paid on all coverages upon the death of the primary insured in the case of single-life policies. In the case of joint policies, this)*"
  },
  {
    "id": "af500",
    "code": "gross_death_benefit_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "Policy gross death benefit on all coverages before the removal of any indebtness and any other applicable charges, fees, or costs due."
  },
  {
    "id": "af501",
    "code": "surrender_charge_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "SurrenderChargeAmt is the difference between the current accumulation value and the current surrender value, assuming that there are no loans on the policy. In other words, it is the surrender charge"
  },
  {
    "id": "af502",
    "code": "net_death_benefit_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "Policy gross death benefit on all coverages minus any indebtedness and other applicable charges, fees, or costs due. The total value to be paid to the beneficiary at the time of death."
  },
  {
    "id": "af503",
    "code": "curr_int_rate",
    "usedInTables": 1,
    "tables": "life",
    "description": "Applies to Universal Life only. Represented as x100. E.g. 8.5% is represented as 8.5. It is not applicable to Variable Universal Life (VUL), which has different interest rates associated with each sub"
  },
  {
    "id": "af504",
    "code": "curr_int_rate_date",
    "usedInTables": 1,
    "tables": "life",
    "description": "The date the current interest rate changed. This date is associated to the CurrIntRate property."
  },
  {
    "id": "af505",
    "code": "withdrawal_rule",
    "usedInTables": 1,
    "tables": "life",
    "description": "The rule that should be followed when a client requests a partial withdrawal."
  },
  {
    "id": "af506",
    "code": "gross_wthdrwl_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "Gross amount of withdrawal or partial surrender made on the last withdrawal date. It also includes surrender charges."
  },
  {
    "id": "af507",
    "code": "last_wthdrwl_date",
    "usedInTables": 1,
    "tables": "life",
    "description": "The date the last withdrawal or partial surrender was made."
  },
  {
    "id": "af508",
    "code": "tot_wthdrwl_amt_i_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "Cumulative policy withdrawals taken as of the Policy Issue Date. Gross Amount including surrender charges."
  },
  {
    "id": "af509",
    "code": "tot_wthdrwl_amt_a_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "The Amount of withdrawals from the contract since the last policy anniversary. Gross Amount including surrender charges."
  },
  {
    "id": "af510",
    "code": "cum_wthdrwl_amt_m_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "The cumulative policy withdrawals taken during the current month. This is a gross amount that includes surrender charges."
  },
  {
    "id": "af511",
    "code": "cum_wthdrwl_amt_y_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "The cumulative policy withdrawals taken during the current calendar year. This is a gross amount that includes surrender charges."
  },
  {
    "id": "af512",
    "code": "net_wthdrwl_amt_a_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "The net cumulative total policy withdrawals taken since the last policy anniversary. This is a net amount that does not include surrender charges, loans, loan interest, or any other misc. cash value a"
  },
  {
    "id": "af513",
    "code": "net_wthdrwl_amt_i_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "The net cumulative total policy withdrawals taken since issue. This is a net amount that does not include surrender charges, loans, loan interest, or any other misc. cash value adjustments."
  },
  {
    "id": "af514",
    "code": "net_wthdrwl_amt_m_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "The net cumulative policy withdrawals taken during the current month. This is a net amount that does not include surrender charges, loans, loan interest, or any other misc. cash value adjustments."
  },
  {
    "id": "af515",
    "code": "net_wthdrwl_amt_y_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "The net cumulative total policy withdrawals taken during the current calendar year. This is a net amount that does not include surrender charges, loans, loan interest, or any other misc. cash value ad"
  },
  {
    "id": "af516",
    "code": "num_wthdrw_a_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "The number of withdrawals or partial surrenders the parent object (usually a policy or type of holding) has had since its last anniversary."
  },
  {
    "id": "af517",
    "code": "num_wthdrw_i_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "Number of withdrawals or partial surrenders since Issue of the policy."
  },
  {
    "id": "af518",
    "code": "num_wthdrw_m_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "The cumulative number of policy withdrawals or partial surrenders taken during the current month."
  },
  {
    "id": "af519",
    "code": "num_wthdrw_y_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "The cumulative number of policy withdrawals or partial surrenders taken during the current calendar."
  },
  {
    "id": "af520",
    "code": "withdrw_max_pct",
    "usedInTables": 1,
    "tables": "life",
    "description": "The maximum percentage of cash value that can be withdrawn from the policy. The calculated amount is usually compared with other amounts to determine the actual withdrawal allowed."
  },
  {
    "id": "af521",
    "code": "cash_value_increase_amt_a_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "The amount the Policy has increased from the most recent policy anniversary date. It does not include any dividend that may be payable on the next anniversary. For example, if the Last Anniversary Dat"
  },
  {
    "id": "af522",
    "code": "cash_value_increase_amt_prior_yr",
    "usedInTables": 1,
    "tables": "life",
    "description": "The amount by which the Policy Cash Value increased in the prior anniversary year (negative number is a decrease). For example, if the Last Anniversary Date is 1995, then the figure displayed in this"
  },
  {
    "id": "af523",
    "code": "div_type",
    "usedInTables": 1,
    "tables": "life",
    "description": "Indicates the method in which the plan/coverage participates in dividends."
  },
  {
    "id": "af524",
    "code": "div_o_y_t_date",
    "usedInTables": 1,
    "tables": "life",
    "description": "Dividend One Year Termination date"
  },
  {
    "id": "af525",
    "code": "div_o_y_t_opt_type",
    "usedInTables": 1,
    "tables": "life",
    "description": "Used to specify dividend options for the One Year Term portion of the dividend. Use \"None\" (@tc=1) if there is no One Year Term is to be purchased with the dividend. This property is used in combinati"
  },
  {
    "id": "af526",
    "code": "div_paid_in_cash",
    "usedInTables": 1,
    "tables": "life",
    "description": "The end of year annual dividend amount to be paid in cash."
  },
  {
    "id": "af527",
    "code": "last_div_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "The amount of the most recent dividend."
  },
  {
    "id": "af528",
    "code": "last_div_date",
    "usedInTables": 1,
    "tables": "life",
    "description": "The date the last dividend payment was made."
  },
  {
    "id": "af529",
    "code": "term_div_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "Termination dividend available upon surrender (calculation defined by each product)."
  },
  {
    "id": "af530",
    "code": "div_series_ind_string",
    "usedInTables": 1,
    "tables": "life",
    "description": "Certain policies have more than one dividend series, and the policy effective date may not always be a reliable determinant for which series to use (e.g. back dating) *(On Life, DivSeriesIndString is the valid dividend series indicator field. Life.DivSeriesInd is mis-typed and should not be used.)*"
  },
  {
    "id": "af531",
    "code": "next_div_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "The amount of next dividend - if dividend is going to be adjusted due to repaired amounts, it will be reflected in that amount."
  },
  {
    "id": "af532",
    "code": "next_div_date",
    "usedInTables": 1,
    "tables": "life",
    "description": "The date next dividend is to be paid."
  },
  {
    "id": "af533",
    "code": "index_cover",
    "usedInTables": 1,
    "tables": "life",
    "description": "Was the Consumer Price Index (CPI) Option for sum Insured (face amount) accepted? Indicates if cover will be indexed annually at the rate specified. CPI offers increased amount on policy on anniversar"
  },
  {
    "id": "af534",
    "code": "index_rate",
    "usedInTables": 1,
    "tables": "life",
    "description": "Specifies the Cost of Living Index rate."
  },
  {
    "id": "af535",
    "code": "rollover_date",
    "usedInTables": 1,
    "tables": "life",
    "description": "The date of the last rollover received. Life/TotalRolloverAmt is used to capture this amount if known."
  },
  {
    "id": "af536",
    "code": "transfer_to_paid_date",
    "usedInTables": 1,
    "tables": "life",
    "description": "The calendar date the carrier accepted payment and placed the contract in force."
  },
  {
    "id": "af537",
    "code": "taxable_interest_earned_a_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "The anniversary to date amount of interest earned on total account value. In the US, these figures are reported at the end of the calendar year to the policyowner and the IRS on form 1099 INT."
  },
  {
    "id": "af538",
    "code": "tax_withheld_on_interest_earned_a_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "The anniversary to date amount of tax withheld on the interest earned on total account value during the current policy year. In the US, these figures are reported at the end of the calendar year to th"
  },
  {
    "id": "af539",
    "code": "conversion_credit_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "Face amount that is eligible for conversion to another policy without evidence of insurability or additional underwriting."
  },
  {
    "id": "af540",
    "code": "total_misc_cash_value_adjustments",
    "usedInTables": 1,
    "tables": "life",
    "description": "The total amount of any additional credits or charges that would apply if the policy were surrendered at this As Of date. Examples of adjustments, excess dividend or loan payments and miscellaneous pr"
  },
  {
    "id": "af541",
    "code": "total_risk_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "The amount of insurance underwritten for the primary insured. This includes the basic face amount plus the amounts of any riders and benefits being applied for."
  },
  {
    "id": "af542",
    "code": "premium_deposit_fund_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "This fund can accumulate additional funds on a policy at a specified interest rate. Funds are applied to pay premiums on a traditional policy."
  },
  {
    "id": "af543",
    "code": "projected_curr_lapse_date",
    "usedInTables": 1,
    "tables": "life",
    "description": "The projected date that the policy will lapse based on current interest rate assumptions."
  },
  {
    "id": "af544",
    "code": "projected_curr_lapse_age",
    "usedInTables": 1,
    "tables": "life",
    "description": "The projected age to which the policy will remain in effect if planned premiums are paid at current interest and current cost of insurance."
  },
  {
    "id": "af545",
    "code": "projected_curr_int_rate",
    "usedInTables": 1,
    "tables": "life",
    "description": "The current rate used in the projected calculation."
  },
  {
    "id": "af546",
    "code": "projected_guar_lapse_date",
    "usedInTables": 1,
    "tables": "life",
    "description": "The projected date that the policy will lapse based on illustrated guaranteed assumptions."
  },
  {
    "id": "af547",
    "code": "projected_guar_lapse_age",
    "usedInTables": 1,
    "tables": "life",
    "description": "The projected age to which the policy will remain in effect if planned premiums are paid at guaranteed interest and guaranteed cost of insurance."
  },
  {
    "id": "af548",
    "code": "projected_guar_int_rate",
    "usedInTables": 1,
    "tables": "life",
    "description": "The guaranteed interest rate used for projection purposes."
  },
  {
    "id": "af549",
    "code": "projected_lapse_calc_date",
    "usedInTables": 1,
    "tables": "life",
    "description": "The date which the projected lapse dates were calculated on."
  },
  {
    "id": "af550",
    "code": "div_cash_val",
    "usedInTables": 1,
    "tables": "life",
    "description": "This is the amount of dividend earned in conjunction with the anniversary being reported."
  },
  {
    "id": "af551",
    "code": "div_on_deposit_int_rate",
    "usedInTables": 1,
    "tables": "life",
    "description": "The interest rate for primary dividends on deposit."
  },
  {
    "id": "af552",
    "code": "div_on_deposit_int_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "The amount of interest earned for dividends on deposit."
  },
  {
    "id": "af553",
    "code": "div_on_deposit_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "The amount of dividends left on deposit as of this anniversary."
  },
  {
    "id": "af554",
    "code": "div_p_u_a",
    "usedInTables": 1,
    "tables": "life",
    "description": "The amount of Paid-up Additions (PUA) earned for dividends as of this anniversary."
  },
  {
    "id": "af555",
    "code": "total_p_u_a",
    "usedInTables": 1,
    "tables": "life",
    "description": "The total amount of Paid-up Additions (PUA) on the policy as of this anniversary."
  },
  {
    "id": "af556",
    "code": "o_y_t_purchase_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "This is the total amount of One-Year Term (OYT) insurance purchased, or to be purchased, on this anniversary."
  },
  {
    "id": "af557",
    "code": "premium_per_unit",
    "usedInTables": 1,
    "tables": "life",
    "description": "The premium charged per unit of the face units on the basic coverage on the policy. For coverages that are defined as units this is the annual premium per unit. It is required in order for a system to"
  },
  {
    "id": "af558",
    "code": "premium_rate_per_unit",
    "usedInTables": 1,
    "tables": "life",
    "description": "The current premium rate per unit of volume."
  },
  {
    "id": "af559",
    "code": "renewal_premium_per_unit",
    "usedInTables": 1,
    "tables": "life",
    "description": "The renewal premium per unit of volume."
  },
  {
    "id": "af560",
    "code": "renewal_premium_rate_per_unit",
    "usedInTables": 1,
    "tables": "life",
    "description": "The renewal premium rate per unit of volume."
  },
  {
    "id": "af561",
    "code": "renewal_prem_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "The amount of annual premium upon next renewal"
  },
  {
    "id": "af562",
    "code": "cum_pref_wthdrwl_amt_y_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "The cumulative preferred policy withdrawals taken during the current calendar year. This is a gross amount that includes surrender charges. This is used for keeping track of annual limits for preferre"
  },
  {
    "id": "af563",
    "code": "cum_pref_wthdrwl_amt_i_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "Cumulative preferred policy withdrawals taken as of the Policy Issue Date. Gross amount, includes surrender charges. Used for keeping track of lifetime limits for preferred withdrawals on a policy. Th"
  },
  {
    "id": "af564",
    "code": "requested_maturity_age",
    "usedInTables": 1,
    "tables": "life",
    "description": "Requested Maturity Age"
  },
  {
    "id": "af565",
    "code": "requested_maturity_dur",
    "usedInTables": 1,
    "tables": "life",
    "description": "The requested duration in years at which the contract matures."
  },
  {
    "id": "af566",
    "code": "requested_maturity_date",
    "usedInTables": 1,
    "tables": "life",
    "description": "Requested date at which the contract matures."
  },
  {
    "id": "af567",
    "code": "excess_prem_amt_i_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "Dumped - inputted extra amount other than premium money from issue to current date."
  },
  {
    "id": "af568",
    "code": "premium_bonus_reason",
    "usedInTables": 1,
    "tables": "life",
    "description": "The reason or basis for the premium bonus. *(On Life, PremiumBonusReason qualifies PremiumBonusAmt to provide the reason for the premium bonus credit applicable for the policy.)*"
  },
  {
    "id": "af569",
    "code": "premium_bonus_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "The additional amount credited at the time of purchase payment, may be defined as a percentage of the purchase payment. *(On Life, PremiumBonusAmt is the premium bonus credit applicable for the policy. If the credit is pro-rated by coverage and/or participant, use PremiumBonusAmt on LifeParticipant to specify the portion)*"
  },
  {
    "id": "af570",
    "code": "carrier_pricing_indicator",
    "usedInTables": 1,
    "tables": "life",
    "description": "Used to distinguish variations in the pricing of a fund (defined by the InvestProduct/Subaccount/ProductCode) due to product expense charges, rider expense charges, fees, etc. For example, if variable"
  },
  {
    "id": "af571",
    "code": "non_div_cash_val",
    "usedInTables": 1,
    "tables": "life",
    "description": "The amount earned by participation other than dividends at anniversary. Could be coupons/endowments that are not paid out at anniversary. To capture dividend earnings, use DivCashVal."
  },
  {
    "id": "af572",
    "code": "non_div_on_deposit_int_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "The amount of Interest earned on deposits other than dividends at anniversary. This is the interest amount related to the property NonDivOnDepositAmt."
  },
  {
    "id": "af573",
    "code": "non_div_on_deposit_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "The total amount of forms of participation on deposit other than dividends at anniversary. This could be for other methods such as coupon or endowments."
  },
  {
    "id": "af574",
    "code": "non_div_p_u_a",
    "usedInTables": 1,
    "tables": "life",
    "description": "Amount of Paid-up additions (PUA) earned by means other than dividends. DivPUA plus NonDivPua = TotalPUA."
  },
  {
    "id": "af575",
    "code": "highest_table_rating",
    "usedInTables": 1,
    "tables": "life",
    "description": "This indicates the highest (worst) substandard rating on this policy, across all participants and benefits."
  },
  {
    "id": "af576",
    "code": "commissionable_premium_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "Commissions are based on a premium value referred to as the Commissionable Target Premium. This is the maximum premium amount on which a commission is payable. The Commissionable Premium includes the"
  },
  {
    "id": "af577",
    "code": "bene_designation_wording",
    "usedInTables": 1,
    "tables": "life",
    "description": "In the case that the participant is a beneficiary, this is the exact wording of how the beneficiary was designated. *(On Life, BeneDesignationWording holds beneficiary designation wording at the Life level. This is assumed to be for the complete Life contract unless it is also valued at the Coverage level.)*"
  },
  {
    "id": "af578",
    "code": "tot_div_on_deposit_amt_i_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "The total amount of dividends that are on deposit."
  },
  {
    "id": "af579",
    "code": "policy_option_code",
    "usedInTables": 1,
    "tables": "life",
    "description": "String code representing the type of policy option. *(On Life, PolicyOptionCode represents the policy option in effect for this holding.)*"
  },
  {
    "id": "af580",
    "code": "interest_earned_a_t_d",
    "usedInTables": 1,
    "tables": "life",
    "description": "Interest earned for the parent object anniversary to date"
  },
  {
    "id": "af581",
    "code": "r_p_u_initial_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "When a policy enters the reduced paid up status, this is the initial face amount of RPU insurance. *(On Life, RPUInitialAmt represents the initial amount of RPU. If there is only one RPU amount according to the product definition, use the RPUUltimateAmt property.)*"
  },
  {
    "id": "af582",
    "code": "r_p_u_ultimate_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "When a policy enters the reduced paid up status, this is the ultimate face amount of RPU insurance. *(On Life, RPUUltimateAmt represents the ultimate amount of RPU. If there is only one RPU amount according to the product definition, use this property.)*"
  },
  {
    "id": "af583",
    "code": "r_p_u_change_date",
    "usedInTables": 1,
    "tables": "life",
    "description": "The date on which the Reduced Paid-up Amount changes from the initial amount to the ultimate amount."
  },
  {
    "id": "af584",
    "code": "x_i_years",
    "usedInTables": 1,
    "tables": "life",
    "description": "When a life insurance policy enters the Extended Insurance status, the Extended Term is expressed in Years and Days (for whole life) or Years and Amount of Pure Endowment (for endowments). This proper"
  },
  {
    "id": "af585",
    "code": "x_i_days",
    "usedInTables": 1,
    "tables": "life",
    "description": "When a Whole Life policy enters the Extended Insurance status, the extended term is expressed in years and days.This property holds the Days."
  },
  {
    "id": "af586",
    "code": "x_i_amt_of_pure_endow",
    "usedInTables": 1,
    "tables": "life",
    "description": "When an Endowment policy enters the Extended Insurance status, the term is in years only and the remainder is expressed as an amount of pure endowment. This property holds the Amount of Pure Endowment"
  },
  {
    "id": "af587",
    "code": "excess_div_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "On policies where the dividend option is \"reduction of premiums\", it is possible for the amount of dividend to exceed the premium. In this case, this field will contain the amount of the excess divide"
  },
  {
    "id": "af588",
    "code": "excess_div_amt_disp",
    "usedInTables": 1,
    "tables": "life",
    "description": "On policies where the dividend option is one of the \"reduction of premiums\" type codes, it is possible for the amount of dividend to exceed the premium. In this case, this field will contain the dispo"
  },
  {
    "id": "af589",
    "code": "excess_div_type",
    "usedInTables": 1,
    "tables": "life",
    "description": "On policies where the dividend option is one of the \"reduction of premiums\" type codes, it is possible for the amount of dividend to exceed the premium. In this case, this field will contain the divid *(On Life, ExcessDivType is only used when the excess dividend option must be explicitly stated. If DivType=4 (Reduce Prem) then any type code that does not involve reducing premiums can be used for the)*"
  },
  {
    "id": "af590",
    "code": "excess_residual_div_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "On policies where the original dividend option is one of the \"OYT\" methods and there is a residual dividend amount, it is possible for the dividend option for the residual amount to be \"Reduce Premium"
  },
  {
    "id": "af591",
    "code": "excess_residual_div_amt_disp",
    "usedInTables": 1,
    "tables": "life",
    "description": "On policies where the dividend option is one of the \"OYT\" methods, it is possible for the amount of dividend to exceed the amount needed to purchase the maximum amount of one year term insurance allow"
  },
  {
    "id": "af592",
    "code": "residual_div_type",
    "usedInTables": 1,
    "tables": "life",
    "description": "On policies where the dividend option is one of the \"OYT with maximum purchase amount\" methods, it is possible for the amount of dividend to exceed the amount needed to purchase the maximum amount of  *(On Life, ResidualDivType cannot be set to type code 6 (Term Dividend Option (FULL)). This property is used to designate what should be done with the extra dividend once the maximum amount of one year )*"
  },
  {
    "id": "af593",
    "code": "residual_div_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "On policies where the dividend option is one of the \"OYT with maximum purchase amount\" methods, it is possible for the amount of dividend to exceed the amount needed to purchase the maximum amount of"
  },
  {
    "id": "af594",
    "code": "premium_offset_status",
    "usedInTables": 1,
    "tables": "life",
    "description": "In situations where a Premium Offset Method is specified, this is the status of that method."
  },
  {
    "id": "af595",
    "code": "policy_review_date",
    "usedInTables": 1,
    "tables": "life",
    "description": "The Policy Review Date is the date on which the carrier reviews the guaranteed level of cover in effect at that point in time. When this date is reached the entire policy goes through a series of chec"
  },
  {
    "id": "af596",
    "code": "tot_div_on_deposit_plus_int_amt",
    "usedInTables": 1,
    "tables": "life",
    "description": "TotDivOnDepositPlusIntAmt is used to specify the accumulated amounts of the Apportionment and Special Benefit Accounts when the policy has a Profit Share account such as those used in South Africa. Al"
  },
  {
    "id": "af597",
    "code": "coverage",
    "usedInTables": 1,
    "tables": "life",
    "description": "This object contains the properties that delineate the characteristics for a single benefit, rider, provision, election, etc. found on a life insurance policy. The collection of coverage objects repre"
  },
  {
    "id": "af598",
    "code": "life_u_s_a",
    "usedInTables": 1,
    "tables": "life",
    "description": "If the policy is issued within the USA, this object contains the properties that are unique to that marketplace."
  },
  {
    "id": "af599",
    "code": "life_canada",
    "usedInTables": 1,
    "tables": "life",
    "description": "If the policy is issued within Canada, this object contains the properties that are unique to that marketplace."
  },
  {
    "id": "af600",
    "code": "keyed_value",
    "usedInTables": 1,
    "tables": "life",
    "description": "Generic object used to extend object hierarchy for proprietary data requirements. Each proprietary data item is represented using a KeyedValue object. A collection of KeyedValue objects is utilized to"
  },
  {
    "id": "af601",
    "code": "superannuation",
    "usedInTables": 1,
    "tables": "life",
    "description": "Australia specific This is to support the details specific to a superannuation policy. Initially, this product type applies specifically to Australia, but can be used wherever superannuation policies"
  },
  {
    "id": "af602",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "life",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af603",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "life",
    "description": "Record creation timestamp."
  },
  {
    "id": "af604",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "life",
    "description": "Record last update timestamp."
  },
  {
    "id": "af605",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "life",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af606",
    "code": "annuity_id",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Primary key for Annuity."
  },
  {
    "id": "af607",
    "code": "policy_id",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "FK → policy.policy_id"
  },
  {
    "id": "af608",
    "code": "party_id",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "FK → party.party_id"
  },
  {
    "id": "af609",
    "code": "annuity_key",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Annuity Key"
  },
  {
    "id": "af610",
    "code": "annuity_sys_key",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Annuity System Key"
  },
  {
    "id": "af611",
    "code": "prem_type",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Premium for annuity as a single, fixed, or flexible."
  },
  {
    "id": "af612",
    "code": "payout_type",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Indicates a type of payout such as immediate or deferred. *(On Annuity, PayoutType defines the type of Annuity, such as Immediate or Deferred.)*"
  },
  {
    "id": "af613",
    "code": "qual_plan_type",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Plan type for this policy. Insurance products can be sold as tax qualified products. Use in conjunction with QualPlanSubType to fully define plan types. In the U.S., a plan is 'qualified' by conformin"
  },
  {
    "id": "af614",
    "code": "qual_plan_sub_type",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Qualified Plan Sub Type further refines the QualPlanType of this policy or account. Indicates the specific sub provision of the IRC code to which this Policy applies, such as a \"Stretch IRA\" or \"Solo"
  },
  {
    "id": "af615",
    "code": "qual_plan_origination_date",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "This date represents when the qualified plan originated. For example, a 401k plan was created by the Smith Flower Shop in 1992 when the employer created a 401k plan option for their employees. The usa"
  },
  {
    "id": "af616",
    "code": "source_of_funds",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Indicates a payment's source or where it originated. *(On Annuity, SourceOfFunds indicates where the initial lump sum payment(s) for this annuity came from. In the US it indicates if from a death benefit or from a 1035 exchange.)*"
  },
  {
    "id": "af617",
    "code": "source_of_funds_t_c",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The source of funds is used to capture the result of the event or transaction that generated or created funds, not the location or financial repository from which they were taken to satisfy the financ *(On Annuity, SourceOfFundsTC indicates the source of Annuity/InitPaymentAmt and is used only if the InitPaymentAmt has a single source. If there is more than one source for the initial premium then the)*"
  },
  {
    "id": "af618",
    "code": "ownership_of_funds",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Use a lookup table to determine who owned the funds *(On Annuity, OwnershipOfFunds is used to determine whether the client has the right to determine the structure of the Annuity being purchased as well as the right as to whether or not he may specify wh)*"
  },
  {
    "id": "af619",
    "code": "num_wthdrw_a_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The number of withdrawals or partial surrenders the parent object (usually a policy or type of holding) has had since its last anniversary."
  },
  {
    "id": "af620",
    "code": "num_wthdrw_i_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Number of withdrawals or partial surrenders since Issue of the policy."
  },
  {
    "id": "af621",
    "code": "num_wthdrw_m_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The cumulative number of policy withdrawals or partial surrenders taken during the current month."
  },
  {
    "id": "af622",
    "code": "num_wthdrw_y_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The cumulative number of policy withdrawals or partial surrenders taken during the current calendar."
  },
  {
    "id": "af623",
    "code": "withdrw_max_pct",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The maximum percentage of cash value that can be withdrawn from the policy. The calculated amount is usually compared with other amounts to determine the actual withdrawal allowed."
  },
  {
    "id": "af624",
    "code": "total_amt_wthdrwn",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Total Amount Withdrawn"
  },
  {
    "id": "af625",
    "code": "div_series_ind_string",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Certain policies have more than one dividend series, and the policy effective date may not always be a reliable determinant for which series to use (e.g. back dating)"
  },
  {
    "id": "af626",
    "code": "man_payout_date",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Date 1st payment must be made."
  },
  {
    "id": "af627",
    "code": "home_loan_amt",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Amount of loan taken for a home (total loan, including home and other is obtained through Holding.LiabilityValue)."
  },
  {
    "id": "af628",
    "code": "cum_wthdrwl_amt_a_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The cumulative policy withdrawals taken during the current policy year. This is a gross amount that includes surrender charges."
  },
  {
    "id": "af629",
    "code": "cum_wthdrwl_amt_i_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The cumulative policy withdrawals taken since issue. This is a gross amount that includes surrender charges."
  },
  {
    "id": "af630",
    "code": "cum_wthdrwl_amt_m_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The cumulative policy withdrawals taken during the current month. This is a gross amount that includes surrender charges."
  },
  {
    "id": "af631",
    "code": "cum_wthdrwl_amt_y_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The cumulative policy withdrawals taken during the current calendar year. This is a gross amount that includes surrender charges."
  },
  {
    "id": "af632",
    "code": "net_wthdrwl_amt_a_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The net cumulative total policy withdrawals taken since the last policy anniversary. This is a net amount that does not include surrender charges, loans, loan interest, or any other misc. cash value a"
  },
  {
    "id": "af633",
    "code": "net_wthdrwl_amt_i_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The net cumulative total policy withdrawals taken since issue. This is a net amount that does not include surrender charges, loans, loan interest, or any other misc. cash value adjustments."
  },
  {
    "id": "af634",
    "code": "net_wthdrwl_amt_m_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The net cumulative policy withdrawals taken during the current month. This is a net amount that does not include surrender charges, loans, loan interest, or any other misc. cash value adjustments."
  },
  {
    "id": "af635",
    "code": "net_wthdrwl_amt_y_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The net cumulative total policy withdrawals taken during the current calendar year. This is a net amount that does not include surrender charges, loans, loan interest, or any other misc. cash value ad"
  },
  {
    "id": "af636",
    "code": "misc_cash_value_adjustments_a_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Any additional credits or charges that would apply when calculating the gross total for a given policy value for a given anniversary."
  },
  {
    "id": "af637",
    "code": "misc_cash_value_adjustments_i_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Any additional credits or charges that would apply when calculating the gross total for a given policy value since the policy's inception."
  },
  {
    "id": "af638",
    "code": "misc_cash_value_adjustments_m_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Any additional credits or charges that would apply when calculating the gross total for a given policy value for a given month."
  },
  {
    "id": "af639",
    "code": "misc_cash_value_adjustments_y_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Any additional credits or charges that would apply when calculating the gross total for a given policy value for a given year."
  },
  {
    "id": "af640",
    "code": "cum_withdrawal_amt_prior_yr",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The total of all withdrawals received by the owner from this contract in the prior policy anniversary year. This is a gross amount that includes surrender charges. For example, if the Last Anniversary"
  },
  {
    "id": "af641",
    "code": "death_benefit_payment_option",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Contains the method requested for payment of death benefit."
  },
  {
    "id": "af642",
    "code": "death_benefit_amt",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The total benefit that would be paid upon the death of the primary, or joint, insured. It is net of any prior surrender charges, loans, cash value adjustments or term dividends. Prior to version 2.22, *(On Annuity, DeathBenefitAmt is ambiguously defined. Please see NetDeathBenefitAmt and GrossDeathBenefitAmt if this level of detail is desired.)*"
  },
  {
    "id": "af643",
    "code": "gross_death_benefit_amt",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Policy gross death benefit on all coverages before the removal of any indebtness and any other applicable charges, fees, or costs due."
  },
  {
    "id": "af644",
    "code": "net_death_benefit_amt",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Policy gross death benefit on all coverages minus any indebtedness and other applicable charges, fees, or costs due. The total value to be paid to the beneficiary at the time of death."
  },
  {
    "id": "af645",
    "code": "guaranteed_death_benefit_amt",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "To be used when a portion or all of a contract's death benefit is guaranteed or enhanced. The Guaranteed Death Benefit (GDB) is to identify the portion of the minimum Gross Death Benefit (GD) that is"
  },
  {
    "id": "af646",
    "code": "cash_value_maturity",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Specified amount received by an insured at the end of an endowment period (usually the face amount of the endowment policy), or by the owner of an ordinary life policy (usually the individual insured)"
  },
  {
    "id": "af647",
    "code": "penalty_phase_end_date",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "When this annuity is out of the penalty phase; when there are no longer surrender charges."
  },
  {
    "id": "af648",
    "code": "surrender_value",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Cash surrender value (Net) available if client was able to surrender contract. This is the net of the surrender charges and loans."
  },
  {
    "id": "af649",
    "code": "surrender_free_amt_used_a_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The amount of the available Surrender-Free Amount already withdrawn in the current policy year."
  },
  {
    "id": "af650",
    "code": "surrender_free_amt_a_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The amount up to which the owner is allowed to make (partial) withdrawals within this anniversary year, without having the withdrawal reduced by a surrender charge."
  },
  {
    "id": "af651",
    "code": "surrender_charge",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "SurrenderCharge is the difference between the current accumulation value and the current surrender value, assuming that there are no loans on the policy. In other words, it is the surrender charge tha"
  },
  {
    "id": "af652",
    "code": "fed_taxable_gain",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The amount of taxable gain that would be reported as taxable income, if the annuity were fully surrendered at the 'As Of Date.' It takes into account all prior withdrawals that may have affected the p"
  },
  {
    "id": "af653",
    "code": "jurisdiction_taxable_gain",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The amount of taxable gain that would be reported to the state as taxable income, if the annuity were fully surrendered at the 'As Of Date.' It takes into account all prior withdrawals that may have a"
  },
  {
    "id": "af654",
    "code": "guar_int_end_date",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The date through which the guaranteed interest rate is applicable."
  },
  {
    "id": "af655",
    "code": "guar_int_rate",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Defines a guaranteed minimum product/policy level interest rate independent of any fund/subaccount rates. It represents the minimum floor rate. This rate is guaranteed until the date GuarIntEndDate is"
  },
  {
    "id": "af656",
    "code": "guar_lifetime_rate",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The guaranteed lifetime interest rate."
  },
  {
    "id": "af657",
    "code": "withdrawal_rule",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The rule that should be followed when a client requests a partial withdrawal."
  },
  {
    "id": "af658",
    "code": "e_e_contrib_amt",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Amount of Salary contribution elected by the participant. When a participant applies for a salary reduction plan (e.g. 401(k)), they specify the amount of their salary that will be contributed from ea"
  },
  {
    "id": "af659",
    "code": "e_e_contrib_pct",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Percentage of Salary contribution elected by the participant. When a participant applies for a salary reduction plan (e.g. 401(k)), they specify the percentage of their salary that will be contributed *(On Annuity, EEContribPct specifies the percentage of premium for which the employee pays for this particular policy.)*"
  },
  {
    "id": "af660",
    "code": "e_e_cont_value_i_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Value of all Employee Contributions Since Issue; Total value of the employee contribution since the Holding was issued."
  },
  {
    "id": "af661",
    "code": "e_r_contrib_amt",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Amount of contribution by the employer."
  },
  {
    "id": "af662",
    "code": "e_r_contrib_pct",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Percentage of contribution by the employer. *(On Annuity, ERContribPct specifies the percentage of premium for which the employer pays for this particular policy.)*"
  },
  {
    "id": "af663",
    "code": "e_r_value_i_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Total value of the employee contribution from issue to date, to a qualified plan that requires both employer and employee contribution."
  },
  {
    "id": "af664",
    "code": "init_deposit_amt",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Represents the initial lump sum made to this contract such as a rollover amount that is not treated preferentially. e.g. New Money. *(On Annuity, InitDepositAmt represents the estimated or expected portion of an initial lump sum to be made to this contract when Carrier is to request for transfer of assets. Examples include qualified)*"
  },
  {
    "id": "af665",
    "code": "init_deposit_date",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The date the lump sum was made to the contract."
  },
  {
    "id": "af666",
    "code": "init_payment_amt",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Initial Payment Amount *(On Annuity, InitPaymentAmt is the actual premium that is immediately available for policy issue. Expected or estimated premiums would not be included in this total.)*"
  },
  {
    "id": "af667",
    "code": "last_paid_amt",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Amount of last payment"
  },
  {
    "id": "af668",
    "code": "last_paid_date",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Date of last payment"
  },
  {
    "id": "af669",
    "code": "total_deposit_i_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Total Amount Deposited, from issue to current. Includes lumpsum and premiums paid."
  },
  {
    "id": "af670",
    "code": "gross_prem_a_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The total of all premiums received by the Company into this annuity in the current policy year."
  },
  {
    "id": "af671",
    "code": "gross_prem_amt_i_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Total gross premium received from policy issue."
  },
  {
    "id": "af672",
    "code": "cum_prem_amt_first_yr",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Total premium paid during the first policy year. Not necessarily limited to a twelve month period if administration system allows first year premium in later months. *(On Annuity, CumPremAmtFirstYr represents the total premium paid into the policy during the first policy year.)*"
  },
  {
    "id": "af673",
    "code": "gross_prem_prior_yr",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The total of all premiums received by the Company into this contract in the prior policy anniversary year. For example, if the Last Anniversary Date is 1995, then the figure displayed in this field is"
  },
  {
    "id": "af674",
    "code": "accum_value_int_rate_current",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The base rate of interest applied to the annuity Accumulation Value in the current accumulation period."
  },
  {
    "id": "af675",
    "code": "init_dep_int_rate_current",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The current rate of interest being credited to values in the Fixed Account remaining from the original premium."
  },
  {
    "id": "af676",
    "code": "taxable_status",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Defines whether taxing is required - e.g. compulsory or voluntary."
  },
  {
    "id": "af677",
    "code": "locked_in_ind",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Indicates if deposit funds are locked in or not locked in. For example, funds cannot be redeemed until retirement, earnings during an IndexTerm that are locked in such that the client does not partici"
  },
  {
    "id": "af678",
    "code": "first_tax_year",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "For rollover payments, the receiver needs to know the first tax year applicable to a rollover deposit. It indicates the first tax year in which a contribution was made into the prior policy/payment so *(On Annuity, FirstTaxYear is applicable to a rollover deposit and indicates the first tax year in which a contribution was made into the prior policy/payment source. With regard to rollovers into a ROT)*"
  },
  {
    "id": "af679",
    "code": "roth_ira_net_contribution_amt",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Money from a traditional IRA surrender applied to the Roth Conversion IRA. Defines the net amount of a rollover of trustee-to-trustee transfer for one ROTH IRA to another ROTH IRA that is attributable"
  },
  {
    "id": "af680",
    "code": "prev_reported_tax_year",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The tax year for which a previous reported taxable amount is being entered. *(On Annuity, PrevReportedTaxYear is data that may be gathered during the application process.)*"
  },
  {
    "id": "af681",
    "code": "prev_reported_tax_amt",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The sum total of all payments made in a given calendar year into a qualified plan but reported for tax purposes in the previous tax year. *(On Annuity, PrevReportedTaxAmt is data that may be gathered during the application process. See also: PrevTaxYearReportableAmt and CurrTaxYearReportableAmt.)*"
  },
  {
    "id": "af682",
    "code": "requested_maturity_age",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Requested Maturity Age"
  },
  {
    "id": "af683",
    "code": "requested_maturity_date",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Requested date at which the contract matures. *(On Annuity, RequestedMaturityDate is used to specify the requested annuitization date on a Deferred annuity.)*"
  },
  {
    "id": "af684",
    "code": "requested_maturity_dur",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The requested duration in years at which the contract matures."
  },
  {
    "id": "af685",
    "code": "r_m_d_calc_meth",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Identifies the Required Minimum Distribution (RMD) calculation method used to determine the expectation of life factors when figuring the plan's minimum payout amount."
  },
  {
    "id": "af686",
    "code": "r_m_d_calc_table",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Identifies the Required Minimum Distribution (RMD) calculation table used to determine the expectation of life factors when figuring the plan's minimum payout amount."
  },
  {
    "id": "af687",
    "code": "subject_to_tax_aggregation_ind",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "TRUE indicates that contract is subject to tax aggregation rules. FALSE indicates that the contract is not subject to these rules."
  },
  {
    "id": "af688",
    "code": "bonus_value_amt",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The current, aggregate value of the Premium Bonus(es), expressed as an amount net of the vesting schedule. Today's value of the Premium Bonus(es), adjusted for market gain or loss, and further adjuste"
  },
  {
    "id": "af689",
    "code": "premium_bonus_amt",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The additional amount credited at the time of purchase payment, may be defined as a percentage of the purchase payment."
  },
  {
    "id": "af690",
    "code": "premium_bonus_rate",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Based on the product rules, this percentage represents the rate that is added to the premium at issue or receipt of the premium."
  },
  {
    "id": "af691",
    "code": "premium_bonus_vesting_date",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "This date represents when the client is 100% vested in the premium bonus amount received at issue or receipt of the premium; based upon the product rules."
  },
  {
    "id": "af692",
    "code": "projected_income_amt",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Indicates the annual income at maturity for the annuity policy. This amount is displayed on policy print and is included as a part of the status page for an advanced product flexible premium annuity."
  },
  {
    "id": "af693",
    "code": "suspense_amt",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Money that has been received and the company does not know how the owner intended for the money to be applied. SuspenseAmt is used when a company receives a payment that does not match a scheduled pay"
  },
  {
    "id": "af694",
    "code": "end_period_certain_date",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The date on which the Period Certain Income Options ends."
  },
  {
    "id": "af695",
    "code": "l_o_i_r_o_a_ref_num_type",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Used to define what type of id is being provided as the key or code for this Letter Of Intent or Rights of Accumulation (LOI/ROA) agreement."
  },
  {
    "id": "af696",
    "code": "l_o_i_r_o_a_ref_num",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The reference id of the Letter Of Intent or Rights of Accumulation (LOI/ROA) agreement."
  },
  {
    "id": "af697",
    "code": "l_o_i_r_o_a_type",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Identifies if a Letter of Intent (LOI) or Rights of Accumulation (ROA) applies to the product. LOI applies to a single contract: letter of intent would indicate the initial dollars and the dollars int"
  },
  {
    "id": "af698",
    "code": "l_o_i_r_o_a_amt",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The amount the client has committed to under the LOI or ROA agreement."
  },
  {
    "id": "af699",
    "code": "l_o_i_commitment_date",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The date on which the period for a letter of intent ends. *(This date is determined by adding the amount of time defined by the PolicyProduct.LOIPeriodDuration and PolicyProductLOIPeriodType properties for the product to the issue date for the policy.)*"
  },
  {
    "id": "af700",
    "code": "commission_link",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "A code used to tie related commission objects together"
  },
  {
    "id": "af701",
    "code": "loading_type",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Type of sales load for this product. *(On Annuity, LoadingType indicates the type of loading charge that will be applied to the variable investments on the annuity.)*"
  },
  {
    "id": "af702",
    "code": "prev_tax_year_reportable_amt",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Contributions claimable in current or previous year. The contributions that have been made in the current year that may be claimed for the current or previous tax year. Holding/AsOfDate is used to det *(On Annuity, PrevTaxYearReportableAmt is used to specify contributions that may be claimed in either the current tax year or the previous tax year. For example, amounts contributed to a Canadian Regist)*"
  },
  {
    "id": "af703",
    "code": "curr_tax_year_reportable_amt",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Contributions that may only be claimed for the current year's taxes. Use Holding/AsOfDate to determine the current tax year. *(On Annuity, CurrTaxYearReportableAmt is used to specify contributions that may be only be claimed in the current tax year. For example, amounts contributed to a Canadian Registered Retirement Savings )*"
  },
  {
    "id": "af704",
    "code": "valuation_class_type",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Identifies basic type of insurance. Valuation Class Type is needed to identify the product category used to determine policy reserves assembled in exhibits in the Annual Statement. Such exhibits provi"
  },
  {
    "id": "af705",
    "code": "valuation_base_series",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Used to distinguish plans of insurance for variations in death benefits, premium changes, cash values and any other information that can vary from plan to plan. The values assigned to this data attrib *(Used to distinguish plans of insurance for variations in death benefits, premium changes, cash values and any other information that can vary from plan to plan.)*"
  },
  {
    "id": "af706",
    "code": "valuation_sub_series",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Describes variations in the methods used to compute gross premiums, cash values and dividends. Completes the Base Series. These codes describe variations in the methods used to compute gross premium,"
  },
  {
    "id": "af707",
    "code": "net_prem_amt_a_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The total of all premiums received by the Company into this annuity in the current policy year based on the anniversary date and the Holding.AsOfDate. This is the net of any fees charged."
  },
  {
    "id": "af708",
    "code": "net_prem_amt_i_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The total of all premiums received by the Company from the issue date Policy.IssueDate) to the Holding.AsOfDate. This is the net of any fees charged."
  },
  {
    "id": "af709",
    "code": "net_prem_amt_y_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The total of all premiums received by the Company into this annuity in the current calendar year based on the calendar date and the Holding.AsOfDate. This is the net of any fees charged."
  },
  {
    "id": "af710",
    "code": "net_prem_amt_prior_yr",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The total of all premiums received by the Company into this annuity in the prior policy year based on the anniversary date and the Holding.AsOfDate. This is the net of any fees charged."
  },
  {
    "id": "af711",
    "code": "reserve_function",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The method used to calculate reserves. Defines the mortality function used to calculate reserves and net premium for valuation."
  },
  {
    "id": "af712",
    "code": "reserve_int_rate",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The ultimate interest rate used in calculating reserves for the plan. For plans that utilize only a single interest rate, this property holds the single interest rate. For plans that utilize split int"
  },
  {
    "id": "af713",
    "code": "reserve_method",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Indicates the method of calculating reserves on this coverage and is used by valuation programs to find the correct reserves for this coverage."
  },
  {
    "id": "af714",
    "code": "mortality_or_morbidity_table",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Identifies the mortality rate table to use, to obtain the mortality rate used to calculate the policy reserves. Each plan (i.e., layer of coverage) may have its own mortality table definition within P *(On Annuity, defines the mortality table used.)*"
  },
  {
    "id": "af715",
    "code": "inherited_payout_timing",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Disbursement timing on Inherited Contracts. The elected/applicable payout option which indicates by when disbursements must be completed on an Inherited (aka Beneficiary) policy. This is usually, but"
  },
  {
    "id": "af716",
    "code": "inherited_deferral_end_date",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The date by which the Beneficiary must withdraw all funds inherited from a qualified plan. This date is based upon RMD and Inherited contract rules, for example the 10-year deferral election. See Inhe *(On Annuity, InheritedDeferralEndDate is used to specify the end date of the inherited deferral period if one is depicted via InheritedPayoutTiming.)*"
  },
  {
    "id": "af717",
    "code": "carrier_pricing_indicator",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Used to distinguish variations in the pricing of a fund (defined by the InvestProduct/Subaccount/ProductCode) due to product expense charges, rider expense charges, fees, etc. For example, if variable"
  },
  {
    "id": "af718",
    "code": "r_m_d_basis_value",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The calculated total amount upon which the mortality factor may be applied to determine the annual Required Minimum Distribution amount for this annuity for this calendar year. This amount represents  *(On Annuity, RMDBasisValue is the total value upon which the mortality factor will be applied.)*"
  },
  {
    "id": "af719",
    "code": "r_m_d_actuarial_present_value",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The property represents the calculated total \"actuarial present value\" of additional benefits in excess of the account value provided under this annuity as of December 31 of the last calendar year bas *(On Annuity, RMDActuarialPresentValue contains only the actuarial present value of benefits, and does not include the 12/31 account value. If the actuarial present value is calculated but is not includ)*"
  },
  {
    "id": "af720",
    "code": "bene_designation_wording",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "In the case that the participant is a beneficiary, this is the exact wording of how the beneficiary was designated. *(On Annuity, BeneDesignationWording holds beneficiary designation wording at the Annuity level. This is assumed to be for the Annuity.)*"
  },
  {
    "id": "af721",
    "code": "interest_earned_a_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Interest earned for the parent object anniversary to date"
  },
  {
    "id": "af722",
    "code": "interest_earned_i_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Interest earned for the parent object from issue to date"
  },
  {
    "id": "af723",
    "code": "interest_earned_m_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Interest earned for the parent object month to date"
  },
  {
    "id": "af724",
    "code": "interest_earned_y_t_d",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Interest earned for the parent object year to date"
  },
  {
    "id": "af725",
    "code": "r_m_d_amt",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The amount of annual Required Minimum Distribution (RMD) associated with the annuity policy as determined by the carrier and their RMD calculation method. *(On Annuity, RMDAmt is the amount to be distributed in the RMDTaxYear. This value may be used as the Arrangement/TotalAmt on the RMD Arrangement for that year.)*"
  },
  {
    "id": "af726",
    "code": "r_m_d_tax_year",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The year the reported Required Minimum Distribution (RMD) is being reported for. This is the year in which the transaction takes place. For example, a distribution taken in January 2021 typically appl *(On Annuity, RMDTaxYear represents the year for which the Required Minimum Distribution (RMD) properties on Annuity apply.)*"
  },
  {
    "id": "af727",
    "code": "interest_only_amt",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The amount of interest available for withdrawal that does not include any surrender fees or charges."
  },
  {
    "id": "af728",
    "code": "interest_only_pct",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Annual Withdrawal % of Earned Interest Allowed (w/o Surrender Charge) - This is a rolling 12-month value. For example, InterestOnlyPct would be 100% if the client could withdraw 100% of interest earne"
  },
  {
    "id": "af729",
    "code": "r_m_d_factor",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The Calculated RMD Percent Factor is the Factor used in the equation to get the Required Minimum Distribution value for a Contract. This should be represented as a factor (e.g. .06) rather than a perc"
  },
  {
    "id": "af730",
    "code": "annuitized_amt",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The amount from the deferred contract that was used to fund the income stream."
  },
  {
    "id": "af731",
    "code": "free_withdrawal_pct",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "The percentage allowed per calendar year for back-end load fund units to be withdrawn from an account free of charges. *(On Annuity, FreeWithdrawalPct represents a percent of premium, anniversary value, contract value, or some other specified amount. For more specific rules please contact the carrier directly or refer t)*"
  },
  {
    "id": "af732",
    "code": "payout",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "This object represents a single payout stream. A payout stream is a repetitive series of payments of predictable fluctuations (i.e. the original amount may change over time based on a predictable sche *(On Annuity, at least one Payout object should be present on annuities with active payment streams.)*"
  },
  {
    "id": "af733",
    "code": "rider",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Policy Rider Object is used for Annuity and DisabilityHealth sections of the model. DisabilityHealth also includes long term care usage. This rider object is used to support product features associate"
  },
  {
    "id": "af734",
    "code": "keyed_value",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Generic object used to extend object hierarchy for proprietary data requirements. Each proprietary data item is represented using a KeyedValue object. A collection of KeyedValue objects is utilized to"
  },
  {
    "id": "af735",
    "code": "annuity_u_s_a",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "If the annuity is issued within the USA, this object contains the properties that are unique to that marketplace."
  },
  {
    "id": "af736",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af737",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Record creation timestamp."
  },
  {
    "id": "af738",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Record last update timestamp."
  },
  {
    "id": "af739",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "annuity",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af740",
    "code": "coverage_id",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Primary key for Coverage."
  },
  {
    "id": "af741",
    "code": "policy_id",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "FK → policy.policy_id"
  },
  {
    "id": "af742",
    "code": "coverage_key",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Coverage Key"
  },
  {
    "id": "af743",
    "code": "coverage_sys_key",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Coverage System Key"
  },
  {
    "id": "af744",
    "code": "carrier_admin_system",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The carrier assigned system identification where the information resides or originated."
  },
  {
    "id": "af745",
    "code": "plan_name",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Full name of plan. This is the complete, official, and/or legal name used for this policy/coverage/option."
  },
  {
    "id": "af746",
    "code": "short_name",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The abbreviated or short name. *(On Coverage, ShortName references the CoverageProduct/ShortName.)*"
  },
  {
    "id": "af747",
    "code": "marketing_name",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The marketing name given by the carrier for this item. *(On Coverage, MarketingName indicates the version marketing name associated with a product. MarketingName is the carriers marketing name associated with the ProductVersionCode.)*"
  },
  {
    "id": "af748",
    "code": "product_code",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "This is a carrier assigned code used to identify the object that contains this property. Because the code is assigned by a carrier, it is typically used in conjunction with a CarrierCode to create a u *(On Coverage, ProductCode is the Carrier assigned code for the Coverage.)*"
  },
  {
    "id": "af749",
    "code": "product_version_code",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "ProductVersionCode defines the version of a product, particularly when a company uses the same ProductCode across versions. Business users require the ability to vary product information without creat"
  },
  {
    "id": "af750",
    "code": "cusip_num",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Committee on Uniform Security Identification Procedures (CUSIP) number of insurance or investment product. *(On Coverage, CusipNum is used to specify the CUSIP for an insurance component. It is typically used for riders (IndicatorCode is Rider, tc=2) that have their own CUSIP numbers. If provided on a base C)*"
  },
  {
    "id": "af751",
    "code": "cov_number",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Internal System Coverage Number. This element is to support systems where coverages are stored in different systems or as other policies each with unique numbers."
  },
  {
    "id": "af752",
    "code": "form_no",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "This is the home office form number associated when a form is applicable."
  },
  {
    "id": "af753",
    "code": "life_cov_status",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Life Coverage Status"
  },
  {
    "id": "af754",
    "code": "status_reason",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Reason for Status *(On Coverage, StatusReason provides an explanation as to why the coverage is in the status it is in. This relates to the status indicated in LifeCovStatus also on Coverage.)*"
  },
  {
    "id": "af755",
    "code": "issue_type",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The type of underwriting used for this policy. For example: Full Underwriting, Mass Underwriting, Reduced Underwriting, Simplified Underwriting, etc."
  },
  {
    "id": "af756",
    "code": "issue_sub_type",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Used to specify sub-categories of issue type. For example,\"Full Underwriting\" may be further refined into non-medical underwriting, paramedical underwriting, and full medical underwriting based on the *(On Coverage, IssueSubType is used with IssueType to provide additional detail about the type of underwriting that was applied to the coverage)*"
  },
  {
    "id": "af757",
    "code": "purpose",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Code showing purpose / goal of client for which this was sold. *(On Coverage, Purpose should be used when the reason for purchasing the specific Coverage is different from the reason for purchasing the policy as a whole.)*"
  },
  {
    "id": "af758",
    "code": "issue_nation",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The nation of issue."
  },
  {
    "id": "af759",
    "code": "issue_nation_desc",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Description to further define the nation of issue. *(On Coverage, IssueNationDesc may be used when the IssueNation type is set to \"Other\".)*"
  },
  {
    "id": "af760",
    "code": "jurisdiction",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The jurisdiction of the parent aggregate. In most cases, Jurisdiction is used to describe one of two situations. Jurisdiction is most often used to record A) a valid jurisdiction for the associated ag"
  },
  {
    "id": "af761",
    "code": "life_cov_type_code",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Life Coverage Type Code"
  },
  {
    "id": "af762",
    "code": "indicator_code",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Coverage classification - e.g. base, rider, etc. *(On Coverage, IndicatorCode is used to classify the coverage as a base coverage, a rider coverage, an increase, etc.)*"
  },
  {
    "id": "af763",
    "code": "d_b_o_switch",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "TRUE indicates this coverage was created as a result of a Death Benefit Option switch. FALSE indicates the coverage was NOT created as a result of a Death Benefit Option switch. This property would on"
  },
  {
    "id": "af764",
    "code": "renewable_ind",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Indicates if coverage is renewable. If TRUE - then it is renewable, if FALSE- then it is not renewable."
  },
  {
    "id": "af765",
    "code": "duration_design",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Duration for renewable, level and decreasing terms and duration of limited pay and graded premium whole life - represented in years as integer; if coverage is for life or not applicable, integer will"
  },
  {
    "id": "af766",
    "code": "cost_of_ins_duration_design",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The duration design for the cost of insurance *(On Coverage, CostOfInsDesign is modelled like DurationDesign. For reference, the integer values would reflect the following submitted lookup values: 5 - 5YR 10 - 10YR 20 - 20YR 0 - Level (LifeTime) 1 )*"
  },
  {
    "id": "af767",
    "code": "cost_of_ins_age_design",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The age design for the cost of insurance *(On Coverage, CostOfInsAgeDesign corresponds to CostOfInsDurationDesign. When the cost of insurance is based on the number of years (e.g. 10 year), then use CostOfInsDurationDesign. When the cost of in)*"
  },
  {
    "id": "af768",
    "code": "lives_type",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Type code indicating if coverage is single, joint or multi-life and what life the benefit payment is based on (e.g. first to die, last to die). *(On Coverage, LivesType is used to indicate if a single life, joint lives, or multiple lives are covered. In order to capture the number of lives covered, use NumLives.)*"
  },
  {
    "id": "af769",
    "code": "expiry_date",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The date the item will mature or expire and is no longer in force. *(On Coverage, ExpiryDate may represent the maturity date or the expiry date depending on the type of Coverage.)*"
  },
  {
    "id": "af770",
    "code": "payment_structure",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "How the premiums are modeled. For example, the option of level or stepped payment structure."
  },
  {
    "id": "af771",
    "code": "prem_freeze_date",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The date on which the premium freezes. This is applicable when coverage is for income protection. This date applies only when the payment structure is \"stepped\". *(On Coverage, PremFreezeDate is only applicable when PaymentStructure = 'Stepped'.)*"
  },
  {
    "id": "af772",
    "code": "benefit_structure",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Code representing the structure of the benefits."
  },
  {
    "id": "af773",
    "code": "death_benefit_opt_type",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Option chosen for this contract which would affect the death proceeds, i.e. increasing, level."
  },
  {
    "id": "af774",
    "code": "death_benefit_option_name",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "A carrier defined name for the death benefit option type. For example, instead of \"Level (DB = Face)\" for OLI_DBOPT_LEVEL tc=1 a carrier might use the term \"Fixed\" or \"Option F\". *(On Coverage, DeathBenefitOptionName is used to provide a carrier defined name for the specified DeathBenefitOptType.)*"
  },
  {
    "id": "af775",
    "code": "guaranteed_coverage_option",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Defines which Guaranteed Coverage option was selected"
  },
  {
    "id": "af776",
    "code": "equivalent_age",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The issue age applied to the coverage after rating. When a single life coverage, it may match that shown for LifeParticipant/IssueAge but is possible to be a higher value for added risk purposes. For"
  },
  {
    "id": "af777",
    "code": "guar_int_rate",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Defines a guaranteed minimum product/policy level interest rate independent of any fund/subaccount rates. It represents the minimum floor rate. This rate is guaranteed until the date GuarIntEndDate is"
  },
  {
    "id": "af778",
    "code": "prem_source_type",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "PremSourceType documents where the money originated from as opposed to where the money is currently held (which is SourceOfFundsTC). For example, the premium payment may be paid from a savings account"
  },
  {
    "id": "af779",
    "code": "qual_add_benefit_ind",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Used to determine if the cost of this coverage should be included when calculating cost basis. TRUE means it should be included. FALSE means it should NOT be included."
  },
  {
    "id": "af780",
    "code": "bene_designation_wording",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "In the case that the participant is a beneficiary, this is the exact wording of how the beneficiary was designated."
  },
  {
    "id": "af781",
    "code": "payment_mode",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The frequency of a payment. Typically annual, monthly, weekly, etc. *(On Coverage, PaymentMode is used to support coverage payments paid on a different schedule than the policy. It directly relates to premium source of \"Separately Billable\".)*"
  },
  {
    "id": "af782",
    "code": "div_series_ind_string",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Certain policies have more than one dividend series, and the policy effective date may not always be a reliable determinant for which series to use (e.g. back dating)"
  },
  {
    "id": "af783",
    "code": "cum_prem_amt_first_yr",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Total premium paid during the first policy year. Not necessarily limited to a twelve month period if administration system allows first year premium in later months. *(On Coverage, CumPremAmtFirstYr represents the total premium paid into the coverage during the first policy year.)*"
  },
  {
    "id": "af784",
    "code": "prem_amt_a_t_d",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "This holds the total premium paid since the last anniversary of the contract."
  },
  {
    "id": "af785",
    "code": "cash_surr_value",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Cash Surrender Value"
  },
  {
    "id": "af786",
    "code": "cash_value",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Total Cash Value"
  },
  {
    "id": "af787",
    "code": "current_amt",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Amount of coverage -- the face amount of the rider/benefit, without options."
  },
  {
    "id": "af788",
    "code": "death_benefit_amt",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The total benefit that would be paid upon the death of the primary, or joint, insured. It is net of any prior surrender charges, loans, cash value adjustments or term dividends. Prior to version 2.22,"
  },
  {
    "id": "af789",
    "code": "init_cov_amt",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Also known as the initial face without options The amount of the coverage as initially issued. It does not include amounts associated with any options. This is the initial face amount at the time the  *(On Coverage, InitCovAmt represents the initial coverage amount. During the application process the CurrentAmt and the InitCovAmt are the same and they both represent the amount of insurance that is be)*"
  },
  {
    "id": "af790",
    "code": "intial_number_of_units",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "This is the initial number of units at the time the coverage becomes effective. *(On Coverage, IntialNumberOfUnits represents the initial number of units. During the application process the CurrentNumberOfUnits and the IntialNumberOfUnits are the same and they both represent the am)*"
  },
  {
    "id": "af791",
    "code": "current_number_of_units",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Current number of units of this coverage"
  },
  {
    "id": "af792",
    "code": "value_per_unit",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The value per unit of the face units on the basic coverage on the policy. For coverages that are defined as units the value per unit is required in order for the total value to be calculated."
  },
  {
    "id": "af793",
    "code": "min_prem_amt",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "This is current no lapse guarantee premium for a policy, coverage, or coverage option. This premium is normally adjusted when changes in coverages occur such as an increase or decrease in coverage. If"
  },
  {
    "id": "af794",
    "code": "modal_prem_amt",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Current modal premium/ payment amount. May also be known as billed premium amount. Represents the amount that the carrier expects to be paid."
  },
  {
    "id": "af795",
    "code": "target_prem_amt",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The target premium is a carrier-defined specific value normally used in the calculation of commissions."
  },
  {
    "id": "af796",
    "code": "target2_prem_amt",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "This is a second level of a target premium threshold from which commissions are paid. An example is a product which pays a specified commission rate up to target, then a second commission rate up to t"
  },
  {
    "id": "af797",
    "code": "target_prem_amt_a_t_d",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The accumulated target premium for this coverage since the last policy anniversary."
  },
  {
    "id": "af798",
    "code": "target_prem_amt_i_t_d",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The accumulated target premium for this coverage since Issue."
  },
  {
    "id": "af799",
    "code": "target_prem_amt_m_t_d",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The accumulated target premium for this coverage since the last monthly anniversary."
  },
  {
    "id": "af800",
    "code": "target_prem_amt_y_t_d",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The accumulated target premium for this coverage during the current calendar year."
  },
  {
    "id": "af801",
    "code": "annual_prem_amt",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Base annualized premium of this coverage. Does not include associated options."
  },
  {
    "id": "af802",
    "code": "tot_annual_prem_amt",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Total annual premium of the coverage. Includes associated options."
  },
  {
    "id": "af803",
    "code": "alloc_prem_a_t_d",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Defined as total premiums paid for the coverage during the current anniversary year. To specify Dividend Accumulated amounts, use a coverage of Accumulate Dividends. Specify AllocPremATD to demonstrat"
  },
  {
    "id": "af804",
    "code": "alloc_prem_i_t_d",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The amount of the total premiums paid since issue (Life/TotCumPremAmt) that have been allocated to this coverage. This is used for surrender charge calculations. To specify Dividend Accumulated amount"
  },
  {
    "id": "af805",
    "code": "guar_c_o_i_charges_m_t_d",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The amount of monthly guaranteed COI charges that have been calculated since the last monthly anniversary."
  },
  {
    "id": "af806",
    "code": "deducted_c_o_i_chgs_a_t_d",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "DeductedCOIChgsATD is the amount of COI charges made since the last policy anniversary for the contract's basic values. This includes the base coverage and any coverage that supplements or adjusts the"
  },
  {
    "id": "af807",
    "code": "deducted_c_o_i_chgs_i_t_d",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "DeductedCOIChgsITD is the amount of COI charges made since issue of the policy for the contract's basic values. This includes the base coverage and any coverage that supplements or adjusts the coverag"
  },
  {
    "id": "af808",
    "code": "deducted_c_o_i_chgs_m_t_d",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "DeductedCOIChgsMTD is the amount of COI charges made during the last policy month for the contract's basic values. This includes the base coverage and any coverage that supplements or adjusts the cove"
  },
  {
    "id": "af809",
    "code": "deducted_c_o_i_chgs_y_t_d",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "DeductedCOIChgsYTD is the amount of COI charges made during the current policy year for the contract's basic values. This includes the base coverage and any coverage that supplements or adjusts the co"
  },
  {
    "id": "af810",
    "code": "surr_target_prem",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The target premium to use for the purpose of calculating surrender charges. In many cases, this is the same as the target premium used for calculating commissions (Coverage\\TargetPremAmt), but for som"
  },
  {
    "id": "af811",
    "code": "g_d_b_prem",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Normally, in order to qualify for the guaranteed death benefit, the policy owner must have cumulatively paid premiums equal to a minimum amount. This amount would be the sum of month by month GDB prem *(On Coverage, GDBPrem represents the Guaranteed Death Benefit Premium for the most favorable Guaranteed Death Benefit or No Lapse Guarantee.)*"
  },
  {
    "id": "af812",
    "code": "surr_charge",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "SurrCharge is the difference between the current accumulation value and the current surrender value, assuming that there are no loans on the policy. In other words, it is the surrender charge that wou"
  },
  {
    "id": "af813",
    "code": "surr_charge_i_t_d",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Surrender Charges Issue-To-Date"
  },
  {
    "id": "af814",
    "code": "conversion_start_date",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "For coverages that can be converted to a different type, this date represents the start of the convertible period and the initial date for which conversion is available. *(On Coverage, ConversionStartDate may be used with ConversionDate to specify the time period in which conversions may take place. For instance, for a term product that can be converted to a permanent p)*"
  },
  {
    "id": "af815",
    "code": "conversion_date",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "For coverages that can be converted to a different type, this date represents the end of the convertible period and the final date for which conversion is available *(On Coverage, ConversionDate may be used with ConversionStartDate to specify the time period in which conversions may take place. For instance, for a term product that can be converted to a permanent p)*"
  },
  {
    "id": "af816",
    "code": "eff_date",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "This will usually indicate when an aggregate is effective (e.g. CommSchedule, LifeParticipant and Participant) or the actual effective date which may be used for the calculation of the anniversary dat"
  },
  {
    "id": "af817",
    "code": "term_date",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Termination Date is the date the aggregate is no longer effective. *(On Coverage, TermDate represents the date the coverage is no longer in force.)*"
  },
  {
    "id": "af818",
    "code": "renewal_date",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Renewal Date associated with this particular item. *(On Coverage, RenewalDate represents the date the coverage is up for renewal.)*"
  },
  {
    "id": "af819",
    "code": "final_payment_date",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "For inforce policies/coverages, this property contains the date the final premium payment is due. For terminated policies/coverages, this property contains the date the final premium payment was made. *(On Coverage, FinalPaymentDate is used to support coverage payments paid on a different schedule than the policy. It directly relates to premium source of \"Separately Billable\".)*"
  },
  {
    "id": "af820",
    "code": "payment_due_date",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Date the premium/payment is due. *(On Coverage, PaymentDueDate is used to support coverage payments paid on a different schedule than the policy. It directly relates to premium source of \"Separately Billable\".)*"
  },
  {
    "id": "af821",
    "code": "last_payment_date",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The date the premium on the coverage was paid."
  },
  {
    "id": "af822",
    "code": "benefit_period",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The benefit period an option is guaranteed for, for example it applies to long term care."
  },
  {
    "id": "af823",
    "code": "benefit_mode",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Mode for benefit payment amount *(On Coverage, BenefitMode is used to specify the mode at which the benefit amounts, BenefitAmtAcc and BenefitAmtSick, are paid out.)*"
  },
  {
    "id": "af824",
    "code": "benefit_index",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The annual Percentage by which the Benefit Index will change if Benefit Structure type tc = Increasing or tc = Decreasing"
  },
  {
    "id": "af825",
    "code": "benefit_pct",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Benefit Percentage *(On Coverage, BenefitPct is the percent of the Face Amount at issue that determines the Long Term Care (LTC) Maximum Monthly Benefit Amount specified in MonthlyBenefitAmt.)*"
  },
  {
    "id": "af826",
    "code": "monthly_benefit_amt",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The maximum amount of benefits that can be accelerated in a given month. Long Term Care claim payments in a given month cannot exceed this amount. The figure is 'As Of' the Monthly Benefit Effective D"
  },
  {
    "id": "af827",
    "code": "monthly_benefit_eff_date",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The date for which the Monthly Benefit Amt was effective."
  },
  {
    "id": "af828",
    "code": "guideline_ann_prem",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The Guideline Annual Premium is determined using assumptions specified in the Tax Equity and Fiscal Responsibility Act of 1982 (TEFRA - IRC Section 7702), and used in the test for whether a policy qua"
  },
  {
    "id": "af829",
    "code": "guideline_ann_prem_sum",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Cumulative amount of the guideline annual premiums for this coverage."
  },
  {
    "id": "af830",
    "code": "guideline_single_prem",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The Annual Guideline Single Premium which is the premium needed to be made on a single basis to endow the policy based on guaranteed assumptions and 6% interest."
  },
  {
    "id": "af831",
    "code": "guideline_face",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Face amount used for this Coverage's Guideline Premium calculation. This is almost always the same as the current face (Coverage.CurrentAmt). In some situations, such as an integrated term rider (Cove"
  },
  {
    "id": "af832",
    "code": "mec7_d_b_lowest",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Lowest death benefit for the current Modified Endowment Contract (MEC) 7-pay period"
  },
  {
    "id": "af833",
    "code": "s_e_c_guideline_prem",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Securities and Exchange Commission (SEC) guideline annual premium is similar in concept to Coverage\\GuidelineAnnPrem, but calculated with a 5% interest assumption. It is used to test the 'reasonablene"
  },
  {
    "id": "af834",
    "code": "salary_pct",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Percentage of salary utilized for calculating payment amount associated with this particular coverage."
  },
  {
    "id": "af835",
    "code": "net_amt_at_risk",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The net amount of risk for this coverage. Cost of Insurance charges are often associated with this amount."
  },
  {
    "id": "af836",
    "code": "interest_earned_a_t_d",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Interest earned for the parent object anniversary to date"
  },
  {
    "id": "af837",
    "code": "interest_earned_i_t_d",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Interest earned for the parent object from issue to date"
  },
  {
    "id": "af838",
    "code": "grandfathered_ind",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "True indicates the coverage amount InitCovAmt was grand fathered from a previously existing plan, in a group insurance context."
  },
  {
    "id": "af839",
    "code": "benefit_schedule_type",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "How to determine the benefit amount"
  },
  {
    "id": "af840",
    "code": "coverage_percentage_selected",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Percent of Salary or Multiple Number indicating the percentage, for example of employee's salary, selected for the coverage amount. Multiples would be expressed as rates - e.g. 3 times = 300%."
  },
  {
    "id": "af841",
    "code": "filed_form_number",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The 'Policy Form Number' for this Coverage, as filed with the State (in the U.S.) or other appropriate regulating jurisdiction"
  },
  {
    "id": "af842",
    "code": "elimination_period",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Period of time after disability before benefits are paid"
  },
  {
    "id": "af843",
    "code": "mortgage_interest_rate",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Mortgage Interest Rate"
  },
  {
    "id": "af844",
    "code": "issued_as_applied_ind",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "TRUE means the coverage for this component or contract was issued as applied for. In this context a component is considered to be issued as applied for if no material change is made to the component d *(On Coverage, IssuedAsAppliedInd is set to TRUE when no material changes were made to this specific coverage or any of its child objects/aggregates prior to issue. However, the IssuedAsAppliedInd on a )*"
  },
  {
    "id": "af845",
    "code": "equivalent_underwriting_class",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Underwriting class of the coverage used for rating purposes. *(On Coverage, EquivalentUnderwritingClass should match that specified in LifeParticipant/UnderwritingClass for a single life coverage. For joint or multi-life cases, EquivalentUnderwritingClass can rep)*"
  },
  {
    "id": "af846",
    "code": "equivalent_underwriting_sub_class",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "A further classification/refinement of the EquivalentUnderwritingClass. *(On Coverage, EquivalentUnderwritingSubClass should match that specified in LifeParticipant/UnderwritingSubClass for a single life coverage. For joint or multi-life cases, EquivalentUnderwritingSubClas)*"
  },
  {
    "id": "af847",
    "code": "excess_prem_amt_a_t_d",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Excess premium annual to date based on policy anniversary. The accumulated excess premium for this coverage During the current policy year."
  },
  {
    "id": "af848",
    "code": "excess_prem_amt_i_t_d",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Dumped - inputted extra amount other than premium money from issue to current date."
  },
  {
    "id": "af849",
    "code": "excess_prem_amt_m_t_d",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The accumulated excess premium for this coverage During the current month"
  },
  {
    "id": "af850",
    "code": "excess_prem_amt_y_t_d",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The accumulated excess premium for this coverage During the current calendar year."
  },
  {
    "id": "af851",
    "code": "premium_per_unit",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The premium charged per unit of the face units on the basic coverage on the policy. For coverages that are defined as units this is the annual premium per unit. It is required in order for a system to"
  },
  {
    "id": "af852",
    "code": "premium_rate_per_unit",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The current premium rate per unit of volume."
  },
  {
    "id": "af853",
    "code": "renewal_premium_per_unit",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The renewal premium per unit of volume."
  },
  {
    "id": "af854",
    "code": "renewal_premium_rate_per_unit",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The renewal premium rate per unit of volume."
  },
  {
    "id": "af855",
    "code": "renewal_prem_amt",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The amount of annual premium upon next renewal"
  },
  {
    "id": "af856",
    "code": "tobacco_premium_basis",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Used to classify insurance policy underwriting categories related to tobacco usage. This element is NOT used to classify the tobacco or nicotine usage history of natural persons. For that purpose, ref"
  },
  {
    "id": "af857",
    "code": "commission_link",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "A code used to tie related commission objects together"
  },
  {
    "id": "af858",
    "code": "valuation_class_type",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Identifies basic type of insurance. Valuation Class Type is needed to identify the product category used to determine policy reserves assembled in exhibits in the Annual Statement. Such exhibits provi"
  },
  {
    "id": "af859",
    "code": "valuation_base_series",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Used to distinguish plans of insurance for variations in death benefits, premium changes, cash values and any other information that can vary from plan to plan. The values assigned to this data attrib"
  },
  {
    "id": "af860",
    "code": "valuation_sub_series",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Describes variations in the methods used to compute gross premiums, cash values and dividends. Completes the Base Series. These codes describe variations in the methods used to compute gross premium,"
  },
  {
    "id": "af861",
    "code": "policy_exhibit_status",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "PolicyExhibit is used to indicate policy entries and exits from the policy file."
  },
  {
    "id": "af862",
    "code": "reserve_method",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Indicates the method of calculating reserves on this coverage and is used by valuation programs to find the correct reserves for this coverage."
  },
  {
    "id": "af863",
    "code": "last_prem_amt",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Dollar amount of the last premium payment."
  },
  {
    "id": "af864",
    "code": "child_mature_age",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The attained age at which the child coverage or benefit ceases."
  },
  {
    "id": "af865",
    "code": "child_age_use",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Identified the method of calculating the child coverage cease date."
  },
  {
    "id": "af866",
    "code": "benefit_coordination_ind",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "TRUE indicates this is a product provision that requires coordination of benefits. FALSE indicates it does not require coordination of benefits. Coordination of benefits is the practice of ensuring th"
  },
  {
    "id": "af867",
    "code": "pre_existing_condition_ind",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "This is an indicator that defines whether pre-existing conditions limit the benefits for claims or the validation of the policy. Sometimes a pre-existing condition unknown by the carrier can result in"
  },
  {
    "id": "af868",
    "code": "benefit_period_acc",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The benefit period that an option is guaranteed for, using Benefit Period lookup table."
  },
  {
    "id": "af869",
    "code": "benefit_period_sick",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The benefit period that an option is guaranteed for, using Benefit Period lookup table."
  },
  {
    "id": "af870",
    "code": "elim_period_acc",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Period of time after accident claim onset date before benefits are paid."
  },
  {
    "id": "af871",
    "code": "elim_period_sick",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Period of time after sickness claim onset date, before benefits are paid."
  },
  {
    "id": "af872",
    "code": "deduction_option",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Used to indicate deduction options for this product."
  },
  {
    "id": "af873",
    "code": "benefit_amt_acc",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Benefit amount paid for disabilities due to accidents *(On Coverage, BenefitAmtAcc is qualified by BenefitMode to describe the mode of the benefit payment.)*"
  },
  {
    "id": "af874",
    "code": "benefit_amt_sick",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Benefit amount paid for disabilities due to sickness *(On Coverage, BenefitAmtSick is qualified by BenefitMode to describe the mode of the benefit payment.)*"
  },
  {
    "id": "af875",
    "code": "prem_payment_dur_basis",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "A contracting party may select to pay premiums either for the cover duration or until a specified age, such as a retirement age or an age defined in the product definition. The premium payment duratio *(On Coverage, PremPaymentDurBasis is used to identify the basis upon which the premium payment duration is calculated. The actual value would appear in PayToAge or PayToYear depending on the basis sele)*"
  },
  {
    "id": "af876",
    "code": "pay_to_age",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The age to which premiums are paid in a fixed plan. In a flexible premium plan the maximum age to which premiums can be accepted. Applicable to both FixedPremiumDesign and FlexiblePremiumDesign when d *(On Coverage, PayToAge reflects the age to which a product is paid from the design of the underlying product. Either PayToAge or PayToYear may be specified, not both.)*"
  },
  {
    "id": "af877",
    "code": "pay_to_year",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The number of years for which premiums are paid in a fixed premium plan. In a flexible premium plan the maximum number of years to which premiums can be accepted. Applicable to both FixedPremiumDesign *(On Coverage, PayToYear reflects the year to which a product is paid from the design of the underlying product. Either PayToAge or PayToYear may be specified, not both.)*"
  },
  {
    "id": "af878",
    "code": "level_premium_period",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The period of time that the premium is designed to be level according to the product definition of its parent object. This differs from DurationDesign in that DurationDesign is the length of time the"
  },
  {
    "id": "af879",
    "code": "level_premium_period_units",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The type of measurement that is used to define the level premium period, usually years *(On Coverage, LevelPremiumPeriodUnits qualifies LevelPremiumPeriod.)*"
  },
  {
    "id": "af880",
    "code": "commission_rate",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Commission rate for the commission payment (in absence of split). *(On Coverage, CommissionRate provides a rate for the particular Coverage when it varies from the overall Policy. The commission rate that applies to the whole policy is captured in CompensationPayment.)*"
  },
  {
    "id": "af881",
    "code": "e_r_contrib_amt",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Amount of contribution by the employer. *(On Coverage, ERContribAmt applies the amount of employer contribution applicable to this particular coverage.)*"
  },
  {
    "id": "af882",
    "code": "e_e_contrib_amt",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Amount of Salary contribution elected by the participant. When a participant applies for a salary reduction plan (e.g. 401(k)), they specify the amount of their salary that will be contributed from ea *(On Coverage, EEContribAmt applies the amount of employee contribution applicable to this particular coverage.)*"
  },
  {
    "id": "af883",
    "code": "e_r_contrib_pct",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Percentage of contribution by the employer. *(On Coverage, ERContribPct specifies the percentage of premium for which the employer pays for this particular coverage.)*"
  },
  {
    "id": "af884",
    "code": "e_e_contrib_pct",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Percentage of Salary contribution elected by the participant. When a participant applies for a salary reduction plan (e.g. 401(k)), they specify the percentage of their salary that will be contributed *(On Coverage, EEContribPct specifies the percentage of premium for which the employee pays for this particular coverage.)*"
  },
  {
    "id": "af885",
    "code": "cov_option",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "A coverage option further describes or modifies the parent Coverage (Life) or Rider (Annuity or DisabilityHealth) Object with which it is associated. *(On Coverage, CovOption is used to model insurance components. When a component is dependent on the existence and continuation of another component ( i.e. its superior/ parent) and its effect / attribu)*"
  },
  {
    "id": "af886",
    "code": "life_participant",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "This object represents the different participants that are associated with a particular coverage. It contains properties that are unique to the issuance of life insurance. A party ID is utilized to ob *(On Coverage, LifeParticipant represents the different participants that are associated with a particular coverage. It contains properties that are unique to the issuance of life insurance. A PartyID a)*"
  },
  {
    "id": "af887",
    "code": "attachment",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "This contains a collection of attachments. Each attachment could contain any of the attachment Types defined. In the Attachment object the three items AttachmentData, AttachmentReference, and Attachme"
  },
  {
    "id": "af888",
    "code": "reinsurance_info",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "All of the items needed for reinsurance calculations and reporting. The reserves should be statutory and the substandard reserve should be the sum of the flat extra and the table extra reserves."
  },
  {
    "id": "af889",
    "code": "benefit_limit",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Supports Riders, Coverages, and CovOptions with one or more benefit limits. In addition to describing the coverage being provided, these limits would be used as input to the validation of Claims. *(On Coverage, BenefitLimit is typically assumed to be a percentage of the base Coverage benefit when the limit is defined as a percentage.)*"
  },
  {
    "id": "af890",
    "code": "restriction_info",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Contains information relating to Restrictions. *(On Coverage, RestrictionInfo can be used for disability health options to define whether HIPAA rules apply.)*"
  },
  {
    "id": "af891",
    "code": "underwriting_review",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Reason(s) for the current status of the coverage *(On Coverage, UnderwritingReview documents the reason(s) for the current values in LifeCovStatus and StatusReason. Note that UnderwritingReview aggregates defined on a base Coverage generally apply to )*"
  },
  {
    "id": "af892",
    "code": "sub_account_info",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Contains information about sub accounts linked to this Coverage."
  },
  {
    "id": "af893",
    "code": "alt_prem_mode",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "This aggregate provides details about alternative payment mode, method and amounts. Note that this does not necessarily imply that these may be used in lieu of the currently selected premium mode. For *(On Coverage, AltPremMode represents the coverage level detail payment amounts for each mode and method. One possible use is for Illustrations where component part of the premium need to be indicated.)*"
  },
  {
    "id": "af894",
    "code": "added_date",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The added date describes the date the component is added to the contract, regardless of its effective date. It is common for the effective date of a component to be a policy anniversary or monthiversa *(On Coverage, AddedDate represents the date the Coverage was added to the internal Policy (usually during or prior to the underwriting process). See also IssueDate, which represents the date when an in)*"
  },
  {
    "id": "af895",
    "code": "issue_date",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Date when an insurance company issues a policy or policy component. This is commonly the date the policy is printed. This date may be different from the date the insurance coverage becomes effective.  *(On Coverage, IssueDate represents the date when an insurance company issues the coverage. This date would be specified in situations where the Coverage is issued after the Policy. See also AddedDate, )*"
  },
  {
    "id": "af896",
    "code": "exercise_date",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "This is the date when this components benefit or option can next be elected or activated. *(On Coverage, ExerciseDate represents the next available date when this coverage's benefit or option is available to be elected.)*"
  },
  {
    "id": "af897",
    "code": "duration",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Unless otherwise indicated by a duration qualifier, Duration is specified in years based on current point in time. Numerous calculations and financial statements require knowing the current duration t *(On Coverage, Duration represents the year number (count) that indicates the duration of time that the coverage has been in effect in whole years, starting in year 1. For example, a coverage that was i)*"
  },
  {
    "id": "af898",
    "code": "last_anniversary_date",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Last anniversary date processed. *(On Coverage, LastAnniversaryDate represents the last anniversary date for the Coverage. Coverages can be added at any time, so they may have different anniversary dates from the Holding.)*"
  },
  {
    "id": "af899",
    "code": "next_anniversary_date",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "This is the anniversary date of any anniversary notification amounts. The next anniversary date is the date that anniversary changes will be processed. This date should not be confused with the next m *(On Coverage, NextAnniversaryDate represents the next anniversary date for the Coverage. Coverages can be added at any time, so they may have different anniversary dates from the Holding.)*"
  },
  {
    "id": "af900",
    "code": "issue_gender",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Insurance gender rate basis. Identifies the gender used for rating purposes. *(On Coverage, IssueGender represents the gender used for issuing the coverage. On a joint or multi-life case, it would represent a gender rate basis identified that combines gender information across t)*"
  },
  {
    "id": "af901",
    "code": "status_change_date",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The date the parent object was changed to its current status. *(On Coverage, StatusChangeDate is the date the coverage status (LifeCovStatus) last changed.)*"
  },
  {
    "id": "af902",
    "code": "group_coverage",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "If the policy being modeled is a group plan, then certain group insurance specific details will be stored here for convenience. *(On Coverage, GroupCoverage is used on the group master Holding (when HoldingTypeCode = OLI_HOLDTYPE_GROUPMASTER) to define the parameters specific to this group of insureds.)*"
  },
  {
    "id": "af903",
    "code": "condition_type_option",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Used to indicate condition types defined for this product. *(On Coverage, ConditionTypeOption indicates the conditions that are covered by this coverage)*"
  },
  {
    "id": "af904",
    "code": "upgrade_available_ind",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Indicates that an upgrade is available. TRUE indicates that an upgrade is available. FALSE indicates that an upgrade is NOT available. *(On Coverage, UpgradeAvailableInd indicates that a newer version of this same benefit is available for selection. This is a common feature in South Africa.)*"
  },
  {
    "id": "af905",
    "code": "keyed_value",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Generic object used to extend object hierarchy for proprietary data requirements. Each proprietary data item is represented using a KeyedValue object. A collection of KeyedValue objects is utilized to"
  },
  {
    "id": "af906",
    "code": "coverage_x_lat",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The string fields for the data model are represented in the language specified by OLifE/CurrentLanguage. This object contains the string fields that were deemed pertinent to be presented in one or mor *(On Coverage, CoverageXLat is used to represent string elements in a language other than the default language specified by OLifE/CurrentLanguage.)*"
  },
  {
    "id": "af907",
    "code": "paid_up_date",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The date upon which the parent object is or will be paid up. Paid up means that no further premium payments are required based on guaranteed interest and Guaranteed COI assumptions. *(On Coverage, PaidUpDate represents the date the specific Coverage is paid up.)*"
  },
  {
    "id": "af908",
    "code": "mortality_or_morbidity_table",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Identifies the mortality rate table to use, to obtain the mortality rate used to calculate the policy reserves. Each plan (i.e., layer of coverage) may have its own mortality table definition within P"
  },
  {
    "id": "af909",
    "code": "charge_total_amt",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The sum of the policy's Cost of Insurance charges and the monthly expense charges made on the policy's last month-i-versary as determined by plan."
  },
  {
    "id": "af910",
    "code": "reserve_int_rate",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The ultimate interest rate used in calculating reserves for the plan. For plans that utilize only a single interest rate, this property holds the single interest rate. For plans that utilize split int"
  },
  {
    "id": "af911",
    "code": "participating_c_s_v_ind",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Participating / non-participating indicator regarding participation in cash surrender values. TRUE indicates the Plan provides cash surrender values to the policy owner. FALSE indicates it does not. *(On Coverage, ParticipatingCSVInd indicates the participation rights of the policy owner with respect to cash surrender values for this particular coverage based on last update.)*"
  },
  {
    "id": "af912",
    "code": "prior_cov_number",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "In the case of a conversion, replacement, exchange or reissue, this is the original coverage number of the coverage. *(On Coverage, PriorCovNumber is a denormalization necessary for reinsurance transactions because there is no way to show a relationship between a current coverage and a prior coverage. It is only valid)*"
  },
  {
    "id": "af913",
    "code": "issue_basis",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "This is a value used by the actuaries for calculation or premium rates. Issue Basis is kind of a unique identifier for particular products pricing/premium rates used for contract calculations when req"
  },
  {
    "id": "af914",
    "code": "death_benefit_pct_inc",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The percent increase of a Death Benefit Option, typically as indicated on a life insurance application. The type of percent increase (Simple or Compound) is defined in using DeathBenefitOptType."
  },
  {
    "id": "af915",
    "code": "fee",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "An aggregate describing fees to be charged. *(On Coverage, Fee communicates any fees outside of any premium associated to the coverage. Some fees may be based on the coverage. In those cases, fee is modeled at the coverage level. It is assumed th)*"
  },
  {
    "id": "af916",
    "code": "reserve_function",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The method used to calculate reserves. Defines the mortality function used to calculate reserves and net premium for valuation."
  },
  {
    "id": "af917",
    "code": "joint_age_basis",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The method to be used to calculate the joint age. *(On Coverage, this indicates the method used to calculated the joint age at time of issue.)*"
  },
  {
    "id": "af918",
    "code": "line_of_business",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Line of business of the insurance. *(On Coverage, this indicates the line of business the particular coverage type represents.)*"
  },
  {
    "id": "af919",
    "code": "paid_to_date",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The date to which the contract is currently funded. *(On Coverage, PaidToDate is the date to which the coverage is currently funded.)*"
  },
  {
    "id": "af920",
    "code": "participating_ind",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "TRUE indicates the product is designed to pay a dividend to the policy owner. FALSE indicates the product is not designed to pay a dividend to the policy owner. *(On Coverage, ParticipatingInd indicates the participation rights of the policy owner with respect to dividends for this particular coverage based on last update. The value specified on the base Covera)*"
  },
  {
    "id": "af921",
    "code": "prior_eff_date",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "In the case of a conversion, replacement, exchange or reissue, this is the original effective date of the plan. *(On Coverage, PriorEffDate is a denormalization necessary for reinsurance transactions because there is no way to show a relationship between a current coverage and a prior coverage.)*"
  },
  {
    "id": "af922",
    "code": "description",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "The Description field defines a human readable, displayable, paragraph of detailed information for the corresponding object/concept. It provides a more detailed explanatory narrative for the object/co *(On Coverage, Description is a string description of the rider.)*"
  },
  {
    "id": "af923",
    "code": "num_lives",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "In the case of a multi life coverage where there are more than 2 lives, (as indicated by LivesType), this indicates the total number of lives covered by this coverage."
  },
  {
    "id": "af924",
    "code": "num_children_excluded",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Number of children in this household excluded *(On Coverage, NumChildrenExcluded represents the total number of children in the family excluded from this policy. It will be used in conjunction with NumChildren to determine the number of children in)*"
  },
  {
    "id": "af925",
    "code": "num_children",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "This is the total number of children. There is no direct relationship between this value and the number of children represented using the Relation object because data entry personnel such as the agent *(On Coverage, NumChildren represents the total number of children in the family. It will be used in conjunction with NumChildrenExcluded to determine the number of children included on this policy)*"
  },
  {
    "id": "af926",
    "code": "initial_reserve_int_rate",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "For plans that utilize split interest for reserve calculations, this is the initial interest rate *(On Coverage, InitialReserveIntRate is used through the ReserveIntRateSplitDur. The ultimate interest rate should appear in ReserveIntRate. When a single interest rate is used, it should appear in Rese)*"
  },
  {
    "id": "af927",
    "code": "reserve_int_rate_split_dur",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "For plans that utilize split interest for reserve calculations, this is the duration (policy year) after which the ultimate interest rate becomes effective. For example, a plan may have 5.5% interest  *(On Coverage, ReserveIntRateSplitDur is the duration at which the initial interest rate ends. When a single interest rate is used, it should appear in ReserveIntRate; both InitialReserveIntRate and Res)*"
  },
  {
    "id": "af928",
    "code": "net_current_amt",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Represents the current benefit amount payable, after adjustments as defined by the policy. For example, if a $250,000 Universal Life Policy has a loan, the CurrentPayableAmt would reflect the current  *(On Coverage, NetCurrentAmt is the payable amount not including options.)*"
  },
  {
    "id": "af929",
    "code": "conversion_credit_amt",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Face amount that is eligible for conversion to another policy without evidence of insurability or additional underwriting."
  },
  {
    "id": "af930",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af931",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Record creation timestamp."
  },
  {
    "id": "af932",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Record last update timestamp."
  },
  {
    "id": "af933",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "coverage",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af934",
    "code": "cov_option_id",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Primary key for Coverage Option."
  },
  {
    "id": "af935",
    "code": "policy_id",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "FK → policy.policy_id"
  },
  {
    "id": "af936",
    "code": "party_id",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "FK → party.party_id"
  },
  {
    "id": "af937",
    "code": "cov_option_key",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "CovOption Key"
  },
  {
    "id": "af938",
    "code": "cov_option_sys_key",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "CovOption System Key"
  },
  {
    "id": "af939",
    "code": "short_name",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The abbreviated or short name."
  },
  {
    "id": "af940",
    "code": "marketing_name",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The marketing name given by the carrier for this item. *(On CovOption, MarketingName indicates the version marketing name associated with a product. MarketingName is the carriers marketing name associated with the ProductVersionCode.)*"
  },
  {
    "id": "af941",
    "code": "plan_name",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Full name of plan. This is the complete, official, and/or legal name used for this policy/coverage/option."
  },
  {
    "id": "af942",
    "code": "product_code",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "This is a carrier assigned code used to identify the object that contains this property. Because the code is assigned by a carrier, it is typically used in conjunction with a CarrierCode to create a u"
  },
  {
    "id": "af943",
    "code": "product_version_code",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "ProductVersionCode defines the version of a product, particularly when a company uses the same ProductCode across versions. Business users require the ability to vary product information without creat"
  },
  {
    "id": "af944",
    "code": "form_no",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "This is the home office form number associated when a form is applicable."
  },
  {
    "id": "af945",
    "code": "class_name",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Carrier's nomenclature (or marketing name) for this underwriting class."
  },
  {
    "id": "af946",
    "code": "underwriting_class_ranking",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "This is the ranking of the relevant underwriting class in the context of all underwriting classes available for the product. The most favorable class is 1."
  },
  {
    "id": "af947",
    "code": "cov_option_status",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Status of the Coverage Option"
  },
  {
    "id": "af948",
    "code": "issue_type",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The type of underwriting used for this policy. For example: Full Underwriting, Mass Underwriting, Reduced Underwriting, Simplified Underwriting, etc."
  },
  {
    "id": "af949",
    "code": "issue_sub_type",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Used to specify sub-categories of issue type. For example,\"Full Underwriting\" may be further refined into non-medical underwriting, paramedical underwriting, and full medical underwriting based on the *(On CovOption, IssueSubType is used with IssueType to provide additional detail about the type of underwriting that was applied to the coverage option.)*"
  },
  {
    "id": "af950",
    "code": "life_cov_opt_type_code",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Benefits selected on an insurance policy, such as accelerated benefit, death benefit, etc. *(On CovOption, LifeCovOptTypeCode is utilized for both life insurance benefits as well as disability/health/long term care benefits despite what the name implies.)*"
  },
  {
    "id": "af951",
    "code": "expiry_date",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The date the item will mature or expire and is no longer in force. *(On CovOption, ExpiryDate may represent the maturity date or the expiry date depending on the type of CovOption.)*"
  },
  {
    "id": "af952",
    "code": "rating_reason",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "This reason the coverage option was rated by the underwriter. The reason can also be used for field underwritten cases. *(On CovOption, RatingReason is one of many properties used to describe rating information. The rating information on CovOption is used to override any individual ratings on the coverage participants fo)*"
  },
  {
    "id": "af953",
    "code": "rating_overridden_ind",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "This indicates if the underwriter overrode the rating as applied for. TRUE indicates the the underwriter overrode the rating and FALSE indicates the underwriter did NOT override the rating. *(On CovOption, RatingOverriddenInd is one of many properties used to describe rating information. The rating information on CovOption is used to override any individual ratings on the coverage particip)*"
  },
  {
    "id": "af954",
    "code": "rating_commission_rule",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Commission rules for substandard rating premium payments. *(On CovOption, RatingCommissionRule is one of many properties used to describe rating information. The rating information on CovOption is used to override any individual ratings on the coverage partici)*"
  },
  {
    "id": "af955",
    "code": "tobacco_premium_basis",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Used to classify insurance policy underwriting categories related to tobacco usage. This element is NOT used to classify the tobacco or nicotine usage history of natural persons. For that purpose, ref"
  },
  {
    "id": "af956",
    "code": "perm_table_rating",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "A table of valuation of risk of an individual or organization. This is a permanent rating according to this table for this individual or organization. In the USA, this is the preferred representation  *(On CovOption, PermTableRating is used with PermPercentageLoading and PermTableRatingAlphaCode to define a permanent rating. Please refer to the definition of PermTableRating for details on this usage.)*"
  },
  {
    "id": "af957",
    "code": "perm_table_rating_end_date",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The date the permanent table rating ends. This date may be established by the Product's definition, such as an Occupational Rating that terminates at age 65, or used where coverage has been re-underwr *(On CovOption, PermTableRatingEndDate is one of many properties used to describe rating information. The rating information on CovOption is used to override any individual ratings on the coverage parti)*"
  },
  {
    "id": "af958",
    "code": "temp_table_rating",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "A table of valuation of risk of an individual or organization. This is a temporary rating according to this table for this individual or organization. In the USA, this is the preferred representation  *(On CovOption, TempTableRating is used with TempPercentageLoading and TempTableRatingCode to define a temporary rating. Please refer to the definition of TempTableRating for details on this usage. The )*"
  },
  {
    "id": "af959",
    "code": "temp_table_rating_start_date",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "In USA, this field represents the start date associated with TempTableRating. In Australia, this field represents the Temporary Percentage Loading Start Date for use with TempPercentageLoading. *(On CovOption, TempTableRatingStartDate is assumed to be the same as the Effective Date (EffDate) of the CovOption if TempTableRatingStartDate is not specified and if temporary table rating information)*"
  },
  {
    "id": "af960",
    "code": "temp_table_rating_end_date",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "In USA, this field represents the end date associated with TempTableRating. In Australia, this field represents the Temporary Percentage Loading End Date for use with TempPercentageLoading. *(On CovOption, TempTableRatingEndDate is one of many properties used to describe rating information. The rating information on CovOption is used to override any individual ratings on the coverage parti)*"
  },
  {
    "id": "af961",
    "code": "qual_add_benefit_ind",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Used to determine if the cost of this coverage should be included when calculating cost basis. TRUE means it should be included. FALSE means it should NOT be included."
  },
  {
    "id": "af962",
    "code": "lives_type",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Type code indicating if coverage is single, joint or multi-life and what life the benefit payment is based on (e.g. first to die, last to die)."
  },
  {
    "id": "af963",
    "code": "issued_as_applied_ind",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "TRUE means the coverage for this component or contract was issued as applied for. In this context a component is considered to be issued as applied for if no material change is made to the component d *(On CovOption, IssuedAsAppliedInd is set to TRUE when no material changes were made to this specific option or any of its child objects/aggregates prior to issue. However the IssuedAsAppliedInd on its )*"
  },
  {
    "id": "af964",
    "code": "underwriting_class",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Underwriting Class"
  },
  {
    "id": "af965",
    "code": "underwriting_sub_class",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "A further breakdown of Underwriting Class, most commonly used to allow for making a slightly different offer, where the change in risk is determined to fit in between classes, but not sufficient to go"
  },
  {
    "id": "af966",
    "code": "prem_source_type",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "PremSourceType documents where the money originated from as opposed to where the money is currently held (which is SourceOfFundsTC). For example, the premium payment may be paid from a savings account"
  },
  {
    "id": "af967",
    "code": "annual_prem_amt",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Base annualized premium of this coverage. Does not include associated options."
  },
  {
    "id": "af968",
    "code": "modal_prem_amt",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Current modal premium/ payment amount. May also be known as billed premium amount. Represents the amount that the carrier expects to be paid."
  },
  {
    "id": "af969",
    "code": "cov_option_pct_ind",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "TRUE indicates the benefit amount is a percent stored in OptionPct. FALSE indicates the benefit is a unit amount stored in OptionAmt. This is true when the benefit is defined as a percentage instead o"
  },
  {
    "id": "af970",
    "code": "option_amt",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Face amount of benefit."
  },
  {
    "id": "af971",
    "code": "option_pct",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Option Percentage"
  },
  {
    "id": "af972",
    "code": "option_pct_type",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Identifies how the interest will be calculated. For example, simple or compound. *(On CovOption, OptionPctType is used to specify the percent type such as simple or compound as it relates to OptionPct.)*"
  },
  {
    "id": "af973",
    "code": "option_number_of_units",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Number Of Units for this Option"
  },
  {
    "id": "af974",
    "code": "value_per_unit",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The value per unit of the face units on the basic coverage on the policy. For coverages that are defined as units the value per unit is required in order for the total value to be calculated."
  },
  {
    "id": "af975",
    "code": "death_benefit_amt",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The total benefit that would be paid upon the death of the primary, or joint, insured. It is net of any prior surrender charges, loans, cash value adjustments or term dividends. Prior to version 2.22,"
  },
  {
    "id": "af976",
    "code": "temp_flat_extra_amt",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "On substandard risks, this amount is an additional charge to the insured for a predetermined period of time, such as five years. The idea here is the same as for the Permanent Flat extra (compensating *(On CovOption, TempFlatExtraAmt is one of many properties used to describe rating information. The rating information on CovOption is used to override any individual ratings on the coverage participant)*"
  },
  {
    "id": "af977",
    "code": "temp_flat_end_date",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Last date at which no further flat extra amount is required in addition to the regularly scheduled premium for the additional risk carried by the company. *(On CovOption, TempFlatEndDate is one of many properties used to describe rating information. The rating information on CovOption is used to override any individual ratings on the coverage participants)*"
  },
  {
    "id": "af978",
    "code": "perm_flat_extra_amt",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "On substandard risks, this amount is an additional charge to the insured for the life of the policy. Because the insured represents a higher risk to the company, the flat extra is charged to compensat *(On CovOption, PermFlatExtraAmt is one of many properties used to describe rating information. The rating information on CovOption is used to override any individual ratings on the coverage participant)*"
  },
  {
    "id": "af979",
    "code": "perm_flat_extra_end_date",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The date the permanent flat extra rating ends. This date is established when coverage has been re-underwritten and is determined by the insurer that the rating no longer applies as of this date."
  },
  {
    "id": "af980",
    "code": "flat_extra_prem_basis",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Flat Extra Basis tells what amount to use to determine the flat extra premium. *(On CovOption, FlatExtraPremBasis is one of many properties used to describe rating information. The rating information on CovOption is used to override any individual ratings on the coverage participa)*"
  },
  {
    "id": "af981",
    "code": "modal_gross_flat_extra_prem_amt",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The gross amount payable to the ceding company by the reinsurer in lieu of actual commissions and expenses incurred by the ceding company. *(On CovOption, ModalGrossFlatExtraPremAmt is one of many properties used to describe rating information. The rating information on CovOption is used to override any individual ratings on the coverage p)*"
  },
  {
    "id": "af982",
    "code": "modal_gross_flat_extra_allowance_amt",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "An amount payable to the ceding company by the reinsurer in lieu of actual commissions and expenses incurred by the ceding company. *(On CovOption, ModalGrossFlatExtraAllowanceAmt is one of many properties used to describe rating information. The rating information on CovOption is used to override any individual ratings on the cover)*"
  },
  {
    "id": "af983",
    "code": "eff_date",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "This will usually indicate when an aggregate is effective (e.g. CommSchedule, LifeParticipant and Participant) or the actual effective date which may be used for the calculation of the anniversary dat"
  },
  {
    "id": "af984",
    "code": "exercise_date",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "This is the date when this components benefit or option can next be elected or activated."
  },
  {
    "id": "af985",
    "code": "term_date",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Termination Date is the date the aggregate is no longer effective. *(On CovOption, TermDate represents the date the option is no longer in force.)*"
  },
  {
    "id": "af986",
    "code": "grace_period_start_date",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The date that the contract will enter lapse processing. May also be called the No Lapse Fail Date. When used on No Lapse Guarantee options (LifeCovOptionType tc=9), this represents the date on which t"
  },
  {
    "id": "af987",
    "code": "temp_percentage_loading",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "In the USA, this field should only be used when a percentage value is not available in TempTableRating. In this scenario, TempTableRating would be mapped to Other and the actual percentage value would *(On CovOption, TempPercentageLoading is used with TempTableRating and TempTableRatingCode to define a temporary rating. Please refer to the definition of TempTableRating for details on this usage. The )*"
  },
  {
    "id": "af988",
    "code": "perm_percentage_loading",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "This field should only be used when a percentage value is not available in PermTableRating. In this scenario, PermTableRating would be mapped to Other and the actual percentage value would be represen *(On CovOption, PermPercentageLoading is used with PermTableRating and PermTableRatingAlphaCode to define a permanent rating. Please refer to the definition of PermTableRating for details on this usage.)*"
  },
  {
    "id": "af989",
    "code": "filed_form_number",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The 'Policy Form Number' for this Coverage, as filed with the State (in the U.S.) or other appropriate regulating jurisdiction"
  },
  {
    "id": "af990",
    "code": "elimination_period",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Period of time after disability before benefits are paid"
  },
  {
    "id": "af991",
    "code": "benefit_period",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The benefit period an option is guaranteed for, for example it applies to long term care."
  },
  {
    "id": "af992",
    "code": "benefit_mode",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Mode for benefit payment amount"
  },
  {
    "id": "af993",
    "code": "premium_per_unit",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The premium charged per unit of the face units on the basic coverage on the policy. For coverages that are defined as units this is the annual premium per unit. It is required in order for a system to"
  },
  {
    "id": "af994",
    "code": "premium_rate_per_unit",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The current premium rate per unit of volume."
  },
  {
    "id": "af995",
    "code": "renewal_premium_per_unit",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The renewal premium per unit of volume."
  },
  {
    "id": "af996",
    "code": "renewal_premium_rate_per_unit",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The renewal premium rate per unit of volume."
  },
  {
    "id": "af997",
    "code": "renewal_prem_amt",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The amount of annual premium upon next renewal"
  },
  {
    "id": "af998",
    "code": "max_benefit_amt",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Maximum amount of benefit."
  },
  {
    "id": "af999",
    "code": "commission_link",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "A code used to tie related commission objects together"
  },
  {
    "id": "af1000",
    "code": "added_date",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The added date describes the date the component is added to the contract, regardless of its effective date. It is common for the effective date of a component to be a policy anniversary or monthiversa"
  },
  {
    "id": "af1001",
    "code": "modal_gross_perm_flat_allow_amt",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The modal gross flat extra allowance amount for the permanent flat extra represented at this level. *(On CovOption, ModalGrossPermFlatAllowAmt is one of many properties used to describe rating information. The rating information on CovOption is used to override any individual ratings on the coverage p)*"
  },
  {
    "id": "af1002",
    "code": "perm_table_rating_alpha_code",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The code mnemonic associated with the percentage represented in PermTableRating or PermPercentageLoading. See definition in PermTableRating for more information on the usage of these fields. Used in c *(On CovOption, PermTableRatingAlphaCode is used with PermTableRating and PermPercentageLoading to define a permanent rating. Please refer to the definition of PermTableRating for details on this usage.)*"
  },
  {
    "id": "af1003",
    "code": "temp_table_rating_code",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The code mnemonic associated with the percentage represented in TempTableRating or TempPercentageLoading. See definition in TempTableRating for more information on the usage of these fields. Used in c *(On CovOption, TempTableRatingCode is used with TempTableRating and TempPercentageLoading to define a temporary rating. The rating information on CovOption is used to override any individual ratings on)*"
  },
  {
    "id": "af1004",
    "code": "modal_gross_temp_flat_allow_amt",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The modal gross flat extra allowance amount for the temporary flat extra represented at this level. *(On CovOption, ModalGrossTempFlatAllowAmt is one of many properties used to describe rating information. The rating information on CovOption is used to override any individual ratings on the coverage p)*"
  },
  {
    "id": "af1005",
    "code": "paid_up_date",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The date upon which the parent object is or will be paid up. Paid up means that no further premium payments are required based on guaranteed interest and Guaranteed COI assumptions. *(On CovOption, PaidUpDate represents the date the specific CovOption is paid up.)*"
  },
  {
    "id": "af1006",
    "code": "temp_flat_extra_duration",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Duration in years the temporary flat extra charge is in effect. *(On CovOption, TempFlatExtraDuration is one of many properties used to describe rating information. The rating information on CovOption is used to override any individual ratings on the coverage partic)*"
  },
  {
    "id": "af1007",
    "code": "cov_option_number",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "This is used as part of the identification of the CovOption when an administration system tracks these, much like PolNumber identifies the policy."
  },
  {
    "id": "af1008",
    "code": "temp_flat_start_date",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "First date at which flat extra amount is required in addition to the regularly scheduled premium for the additional risk carried by the company. If not valued, it is assumed that it starts based on th *(On CovOption, TempFlatStartDate is one of many properties used to describe rating information. The rating information on CovOption is used to override any individual ratings on the coverage participan)*"
  },
  {
    "id": "af1009",
    "code": "guideline_ann_prem",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The Guideline Annual Premium is determined using assumptions specified in the Tax Equity and Fiscal Responsibility Act of 1982 (TEFRA - IRC Section 7702), and used in the test for whether a policy qua"
  },
  {
    "id": "af1010",
    "code": "guideline_ann_prem_sum",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Cumulative amount of the guideline annual premiums for this coverage."
  },
  {
    "id": "af1011",
    "code": "guideline_single_prem",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The Annual Guideline Single Premium which is the premium needed to be made on a single basis to endow the policy based on guaranteed assumptions and 6% interest."
  },
  {
    "id": "af1012",
    "code": "mec7_d_b_lowest",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Lowest death benefit for the current Modified Endowment Contract (MEC) 7-pay period"
  },
  {
    "id": "af1013",
    "code": "s_e_c_guideline_prem",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Securities and Exchange Commission (SEC) guideline annual premium is similar in concept to Coverage\\GuidelineAnnPrem, but calculated with a 5% interest assumption. It is used to test the 'reasonablene"
  },
  {
    "id": "af1014",
    "code": "min_prem_amt",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "This is current no lapse guarantee premium for a policy, coverage, or coverage option. This premium is normally adjusted when changes in coverages occur such as an increase or decrease in coverage. If"
  },
  {
    "id": "af1015",
    "code": "target_prem_amt_a_t_d",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The accumulated target premium for this coverage since the last policy anniversary."
  },
  {
    "id": "af1016",
    "code": "target_prem_amt_i_t_d",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The accumulated target premium for this coverage since Issue."
  },
  {
    "id": "af1017",
    "code": "target_prem_amt_m_t_d",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The accumulated target premium for this coverage since the last monthly anniversary."
  },
  {
    "id": "af1018",
    "code": "target_prem_amt_y_t_d",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The accumulated target premium for this coverage during the current calendar year."
  },
  {
    "id": "af1019",
    "code": "g_d_b_prem",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Normally, in order to qualify for the guaranteed death benefit, the policy owner must have cumulatively paid premiums equal to a minimum amount. This amount would be the sum of month by month GDB prem *(On CovOption, GDBPrem represents the cumulative amount of premium that must be paid in order to keep a Guaranteed Death Benefit or No Lapse Guarantee in effect. The owner must have paid premiums equal)*"
  },
  {
    "id": "af1020",
    "code": "g_d_b_skip_payment_duration",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "This is the number of modal payments that may be 'skipped' due to excess monies received, as compared to the amount required to keep the guaranteed death benefit or no lapse guarantee in effect."
  },
  {
    "id": "af1021",
    "code": "duration",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Unless otherwise indicated by a duration qualifier, Duration is specified in years based on current point in time. Numerous calculations and financial statements require knowing the current duration t *(On CovOption, Duration represents the year number (count) that indicates the duration of time that the CovOption has been in effect in whole years, starting in year 1. For example, a CovOption that wa)*"
  },
  {
    "id": "af1022",
    "code": "duration_design",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Duration for renewable, level and decreasing terms and duration of limited pay and graded premium whole life - represented in years as integer; if coverage is for life or not applicable, integer will  *(On CovOption, DurationDesign represents the number of years for which the option is issued.)*"
  },
  {
    "id": "af1023",
    "code": "pre_existing_condition_ind",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "This is an indicator that defines whether pre-existing conditions limit the benefits for claims or the validation of the policy. Sometimes a pre-existing condition unknown by the carrier can result in"
  },
  {
    "id": "af1024",
    "code": "child_mature_age",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The attained age at which the child coverage or benefit ceases."
  },
  {
    "id": "af1025",
    "code": "child_age_use",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Identified the method of calculating the child coverage cease date."
  },
  {
    "id": "af1026",
    "code": "benefit_coordination_ind",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "TRUE indicates this is a product provision that requires coordination of benefits. FALSE indicates it does not require coordination of benefits. Coordination of benefits is the practice of ensuring th"
  },
  {
    "id": "af1027",
    "code": "target_prem_amt",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The target premium is a carrier-defined specific value normally used in the calculation of commissions."
  },
  {
    "id": "af1028",
    "code": "annual_index_type",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The type of Premium Increase chosen."
  },
  {
    "id": "af1029",
    "code": "pay_to_age",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The age to which premiums are paid in a fixed plan. In a flexible premium plan the maximum age to which premiums can be accepted. Applicable to both FixedPremiumDesign and FlexiblePremiumDesign when d *(On CovOption, PayToAge reflects the age to which a product is paid from the design of the underlying product. Either PayToAge or PayToYear may be specified, not both.)*"
  },
  {
    "id": "af1030",
    "code": "pay_to_year",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The number of years for which premiums are paid in a fixed premium plan. In a flexible premium plan the maximum number of years to which premiums can be accepted. Applicable to both FixedPremiumDesign *(On CovOption, PayToYear reflects the year to which a product is paid from the design of the underlying product. Either PayToAge or PayToYear may be specified, not both.)*"
  },
  {
    "id": "af1031",
    "code": "perm_rating_amt_per_thou",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Amount per thousand that is charged for the permanent substandard rating *(On CovOption, PermRatingAmtPerThou is one of many properties used to describe rating information. The rating information on CovOption is used to override any individual ratings on the coverage partici)*"
  },
  {
    "id": "af1032",
    "code": "temp_rating_amt_per_thou",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Amount per thousand that is charged for the temporary substandard rating *(On CovOption, TempRatingAmtPerThou is one of many properties used to describe rating information. The rating information on CovOption is used to override any individual ratings on the coverage partici)*"
  },
  {
    "id": "af1033",
    "code": "temp_flat_extra_override_end_date",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "TempFlatExtraOverrideEndDate may be exception overridden end dates per post-issue underwriting decisions. The TempFlatExtraOverrideEndDate is used to override the temporary rating end date in cases wh *(On CovOption, TempFlatExtraOverrideEndDate is equivalent to the EndDate property on the SubstandardRating object. The rating information on CovOption is used to override any individual ratings on the )*"
  },
  {
    "id": "af1034",
    "code": "temp_flat_extra_override_eff_date",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "For Substandard Rating in cases where coverage is added post issue, the rating effective date may be required in situations where insurability of the insured differs from the original issue. *(On CovOption, TempFlatExtraOverrideEffDate is equivalent to the EffDate property on the SubstandardRating object. The rating information on CovOption is used to override any individual ratings on the )*"
  },
  {
    "id": "af1035",
    "code": "occupation",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Occupation for the person. Can include values such as 'Doctor,' 'Lawyer,' etc. *(On CovOption, Occupation is one of many properties used to describe rating information. The rating information on CovOption is used to override any individual ratings on the coverage participants for )*"
  },
  {
    "id": "af1036",
    "code": "occup_rating",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "This table contains sub types for rating types such as Occupational or Aviation. *(On CovOption, OccupRating essentially serves as a sub type for the PermRatingType and TempRatingType properties. This correlates to the PermTableRatingInfo/RatingSubType and TempTableRatingInfo/Rating)*"
  },
  {
    "id": "af1037",
    "code": "last_rating_date",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Last date a rate was applied to the policy for this insured. *(On CovOption, LastRatingDate is one of many properties used to describe rating information. The rating information on CovOption is used to override any individual ratings on the coverage participants )*"
  },
  {
    "id": "af1038",
    "code": "temp_rating_type",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The reasons for rating a policy which could include occupation risk, aviation risk, or an impairment. *(On CovOption, TempRatingType may be further clarified using the OccupRating property. For example, if TempRatingType = Aviation, the type of Aviation rating is specified in OccupRating. The rating inf)*"
  },
  {
    "id": "af1039",
    "code": "perm_rating_type",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The reasons for rating a policy which could include occupation risk, aviation risk, or an impairment. *(On CovOption, PermRatingType may be further clarified using the OccupRating property. For example, if PermRatingType = Aviation, the type of Aviation rating is specified in OccupRating. The rating inf)*"
  },
  {
    "id": "af1040",
    "code": "level_premium_period",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The period of time that the premium is designed to be level according to the product definition of its parent object. This differs from DurationDesign in that DurationDesign is the length of time the"
  },
  {
    "id": "af1041",
    "code": "level_premium_period_units",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The type of measurement that is used to define the level premium period, usually years *(On CovOption, LevelPremiumPeriodUnits qualifies LevelPremiumPeriod.)*"
  },
  {
    "id": "af1042",
    "code": "payment_structure",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "How the premiums are modeled. For example, the option of level or stepped payment structure."
  },
  {
    "id": "af1043",
    "code": "commission_rate",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Commission rate for the commission payment (in absence of split). *(On CovOption, CommissionRate provides a rate for the particular option when it varies from the overall Policy. The commission rate that applies to the whole policy is captured in CompensationPayment.)*"
  },
  {
    "id": "af1044",
    "code": "description",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The Description field defines a human readable, displayable, paragraph of detailed information for the corresponding object/concept. It provides a more detailed explanatory narrative for the object/co *(On CovOption, Description is a string description of the option.)*"
  },
  {
    "id": "af1045",
    "code": "e_r_contrib_amt",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Amount of contribution by the employer. *(On CovOption, ERContribAmt applies the amount of employer contribution applicable to this particular option.)*"
  },
  {
    "id": "af1046",
    "code": "e_e_contrib_amt",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Amount of Salary contribution elected by the participant. When a participant applies for a salary reduction plan (e.g. 401(k)), they specify the amount of their salary that will be contributed from ea *(On CovOption, EEContribAmt applies the amount of employee contribution applicable to this particular option.)*"
  },
  {
    "id": "af1047",
    "code": "e_r_contrib_pct",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Percentage of contribution by the employer. *(On CovOption, ERContribPct specifies the percentage of premium for which the employer pays for this particular option.)*"
  },
  {
    "id": "af1048",
    "code": "e_e_contrib_pct",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Percentage of Salary contribution elected by the participant. When a participant applies for a salary reduction plan (e.g. 401(k)), they specify the percentage of their salary that will be contributed *(On CovOption, EEContribPct specifies the percentage of premium for which the employee pays for this particular option.)*"
  },
  {
    "id": "af1049",
    "code": "upgrade_available_ind",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Indicates that an upgrade is available. TRUE indicates that an upgrade is available. FALSE indicates that an upgrade is NOT available. *(On CovOption, UpgradeAvailableInd indicates that a newer version of this same benefit is available for selection. This is a common feature in South Africa.)*"
  },
  {
    "id": "af1050",
    "code": "modal_perm_rating_amt",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The additional amount of modal premium required for a permanent table rating. *(On CovOption, ModalPermRatingAmt returns the additional amount of modal premium required for a permanent table rating. The per thousand premium amount for a table rating is returned in PermRatingAmtPe)*"
  },
  {
    "id": "af1051",
    "code": "modal_temp_rating_amt",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The additional amount of modal premium required for a temporary table rating. *(On CovOption, ModalTempRatingAmt returns the additional amount of modal premium required for a temporary table rating. The per thousand premium amount for a table rating is returned in TempRatingAmtPe)*"
  },
  {
    "id": "af1052",
    "code": "net_current_amt",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Represents the current benefit amount payable, after adjustments as defined by the policy. For example, if a $250,000 Universal Life Policy has a loan, the CurrentPayableAmt would reflect the current  *(On CovOption, NetCurrentAmt is the current payable amount for the option.)*"
  },
  {
    "id": "af1053",
    "code": "num_available_accrued_occs",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The number of accrued occurrences. For example, a premium holiday benefit may accrue one occurrence per year for a set number of years such as 6. NumAvailableAccruedOccs is used to specify the number  *(On CovOption, MaxNumAvailableAccruedOccs is used to specify the number of occurrences that have accrued automatically. This property pertains to options such as a Premium Holiday which cover multiple )*"
  },
  {
    "id": "af1054",
    "code": "num_available_requested_occs",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The number of occurrences that may be requested. For example, a premium holiday benefit may allow a contracting party to request premium holidays after a set number of premiums have been paid. NumAvai *(On CovOption, NumAvailableRequestedOccs is used to specify the number of requested occurrences available for use. This property pertains to options such as a Premium Holiday which cover multiple occur)*"
  },
  {
    "id": "af1055",
    "code": "num_used_requested_occs",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The number of requested occurrences that have been used. For example, a premium holiday benefit may allow a contracting party to request premium holidays after a set number of premiums have been paid. *(On CovOption, NumUsedRequestedOccs is used to specify the number of requested occurrences that have been used. This property pertains to options such as a Premium Holiday which cover multiple occurren)*"
  },
  {
    "id": "af1056",
    "code": "total_used_occs",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The total number of occurrences that have been used. *(On CovOption, TotalUsedOccs is used to specify the total number of occurrences that have been used. This property pertains to options such as a Premium Holiday which cover multiple occurrences or even)*"
  },
  {
    "id": "af1057",
    "code": "num_reinstated_occs",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The number of occurrences that are reinstated. For example, if the premiums waived during a premium holiday are repaid, that used instance can be reinstated. *(On CovOption, NumReinstatedOccs is used to specify the total number of occurrences that have been reinstated. This property pertains to options such as a Premium Holiday which cover multiple occurrenc)*"
  },
  {
    "id": "af1058",
    "code": "reinsurance_info",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "All of the items needed for reinsurance calculations and reporting. The reserves should be statutory and the substandard reserve should be the sum of the flat extra and the table extra reserves."
  },
  {
    "id": "af1059",
    "code": "substandard_rating",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The purpose of this object is to contain tables 2 through x that are needed to handle substandard cases. The first rating, table, etc should be stored on the respective parent Life Participant or Part *(On CovOption, SubstandardRating should be used to contain subsequent occurrences of each Permanent and/or Temporary extra. The singularly occurring rating properties on CovOption should be used to doc)*"
  },
  {
    "id": "af1060",
    "code": "cov_option_x_lat",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "The string fields for the data model are represented in the language specified by OLifE/CurrentLanguage. This object contains the string fields that were deemed pertinent to be presented in one or mor *(On CovOption, CovOptionXLat is used to represent string elements in a language other than the default language specified by OLifE/CurrentLanguage.)*"
  },
  {
    "id": "af1061",
    "code": "participant",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "An implementation requirement is that a relationship must be built for all participants. Note that MR 04-1.127.03 synchronized the objects, properties, and attributes of Participant and LifeParticipan *(On CovOption, Participant should be used only to express relationships to the option that are not able to be expressed in the parent context.)*"
  },
  {
    "id": "af1062",
    "code": "benefit_limit",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Supports Riders, Coverages, and CovOptions with one or more benefit limits. In addition to describing the coverage being provided, these limits would be used as input to the validation of Claims. *(On CovOption, BenefitLimit is typically assumed to be a percentage of the parent Coverage or Rider benefit when the limit is defined as a percentage.)*"
  },
  {
    "id": "af1063",
    "code": "deduction_option",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Used to indicate deduction options for this product."
  },
  {
    "id": "af1064",
    "code": "restriction_info",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Contains information relating to Restrictions. *(On CovOption, RestrictionInfo can be used for disability health options to define whether HIPAA rules apply.)*"
  },
  {
    "id": "af1065",
    "code": "group_cov_option",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "If the policy being modeled is a group plan, then certain group insurance specific details will be stored here for convenience. *(On CovOption, GroupCovOption is used on the group master Holding (when HoldingTypeCode = OLI_HOLDTYPE_GROUPMASTER) to define the parameters specific to this group of insureds.)*"
  },
  {
    "id": "af1066",
    "code": "attachment",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "This contains a collection of attachments. Each attachment could contain any of the attachment Types defined. In the Attachment object the three items AttachmentData, AttachmentReference, and Attachme *(On CovOption, Attachment includes any attachments specific to that option.)*"
  },
  {
    "id": "af1067",
    "code": "condition_type_option",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Used to indicate condition types defined for this product. *(On CovOption, ConditionTypeOption indicates the conditions that are covered by this option.)*"
  },
  {
    "id": "af1068",
    "code": "alt_prem_mode",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "This aggregate provides details about alternative payment mode, method and amounts. Note that this does not necessarily imply that these may be used in lieu of the currently selected premium mode. For *(On CovOption, AltPremMode represents the coverage option level detail payment amount for each mode and method. One possible use is for Illustrations where component part of the premium need to be indi)*"
  },
  {
    "id": "af1069",
    "code": "fee",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "An aggregate describing fees to be charged. *(On CovOption, Fee communicates any fees outside of any premium associated to the rider or benefit. Some fees may be based on the coverage option. In those cases, fee is modeled at the coverage option )*"
  },
  {
    "id": "af1070",
    "code": "shadow_account",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "This object contains the information necessary for shadow accounts, also known as hypothetical accounts or simulated accounts. These accounts mimic the actual processing of the contract fund just as t *(On CovOption, ShadowAccount is typically used to support some types of no lapse, or secondary, guarantees. These guarantees are identified via a LifeCovOptTypeCode set to 9 (OLI_OPTTYPE_NOLAPSE).)*"
  },
  {
    "id": "af1071",
    "code": "keyed_value",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Generic object used to extend object hierarchy for proprietary data requirements. Each proprietary data item is represented using a KeyedValue object. A collection of KeyedValue objects is utilized to"
  },
  {
    "id": "af1072",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af1073",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Record creation timestamp."
  },
  {
    "id": "af1074",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Record last update timestamp."
  },
  {
    "id": "af1075",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "cov_option",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af1076",
    "code": "life_participant_id",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Primary key for Life Participant."
  },
  {
    "id": "af1077",
    "code": "policy_id",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "FK → policy.policy_id"
  },
  {
    "id": "af1078",
    "code": "party_id",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "FK → party.party_id"
  },
  {
    "id": "af1079",
    "code": "life_participant_key",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "LifeParticipant Key"
  },
  {
    "id": "af1080",
    "code": "life_participant_sys_key",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "LifeParticipant System Key"
  },
  {
    "id": "af1081",
    "code": "participant_name",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "FullName from the Party object. *(On LifeParticipant, ParticipantName is redundant with FullName on the Party referenced via LifeParticipant/@PartyID. If additional information regarding the Participant Party is needed such as contact)*"
  },
  {
    "id": "af1082",
    "code": "life_participant_role_code",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Role of the participant with respect to this coverage. If this the base coverage, then this is the role with respect to the entire policy."
  },
  {
    "id": "af1083",
    "code": "participation_pct",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "The percentage of participation the Participant has in the overall relation in which it participates. For example, if the relationship is to an owner, this is the percentage of ownership."
  },
  {
    "id": "af1084",
    "code": "issue_age",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Age of participant when the coverage was issued based on carrier's calculation rules. *(On LifeParticipant, IssueAge may differ from Coverage/EquivalentAge if the coverage's age is adjusted for rating purposes or there is more than one insured on the coverage.)*"
  },
  {
    "id": "af1085",
    "code": "closed_age",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Client age at time when investment was closed / cashed in or will be was closed / cashed in"
  },
  {
    "id": "af1086",
    "code": "issue_gender",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Insurance gender rate basis. Identifies the gender used for rating purposes. *(On LifeParticipant, IssueGender represents the gender used for the individual insured participant.)*"
  },
  {
    "id": "af1087",
    "code": "residence_nation_at_issue",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Residence Nation at the time of Issue."
  },
  {
    "id": "af1088",
    "code": "residence_jurisdiction_at_issue",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Residence Jurisdiction at the time of Issue."
  },
  {
    "id": "af1089",
    "code": "occup_rating",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "This table contains sub types for rating types such as Occupational or Aviation. *(On LifeParticipant, OccupRating essentially serves as a sub type for the PermRatingType and TempRatingType properties. This correlates to the PermTableRatingInfo/RatingSubType and TempTableRatingInfo/)*"
  },
  {
    "id": "af1090",
    "code": "perm_flat_extra_amt",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "On substandard risks, this amount is an additional charge to the insured for the life of the policy. Because the insured represents a higher risk to the company, the flat extra is charged to compensat"
  },
  {
    "id": "af1091",
    "code": "perm_flat_extra_end_date",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "The date the permanent flat extra rating ends. This date is established when coverage has been re-underwritten and is determined by the insurer that the rating no longer applies as of this date."
  },
  {
    "id": "af1092",
    "code": "tobacco_premium_basis",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Used to classify insurance policy underwriting categories related to tobacco usage. This element is NOT used to classify the tobacco or nicotine usage history of natural persons. For that purpose, ref"
  },
  {
    "id": "af1093",
    "code": "rating_reason",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "This reason the coverage option was rated by the underwriter. The reason can also be used for field underwritten cases."
  },
  {
    "id": "af1094",
    "code": "rating_overridden_ind",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "This indicates if the underwriter overrode the rating as applied for. TRUE indicates the the underwriter overrode the rating and FALSE indicates the underwriter did NOT override the rating."
  },
  {
    "id": "af1095",
    "code": "perm_table_rating",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "A table of valuation of risk of an individual or organization. This is a permanent rating according to this table for this individual or organization. In the USA, this is the preferred representation  *(On LifeParticipant, PermTableRating is used with PermPercentageLoading and PermTableRatingAlphaCode to define a permanent rating. Please refer to the definition of PermTableRating for details on this )*"
  },
  {
    "id": "af1096",
    "code": "perm_table_rating_end_date",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "The date the permanent table rating ends. This date may be established by the Product's definition, such as an Occupational Rating that terminates at age 65, or used where coverage has been re-underwr"
  },
  {
    "id": "af1097",
    "code": "temp_table_rating",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "A table of valuation of risk of an individual or organization. This is a temporary rating according to this table for this individual or organization. In the USA, this is the preferred representation  *(On LifeParticipant, TempTableRating is used with TempPercentageLoading and TempTableRatingCode to define a temporary rating. Please refer to the definition of TempTableRating for details on this usage)*"
  },
  {
    "id": "af1098",
    "code": "temp_table_rating_start_date",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "In USA, this field represents the start date associated with TempTableRating. In Australia, this field represents the Temporary Percentage Loading Start Date for use with TempPercentageLoading. *(On LifeParticipant, TempTableRatingStartDate is assumed to be the same as the Effective Date (EffDate) of the LifeParticipant if not specified.)*"
  },
  {
    "id": "af1099",
    "code": "temp_table_rating_end_date",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "In USA, this field represents the end date associated with TempTableRating. In Australia, this field represents the Temporary Percentage Loading End Date for use with TempPercentageLoading."
  },
  {
    "id": "af1100",
    "code": "temp_flat_end_date",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Last date at which no further flat extra amount is required in addition to the regularly scheduled premium for the additional risk carried by the company."
  },
  {
    "id": "af1101",
    "code": "temp_flat_extra_amt",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "On substandard risks, this amount is an additional charge to the insured for a predetermined period of time, such as five years. The idea here is the same as for the Permanent Flat extra (compensating"
  },
  {
    "id": "af1102",
    "code": "flat_extra_prem_basis",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Flat Extra Basis tells what amount to use to determine the flat extra premium."
  },
  {
    "id": "af1103",
    "code": "modal_gross_flat_extra_prem_amt",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "The gross amount payable to the ceding company by the reinsurer in lieu of actual commissions and expenses incurred by the ceding company."
  },
  {
    "id": "af1104",
    "code": "modal_gross_flat_extra_allowance_amt",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "An amount payable to the ceding company by the reinsurer in lieu of actual commissions and expenses incurred by the ceding company."
  },
  {
    "id": "af1105",
    "code": "issued_as_applied_ind",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "TRUE means the coverage for this component or contract was issued as applied for. In this context a component is considered to be issued as applied for if no material change is made to the component d *(On LifeParticipant, IssuedAsAppliedInd is set to TRUE when no material changes were made to this participant object or any of its descendant objects prior to issue. However the IssuedAsAppliedInd on i)*"
  },
  {
    "id": "af1106",
    "code": "underwriting_class",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Underwriting Class"
  },
  {
    "id": "af1107",
    "code": "underwriting_sub_class",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "A further breakdown of Underwriting Class, most commonly used to allow for making a slightly different offer, where the change in risk is determined to fit in between classes, but not sufficient to go"
  },
  {
    "id": "af1108",
    "code": "beneficiary_seq_num",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Code that indicates the order of Beneficiary. When you have multiple relationships of the same type with equal percentages, the parent object would be used to indicate which is primary, secondary, ter *(On LifeParticipant, BeneficiarySeqNum is NOT associated with the beneficiary order. It merely provides an ordering for printing or viewing.)*"
  },
  {
    "id": "af1109",
    "code": "beneficiary_amount_distribution",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Amount of distribution for beneficiary."
  },
  {
    "id": "af1110",
    "code": "participation_numerator",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Used to specify the numerator for a stated fraction distribution option."
  },
  {
    "id": "af1111",
    "code": "participation_denominator",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Used to specify the denominator for a stated fraction distribution option."
  },
  {
    "id": "af1112",
    "code": "irrevokable_ind",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Indicator of whether an election or choice is permitted to be changed or not. TRUE indicates the choice may not be revoked. FALSE indicates the choice may be revoked. The name of this property is miss *(On LifeParticipant, IrrevokableInd indicates whether the role and the specified party is changeable. TRUE indicates the role and the specified party may not be changed. FALSE indicates the role or the)*"
  },
  {
    "id": "af1113",
    "code": "beneficiary_share_method",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Describes the means by which proceeds will be paid if the stated beneficiary no longer exists (i.e. if the beneficiary dies, or the organization is dissolved, etc.) as of the contractual event under w"
  },
  {
    "id": "af1114",
    "code": "beneficiary_common_disaster_period",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Length of time in days considered a common disaster."
  },
  {
    "id": "af1115",
    "code": "distribution_option",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Identifies how the proceeds should be distributed to a specified Party(s)."
  },
  {
    "id": "af1116",
    "code": "distribution_option_desc",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Used to provide additional details in free-form text. *(On LifeParticipant, DistributionOptionDesc is used to provide more details regarding the DistributionOption, such as when the distribution option is non-standard or other.)*"
  },
  {
    "id": "af1117",
    "code": "beneficiary_designation",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "BeneficiaryDesignation is used to identify whether this beneficiary is specifically \"named\" or if a beneficiary will be identified as a class or group of beneficiaries without specifically naming the  *(On LifeParticipant, BeneficiaryDesignation is used when unnamed beneficiaries are not further qualified other than BeneficiaryDesignation; unnamed beneficiaries are modeled using LifeParticipantRoleCo)*"
  },
  {
    "id": "af1118",
    "code": "beneficiary_designation_desc",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Beneficiary Designation Description *(On LifeParticipant, BeneficiaryDesignationDesc is used to provide details about the BeneficiaryDesignation.)*"
  },
  {
    "id": "af1119",
    "code": "beneficiary_role_code",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Role code for the beneficiary. *(On LifeParticipant, BeneficiaryRoleCode is used only when the Beneficiary Designation is \"Named\" or \"Named with Children by Representation\". It typically describes the relationship of the beneficiary )*"
  },
  {
    "id": "af1120",
    "code": "beneficiary_role_code_desc",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Role Code Description of Beneficiary. *(On LifeParticipant, BeneficiaryRoleCodeDesc is a further refinement of the BeneficiaryRoleCode element. For example, additional detail regarding BeneficiaryRoleCode of \"Parent\" may be described by spe)*"
  },
  {
    "id": "af1121",
    "code": "insurable_interest_reason",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Detailed explanation of why the party has an Insurable Interest in the contract. *(On LifeParticipant, InsurableInterestReason is associated with atypical relationships like \"Friend\". The InsurableInterestReason property may be used to further explain why the person is named as a be)*"
  },
  {
    "id": "af1122",
    "code": "a_s_c_o_code",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Level 4 - the 4-digit integer is the integer value entered here. The ASCO Code list is not being provided as part of the specification. The ASCO Code list may be obtained from the Australian Bureau of"
  },
  {
    "id": "af1123",
    "code": "reconsideration_date",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "A date that indicates when the participant would be reconsidered either for a rating on the coverage or on insurance in general if denied."
  },
  {
    "id": "af1124",
    "code": "rating_commission_rule",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Commission rules for substandard rating premium payments."
  },
  {
    "id": "af1125",
    "code": "class_name",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Carrier's nomenclature (or marketing name) for this underwriting class."
  },
  {
    "id": "af1126",
    "code": "underwriting_class_ranking",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "This is the ranking of the relevant underwriting class in the context of all underwriting classes available for the product. The most favorable class is 1."
  },
  {
    "id": "af1127",
    "code": "commission_link",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "A code used to tie related commission objects together"
  },
  {
    "id": "af1128",
    "code": "participant_status",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Indicates the current status of the participant on this policy/coverage."
  },
  {
    "id": "af1129",
    "code": "underwriting_status",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Reflects the current status of the individual in the underwriting process. *(On LifeParticipant, UnderwritingStatus identifies the overall status of the individual in the underwriting process to determine if a decision has been reached based on all underwriting requirements fo)*"
  },
  {
    "id": "af1130",
    "code": "issue_age_source",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Indicates how the issue age was obtained, e.g. was it manually entered or calculated."
  },
  {
    "id": "af1131",
    "code": "age_set_back_quantity",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Indicates number of years to subtract from the first insured's age, usually resulting from declining one of the insureds on a Joint survivorship policy (commonly called Age Set Back)"
  },
  {
    "id": "af1132",
    "code": "original_issue_age",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "In case of policy changes which may result in new coverage issue date and hence new issue age, this holds the original issue age of the first insured."
  },
  {
    "id": "af1133",
    "code": "insured_seq_num",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "The sequence number for insureds on a policy to ensure the lives are presented in a consistent order."
  },
  {
    "id": "af1134",
    "code": "modal_gross_perm_flat_extra_allowance_amt",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "The modal gross flat extra allowance amount for the permanent flat extra represented at this level."
  },
  {
    "id": "af1135",
    "code": "modal_gross_temp_flat_extra_allowance_amt",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "The modal gross flat extra allowance amount for the temporary flat extra represented at this level."
  },
  {
    "id": "af1136",
    "code": "temp_flat_extra_duration",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Duration in years the temporary flat extra charge is in effect."
  },
  {
    "id": "af1137",
    "code": "eff_date",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "This will usually indicate when an aggregate is effective (e.g. CommSchedule, LifeParticipant and Participant) or the actual effective date which may be used for the calculation of the anniversary dat *(On LifeParticipant, EffDate is the date the LifeParticipant became effective on the coverage. The coverage may have been inforce for some time.)*"
  },
  {
    "id": "af1138",
    "code": "age_calculation_type",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Indicates the method to be used when calculating a role's age. *(On LifeParticipant, AgeCalculationType indicates the algorithm used to determine the issue age of the insured, at the time of issue.)*"
  },
  {
    "id": "af1139",
    "code": "temp_percentage_loading",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "In the USA, this field should only be used when a percentage value is not available in TempTableRating. In this scenario, TempTableRating would be mapped to Other and the actual percentage value would *(On LifeParticipant, TempPercentageLoading is used with TempTableRating and TempTableRatingCode to define a temporary rating. Please refer to the definition of TempTableRating for details on this usage)*"
  },
  {
    "id": "af1140",
    "code": "perm_percentage_loading",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "This field should only be used when a percentage value is not available in PermTableRating. In this scenario, PermTableRating would be mapped to Other and the actual percentage value would be represen *(On LifeParticipant, PermPercentageLoading is used with PermTableRating and PermTableRatingAlphaCode to define a permanent rating. Please refer to the definition of PermTableRating for details on this )*"
  },
  {
    "id": "af1141",
    "code": "perm_table_rating_alpha_code",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "The code mnemonic associated with the percentage represented in PermTableRating or PermPercentageLoading. See definition in PermTableRating for more information on the usage of these fields. Used in c *(On LifeParticipant, PermTableRatingAlphaCode is used with PermTableRating and PermPercentageLoading to define a permanent rating. Please refer to the definition of PermTableRating for details on this )*"
  },
  {
    "id": "af1142",
    "code": "temp_table_rating_code",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "The code mnemonic associated with the percentage represented in TempTableRating or TempPercentageLoading. See definition in TempTableRating for more information on the usage of these fields. Used in c *(On LifeParticipant, TempTableRatingCode is used with TempTableRating and TempPercentageLoading to define a temporary rating. Please refer to the definition of TempTableRating for details on this usage)*"
  },
  {
    "id": "af1143",
    "code": "occupation",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Occupation for the person. Can include values such as 'Doctor,' 'Lawyer,' etc."
  },
  {
    "id": "af1144",
    "code": "privacy_last_communication_date",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "This is the last time the carrier's Privacy Policy was mailed to a participant (usually the Owner)."
  },
  {
    "id": "af1145",
    "code": "beneficiary_income_option",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "The settlement option that is selected for the beneficiary for the proceeds of the holding. *(On LifeParticipant, BeneficiaryIncomeOption is used to specify the settlement option that is selected for the beneficiary for the proceeds of the holding.)*"
  },
  {
    "id": "af1146",
    "code": "beneficiary_income_option_desc",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Used to provide additional details in free-form text. *(On LifeParticipant, BeneficiaryIncomeOptionDesc is used to provide more details regarding the BeneficiaryIncomeOption, such as when the income option is non-standard or other.)*"
  },
  {
    "id": "af1147",
    "code": "temp_rating_type",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "The reasons for rating a policy which could include occupation risk, aviation risk, or an impairment. *(On LifeParticipant, TempRatingType may be further clarified using the OccupRating property. For example, if TempRatingType = Aviation, the type of Aviation rating is specified in OccupRating.)*"
  },
  {
    "id": "af1148",
    "code": "proceeds_hold_duration",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "This is to support Short Term Survivorship Provision where the insured can choose the number of days the proceeds will be on hold. The number of days is from the death of the insured. At the death of  *(On LifeParticipant, ProceedsHoldDuration is qualified by ProceedsHoldDurUnitMeasure.)*"
  },
  {
    "id": "af1149",
    "code": "proceeds_hold_dur_unit_measure",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Unit of measurement used to define the duration of time. *(On LifeParticipant, ProceedsHoldDurUnitMeasure qualifies ProceedsHoldDuration.)*"
  },
  {
    "id": "af1150",
    "code": "last_rating_date",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Last date a rate was applied to the policy for this insured."
  },
  {
    "id": "af1151",
    "code": "employment_class",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "The occupational rating for the policy, coverage or rider to which this object is attached. The rating affects the calculation of the premium for the parent object. It is typically used to define the"
  },
  {
    "id": "af1152",
    "code": "beneficiary_claim_period",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "When a testamentary trustee is designated, there is a qualifying period, also known as the beneficiary claim period, during which the trustee is expected to claim proceeds. If the trustee does not cla *(On LifeParticipant, BeneficiaryClaimPeriod is qualified by BeneClaimPeriodMeasureUnit to define the period.)*"
  },
  {
    "id": "af1153",
    "code": "bene_claim_period_measure_unit",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Beneficiary claim period units of measure. *(On LifeParticipant, BeneClaimPeriodMeasureUnit qualifies BeneficiaryClaimPeriod to define the period.)*"
  },
  {
    "id": "af1154",
    "code": "perm_rating_type",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "The reasons for rating a policy which could include occupation risk, aviation risk, or an impairment. *(On LifeParticipant, PermRatingType may be further clarified using the OccupRating property. For example, if PermRatingType = Aviation, the type of Aviation rating is specified in OccupRating.)*"
  },
  {
    "id": "af1155",
    "code": "term_date",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Termination Date is the date the aggregate is no longer effective. *(On LifeParticipant, TermDate reflects the date that the LifeParticipant is no longer in effect with this coverage.)*"
  },
  {
    "id": "af1156",
    "code": "face_amt",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Base coverage amount of life insurance purchased at time of issue. *(On LifeParticipant, FaceAmt reflects the face amount applied to this particular insured on a joint or multi-life coverage. It is applicable when the benefit amounts vary by participant on a single cov)*"
  },
  {
    "id": "af1157",
    "code": "lives_with_primary_ins_ind",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "TRUE indicates the participant lives with primary insured. FALSE indicates the participant lives elsewhere."
  },
  {
    "id": "af1158",
    "code": "dependent_on_primary_ins_ind",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "TRUE indicates the participant is dependent on the Primary Insured. FALSE indicates the participant is NOT dependent on the Primary Insured."
  },
  {
    "id": "af1159",
    "code": "temp_flat_start_date",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "First date at which flat extra amount is required in addition to the regularly scheduled premium for the additional risk carried by the company. If not valued, it is assumed that it starts based on th"
  },
  {
    "id": "af1160",
    "code": "temp_flat_extra_override_end_date",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "TempFlatExtraOverrideEndDate may be exception overridden end dates per post-issue underwriting decisions. The TempFlatExtraOverrideEndDate is used to override the temporary rating end date in cases wh *(On LifeParticipant, TempFlatExtraOverrideEndDate property is equivalent to the EndDate property on the SubstandardRating object.)*"
  },
  {
    "id": "af1161",
    "code": "temp_flat_extra_override_eff_date",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "For Substandard Rating in cases where coverage is added post issue, the rating effective date may be required in situations where insurability of the insured differs from the original issue. *(On LifeParticipant, TempFlatExtraOverrideEffDate is equivalent to the EffDate property on the SubstandardRating object.)*"
  },
  {
    "id": "af1162",
    "code": "perm_rating_amt_per_thou",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Amount per thousand that is charged for the permanent substandard rating"
  },
  {
    "id": "af1163",
    "code": "temp_rating_amt_per_thou",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Amount per thousand that is charged for the temporary substandard rating"
  },
  {
    "id": "af1164",
    "code": "temporary_role_ind",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "This indicator is used to model a situation where the role is temporarily assigned and is (was) never considered to be permanent. Here, \"temporary\" is different than simply setting an end date on the"
  },
  {
    "id": "af1165",
    "code": "preferred_beneficiary_ind",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "TRUE indicates the beneficiary is a preferred beneficiary. FALSE indicates they are not. The preferred class consists of a spouse, children, adopted children, grandchildren, children of adopted childr *(On LifeParticipant, PreferredBeneficiaryInd is Canadian specific. The \"preferred\" status of a beneficiary was used more so prior to July 1, 1962 under the \"old\" Uniform Life Insurance Act in Canada. U)*"
  },
  {
    "id": "af1166",
    "code": "modal_perm_rating_amt",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "The additional amount of modal premium required for a permanent table rating. *(On LifeParticipant, ModalPermRatingAmt returns the additional amount of modal premium required for a permanent table rating. The per thousand premium amount for a table rating is returned in PermRatin)*"
  },
  {
    "id": "af1167",
    "code": "modal_temp_rating_amt",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "The additional amount of modal premium required for a temporary table rating. *(On LifeParticipant, ModalTempRatingAmt returns the additional amount of modal premium required for a temporary table rating. The per thousand premium amount for a table rating is returned in TempRatin)*"
  },
  {
    "id": "af1168",
    "code": "conversion_eligible_ind",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Indicates if the coverage is eligible for conversion to another product for a participant."
  },
  {
    "id": "af1169",
    "code": "premium_bonus_reason",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "The reason or basis for the premium bonus. *(On LifeParticipant, PremiumBonusReason is the reason for the premium bonus credit applicable for this Coverage and LifeParticipant.)*"
  },
  {
    "id": "af1170",
    "code": "premium_bonus_amt",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "The additional amount credited at the time of purchase payment, may be defined as a percentage of the purchase payment. *(On LifeParticipant, PremiumBonusAmt is the portion of the premium bonus credit applicable for this Coverage and LifeParticipant.)*"
  },
  {
    "id": "af1171",
    "code": "premium_bonus_expiry_date",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "The date the premium bonus credit expires."
  },
  {
    "id": "af1172",
    "code": "substandard_rating",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "The purpose of this object is to contain tables 2 through x that are needed to handle substandard cases. The first rating, table, etc should be stored on the respective parent Life Participant or Part *(On LifeParticipant, SubstandardRating should be used for subsequent occurrences of each Permanent and/or Temporary extra. The singularly occurring rating properties on LifeParticipant should be used t)*"
  },
  {
    "id": "af1173",
    "code": "assoc_participant_object_info",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "This is used to identify other objects that relate to the context of this LifeParticipant/Participant. Examples include: Identify succeeding beneficiaries for a specific primary beneficiary Identify t *(On LifeParticipant, AssocParticipantObjectInfo may be used for succeeding beneficiaries. When used for this purpose, AssociatedParticipantObjectInfo AssociatedParticipantObjectInfo is used to referenc)*"
  },
  {
    "id": "af1174",
    "code": "underwriting_result",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Contains the results of an underwriting investigation. These results are used as input to underwriting determinations such as the underwriting class, tobacco premium basis, substandard ratings, etc."
  },
  {
    "id": "af1175",
    "code": "delivery_info",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Depending on usage, specifies available or selected preferences for the delivery of documents, notifications, security information, data capture/interviews, etc. *(On LifeParticipant, DeliveryInfo indicates notifications and/or delivery information specific to a Party in the context of the Holding and the Party's particular role.)*"
  },
  {
    "id": "af1176",
    "code": "beneficiary_income_option_info",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Contains information about the beneficiary income option *(On LifeParticipant, BeneficiaryIncomeOptionInfo only applies if the LifeParticipantRoleCode is a type of beneficiary (e.g. Beneficiary, Beneficiary - Contingent, etc).)*"
  },
  {
    "id": "af1177",
    "code": "alternate_policy_option",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "In the case of a conversion, replacement, or exchange, this object identifies the alternate policies available for the existing holding."
  },
  {
    "id": "af1178",
    "code": "bene_income_restriction",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "A restriction that applies to the funds the beneficiary is withdrawing from the proceeds from their respective settlement. For example, there may be a maximum amount of withdrawal per year or withdraw"
  },
  {
    "id": "af1179",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af1180",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Record creation timestamp."
  },
  {
    "id": "af1181",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Record last update timestamp."
  },
  {
    "id": "af1182",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "life_participant",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af1183",
    "code": "relation_id",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Primary key for Relation."
  },
  {
    "id": "af1184",
    "code": "policy_id",
    "usedInTables": 1,
    "tables": "relation",
    "description": "FK → policy.policy_id"
  },
  {
    "id": "af1185",
    "code": "party_id",
    "usedInTables": 1,
    "tables": "relation",
    "description": "FK → party.party_id"
  },
  {
    "id": "af1186",
    "code": "relation_key",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Relation Key"
  },
  {
    "id": "af1187",
    "code": "relation_sys_key",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Relation System Key"
  },
  {
    "id": "af1188",
    "code": "originating_object_type",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Object type associated with the originating top-level object. *(On Relation, OriginatingObjectType is used to qualify the OriginatingObjectID attribute. The Originating Object MUST be a top-level object. When specified, it MUST match the type of object referenced )*"
  },
  {
    "id": "af1189",
    "code": "related_object_type",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Object type associated with the related object. *(On Relation, RelatedObjectType is used to qualify the RelatedObjectID attribute. The Related Object MUST be a top-level object. When specified, it MUST match the type of object referenced by the Relat)*"
  },
  {
    "id": "af1190",
    "code": "relation_role_code",
    "usedInTables": 1,
    "tables": "relation",
    "description": "The nature of the relation between the \"Originating Object\" and the \"Related Object\", as viewed from the perspective of the Originating object. *(On Relation, RelationRoleCode defines the relationship between the \"originating object\" and the \"related object\". A RelationRoleCode SHOULD always be specified. The relationship may be further qualifi)*"
  },
  {
    "id": "af1191",
    "code": "relation_description",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Description code to further define the role of a relationship. *(On Relation, RelationDescription is a further refinement of the RelationRoleCode element. For example, additional detail regarding RelationRoleCode of \"Parent\" may be described by specifying \"Mother\" )*"
  },
  {
    "id": "af1192",
    "code": "insurable_interest_reason",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Detailed explanation of why the party has an Insurable Interest in the contract. *(On Relation, InsurableInterestReason is associated with atypical relationships like \"Friend\". The InsurableInterestReason property may be used to further explain why the person is named as a beneficia)*"
  },
  {
    "id": "af1193",
    "code": "temporary_role_ind",
    "usedInTables": 1,
    "tables": "relation",
    "description": "This indicator is used to model a situation where the role is temporarily assigned and is (was) never considered to be permanent. Here, \"temporary\" is different than simply setting an end date on the"
  },
  {
    "id": "af1194",
    "code": "name_from_related_object",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Full name/name/short name of related top-level object - i.e. Party/FullName, Holding/ShortName."
  },
  {
    "id": "af1195",
    "code": "key_from_related_object",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Carries the non-business data database key or previously exchanged identifier by which this object is known to both the Requestor and Responder. This property is defined of a type used to define persi *(On Relation, KeyFromRelatedObject can be used to specify additional information for the expressed relationship itself, as in some key that is tightly tied to the relationship, or it can be used in Inq)*"
  },
  {
    "id": "af1196",
    "code": "start_date",
    "usedInTables": 1,
    "tables": "relation",
    "description": "The start date is inclusive. The default is the beginning of time."
  },
  {
    "id": "af1197",
    "code": "end_date",
    "usedInTables": 1,
    "tables": "relation",
    "description": "The last date for which the aggregate is available, effective or active. The end date is inclusive. For example, 2004-12-31 indicates that the aggregate is no longer available on or after January 1, 2"
  },
  {
    "id": "af1198",
    "code": "dependent",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Used to determine the dependency status of this relationship to the given party. This property is only applicable for relationships between two parties. Set to TRUE if the relationship is a person-per"
  },
  {
    "id": "af1199",
    "code": "interest_percent",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Percent of interest that the related object has in the relationship. *(On Relation, InterestPercent is used for % commission split for agent; percentage of benefits to be received by beneficiary, ownership percentage - company, holding, etc. InterestPercent may or may no)*"
  },
  {
    "id": "af1200",
    "code": "interest_amt",
    "usedInTables": 1,
    "tables": "relation",
    "description": "The amount of interest expressed as a monetary value. Used for monetary value of benefits to be received by beneficiary, ownership amount - company, holding, etc. *(On Relation, this represents the same business concept as \"InterestPercent\" but as a defined dollar amount. If InterestPercent is specified, then InterestAmt MUST NOT be specified.)*"
  },
  {
    "id": "af1201",
    "code": "participation_numerator",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Used to specify the numerator for a stated fraction distribution option."
  },
  {
    "id": "af1202",
    "code": "participation_denominator",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Used to specify the denominator for a stated fraction distribution option."
  },
  {
    "id": "af1203",
    "code": "volume_share_pct",
    "usedInTables": 1,
    "tables": "relation",
    "description": "The percentage of the face amount applicable to this agent versus any other agent sharing in the commissions for this contract. A default of 100 percent can be assumed if this field is left blank or n"
  },
  {
    "id": "af1204",
    "code": "related_ref_i_d",
    "usedInTables": 1,
    "tables": "relation",
    "description": "An identifier that identifies the related object being referenced in the Relation in a manner similar to a foreign key reference. In other words, a property containing business data that the originati *(On Relation, RelatedRefID can be used to specify additional information for the expressed relationship itself, as in some key that is tightly tied to the relationship, or it can be used in InquiryLeve)*"
  },
  {
    "id": "af1205",
    "code": "related_ref_i_d_type",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Describes the type of identifier being referenced in RelatedRefID. *(On Relation, RelatedRefIDType is used to qualify the value specified in the RelatedRefID property. Please refer to section 4.24, \"How to use the Relation object\", for more information.)*"
  },
  {
    "id": "af1206",
    "code": "primary_address_i_d",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Primary Address IDREF *(On Relation, PrimaryAddressID may be used to indicate the primary address to be used in the context of the specified relationship. When used on the Address Change (181) transaction, PrimaryAddressID m)*"
  },
  {
    "id": "af1207",
    "code": "primary_phone_to_call_i_d",
    "usedInTables": 1,
    "tables": "relation",
    "description": "IDRef to Primary Phone number to use"
  },
  {
    "id": "af1208",
    "code": "primary_email_i_d",
    "usedInTables": 1,
    "tables": "relation",
    "description": "IDRef to Primary Email Address"
  },
  {
    "id": "af1209",
    "code": "beneficiary_seq_num",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Code that indicates the order of Beneficiary. When you have multiple relationships of the same type with equal percentages, the parent object would be used to indicate which is primary, secondary, ter *(On Relation, BeneficiarySeqNum is NOT associated with the beneficiary order. It merely provides an ordering for printing or viewing. Sequencing should start with \"1.\" Nodes within the same object shou)*"
  },
  {
    "id": "af1210",
    "code": "beneficiary_share_method",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Describes the means by which proceeds will be paid if the stated beneficiary no longer exists (i.e. if the beneficiary dies, or the organization is dissolved, etc.) as of the contractual event under w"
  },
  {
    "id": "af1211",
    "code": "beneficiary_common_disaster_period",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Length of time in days considered a common disaster."
  },
  {
    "id": "af1212",
    "code": "beneficiary_designation",
    "usedInTables": 1,
    "tables": "relation",
    "description": "BeneficiaryDesignation is used to identify whether this beneficiary is specifically \"named\" or if a beneficiary will be identified as a class or group of beneficiaries without specifically naming the  *(On Relation, BeneficiaryDesignation is used when unnamed beneficiaries are not further qualified other than BeneficiaryDesignation; unnamed beneficiaries are modeled using Relation RoleCode = Benefici)*"
  },
  {
    "id": "af1213",
    "code": "beneficiary_designation_desc",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Beneficiary Designation Description *(On Relation, BeneficiaryDesignationDesc is used to provide details about the BeneficiaryDesignation.)*"
  },
  {
    "id": "af1214",
    "code": "irrevokable_ind",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Indicator of whether an election or choice is permitted to be changed or not. TRUE indicates the choice may not be revoked. FALSE indicates the choice may be revoked. The name of this property is miss *(On Relation, IrrevokableInd indicates whether the role and the specified party is changeable. TRUE indicates the role and the specified party may not be changed. FALSE indicates the role or the specif)*"
  },
  {
    "id": "af1215",
    "code": "duration",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Unless otherwise indicated by a duration qualifier, Duration is specified in years based on current point in time. Numerous calculations and financial statements require knowing the current duration t *(On Relation, Duration provides an interval of time or duration the relationship is effective for.)*"
  },
  {
    "id": "af1216",
    "code": "duration_unit_measure",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Unit of measurement used to define the duration of time. *(On Relation, DurationUnitMeasure is used in conjunction with Duration to explicitly describe the length of time the relationship has been in effect.)*"
  },
  {
    "id": "af1217",
    "code": "sequence",
    "usedInTables": 1,
    "tables": "relation",
    "description": "This element is used for ordering and sorting purposes. Sequencing should start with \"1\". Nodes within the same object should not duplicate a Sequence that applies to any one application or policy unl *(On Relation, Sequence is used to indicate which is primary, secondary, tertiary, etc. when you have multiple relationships of the same type with equal percentages. This field would only be applicable )*"
  },
  {
    "id": "af1218",
    "code": "commission_link_c_c",
    "usedInTables": 1,
    "tables": "relation",
    "description": "The Commission Links covered by the same relation *(Although this object does not meet all of the rules of a CC as described in the \"Expressing Choice Collections\" section, it is still considered a CC and, as such, is subject to all restrictions applic)*"
  },
  {
    "id": "af1219",
    "code": "advancing_elected_ind",
    "usedInTables": 1,
    "tables": "relation",
    "description": "An indicator of the election of advancing on the case. TRUE overrides the indicators on the producer and policy product. FALSE does not override the indicators on the producer and policy product. If a"
  },
  {
    "id": "af1220",
    "code": "comm_schedule_code",
    "usedInTables": 1,
    "tables": "relation",
    "description": "This is the entity recognition for this object which is pointed to from within the PolicyProductInfo aggregate. *(On Relation, this is only used with Agent relationships and is not typically used when DistributionAgreementCode is present.)*"
  },
  {
    "id": "af1221",
    "code": "distribution_agreement_code",
    "usedInTables": 1,
    "tables": "relation",
    "description": "A character string created by the Carrier that uniquely identifies a DistributionAgreement object. The CarrierCode and DistributionAgreementCode together uniquely identify the DistributionAgreement in *(On Relation, this is a reference to the DistributionAgreement under which this policy was sold (or is being applied for).)*"
  },
  {
    "id": "af1222",
    "code": "renewal_interest_percent",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Percent of interest the Party has in the contract upon renewal. Used to reflect percentage split for an agent at issue. This only applies in situations where the renewal interest can be different from"
  },
  {
    "id": "af1223",
    "code": "initial_interest_percent",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Percent of interest the Party has in the contract upon issue Used to reflect percentage split for an agent at issue. This only applies in situations where the renewal interest can be different from th"
  },
  {
    "id": "af1224",
    "code": "signature_req_type",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Type of signature requirement. For example, any Policy Owner-Trusts, this code stipulates which trustee(s) must sign forms required to exercise rights under the policy. *(On Relation, this property pertains when relating a Holding to a Party that is a Trust. Typically in this situation, the RelationRoleCode would indicate that the Trust is an owner or a beneficiary, th)*"
  },
  {
    "id": "af1225",
    "code": "signature_req_desc",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Description for each signature requirement. It provides additional details regarding the SignatureReqType selected. *(On Relation the specific contents of SignatureReqDesc are defined in the code values in the Signature Requirement Type table. For example, when SignatureReqType is Other - Specified, this property con)*"
  },
  {
    "id": "af1226",
    "code": "distribution_option",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Identifies how the proceeds should be distributed to a specified Party(s)."
  },
  {
    "id": "af1227",
    "code": "distribution_option_desc",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Used to provide additional details in free-form text. *(On Relation, DistributionOptionDesc is used to provide more details regarding the DistributionOption, such as when the distribution option is non-standard or other.)*"
  },
  {
    "id": "af1228",
    "code": "preferred_beneficiary_ind",
    "usedInTables": 1,
    "tables": "relation",
    "description": "TRUE indicates the beneficiary is a preferred beneficiary. FALSE indicates they are not. The preferred class consists of a spouse, children, adopted children, grandchildren, children of adopted childr *(On Relation, PreferredBeneficiaryInd is Canadian specific. The \"preferred\" status of a beneficiary was used more so prior to July 1, 1962 under the \"old\" Uniform Life Insurance Act in Canada. Up to Ju)*"
  },
  {
    "id": "af1229",
    "code": "relation_status",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Used to describe the status of a relationship. For example, when relating a Party to a Grouping as a member, the status of that membership (active, inactive, etc.). *(On Relation, RelationStatus is used to specify a business status about the relationship. A change in RelationStatus value does not necessitate a change in StartDate and/or EndDate. For example, Relati)*"
  },
  {
    "id": "af1230",
    "code": "relation_status_reason",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Used to provide details surrounding the reason for the status of the Relation. *(On Relation, RelationStatusReason is used to provide more information about the RelationStatus including the details when RelationStatus is set to \"Other\".)*"
  },
  {
    "id": "af1231",
    "code": "associated_object_info",
    "usedInTables": 1,
    "tables": "relation",
    "description": "This is used to identify other objects that relate to the context of this relation. Some examples include: Identify the ProducerAgreement in effect for the writing agent relation for a policy. Identif *(When used for succeeding beneficiaries, AssociatedObjectInfo is used to reference another Relation to which the party being modeled is associated, when a \"succeeding beneficiary\" of another beneficiar)*"
  },
  {
    "id": "af1232",
    "code": "delivery_info",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Depending on usage, specifies available or selected preferences for the delivery of documents, notifications, security information, data capture/interviews, etc. *(On Relation, DeliveryInfo indicates notifications and/or deliveries of information specific to a Party in the context of the Holding and the Party's particular role.)*"
  },
  {
    "id": "af1233",
    "code": "profile_result_info",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Additional information about the Profile Result *(On Relation, ProfileResultInfo has context when the RelationRoleCode is set to Hit or Try.)*"
  },
  {
    "id": "af1234",
    "code": "bene_income_restriction",
    "usedInTables": 1,
    "tables": "relation",
    "description": "A restriction that applies to the funds the beneficiary is withdrawing from the proceeds from their respective settlement. For example, there may be a maximum amount of withdrawal per year or withdraw"
  },
  {
    "id": "af1235",
    "code": "keyed_value",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Generic object used to extend object hierarchy for proprietary data requirements. Each proprietary data item is represented using a KeyedValue object. A collection of KeyedValue objects is utilized to"
  },
  {
    "id": "af1236",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af1237",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Record creation timestamp."
  },
  {
    "id": "af1238",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Record last update timestamp."
  },
  {
    "id": "af1239",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "relation",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af1240",
    "code": "financial_activity_id",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Primary key for Financial Activity."
  },
  {
    "id": "af1241",
    "code": "policy_id",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "FK → policy.policy_id"
  },
  {
    "id": "af1242",
    "code": "party_id",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "FK → party.party_id"
  },
  {
    "id": "af1243",
    "code": "financial_activity_key",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "FinancialActivity Key"
  },
  {
    "id": "af1244",
    "code": "financial_activity_sys_key",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "FinancialActivity System Key"
  },
  {
    "id": "af1245",
    "code": "accounting_activity_type",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "The basic type of this transaction"
  },
  {
    "id": "af1246",
    "code": "fin_activity_type",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "The type of financial activity."
  },
  {
    "id": "af1247",
    "code": "fin_activity_sub_type",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Further defines financial activity to reflect activity. *(On FinancialActivity, FinActivitySubType works with FinActivityType to specify that an activity is a reversal or correction.)*"
  },
  {
    "id": "af1248",
    "code": "liquidation_type",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Liquidation Type is used to delineate between financial activities that may be full liquidations or partial liquidations such as 1035 Exchanges, rollovers, or transfers."
  },
  {
    "id": "af1249",
    "code": "fin_activity_status",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Status of this financial activity"
  },
  {
    "id": "af1250",
    "code": "fin_activity_status_comments",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Additional comments or reason description associated with the FinActivityStatus."
  },
  {
    "id": "af1251",
    "code": "reversal_ind",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Reversal Indicator *(On FinancialActivity, ReversalInd set to TRUE indicates that this financial activity has been reversed and is maintained for historical purposes. To specify that a FinancialActivity is a reversal acti)*"
  },
  {
    "id": "af1252",
    "code": "description",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "The Description field defines a human readable, displayable, paragraph of detailed information for the corresponding object/concept. It provides a more detailed explanatory narrative for the object/co"
  },
  {
    "id": "af1253",
    "code": "fin_activity_gross_amt",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "The gross amount for this financial activity. For example: FinActivityNetAmt + FinActivityFee + Taxes paid. Taxes paid are modeled using the Fee Object."
  },
  {
    "id": "af1254",
    "code": "fin_activity_net_amt",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "The net amount for this financial activity. For example, premium payment amount, loan payment amount. FinActivityGrossAmt - FinActivityFee - Taxes paid."
  },
  {
    "id": "af1255",
    "code": "fin_activity_taxable_amt",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "The amount of the transaction that is taxable. This amount may be needed for financial activities such as partial surrenders or partial withdrawals."
  },
  {
    "id": "af1256",
    "code": "fin_activity_fee",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "This is the fee charged for execution of this transaction."
  },
  {
    "id": "af1257",
    "code": "fin_activity_date",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Date financial activity was conducted - e.g. trade date, date payment was made."
  },
  {
    "id": "af1258",
    "code": "fin_eff_date",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "The date when the activity is considered active. It may be interpreted, for example, as when the premium is due. \"Effective Date\" is what Distributors would want to show on any statements they would b"
  },
  {
    "id": "af1259",
    "code": "eff_date_based_on",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "To indicate the instructions for determining an effective date. *(On FinancialActivity, EffDateBasedOn is used to provide instructions for determining the effective date of the activity. Use FinEffDate to specify the date as needed depending on the instruction.)*"
  },
  {
    "id": "af1260",
    "code": "grace_period_end_date",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "The last date the insurer allows for payment without penalty such as a fee or policy lapse. *(On FinancialActivity, only applies for activities of type Payment. This records the GracePeriodEndDate that was applicable at the time of the FinancialActivity. Note that since a FinancialActivity may)*"
  },
  {
    "id": "af1261",
    "code": "reference_no",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "A reference number may include items such as check #, money transfer number, etc. *(On FinancialActivity, ReferenceNo represents the originating company's internal identifier for the activity. See TransConfirmNum for the receiver's identifier. The ReferenceNo when FinancialActivity i)*"
  },
  {
    "id": "af1262",
    "code": "int_posting_rate",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Rate applied to this payment."
  },
  {
    "id": "af1263",
    "code": "int_posting_date",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Date rate was first effective."
  },
  {
    "id": "af1264",
    "code": "order_date",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Date order was made. *(On FinancialActivity, this represents the creation date of the Financial Activity. OrderDate may predate the FinActivityDate or FinEffDate for those activities that are to be deferred.)*"
  },
  {
    "id": "af1265",
    "code": "order_time",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Time order is made. *(On FinancialActivity, OrderTime represents the creation time of the Financial Activity. For example, if the order is placed after close of business then the time the order was created will be signific)*"
  },
  {
    "id": "af1266",
    "code": "order_source",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Source of order"
  },
  {
    "id": "af1267",
    "code": "settlement_date",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Date funds were settled by clearinghouse."
  },
  {
    "id": "af1268",
    "code": "total_units",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Total number of units transacted."
  },
  {
    "id": "af1269",
    "code": "unit_value",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "The current unit sell price of the fund. Unit Price at the sell rate as of the Pricing as of date *(On FinancialActivity, UnitValue is updatable by the end user. When updated, the AsOf date will reflect the current date. This will not, however go back and change the UnitValue property in the InvestP)*"
  },
  {
    "id": "af1270",
    "code": "total_units_issued",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Number of Certificates issued."
  },
  {
    "id": "af1271",
    "code": "total_units_unissued",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Number of Certificates not yet issued."
  },
  {
    "id": "af1272",
    "code": "locked_in_ind",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Indicates if deposit funds are locked in or not locked in. For example, funds cannot be redeemed until retirement, earnings during an IndexTerm that are locked in such that the client does not partici *(On FinancialActivity, LockedInInd is used to communicate that a Financial Activity will lock a specific rate in for a specific piece of money. For example a specific premium amount.)*"
  },
  {
    "id": "af1273",
    "code": "federal_tax_withheld",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Modal amount of federal taxes withheld."
  },
  {
    "id": "af1274",
    "code": "jurisdiction_tax_withheld",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Modal amount of jurisdiction taxes withheld. In the U.S., this would be state taxes."
  },
  {
    "id": "af1275",
    "code": "local_tax_withheld",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Modal amount of city taxes withheld."
  },
  {
    "id": "af1276",
    "code": "services_tax_withheld",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Amount of service taxes withheld. In Canada, this is GST."
  },
  {
    "id": "af1277",
    "code": "annuity_contribution_amt",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Defines the portion of the premium being applied to a flexible premium annuity attached to a traditional (i.e., whole life) contract."
  },
  {
    "id": "af1278",
    "code": "best_int_rate_type",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Type code used for the interest-crediting rate. This property is used when a specific interest crediting rate is not specified. It is used by a back-end system to compare the current interest rate to"
  },
  {
    "id": "af1279",
    "code": "comm_prem_ovr_ridn_amt",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "This is the commissionable premium amount; usage of this property indicates that a standard commission calculation will not be used to determine the commissionable premium. Commission calculation rout"
  },
  {
    "id": "af1280",
    "code": "cost_basis_adj_amt",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Used when submitting 1035 exchange money. It is applicable when the cost basis from a previous or exchanged policy is known. Indicates that the Cost Basis of the policy is to be adjusted by the amount"
  },
  {
    "id": "af1281",
    "code": "cost_basis",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Purchase price, including commissions and other expenses. Used to determine capital gains and capital losses for tax purposes. Also called tax basis. For life insurance, this would be benefits + premi"
  },
  {
    "id": "af1282",
    "code": "first_tax_year",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "For rollover payments, the receiver needs to know the first tax year applicable to a rollover deposit. It indicates the first tax year in which a contribution was made into the prior policy/payment so *(On FinancialActivity, FirstTaxYear is applicable with sending the IRA Rollover payment. A use case to further detail this process is money rolled over from an IRA to a ROTH IRA. When the payment is se)*"
  },
  {
    "id": "af1283",
    "code": "grandfathered_date",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "This is applicable to monies from a non-qualified annuity rolled over into a new annuity, purchased prior to the Tax Equity and Fiscal Responsibility Act of 1982 (TEFRA) regulation."
  },
  {
    "id": "af1284",
    "code": "int_treatment_ind",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "TRUE indicates to use the Policy issue date as the effective date of the transaction. FALSE indicates to use the transaction date as the interest effective date. For an Initial Payment on a contract,"
  },
  {
    "id": "af1285",
    "code": "months_paid",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Number of months paid by this activity"
  },
  {
    "id": "af1286",
    "code": "prem_load_ovr_ridn_amt",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "The amount entered in this field will be used to calculate premium loads for this payment. If no premium loads are to be deducted than this field should contain 0.00"
  },
  {
    "id": "af1287",
    "code": "pre_t_e_f_r_a_cost_basis",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Premiums paid into the annuity contract prior to August 14, 1982 based on the Tax Equity and Fiscal Responsibility Act of 1982 (TEFRA) legislation. These premiums may be withdrawn under the FIFO order"
  },
  {
    "id": "af1288",
    "code": "post_t_e_f_r_a_cost_basis_amt",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Premiums paid into the annuity contract on or after August 14, 1982 based on the Tax Equity and Fiscal Responsibility Act of 1982 (TEFRA) legislation. These premiums must be withdrawn under the LIFO o"
  },
  {
    "id": "af1289",
    "code": "pre_t_a_m_r_a_cost_basis",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Pre-TAMRA cost basis refers to the cost basis of an asset established before the 1988 enactment of the Technical and Miscellaneous Revenue Act (TAMRA). Before TAMRA, withdrawals from life insurance an"
  },
  {
    "id": "af1290",
    "code": "post_t_a_m_r_a_cost_basis",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Post-TAMRA cost basis refers to the cost basis of an asset established after the Technical and Miscellaneous Revenue Act (TAMRA) was enacted in 1988. TAMRA led to policies being taxed using a last-in,"
  },
  {
    "id": "af1291",
    "code": "reporting_tax_year",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Defines the tax year applicable to a financial activity. *(For example, a person has an IRA contract and sends in a payment on March 30, 2003, but requested that the payment be applied as a year 2002 payment.)*"
  },
  {
    "id": "af1292",
    "code": "roth_ira1st_yr_conver_income",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "This field is used to identify the first tax year for a conversion income amount on a \"ROTH IRA\", and defines the beginning period for the 5-year holding period for the conversion money."
  },
  {
    "id": "af1293",
    "code": "rolllover_int_amt",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "This is applicable to monies being rolled over to an annuity or universal life contract. It is used to identify the interest amount from the payment."
  },
  {
    "id": "af1294",
    "code": "roth_ira_conver_inc_date",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "This field is used to identify the first tax year for a conversion income amount on a \"ROTH IRA\", and defines the beginning period for the 5-year holding period for the conversion money."
  },
  {
    "id": "af1295",
    "code": "roth_ira_conver_inc_amt",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Roth IRA Conversion Amount reported as income. This field defines the amount of a traditional IRA surrender, previously reported as taxable income, to be applied to a ROTH IRA."
  },
  {
    "id": "af1296",
    "code": "roth_ira_net_contribution_amt",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Money from a traditional IRA surrender applied to the Roth Conversion IRA. Defines the net amount of a rollover of trustee-to-trustee transfer for one ROTH IRA to another ROTH IRA that is attributable"
  },
  {
    "id": "af1297",
    "code": "roth_ira_cost_basis",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "The contributions made to a Roth IRA account if no distributions have been taken."
  },
  {
    "id": "af1298",
    "code": "tax_overridden_ind",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "TRUE indicates the tax was or will be overridden. FALSE indicates the tax is not overridden."
  },
  {
    "id": "af1299",
    "code": "retained_commission_amt",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Portion of financial activity amount representing the commission retained associated with this financial activity by the producer. *(On FinancialActivity, RetainedCommissionAmt is the difference between the FinActivityGrossAmt and FinActivityNetAmt on premium transactions.)*"
  },
  {
    "id": "af1300",
    "code": "user_code",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "The ID or reference number that identifies the customer service rep associated with the transaction. *(On FinancialActivity, UserCode is used when no other information about the CSR is available.)*"
  },
  {
    "id": "af1301",
    "code": "fin_activity_solicited_ind",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "TRUE indicates the transaction was solicited. FALSE indicates the transaction was no solicited. Primarily applies to investment transactions."
  },
  {
    "id": "af1302",
    "code": "fin_activity_pct",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Identifies the percentage of the total SubAccount value that the transaction represents. Useful when a transaction request was expressed as a percentage of SubAccount value."
  },
  {
    "id": "af1303",
    "code": "withld_prems_on_loan",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "A code determining how premiums on a loan request are handled. This is applicable mainly to fixed premium policies whose paid to date is in the past of the current date."
  },
  {
    "id": "af1304",
    "code": "payment_mode",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "The frequency of a payment. Typically annual, monthly, weekly, etc. *(On FinancialActivity, PaymentMode represents the payment mode in effect at the time the payment was received. Also applies to loan repayments and other periodic finacial activities.)*"
  },
  {
    "id": "af1305",
    "code": "guar_int_end_date",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "The date through which the guaranteed interest rate is applicable. *(On FinancialActivity, GuarIntEndDate indicates the date to which the interest rate on a deposit is guaranteed. Only applies to FinancialActivities of type \"payment\".)*"
  },
  {
    "id": "af1306",
    "code": "e_r_contrib_reason",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Code for the reason of the employer contribution"
  },
  {
    "id": "af1307",
    "code": "e_e_contrib_reason",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Code for the reason of the employee contribution"
  },
  {
    "id": "af1308",
    "code": "commissionable_ind",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Whether this financial activity is considered part of the producer's commission. Default is False = Not Commissionable. For clarification, although the name of the tag is CommissionableInd - it is not"
  },
  {
    "id": "af1309",
    "code": "premium_bonus_reason",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "The reason or basis for the premium bonus."
  },
  {
    "id": "af1310",
    "code": "trans_confirm_num",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "A unique confirmation identifier associated with a business transaction. Provides the assigned confirmation ID to a financial activity. *(On FinancialActivity, TransConfirmNum is commonly provided when an electronic payment is received by a company. It provides the customer with a unique identifier associated with the transaction. For t)*"
  },
  {
    "id": "af1311",
    "code": "o_f_a_c_date",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Date of Office of Foreign Assets Control List Comparison. Used to communicate when the owner/payee for financial activity was compared to the Federal OFAC listing. Due to the Patriot Act/Anti-Money La"
  },
  {
    "id": "af1312",
    "code": "commission_amt",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Calculated commission amount associated with this financial activity."
  },
  {
    "id": "af1313",
    "code": "cancellation_period_end_date",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Date at which the Cancellation Period ends. The cancellation period is the time frame at which an activity or task may be cancelled. This marks the end of the time frame. *(On FinancialActivity, CancellationPeriodEndDate marks the end of the time frame in which the FinancialActivity may be cancelled. This date is inclusive.)*"
  },
  {
    "id": "af1314",
    "code": "cancellation_period_end_time",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Point of time at which the Cancellation Period ends. The cancellation period is the time frame at which an activity or task may be cancelled. This marks the end of the time frame. *(On FinancialActivity, CancellationPeriodEndTime marks the end of the time frame in which the FinancialActivity may be cancelled. This time is inclusive.)*"
  },
  {
    "id": "af1315",
    "code": "cancellation_date",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Date the activity or task was or will be cancelled. *(On FinancialActivity, CancellationDate represents either the date the financial activity was cancelled if it happened in the past or may be the date the financial activity is planned to be cancelled.)*"
  },
  {
    "id": "af1316",
    "code": "cancellation_time",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Point in time the activity or task was or will be cancelled. *(On FinancialActivity, CancellationTime represents either the time the financial activity was cancelled if it happened in the past or may be the time the financial activity is planned to be cancelled.)*"
  },
  {
    "id": "af1317",
    "code": "applies_to_object_type",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Type of insurance component referenced by the AppliesToCoverageID attribute. For example: 360 = Coverage, 21 = CovOption, 454 = Rider. *(On FinancialActivity, AppliesToObjectType qualifies the object referenced by @AppliesToCoverageID. If no AppliesToObjectType is specified, @AppliesToCoverageID is assumed to reference a Coverage objec)*"
  },
  {
    "id": "af1318",
    "code": "accrued_earnings",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "The Earnings accrued on the Contributions made to the source through Pre-Tax contributions, After-Tax contributions, or Roth contributions."
  },
  {
    "id": "af1319",
    "code": "payment",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "The Payment object is optional, and may be a collection, but ordinarily would not be unless several checks are involved in a financial activity. *(On FinancialActivity, Payment is used to specify the individual payments made for that activity. Note that, for premium transactions such as initial premium or subsequent premium/deposits, one or more)*"
  },
  {
    "id": "af1320",
    "code": "payment_reference",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Payment Reference is used to refer to a Payment aggregate. *(On FinancialActivity, PaymentReference is used to reference a Payment object on another FinancialActivity in situations where one payment affects multiple activities.)*"
  },
  {
    "id": "af1321",
    "code": "accounting_activity",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Provides the line item entries that would be sent to a general ledger system. *(On FinancialActivity, AccountingActivity is used to record individual accounting events related to the financial activity. These may be summarized for general ledger purposes using AccountingStatement)*"
  },
  {
    "id": "af1322",
    "code": "tax_withholding",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "TaxWithholding contains the rules that indicate how taxes for the specified taxation entity were or should be calculated. *(On FinancialActivity, TaxWithholding contains the rules for determining the amount of taxes withheld. Total, specific amount information for an individual FinancialActivity such as the total taxes wit)*"
  },
  {
    "id": "af1323",
    "code": "financial_activity_info",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Provides information on financial activities that are dependent on this one. *(On FinancialActivity, FinancialActivityInfo was defined to mimic the design used by InvestProductInfo and PolicyProductInfo to relate products together. For example, when a financial activity at one l)*"
  },
  {
    "id": "af1324",
    "code": "fee",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "An aggregate describing fees to be charged."
  },
  {
    "id": "af1325",
    "code": "claim_reference_info",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Contains the claim reference information necessary to allow the association of Claims and payments, especially in the case where the Claim object may not be present in the stream."
  },
  {
    "id": "af1326",
    "code": "loan_activity",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "The LoanActivity tracks additional information about the financial activity when the FinActivityType is one of the types associated with loan processing (taking of loans, loan payments, etc.) *(On FinancialActivity, LoanActivity is used to track loan activity on transactions that relate to loans. On loan repayments, there should be one FinancialActivity for each loan even if multiple loans a)*"
  },
  {
    "id": "af1327",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af1328",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Record creation timestamp."
  },
  {
    "id": "af1329",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Record last update timestamp."
  },
  {
    "id": "af1330",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "financial_activity",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af1331",
    "code": "sub_account_id",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Primary key for Sub-Account."
  },
  {
    "id": "af1332",
    "code": "policy_id",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "FK → policy.policy_id"
  },
  {
    "id": "af1333",
    "code": "party_id",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "FK → party.party_id"
  },
  {
    "id": "af1334",
    "code": "sub_account_key",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "SubAccount Key"
  },
  {
    "id": "af1335",
    "code": "sub_account_sys_key",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "SubAccount System Key"
  },
  {
    "id": "af1336",
    "code": "sub_acct_status",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The status of SubAccount."
  },
  {
    "id": "af1337",
    "code": "purpose",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Code showing purpose / goal of client for which this was sold."
  },
  {
    "id": "af1338",
    "code": "asset_class",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Any item of economic value owned by an individual or corporation, especially that which could be converted to cash. Examples are cash, securities, accounts receivable, inventory, office equipment, a h"
  },
  {
    "id": "af1339",
    "code": "product_code",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "This is a carrier assigned code used to identify the object that contains this property. Because the code is assigned by a carrier, it is typically used in conjunction with a CarrierCode to create a u *(On SubAccount, ProductCode is the carrier assigned code used to identify the SubAccount, which is the InvestProduct or fund.)*"
  },
  {
    "id": "af1340",
    "code": "description",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The Description field defines a human readable, displayable, paragraph of detailed information for the corresponding object/concept. It provides a more detailed explanatory narrative for the object/co"
  },
  {
    "id": "af1341",
    "code": "carrier_code",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Uniquely represents the manufacturer of the financial product, such as an insurance company or fund manager. Note that the CarrierCode on PolicyProduct may reference the unique identifier of an insura *(On SubAccount, CarrierCode references a unique identifier of a fund manager or managing firm. When used by US implementations, use the firm's IARD/CRD numbers from the SEC's \"Investment Advisor Public)*"
  },
  {
    "id": "af1342",
    "code": "carrier_name",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Full name of issuing company or legal fund manager name. *(On SubAccount, CarrierName is the name of the Investment (Fund) Manager. It also references the name on the Prospectus and refers to the organization which manages the fund.)*"
  },
  {
    "id": "af1343",
    "code": "product_full_name",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Full name of SubAccount. This is the complete, official, and/or legal name used for this investment product. It should align with the FullName for the Investment."
  },
  {
    "id": "af1344",
    "code": "short_name",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The abbreviated or short name. *(On SubAccount, ShortName maps to/from InvestProduct/ShortName.)*"
  },
  {
    "id": "af1345",
    "code": "product_objective",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Objective of product. *(On SubAccount, ProductObjective is found on the product side on InvestProduct/Objective.)*"
  },
  {
    "id": "af1346",
    "code": "invest_type",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Type of investment product."
  },
  {
    "id": "af1347",
    "code": "invest_type_desc",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Description of the investment product type. *(On SubAccount, InvestTypeDesc is used to provide more details about InvestType. It may also be used to provide description when InvestType is set to \"Other\".)*"
  },
  {
    "id": "af1348",
    "code": "bene_designation_wording",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "In the case that the participant is a beneficiary, this is the exact wording of how the beneficiary was designated."
  },
  {
    "id": "af1349",
    "code": "security_purchase_type",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Used to indicate how securities were purchased."
  },
  {
    "id": "af1350",
    "code": "product_symbol",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Ticker symbol or other unique ID. *(On SubAccount, ProductSymbol is the same as and read-only from InvestProduct.)*"
  },
  {
    "id": "af1351",
    "code": "cusip_num",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Committee on Uniform Security Identification Procedures (CUSIP) number of insurance or investment product."
  },
  {
    "id": "af1352",
    "code": "old_inv_acct_num",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Maps to Investment.AccountNum field."
  },
  {
    "id": "af1353",
    "code": "cert_no",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Certificate Number"
  },
  {
    "id": "af1354",
    "code": "open_date",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Date when account was first opened"
  },
  {
    "id": "af1355",
    "code": "as_of_date",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "As of date of information. Purpose dependent on where it is used."
  },
  {
    "id": "af1356",
    "code": "self_directed_ind",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "TRUE indicates this is a self-directed fund. FALSE indicates this is NOT a self-directed fund. Directly correlates to Canadian Qualified Plan Types."
  },
  {
    "id": "af1357",
    "code": "core_fund_ind",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "TRUE indicates the fund is a Core Fund. FALSE indicates it is not. A core fund in a retirement plan line up is one that the advisor and/or plan sponsor are responsible for selecting and monitoring for"
  },
  {
    "id": "af1358",
    "code": "locked_in_ind",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Indicates if deposit funds are locked in or not locked in. For example, funds cannot be redeemed until retirement, earnings during an IndexTerm that are locked in such that the client does not partici *(On SubAccount, LockedInInd is used to communicate that a specific fund is or is not locked.)*"
  },
  {
    "id": "af1359",
    "code": "valuations_as_of_date",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Date shares (CurrNumberUnits) were last updated. If no shares, it is when the value is updated."
  },
  {
    "id": "af1360",
    "code": "compound_mode",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Compound interest can be paid out in different time frames, i.e. monthly, quarterly, annually, etc. This information is necessary to calculate the current value of the investment. *(On SubAccount, CompoundMode is used to specify the mode for the compound interest to be calculated.)*"
  },
  {
    "id": "af1361",
    "code": "curr_number_units",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Shows how many units of this particular fund the owner actually owns."
  },
  {
    "id": "af1362",
    "code": "curr_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Defines the current total interest rate for a subaccount/fund. This is the commonly quoted total interest rate and is made up of one or more interest rate components which may include BaseRate + Bonus"
  },
  {
    "id": "af1363",
    "code": "override_current_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "An interest rate can be manually set to override the current rate. *(On SubAccount, OverrideCurrentRate may be used to manually override the value in CurrRate.)*"
  },
  {
    "id": "af1364",
    "code": "maturity_date",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The date the investment will mature or expire. *(On SubAccount, MaturityDate is used to specify when the investment element is scheduled to end. Its connotation is context-specific based on the type of investment. For example, a bond will mature on )*"
  },
  {
    "id": "af1365",
    "code": "maturity_value",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Value of the investment at the end of the term or at maturity time."
  },
  {
    "id": "af1366",
    "code": "unit_value",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The current unit sell price of the fund. Unit Price at the sell rate as of the Pricing as of date"
  },
  {
    "id": "af1367",
    "code": "unit_value_buy_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Unit Price at the buy rate as of the UnitPriceAsOfDate."
  },
  {
    "id": "af1368",
    "code": "payout_unit_value",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The unit value used to determine the payout amount."
  },
  {
    "id": "af1369",
    "code": "pricing_as_of_date",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Date for which the Current Unit Value (UnitValue) pertains to. If no units, this is the last time value was updated."
  },
  {
    "id": "af1370",
    "code": "tot_cost",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Total cost (cash) - Does not include tax value of reinvested distributions."
  },
  {
    "id": "af1371",
    "code": "tot_value",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Current value of the fund as of the last update of the unit value or number of shares. Price / unit * # units"
  },
  {
    "id": "af1372",
    "code": "liability",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Total amount of loans for this investment."
  },
  {
    "id": "af1373",
    "code": "tax_basis",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The cumulative amount of money invested to-date, less any withdrawals or disbursements or partial surrenders, +/- any 'adjustments' (e.g. home improvements) as prescribed by the governing jurisdiction"
  },
  {
    "id": "af1374",
    "code": "alloc_percent",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Percentage representing how payments are currently being allocated. *(On SubAccount, AllocPercent represents the current allocation percentage for the fund. If there is more than one allocation defined this applies to the one active at the time of this transaction or in)*"
  },
  {
    "id": "af1375",
    "code": "allocation_amt",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Fixed amount representing how payments are currently being allocated. *(On SubAccount, AllocationAmt represents the amount being allocated to the fund. To set up an asset allocation, use Arrangement/ArrDestination. If there is more than one allocation defined, this applie)*"
  },
  {
    "id": "af1376",
    "code": "policy_charge_pct",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Percentage to allocate Charges, based on the policy charge allocation set for the overall investment account."
  },
  {
    "id": "af1377",
    "code": "actual_end_date",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Indicates the true or actual date the investment was redeemed. *(On SubAccount, not all investments will go to the maturity date, thus this is required as well as the anticipated maturity date.)*"
  },
  {
    "id": "af1378",
    "code": "total_issued_units",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Issued units referred to units of the fund for which a physical certificate has been issued usually for the purposes of using a collateral."
  },
  {
    "id": "af1379",
    "code": "total_unissued_units",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "This total works in conjunction with the TotalIssuedUnits to provide the TotalUnits on the SubAccount."
  },
  {
    "id": "af1380",
    "code": "total_redemption_amt_i_t_d",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Total redemption amount made, issue to date."
  },
  {
    "id": "af1381",
    "code": "future_exp_alloc_percent",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The percentage of future expense charges that will be deducted from the subaccount."
  },
  {
    "id": "af1382",
    "code": "avg_unit_cost",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The average cost of the shares/units remaining in the account/fund."
  },
  {
    "id": "af1383",
    "code": "surrender_charge_amt",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "SurrenderChargeAmt is the difference between the current accumulation value and the current surrender value, assuming that there are no loans on the policy. In other words, it is the surrender charge"
  },
  {
    "id": "af1384",
    "code": "net_surr_value_amt",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Cash Surrender value (NET) available to the client if they were to surrender their contract. It is net of any surrender charges, loans, cash value adjustments or term dividends."
  },
  {
    "id": "af1385",
    "code": "cap_gain_opt",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Destination of capital gains."
  },
  {
    "id": "af1386",
    "code": "dividend_opt",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Destination of dividends."
  },
  {
    "id": "af1387",
    "code": "interest_mode",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Simple interest can be paid out in different time frames, i.e. monthly, quarterly, annually, etc. This information is necessary to calculate the current value of the investment. *(On SubAccount, InterestMode is used to specify the mode for the simple interest to be calculated.)*"
  },
  {
    "id": "af1388",
    "code": "total_income_amt_y_t_d",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Total income received year to date."
  },
  {
    "id": "af1389",
    "code": "compound_ann_rate_of_rtn",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The compound annual rate of return."
  },
  {
    "id": "af1390",
    "code": "div_income_y_t_d",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Total Dividend Income Year To Date for this account."
  },
  {
    "id": "af1391",
    "code": "short_term_cap_gains_y_t_d",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Total Short Term Capital Gains Year To Date for this account."
  },
  {
    "id": "af1392",
    "code": "long_term_cap_gains_y_t_d",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Total Long Term Capital Gains Year To Date for this account."
  },
  {
    "id": "af1393",
    "code": "short_term_non_tax_cap_gains_y_t_d",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Total Short Term Non Taxable Capital Gains for this account Year To Date."
  },
  {
    "id": "af1394",
    "code": "long_term_non_tax_cap_gains_y_t_d",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Total Long Term Non Taxable Capital Gains for this account Year To Date."
  },
  {
    "id": "af1395",
    "code": "init_purchase_amt",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The initial purchase amount paid towards this subaccount."
  },
  {
    "id": "af1396",
    "code": "init_purchase_date",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Date the initial purchase amount was credited to the account."
  },
  {
    "id": "af1397",
    "code": "systematic_activity_type",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Type of systematic activity, e.g. withdrawal or investment."
  },
  {
    "id": "af1398",
    "code": "systematic_amt",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Systematic Investment/Withdrawal amount. Used in conjunction with SystematicMode and SystematicActivityType."
  },
  {
    "id": "af1399",
    "code": "systematic_mode",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Frequency with which payments are being paid to investments. Only applies to systematic payments being applied to investments. e.g. -monthly payments. Frequency of premium payment - monthy, quarterly,"
  },
  {
    "id": "af1400",
    "code": "systematic_activity_start_date",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The date the systematic activity is to begin."
  },
  {
    "id": "af1401",
    "code": "payment_method",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The business process by which payment is made which influences how the payment is billed. To express it in the reverse, there are internal business rules around each allowable Payment Method that usua"
  },
  {
    "id": "af1402",
    "code": "account_number",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "A unique account number. The unique identifier of a subset of financial information. For example the identifier for one of the following: an investment account, a bank account, a credit card account,  *(On SubAccount, the Banking object on another associated Holding referenced via SubAccount/@BankingHoldingID is the preferred location for this information.)*"
  },
  {
    "id": "af1403",
    "code": "routing_number",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The routing number for the bank account also the bank code used for wire transfers. The number used to sort paper checks by bank or bank branch as well as processing electronic funds transfer. This is *(On SubAccount, the Banking object on another associated Holding referenced via SubAccount/@BankingHoldingID is the preferred location for this information.)*"
  },
  {
    "id": "af1404",
    "code": "acct_holder_name",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The name of the holder of either the credit card or bank account associated with payments of either \"electronic funds transfer\" or \"credit card billing\". *(On SubAccount, the Banking object on another associated Holding referenced via SubAccount/@BankingHoldingID is the preferred location for this information.)*"
  },
  {
    "id": "af1405",
    "code": "credit_card_exp_date",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The month and year that the associated credit card expires. *(On SubAccount, the Banking object on another associated Holding referenced via SubAccount/@BankingHoldingID is the preferred location for this information.)*"
  },
  {
    "id": "af1406",
    "code": "credit_card_type",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "In the case that the PaymentMethod or PaymentForm is credit or debit card related, this is the type of card. *(On SubAccount, the Banking object on another associated Holding referenced via SubAccount/@BankingHoldingID is the preferred location for this information.)*"
  },
  {
    "id": "af1407",
    "code": "bank_acct_type",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "This is the type associated with the bank account; for example checking or savings account. *(On SubAccount, the Banking object on another associated Holding referenced via SubAccount/@BankingHoldingID is the preferred location for this information.)*"
  },
  {
    "id": "af1408",
    "code": "payment_draft_day",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "This is the day of the month (e.g. 15 to represent the 15th day of the month) that the payment will either be charged to a credit card or withdrawn from a bank account, when PaymentMethod is either 'c"
  },
  {
    "id": "af1409",
    "code": "bank_name",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Name of parent bank associated with this account. *(On SubAccount, the Banking object on another associated Holding referenced via SubAccount/@BankingHoldingID is the preferred location for this information.)*"
  },
  {
    "id": "af1410",
    "code": "e_e_contrib_amt_y_t_d",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The amount of the current year-to-date employee contributions made to the account."
  },
  {
    "id": "af1411",
    "code": "e_r_contrib_amt_y_t_d",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The amount of the current year-to-date employer contributions made to the account."
  },
  {
    "id": "af1412",
    "code": "pledge_units",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The number of units that have been pledged to another person or organization by way of an informal, or formal, agreement. Units that are ceded or negotiated in favor of a third party are referred to a"
  },
  {
    "id": "af1413",
    "code": "currency_type_code",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The type of currency. It is assumed that all currency fields for this object (including sub-objects) are of the same currency type. *(On SubAccount, CurrencyTypeCode is used to specify the type of currency for each individual SubAccount if different than Holding/CurrencyTypeCode. The total fund value for the investment (Investment.A)*"
  },
  {
    "id": "af1414",
    "code": "available_funds_amt",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The amount that is available to send in a fund transfer request. Used to validate fund transfer requests."
  },
  {
    "id": "af1415",
    "code": "transfer_send_allowed_ind",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "TRUE indicates that the a subaccount is allowed to be a sending subaccount in a fund transfer request. FALSE indicates it is not. In other words, the subaccount is allowed to transfer money out if thi *(On SubAccount, TransferSendAllowedInd specifies whether or not this subaccount may be a source fund. SubAccounts are present for funds on a Holding where there is value or the fund is used for a futur)*"
  },
  {
    "id": "af1416",
    "code": "transfer_send_restrict_info",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Contains information to specify restrictions on money moving out of a fund or subaccount. *(On SubAccount, TransferSendRestrictInfo applies when SubAccount/TransferSendAllowedInd is FALSE. It may apply in other situations also.)*"
  },
  {
    "id": "af1417",
    "code": "muni_state_of_issuance",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "State of issuance when the investment is municipal bonds. *(On SubAccount, MuniStateOfIssuance refers to a Municipal bond. The Municipality will be specified in the bond. This item is used to capture the state of issue. Use the Locality element to specify more)*"
  },
  {
    "id": "af1418",
    "code": "debt_type",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Describes the type of investment when the investment is debt-based."
  },
  {
    "id": "af1419",
    "code": "underlying_cusip_num",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "When the investment has another underlying investment, as in the case of options, this carries the underlying investment's CUSIP number."
  },
  {
    "id": "af1420",
    "code": "opt_put_call_type",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Indicates if the investment is either a Put or a Call. *(On SubAccount, this item is a reflection of the investor's choice in how to invest in the specified security as options. It is not an InvestProduct property since without the perspective or context of)*"
  },
  {
    "id": "af1421",
    "code": "opt_strike_amt",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "In options, the strike price (or exercise price) is the fixed price at which the owner of an option can purchase (in the case of a call), or sell (in the case of a put), the underlying security or com"
  },
  {
    "id": "af1422",
    "code": "alloc_charge_percent",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Percentage representing how charge deductions are currently being allocated. *(To set up an charge allocation, use Arrangement.ArrDestination. If there is more than one allocation defined this applies to the one active at the time of this transaction or inquiry.)*"
  },
  {
    "id": "af1423",
    "code": "alloc_charge_amt",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Amount representing how charge deductions are currently being allocated. *(To set up an charge allocation, use Arrangement.ArrDestination. If there is more than one allocation defined this applies to the one active at the time of this transaction or inquiry.)*"
  },
  {
    "id": "af1424",
    "code": "guar_int_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Defines a guaranteed minimum product/policy level interest rate independent of any fund/subaccount rates. It represents the minimum floor rate. This rate is guaranteed until the date GuarIntEndDate is *(On SubAccount, GuarIntRate represents a guaranteed interest rate greater than the amount specified on the policy. For annuities, the greater of Annuity/GuarIntRate or SubAccount/GuarIntRate (if define)*"
  },
  {
    "id": "af1425",
    "code": "guar_int_end_date",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The date through which the guaranteed interest rate is applicable. *(On SubAccount, GuarIntEndDate is only applicable to \"fixed funds\" (AssetClass = \"1\"). The ACORD model has an elaborate mechanism for describing these rates and their duration in the RateVariation aggr)*"
  },
  {
    "id": "af1426",
    "code": "quote_num",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "When an investment is being proposed, QuoteNum is an identifier associated with the proposal that is not the account number, but may exist in addition to the account number."
  },
  {
    "id": "af1427",
    "code": "withdrawals_allowed_ind",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "TRUE indicates withdrawals are allowed for the associated investment. FALSE indicates withdrawals are NOT allowed for the associated investment."
  },
  {
    "id": "af1428",
    "code": "payin_window_start_date",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "When the investment is defined by a contract, this is the start date of the time period allotted for pay-ins or deposits to the investment. This window applies to all monies paid into the SubAccount,"
  },
  {
    "id": "af1429",
    "code": "payin_window_end_date",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "When the investment is defined by a contract, this is the end date of the time period allotted for pay-ins or deposits to the investment. This window applies to all monies paid into the SubAccount, ac"
  },
  {
    "id": "af1430",
    "code": "maturity_payment_type",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Identifies the payment type initiated at maturity for the contract-based investment."
  },
  {
    "id": "af1431",
    "code": "int_takedown_ind",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "TRUE indicates the contracted investment provides for Interest Takedown payments. FALSE indicates the contracted investment does NOT provides for Interest Takedown payments."
  },
  {
    "id": "af1432",
    "code": "withdrawal_order",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "If withdrawals are allowed, identifies how any money withdrawn is applied or removed from the account."
  },
  {
    "id": "af1433",
    "code": "buffer_acct_ind",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "TRUE indicates the investment has an associated buffer account to cover participant withdrawals to some threshold. FALSE indicates the investment does NOT have an associated buffer account to cover pa"
  },
  {
    "id": "af1434",
    "code": "buffer_acct_amt",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Identifies the amount available in the investment's associated buffer account. *(On SubAccount, BufferAcctAmt represents the buffer amount for the fund if the fund has an associated buffer account (BufferAcctInd set to true). A buffer account would typically have an amount or a pe)*"
  },
  {
    "id": "af1435",
    "code": "buffer_acct_pct",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Identifies the amount available in the investment's associated buffer account as a percentage of the investment's current value. *(On SubAccount, BufferAcctPct represents the buffer percentage for the fund if the fund has an associated buffer account (BufferAcctInd set to true). A buffer account would typically have an amount or )*"
  },
  {
    "id": "af1436",
    "code": "base_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Defines the current base rate declared for the fund. It must be equal to or more commonly greater than the guaranteed interest rate. *(On SubAccount, the BaseRate is the stated, issued, or declared interest rate for the investment vehicle. For bonds, it is the coupon rate.)*"
  },
  {
    "id": "af1437",
    "code": "commission_pct",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The percentage commission payable to the Producer in terms of the distribution agreement"
  },
  {
    "id": "af1438",
    "code": "amort_mkt_val_diff_pct",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "An expense that represents an adjustment to the base rate that can be made if the initial deposit into the contract does not equal the initial book value that is determined for the contract. The expen"
  },
  {
    "id": "af1439",
    "code": "cap_amt",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The maximum total amount of contributions allowed to the investment over the life of the investment."
  },
  {
    "id": "af1440",
    "code": "cap_type",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The type of cap employed by the investment."
  },
  {
    "id": "af1441",
    "code": "floor_amt",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The minimum total amount of contributions allowed to the investment over the life of the investment."
  },
  {
    "id": "af1442",
    "code": "cap_floor_contrib_type",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Identifies the investment contribution monies to which the cap and/or floor will apply."
  },
  {
    "id": "af1443",
    "code": "cap_excess_pay_date",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The date on which all monies paid in excess of the investment cap are to be repaid."
  },
  {
    "id": "af1444",
    "code": "floor_shortfall_pay_date",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The date on which the difference between the floor of the investment and the total contributions is to be paid into the Investment."
  },
  {
    "id": "af1445",
    "code": "interest_type",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Identifies the interest type for an interest bearing investment."
  },
  {
    "id": "af1446",
    "code": "interest_calc_type",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Identifies how the interest will be calculated for an interest bearing investment."
  },
  {
    "id": "af1447",
    "code": "interest_round_type",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Identifies whether the fractional cents of the calculated interest amount will be rounded off, or truncated when the interest is calculated for an interest bearing investment. Different processing and"
  },
  {
    "id": "af1448",
    "code": "dividend_trans_last_date",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The date the last dividend was posted to this sub-account. This is the date of the last transaction register entry reflecting dividend activity including anniversary apportionment, check-writing, or o"
  },
  {
    "id": "af1449",
    "code": "dur_qualifier",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Type of duration applicable to the rate being described. *(On SubAccount, defines the type of GuaranteeDuration)*"
  },
  {
    "id": "af1450",
    "code": "guarantee_duration",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The overall duration that this particular rate variation signifies - e.g. 3 year, 5 year, 6 month. The field DurQualifier indicates the mode it corresponds to (e.g. a month period, year period, etc... *(On SubAccount, GuaranteeDuration is used to define the duration for GuarIntRate. Use AdditionalInterestRateInfo/Duration to specify durations for other rate types.)*"
  },
  {
    "id": "af1451",
    "code": "e_r_contrib_amt_i_t_d",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The amount of the current issue-to-date employer contributions made to the account."
  },
  {
    "id": "af1452",
    "code": "e_e_contrib_amt_i_t_d",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The amount of the current issue-to-date employee contributions made to the account."
  },
  {
    "id": "af1453",
    "code": "rounding_precision",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Specifies the number of decimal places to be used in rounding or truncation. Use in conjunction with the Rounding Method table."
  },
  {
    "id": "af1454",
    "code": "e_r_cont_value_i_t_d",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The amount of the current issue-to-date employer contributions made."
  },
  {
    "id": "af1455",
    "code": "cap_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "This Equity Index Value Cap Rate is applied to the beginning Fund value, compared to the Equity Index value and serves as an upper limit on the amount of increase. This Cap Rate is set on a periodic b"
  },
  {
    "id": "af1456",
    "code": "cap_bailout_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "This is the Equity Index Cap Bailout Rate. The Bailout Rate allows the policy owner to transfer money out of the Equity Index fund or surrender the contract without penalty if the Cap Rate falls below *(On SubAccount, CapBailoutRate applies to index funds. It is stipulated at the time funds are deposited into the fund and does not change.)*"
  },
  {
    "id": "af1457",
    "code": "participation_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "This relates to what proportion an indexed product participates in the upside of the market. For example, if the market goes up 10% and there is an 80% participation rate, they would be credited 8% (s *(On SubAccount, ParticipationRate is used to specify the upside participation rate. Use ParticipationDownsideRate to specify the downside participation rate.)*"
  },
  {
    "id": "af1458",
    "code": "participation_bailout_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "If the renewal upside Participation rate is less than the Bailout Rate for that applicable strategy, client may liquidate without incurring any withdrawal charges."
  },
  {
    "id": "af1459",
    "code": "participation_downside_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The percentage of the index's loss the client will not realize. For example, if the index has a loss of 10% and the annuity's participation rate was 50%, a client will have an actual loss of 5%. *(On SubAccount, ParticipationDownsideRate is used to specify the downside participation rate. Use ParticipationRate to specify the upside participation rate.)*"
  },
  {
    "id": "af1460",
    "code": "transfer_dest_allowed_ind",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "TRUE indicates a subaccount is allowed to be a destination (target) subaccount in a fund transfer request. FALSE indicates a subaccount is NOT allowed to be a destination (target) subaccount in a fund *(On SubAccount, TransferDestAllowedInd specifies whether or not this subaccount may be a target fund. SubAccounts are present for funds on a Holding where there is value or the fund is used for a futur)*"
  },
  {
    "id": "af1461",
    "code": "transfer_dest_restrict_info",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Contains information to specify restrictions on money moving into a fund or subaccount. *(On SubAccount, TransferDestRestrictInfo applies when SubAccount/TransferDestAllowedInd is FALSE. It may apply in other situations also.)*"
  },
  {
    "id": "af1462",
    "code": "sub_account_type",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Represents the kind of SubAccount. *(On SubAccount, SubAccountType allows for managing monies within a policy as consumer elected accounts, side accounts, and internal processing accounts. All SubAccounts on a holding are considered part)*"
  },
  {
    "id": "af1463",
    "code": "tax_status",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Tax Status indicates the tax status of the parent entity. *(On SubAccount, TaxStatus is used to account for the fact that some of the investments are tax exempt but the money in the side account is fully taxed.)*"
  },
  {
    "id": "af1464",
    "code": "tax_status_reason",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The reason for the Tax Status. For example, if the TaxStatus is 3 for Tax Exempt, the type of exemption (full time student, military spouse, etc.) may be specified here. *(On SubAccount, TaxStatusReason may be used to provide details regarding the reason for the TaxStatus.)*"
  },
  {
    "id": "af1465",
    "code": "market_val_adjust_ind",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "TRUE indicates that market value adjustments apply. FALSE indicates market value adjustments do not apply. A market value adjustment increases or decreases a value based on the difference between the  *(On SubAccount, MarketValAdjustInd is used to determine if the fund is subject to market value adjustments. If MarketValAdjustInd is set to TRUE on any SubAccount instance, then it SHOULD BE set to TRU)*"
  },
  {
    "id": "af1466",
    "code": "bonus_accrual",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Bonus accrual indicates whether or not a subaccount allows bonuses. *(If a bonus is scheduled, it is specified in the ScheduledBonus)*"
  },
  {
    "id": "af1467",
    "code": "bonus_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Defines the current bonus rate declared for the fund. A bonus rate is typically based on premium, jurisdiction, qualified plan type or some other policy component. For index-linked products, this rate"
  },
  {
    "id": "af1468",
    "code": "account_value_last_ann",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The value of the account as of the end of the last policy anniversary. *(On SubAccount, AccountValueLastAnn is the ending balance of the individual fund (sub-account) value as of the last policy anniversary.)*"
  },
  {
    "id": "af1469",
    "code": "trading_exchange_type_code",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Name of exchange on which an investment is traded. *(On SubAccount, TradingExchangeTypeCode is used to provide the trading exchange on which the investment represented by the SubAccount is traded.)*"
  },
  {
    "id": "af1470",
    "code": "issue_nation",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The nation of issue. *(On SubAccount, IssueNation is used to specify the nation of issue for the particular investment vehicle. Examples include the issuing nation for government bonds or municipal bonds. This may be differ)*"
  },
  {
    "id": "af1471",
    "code": "locality",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Name of City, Township, Town, Borough, etc. *(On SubAccount, this indicates the locality of issue for the investment vehicle represented by the SubAccount. For example, municipal bonds may be issued at the local government level.)*"
  },
  {
    "id": "af1472",
    "code": "bond_pre_refund_date",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Pre-refunded refers to a provision within certain bonds under which a second bond will be issued to fund the call/redemption of a prior bond. The BondPreRefundDate is the date on which the bond can be"
  },
  {
    "id": "af1473",
    "code": "bond_pre_refund_amt",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Pre-refunded refers to a provision within certain bonds under which a second bond will be issued to fund the call/redemption of a prior bond. The BondPreRefundAmt is the price for which the bond can b"
  },
  {
    "id": "af1474",
    "code": "sub_account_term",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The term of the SubAccount. This element would typically be used if the InvestmentType is a Bond as Bonds always have a fixed term. *(On SubAccount, SubAccountTerm is used with SubAccountTermQualifier to specify the term for which the investment has been made. For example, on a 10 year bond, the SubAccountTerm would be set to 10 and)*"
  },
  {
    "id": "af1475",
    "code": "sub_account_term_qualifier",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Type of duration applicable to the SubAccount Term being described. *(On SubAccount, SubAccountTermQualifier is used with SubAccountTerm to specify the term for which the investment has been made. For example, on a 10 year bond, the SubAccountTerm would be set to 10 and)*"
  },
  {
    "id": "af1476",
    "code": "actual_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The actual rate earned at the end of the index crediting period for this index option."
  },
  {
    "id": "af1477",
    "code": "actual_loss_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The actual loss realized based on the index strategy during the last period."
  },
  {
    "id": "af1478",
    "code": "blended_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "An interest rate charged on a block of monies invested in a fixed account. The rate represents an average of the rate currently being paid on multiple 'buckets' of money in a block. This may be the re"
  },
  {
    "id": "af1479",
    "code": "buffer_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The percentage of loss an investor is protected from in the event of negative index performance. *(On SubAccount, BufferRate only relates to Index Account Earning Crediting.)*"
  },
  {
    "id": "af1480",
    "code": "cap_threshold_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "A rate elected by an advisor/agent or client at point of sale (issue) that communicates the minimum desired upside performance. This rate is captured and communicated back to firms, advisor/agent and  *(On SubAccount, CapThresholdRate applies to index funds. It is stipulated at point of sale (issue).)*"
  },
  {
    "id": "af1481",
    "code": "floor_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The maximum percentage loss that an investor experiences from negative index performance."
  },
  {
    "id": "af1482",
    "code": "m_v_a_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Current rate which will be compared to crediting rate on MVA fund if money is withdrawn."
  },
  {
    "id": "af1483",
    "code": "margin_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The percentage reduction in the index performance used to determine the amount of return an investor can earn."
  },
  {
    "id": "af1484",
    "code": "margin_bailout_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "If the renewal Margin rate is more than the Bailout Rate for that applicable strategy, client may liquidate without incurring any withdrawal charges."
  },
  {
    "id": "af1485",
    "code": "trigger_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The rate credited if the index return exceeds zero or meets the trigger threshold, if the threshold is not zero. Otherwise, no interest is credited."
  },
  {
    "id": "af1486",
    "code": "trigger_bailout_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "If the renewal Trigger rate is less than the Bailout Rate for that applicable strategy, client may liquidate without incurring any withdrawal charges."
  },
  {
    "id": "af1487",
    "code": "trigger_within_buffer_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The rate that is applied if certain parameters are met (e.g. if the trigger rate is 1% and if the index returns less than zero but greater than the buffer, the trigger rate of 1% would apply.)"
  },
  {
    "id": "af1488",
    "code": "index_crediting_method",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The method used to calculate the potential earnings for the index option."
  },
  {
    "id": "af1489",
    "code": "index_crediting_mode",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Mode of the index - yearly, quarterly etc"
  },
  {
    "id": "af1490",
    "code": "index_type",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Is it a standard index or custom index?"
  },
  {
    "id": "af1491",
    "code": "num_term_periods",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Number of Index Periods *(On SubAccount, NumTermPeriods is generally specified on the SubAccount representing an Index Strategy to denote the length of each of its index terms. It is used to specify the number of periods. For )*"
  },
  {
    "id": "af1492",
    "code": "term_period",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The duration of each index term within an index strategy. For example, 3 year, 5 year, 6 month. *(On SubAccount, TermPeriod is generally specified on the SubAccount representing an Index Strategy to denote the length of each of its index terms. The field TermPeriodQualifier indicates the mode it c)*"
  },
  {
    "id": "af1493",
    "code": "term_period_qualifier",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Type of duration applicable to the term being described. *(On SubAccount, TermPeriodQualifier is generally specified on the SubAccount representing an Index Strategy to denote the length of each of its index terms. It qualifies the TermPeriod property. NumTer)*"
  },
  {
    "id": "af1494",
    "code": "tracking_value",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The value of a fund at any point during an index strategy term. It is a hypothetical indication of what the client may earn."
  },
  {
    "id": "af1495",
    "code": "initial_index_benchmark_value",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The index value at the start of the current period."
  },
  {
    "id": "af1496",
    "code": "current_index_benchmark_value",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The index value during the current period."
  },
  {
    "id": "af1497",
    "code": "index_starting_close_price",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "A starting closing price is the final price at which a security or market trades before the end of the trading day. It's a fixed number that's used as a benchmark to measure a market's daily performan"
  },
  {
    "id": "af1498",
    "code": "index_ending_close_price",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "This represents the closing price of the index strategy at the beginning of the duration or term. This will be the starting point to be used in the calculations in the earnings."
  },
  {
    "id": "af1499",
    "code": "minimum_cap_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Minimum cap rate on the index performance"
  },
  {
    "id": "af1500",
    "code": "index_crediting_date",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Used to determine the transfer window. Also called Index Earnings Date. This relates to the IndexCreditingMode."
  },
  {
    "id": "af1501",
    "code": "lock_feature_ind",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "TRUE indicates the client is allowed to lock in the value prior to the end of the index term. FALSE indicates this feature is not available. *(On SubAccount, LockFeatureInd may be used to override availability of the performance lock for a specific fund defined in product rules. If the SubAccount/LockedInInd is set to true, then the LockFeat)*"
  },
  {
    "id": "af1502",
    "code": "index_option_period",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "An ordinal number identifier for each Index Term."
  },
  {
    "id": "af1503",
    "code": "accrued_interest",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Interest accrued in a given term. On index strategy SubAccounts, this is the term for the strategy. On index term SubAccounts, this is the term for the individual bucket."
  },
  {
    "id": "af1504",
    "code": "source_tax_type",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "This represents the different sources of contribution made into the Pension plan such as Employee contributions via Pretax Salary deferrals, Roth Contributions, After Tax contributions and Employer co"
  },
  {
    "id": "af1505",
    "code": "performance_yield_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Provides performance credits based on an annual performance yield when the index is at or above the performance (trigger rate)."
  },
  {
    "id": "af1506",
    "code": "upper_target_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Upper Target Rate set by client/FA on this Strategy, if/when the Strategy Performance reaches this Rate the Carrier will send a notification to the FP and Client."
  },
  {
    "id": "af1507",
    "code": "lock_fixed_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Rate being credited as a fixed rate on the locked funds in this index strategy."
  },
  {
    "id": "af1508",
    "code": "lock_in_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "The calculated rate based on the performance lock feature being executed. This represents the earnings at the time of the Lock. The ActualRate may change based upon the LockFixedRate or other factors)"
  },
  {
    "id": "af1509",
    "code": "lower_target_rate",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Lower Target Rate set by client/FA on this Strategy, if/when the Strategy Performance reaches (drops to/beyond) this Rate the Carrier will send a notification to the FP and Client."
  },
  {
    "id": "af1510",
    "code": "financial_activity",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Reference to the financial activity collection for this policy. A FinancialActivity is one business event. One \"financial activity\" may adjust an account value and/or (if variable funds are involved)"
  },
  {
    "id": "af1511",
    "code": "participant",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "An implementation requirement is that a relationship must be built for all participants. Note that MR 04-1.127.03 synchronized the objects, properties, and attributes of Participant and LifeParticipan *(On SubAccount, Participant is used to provide beneficiary information only.)*"
  },
  {
    "id": "af1512",
    "code": "extend_or_call",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "If the contractual investment is set up to be extendible, callable, or put-able the rules associated with the extend, call, or put would be found in this object. *(On SubAccount, ExtendOrCall is used to define the details about options. An investment is callable when it is able to be redeemed prior to maturity. The term usually applies to bonds and convertible s)*"
  },
  {
    "id": "af1513",
    "code": "fee",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "An aggregate describing fees to be charged."
  },
  {
    "id": "af1514",
    "code": "additional_interest_rate_info",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "This contains information about interest rates and associated periods *(On SubAccount, AdditionalInterestRateInfo shows the different interest rates and associated periods that apply to this particular subaccount and includes the portion of the policy value that was earni)*"
  },
  {
    "id": "af1515",
    "code": "scheduled_bonus",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Scheduled Bonuses accrue to a client and may or may not be paid out, depending on whether all criteria are met for payment."
  },
  {
    "id": "af1516",
    "code": "rating_agency_info",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "A collection of properties used to describe the ratings that various agencies have assigned. For a carrier or an investment, this would be rating agencies like Moody's, Duff & Phelps, Standard & Poor' *(On SubAccount, RatingAgencyInfo is used to specify agency ratings as they apply to the specific instance of this fund. Agencies include Standard and Poors, Moody's, etc.)*"
  },
  {
    "id": "af1517",
    "code": "information_service",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Data Service provider information. Contains the codes used by various Data Service providers. *(On SubAccount, InformationService provides the codes used by various third party Data Service providers such as Lipper, Morningstar, etc.)*"
  },
  {
    "id": "af1518",
    "code": "sub_account_southern_africa",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "If the subaccount or fund exists within Southern Africa, this object contains the properties that are unique to that marketplace. Southern Africa includes the regional nations sharing common insurance"
  },
  {
    "id": "af1519",
    "code": "rate_lock",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Used to specify Rate Lock details such as the time period for which it applies and the relevant rate. *(On SubAccount, RateLock is used to specify rate lock information. For example, either a fixed fund within a variable product or a fixed product.)*"
  },
  {
    "id": "af1520",
    "code": "rate_tier",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Defines what portion of a Return will be credited based upon specific Index Returns. The first tier always starts at the IndexReturnPct of zero%, and goes up to the next tier (e.g. anything above 5%),"
  },
  {
    "id": "af1521",
    "code": "attachment",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "This contains a collection of attachments. Each attachment could contain any of the attachment Types defined. In the Attachment object the three items AttachmentData, AttachmentReference, and Attachme"
  },
  {
    "id": "af1522",
    "code": "keyed_value",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Generic object used to extend object hierarchy for proprietary data requirements. Each proprietary data item is represented using a KeyedValue object. A collection of KeyedValue objects is utilized to"
  },
  {
    "id": "af1523",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af1524",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Record creation timestamp."
  },
  {
    "id": "af1525",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Record last update timestamp."
  },
  {
    "id": "af1526",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "sub_account",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af1527",
    "code": "payment_id",
    "usedInTables": 1,
    "tables": "payment",
    "description": "Primary key for Payment."
  },
  {
    "id": "af1528",
    "code": "policy_id",
    "usedInTables": 1,
    "tables": "payment",
    "description": "FK → policy.policy_id"
  },
  {
    "id": "af1529",
    "code": "party_id",
    "usedInTables": 1,
    "tables": "payment",
    "description": "FK → party.party_id"
  },
  {
    "id": "af1530",
    "code": "payment_key",
    "usedInTables": 1,
    "tables": "payment",
    "description": "Payment Key"
  },
  {
    "id": "af1531",
    "code": "payment_sys_key",
    "usedInTables": 1,
    "tables": "payment",
    "description": "Payment System Key"
  },
  {
    "id": "af1532",
    "code": "payment_form",
    "usedInTables": 1,
    "tables": "payment",
    "description": "Physical form of payment."
  },
  {
    "id": "af1533",
    "code": "create_check_ind",
    "usedInTables": 1,
    "tables": "payment",
    "description": "Indicator whether to create a check request as a result of this activity."
  },
  {
    "id": "af1534",
    "code": "payee_relation_role_code",
    "usedInTables": 1,
    "tables": "payment",
    "description": "Describes the relation of the payee to the holding."
  },
  {
    "id": "af1535",
    "code": "payee_name",
    "usedInTables": 1,
    "tables": "payment",
    "description": "FullName from Party"
  },
  {
    "id": "af1536",
    "code": "check_no",
    "usedInTables": 1,
    "tables": "payment",
    "description": "Individual check number, not including the routing number or account number."
  },
  {
    "id": "af1537",
    "code": "check_description",
    "usedInTables": 1,
    "tables": "payment",
    "description": "Anything the payer wrote on the check."
  },
  {
    "id": "af1538",
    "code": "vendor_code",
    "usedInTables": 1,
    "tables": "payment",
    "description": "VendorCode provides a way of uniquely identifying each and every sender and/or receiver of ACORD messages/transactions. A sender or receiver may be an organization, individual or system, and represent"
  },
  {
    "id": "af1539",
    "code": "payment_amt",
    "usedInTables": 1,
    "tables": "payment",
    "description": "Current amount of payment. PaymentAmt is neutral as to whether the payment is inbound or outbound, paid or intention of payment. Refer to usage details for more information. *(On Payment, PaymentAmt represents the amount of the payment. Usage (inbound or outbound) is defined within the context of the parent object.)*"
  },
  {
    "id": "af1540",
    "code": "source_of_funds_t_c",
    "usedInTables": 1,
    "tables": "payment",
    "description": "The source of funds is used to capture the result of the event or transaction that generated or created funds, not the location or financial repository from which they were taken to satisfy the financ"
  },
  {
    "id": "af1541",
    "code": "source_of_funds_details",
    "usedInTables": 1,
    "tables": "payment",
    "description": "SourceOfFundsDetails is a string field that provides additional information about the source of funds for the Holding."
  },
  {
    "id": "af1542",
    "code": "payment_partial_ind",
    "usedInTables": 1,
    "tables": "payment",
    "description": "TRUE indicates a short, partial payment (less than the amount due) is received. FALSE indicates this is not a partial payment."
  },
  {
    "id": "af1543",
    "code": "payment_method",
    "usedInTables": 1,
    "tables": "payment",
    "description": "The business process by which payment is made which influences how the payment is billed. To express it in the reverse, there are internal business rules around each allowable Payment Method that usua"
  },
  {
    "id": "af1544",
    "code": "retained_commission_amt",
    "usedInTables": 1,
    "tables": "payment",
    "description": "Portion of financial activity amount representing the commission retained associated with this financial activity by the producer."
  },
  {
    "id": "af1545",
    "code": "money_transfer_type",
    "usedInTables": 1,
    "tables": "payment",
    "description": "Indicates the means of transferring money from one contract to another during replacement *(On Payment, MoneyTransferType defines the TYPE of Money Transfer and it is separate from the SOURCE of Funds. Both together define the type and source of transfer funds. These need to be distinct and )*"
  },
  {
    "id": "af1546",
    "code": "check_date",
    "usedInTables": 1,
    "tables": "payment",
    "description": "This does not necessarily reflect the date the check was written. For example, it could be post dated."
  },
  {
    "id": "af1547",
    "code": "check_stub_details",
    "usedInTables": 1,
    "tables": "payment",
    "description": "This is the reference information that is printed on the check stub. It can be used to capture any freeform string that is specific for printing on the stub."
  },
  {
    "id": "af1548",
    "code": "payment_status",
    "usedInTables": 1,
    "tables": "payment",
    "description": "The current status of the payment"
  },
  {
    "id": "af1549",
    "code": "payment_status_date",
    "usedInTables": 1,
    "tables": "payment",
    "description": "This date represents the date that the payment was placed in its current status."
  },
  {
    "id": "af1550",
    "code": "date_received_at_bank",
    "usedInTables": 1,
    "tables": "payment",
    "description": "Date that the payment was received at the Bank"
  },
  {
    "id": "af1551",
    "code": "date_deposited_by_bank",
    "usedInTables": 1,
    "tables": "payment",
    "description": "Date that the payment was deposited by the Bank"
  },
  {
    "id": "af1552",
    "code": "foreign_payment_ind",
    "usedInTables": 1,
    "tables": "payment",
    "description": "Monetary transfer from a country other than the IssueNation or ResidenceCountry"
  },
  {
    "id": "af1553",
    "code": "payment_status_reason",
    "usedInTables": 1,
    "tables": "payment",
    "description": "Free form text to hold the reason for the payment status"
  },
  {
    "id": "af1554",
    "code": "reference_no",
    "usedInTables": 1,
    "tables": "payment",
    "description": "A reference number may include items such as check #, money transfer number, etc. *(On Payment, ReferenceNo is used as an identifier for the payment.)*"
  },
  {
    "id": "af1555",
    "code": "payment_mail_date",
    "usedInTables": 1,
    "tables": "payment",
    "description": "The date that the payment was mailed to the client."
  },
  {
    "id": "af1556",
    "code": "a_c_h_entry_class_type",
    "usedInTables": 1,
    "tables": "payment",
    "description": "Automated Clearing House (ACH) Entry codes associated with National Automated Clearing House Association (NACHA) transaction classification codes."
  },
  {
    "id": "af1557",
    "code": "payment_delivery_meth_info",
    "usedInTables": 1,
    "tables": "payment",
    "description": "A collection of delivery methods available for a payment. *(On Payment, PaymentDeliveryMethInfo contains payment delivery information related to a specific payment. While added as a repeating construct, only one PaymentDeliveryMethInfo is anticipated on a sing)*"
  },
  {
    "id": "af1558",
    "code": "attachment",
    "usedInTables": 1,
    "tables": "payment",
    "description": "This contains a collection of attachments. Each attachment could contain any of the attachment Types defined. In the Attachment object the three items AttachmentData, AttachmentReference, and Attachme"
  },
  {
    "id": "af1559",
    "code": "keyed_value",
    "usedInTables": 1,
    "tables": "payment",
    "description": "Generic object used to extend object hierarchy for proprietary data requirements. Each proprietary data item is represented using a KeyedValue object. A collection of KeyedValue objects is utilized to"
  },
  {
    "id": "af1560",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "payment",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af1561",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "payment",
    "description": "Record creation timestamp."
  },
  {
    "id": "af1562",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "payment",
    "description": "Record last update timestamp."
  },
  {
    "id": "af1563",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "payment",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af1564",
    "code": "medical_exam_id",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Primary key for Medical Exam."
  },
  {
    "id": "af1565",
    "code": "policy_id",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "FK → policy.policy_id"
  },
  {
    "id": "af1566",
    "code": "party_id",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "FK → party.party_id"
  },
  {
    "id": "af1567",
    "code": "medical_exam_key",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "MedicalExam Key"
  },
  {
    "id": "af1568",
    "code": "medical_exam_sys_key",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "MedicalExam System Key"
  },
  {
    "id": "af1569",
    "code": "comments_incomplete_ind",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "A value of True indicates that not all requirements associated with this exam were satisfied. *(If requirements were not completed, ExaminerComments should indicate the reason. Use Attachment to capture the actual comments.)*"
  },
  {
    "id": "af1570",
    "code": "exam_status",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Status of exam"
  },
  {
    "id": "af1571",
    "code": "interpreter_relationship",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Relationship of interpreter to the examinee"
  },
  {
    "id": "af1572",
    "code": "report_language",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Language report is in."
  },
  {
    "id": "af1573",
    "code": "exam_date",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Date of exam."
  },
  {
    "id": "af1574",
    "code": "exam_time",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Time at which an examination took place."
  },
  {
    "id": "af1575",
    "code": "first_diastolic_b_p_reading",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Blood pressure is defined in millimeters of mercury, or mm Hg."
  },
  {
    "id": "af1576",
    "code": "second_diastolic_b_p_reading",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Blood pressure is defined in millimeters of mercury, or mm Hg."
  },
  {
    "id": "af1577",
    "code": "third_diastolic_b_p_reading",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Blood pressure is defined in millimeters of mercury, or mm Hg."
  },
  {
    "id": "af1578",
    "code": "first_systolic_b_p_reading",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Blood pressure is defined in millimeters of mercury, or mm Hg."
  },
  {
    "id": "af1579",
    "code": "second_systolic_b_p_reading",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Blood pressure is defined in millimeters of mercury, or mm Hg."
  },
  {
    "id": "af1580",
    "code": "third_systolic_b_p_reading",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Blood pressure is defined in millimeters of mercury, or mm Hg."
  },
  {
    "id": "af1581",
    "code": "first_pulse_reading",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Pulse is defined in beats per minute (BPM)."
  },
  {
    "id": "af1582",
    "code": "second_pulse_reading",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Pulse is defined in beats per minute (BPM)."
  },
  {
    "id": "af1583",
    "code": "signs_of_alcohol_abuse_obs",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Observation of examiner during time of exam as it relates to alcohol abuse."
  },
  {
    "id": "af1584",
    "code": "signs_of_drug_abuse_obs",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Observation of examiner during time of exam as it relates to drug abuse."
  },
  {
    "id": "af1585",
    "code": "pulse_irregular_ind",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Indicates that the examiner detected a pulse irregularity. TRUE means an irregular pulse was detected."
  },
  {
    "id": "af1586",
    "code": "first_premature_v_c",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Premature Contractions are defined in number of contractions per minute. One reading is acceptable but more may be obtained depending on results."
  },
  {
    "id": "af1587",
    "code": "second_premature_v_c",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Premature Contractions are defined in number of contractions per minute. One reading is acceptable but more may be obtained depending on results."
  },
  {
    "id": "af1588",
    "code": "menstruation",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "TRUE indicates current menses, FALSE indicate not current menses. *(On MedicalExam, Menstruation applies only when the examined person is female. This is relevant to exam results. Instructions: If Yes, specimen is still required.)*"
  },
  {
    "id": "af1589",
    "code": "urine_temperature",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Temperature of Urine Test. Measurement units specified in Measure Units."
  },
  {
    "id": "af1590",
    "code": "medical_exam_type",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Indicates type of exam; Medical, ParaMedical or Lab Slip"
  },
  {
    "id": "af1591",
    "code": "lab_slip_ticket_num",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Lab Slip Code Number of the specimen that will be tested by lab, often a bar code. Only applicable to Lab Slips."
  },
  {
    "id": "af1592",
    "code": "third_pulse_reading",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Pulse is defined in beats per minute (BPM)."
  },
  {
    "id": "af1593",
    "code": "physician_ind",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Response to whether applicant has a primary physician. If any details are provided see Party object for Physician, associated to this Party via a Relation to the Applicant Party with Role Code of 'Phy"
  },
  {
    "id": "af1594",
    "code": "current_drug_use_ind",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Response to question whether applicant is now taking prescription, over-the-counter, vitamins or supplements. If yes, provide details in CurrentDrugUseDesc"
  },
  {
    "id": "af1595",
    "code": "medical_exam_authorization_ind",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Indicates the applicant has signed the medical exam authorization."
  },
  {
    "id": "af1596",
    "code": "current_drug_use_desc",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Details on reported prescription, over-the-counter, vitamins or supplements."
  },
  {
    "id": "af1597",
    "code": "moving_violation_ind",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Response to question whether applicant has had moving violations."
  },
  {
    "id": "af1598",
    "code": "last_physician_visit",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Number of months since last physician visit. Used primarily for Lab Slips."
  },
  {
    "id": "af1599",
    "code": "last_tobacco_months",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Number of months applicant indicated since they last consumed or used a tobacco product (cigarette, cigar)."
  },
  {
    "id": "af1600",
    "code": "nicotine_substance_months",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Number of months applicant indicated since they last consumed or used a nicotine product (chew, etc.)"
  },
  {
    "id": "af1601",
    "code": "blood_centrifuge_date",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Date the blood was centrifuged."
  },
  {
    "id": "af1602",
    "code": "blood_centrifuge_time",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Time the blood was centrifuged"
  },
  {
    "id": "af1603",
    "code": "last_ate_date",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Date the party indicated they last ate food. *(On MedicalExam, LastAteDate is used to specify the last date the patient had something to eat prior to a medical examination.)*"
  },
  {
    "id": "af1604",
    "code": "last_drank_date",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Date the party indicated they last drank fluids (of any kind). *(On MedicalExam, LastDrankDate is used to specify the last date the patient had something to drink prior to a medical examination.)*"
  },
  {
    "id": "af1605",
    "code": "last_ate_time",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Time the party indicated they last ate food. *(On MedicalExam, LastAteTime is used to specify the time on the LastAteDate the patient had something to eat prior to a medical examination.)*"
  },
  {
    "id": "af1606",
    "code": "last_drank_time",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Time the party indicated they last drank fluids (of any kind). *(On MedicalExam, LastDrankTime is used to specify the time on the LastDrankDate the patient had something to eat prior to a medical examination.)*"
  },
  {
    "id": "af1607",
    "code": "hours_since_last_ate",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Hours Since Last Ate"
  },
  {
    "id": "af1608",
    "code": "hours_since_last_drank",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Hours Since Last Drank"
  },
  {
    "id": "af1609",
    "code": "examiner_comments",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "General comments from the examiner."
  },
  {
    "id": "af1610",
    "code": "third_b_p_time",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "States at what time the Third Blood Pressure reading was taken"
  },
  {
    "id": "af1611",
    "code": "second_b_p_time",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "States at what time the Second Blood Pressure reading was taken"
  },
  {
    "id": "af1612",
    "code": "first_b_p_time",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "States at what time the first Blood Pressure reading was taken"
  },
  {
    "id": "af1613",
    "code": "third_b_p_date",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "States on which date the Third Blood Pressure reading was taken"
  },
  {
    "id": "af1614",
    "code": "second_b_p_date",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "States on which date the Second Blood Pressure reading was taken"
  },
  {
    "id": "af1615",
    "code": "first_b_p_date",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "States on which date the first Blood Pressure reading was taken"
  },
  {
    "id": "af1616",
    "code": "third_b_p_arm_code",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "States which arm (left or right) was used to take the Third Blood Pressure reading"
  },
  {
    "id": "af1617",
    "code": "second_b_p_arm_code",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "States which arm (left or right) was used to take the second Blood Pressure reading"
  },
  {
    "id": "af1618",
    "code": "first_b_p_arm_code",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "States which arm (left or right) was used to take the first Blood Pressure reading"
  },
  {
    "id": "af1619",
    "code": "requirement_acct_num",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Account Number of the fulfiller for billing/tracking this requirement"
  },
  {
    "id": "af1620",
    "code": "provider_order_num",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Provider defined id for a requirement order. Unique ID for the requirement order that represents the fulfiller's unique identification for all requirements that make up that order. This ID is assigned *(Same number may be assigned in more than one RequirementInfo if they are being grouped together)*"
  },
  {
    "id": "af1621",
    "code": "face_amt",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Base coverage amount of life insurance purchased at time of issue. *(On MedicalExam, FaceAmt provides a method of reporting a discrepancy between what is reported on the Holding and discovered during the Medical Exam. The face amount appears on the lab slip and so must)*"
  },
  {
    "id": "af1622",
    "code": "smoker_stat",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Indicates the client's history of tobacco use."
  },
  {
    "id": "af1623",
    "code": "third_premature_v_c",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Premature Contractions are defined in number of contractions per minute. One reading is acceptable but more may be obtained depending on results."
  },
  {
    "id": "af1624",
    "code": "blood_collection_date",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Date on which blood was collected from an individual"
  },
  {
    "id": "af1625",
    "code": "blood_collection_time",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Time at which blood was collected from an individual"
  },
  {
    "id": "af1626",
    "code": "chest_full_measure",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Records the full measure of the chest expressed in inches, cm or other units of measure as indicated."
  },
  {
    "id": "af1627",
    "code": "chest_forced_measure",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Records the forced measure of the chest expressed in inches, cm or other units of measure as indicated."
  },
  {
    "id": "af1628",
    "code": "abdomen_measure",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Records the measure of the abdomen expressed in inches, cm or other units of measure as indicated."
  },
  {
    "id": "af1629",
    "code": "special_test_ordered",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Contains list of special tests performed"
  },
  {
    "id": "af1630",
    "code": "kit",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Type of Laboratory Kit"
  },
  {
    "id": "af1631",
    "code": "height2",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "The height of the person as measured or stated."
  },
  {
    "id": "af1632",
    "code": "weight2",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "The weight of the person as measured or stated."
  },
  {
    "id": "af1633",
    "code": "signature_info",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Signature Information states the who, what, where and how a form is or should be signed. This can be used whenever a signature or initials need to be collected to verify and track that a disclosure or"
  },
  {
    "id": "af1634",
    "code": "substance_usage",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Information about a party's usage of substances *(Use when information is collected during a medical examination.)*"
  },
  {
    "id": "af1635",
    "code": "attachment",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "This contains a collection of attachments. Each attachment could contain any of the attachment Types defined. In the Attachment object the three items AttachmentData, AttachmentReference, and Attachme *(On MedicalExam, Attachment is used for Provider Comments or Notes.)*"
  },
  {
    "id": "af1636",
    "code": "identity_verification",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "This object is used to document that a person's identity has been verified. It includes the information relating to the type of identification used in the verification, audit information relating to t"
  },
  {
    "id": "af1637",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af1638",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Record creation timestamp."
  },
  {
    "id": "af1639",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Record last update timestamp."
  },
  {
    "id": "af1640",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "medical_exam",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af1641",
    "code": "producer_id",
    "usedInTables": 1,
    "tables": "producer",
    "description": "Primary key for Producer."
  },
  {
    "id": "af1642",
    "code": "policy_id",
    "usedInTables": 1,
    "tables": "producer",
    "description": "FK → policy.policy_id"
  },
  {
    "id": "af1643",
    "code": "party_id",
    "usedInTables": 1,
    "tables": "producer",
    "description": "FK → party.party_id"
  },
  {
    "id": "af1644",
    "code": "producer_key",
    "usedInTables": 1,
    "tables": "producer",
    "description": "Producer Key"
  },
  {
    "id": "af1645",
    "code": "producer_sys_key",
    "usedInTables": 1,
    "tables": "producer",
    "description": "Producer System Key"
  },
  {
    "id": "af1646",
    "code": "certification",
    "usedInTables": 1,
    "tables": "producer",
    "description": "Certifications for the producer."
  },
  {
    "id": "af1647",
    "code": "n_i_p_r_number",
    "usedInTables": 1,
    "tables": "producer",
    "description": "The producer's National Insurance Producer Registry (NIPR) Number (or other authority's ID number)."
  },
  {
    "id": "af1648",
    "code": "pref_language",
    "usedInTables": 1,
    "tables": "producer",
    "description": "Preferred Language for doing business."
  },
  {
    "id": "af1649",
    "code": "alternate_language",
    "usedInTables": 1,
    "tables": "producer",
    "description": "Alternate language accepted by the Party for doing business. For instance, if the preferred language is Spanish, but the policy is being sold in the US, the company may want to find out if the person"
  },
  {
    "id": "af1650",
    "code": "alternate_language_proficiency",
    "usedInTables": 1,
    "tables": "producer",
    "description": "This indicates how proficient the individual is in the alternate language specified."
  },
  {
    "id": "af1651",
    "code": "c_r_d_number",
    "usedInTables": 1,
    "tables": "producer",
    "description": "Central Registration Depository Number of the producer"
  },
  {
    "id": "af1652",
    "code": "e_o_coverage_info",
    "usedInTables": 1,
    "tables": "producer",
    "description": "Aggregate contains links to the Errors and Omission Coverages"
  },
  {
    "id": "af1653",
    "code": "license",
    "usedInTables": 1,
    "tables": "producer",
    "description": "The license information for each license for a producer or a product provider. Licenses are issued by state. Some states require separate licensing for soliciting and selling. It is not uncommon for a"
  },
  {
    "id": "af1654",
    "code": "carrier_appointment",
    "usedInTables": 1,
    "tables": "producer",
    "description": "The appointment collection represents the various appointments between the agent and various companies. The appointment may be to an insurance company (carrier), but also can be used for appointments"
  },
  {
    "id": "af1655",
    "code": "registration",
    "usedInTables": 1,
    "tables": "producer",
    "description": "Registration Details. In the U.S., this contains the FINRA (Financial Industry Regulation Authority) Details. Provides details on various FINRA (formerly NASD) regulatory requirements, status and admi"
  },
  {
    "id": "af1656",
    "code": "producer_agreement",
    "usedInTables": 1,
    "tables": "producer",
    "description": "Agreement between producers or between producer and Carrier. Represents a Producer hierarchy agreement such as that used between a Distributor and its Producer. *(On Producer, ProducerAgreement repeats as a Producer may have multiple marketing agreements with a single Distributor or other Distributors and/or Producers.)*"
  },
  {
    "id": "af1657",
    "code": "designation_info",
    "usedInTables": 1,
    "tables": "producer",
    "description": "Information regarding a party's professional designations. *(On Producer, for designations that are of interest due to a Party's role as a Producer, then Producer/DesignationInfo should be used. For designations that are not of interest due to a Party's role as)*"
  },
  {
    "id": "af1658",
    "code": "nation_approval",
    "usedInTables": 1,
    "tables": "producer",
    "description": "The nation(s) in which the property or aggregate is available. *(On Producer, NationApproval contains the nations or countries where the producer is entitled to work.)*"
  },
  {
    "id": "af1659",
    "code": "supervision_level",
    "usedInTables": 1,
    "tables": "producer",
    "description": "Identifies the supervisory requirements for the producer *(On Producer, this represents all the supervision requirements in place for the producer across the industry.)*"
  },
  {
    "id": "af1660",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "producer",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af1661",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "producer",
    "description": "Record creation timestamp."
  },
  {
    "id": "af1662",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "producer",
    "description": "Record last update timestamp."
  },
  {
    "id": "af1663",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "producer",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af1664",
    "code": "loan_id",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Primary key for Policy Loan."
  },
  {
    "id": "af1665",
    "code": "policy_id",
    "usedInTables": 1,
    "tables": "loan",
    "description": "FK → policy.policy_id"
  },
  {
    "id": "af1666",
    "code": "party_id",
    "usedInTables": 1,
    "tables": "loan",
    "description": "FK → party.party_id"
  },
  {
    "id": "af1667",
    "code": "loan_key",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Loan Key"
  },
  {
    "id": "af1668",
    "code": "loan_sys_key",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Loan System Key"
  },
  {
    "id": "af1669",
    "code": "loan_type",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Indicates whether the loan is a regular loan or a preferred loan."
  },
  {
    "id": "af1670",
    "code": "loan_status",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Status of Loan"
  },
  {
    "id": "af1671",
    "code": "loan_status_reason",
    "usedInTables": 1,
    "tables": "loan",
    "description": "The reason the current status of the Loan."
  },
  {
    "id": "af1672",
    "code": "loan_reason",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Reason the loan was taken"
  },
  {
    "id": "af1673",
    "code": "loan_reason_desc",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Reason the loan was taken *(On Loan, may be used when the LoanReason property is set to \"Other\".)*"
  },
  {
    "id": "af1674",
    "code": "loan_amt",
    "usedInTables": 1,
    "tables": "loan",
    "description": "The original or initial amount of this loan at its inception."
  },
  {
    "id": "af1675",
    "code": "loan_balance",
    "usedInTables": 1,
    "tables": "loan",
    "description": "The current, total amount of loans outstanding on a policy. The current amount of the outstanding loan, including the loan interest due."
  },
  {
    "id": "af1676",
    "code": "loan_principal",
    "usedInTables": 1,
    "tables": "loan",
    "description": "The current, principal amount of the loan (i.e. loan amount excluding interest)."
  },
  {
    "id": "af1677",
    "code": "loan_payment_amt",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Loan Payment Amount"
  },
  {
    "id": "af1678",
    "code": "loan_payment_method",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Payment Method for this loan."
  },
  {
    "id": "af1679",
    "code": "loan_payment_draft_day",
    "usedInTables": 1,
    "tables": "loan",
    "description": "The day of the month (e.g. 15 to represent the 15th day of the month). The loan repayment will either be charged to a credit card or withdrawn from a bank account, when Loan PaymentMethod is either 'c"
  },
  {
    "id": "af1680",
    "code": "loan_payment_mode",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Payment Mode for this loan."
  },
  {
    "id": "af1681",
    "code": "loan_interest_rate",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Interest rate being applied to the loan"
  },
  {
    "id": "af1682",
    "code": "loan_int_method",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Indicates how loan interest will be paid, such as by capitalization or paid in cash."
  },
  {
    "id": "af1683",
    "code": "loan_int_type",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Whether the rate of interest on the loan is fixed, variable, or adjustable, etc."
  },
  {
    "id": "af1684",
    "code": "loan_int_as_of_date",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Date the Loan Interest Rate became effective"
  },
  {
    "id": "af1685",
    "code": "loan_int_paid_to_date",
    "usedInTables": 1,
    "tables": "loan",
    "description": "The last date for which the loan interest has been paid into the policy. If not on the loan trailer, this is the earliest (soonest to occur) date of any loan aggregate."
  },
  {
    "id": "af1686",
    "code": "loan_repay_num_year",
    "usedInTables": 1,
    "tables": "loan",
    "description": "The number of years established for paying back a loan."
  },
  {
    "id": "af1687",
    "code": "loan_suspend_date",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Date the loan has been suspended. On TSA loans the owner is allowed to suspend the loan. This is necessary in order to meet IRS guidelines on the length of time a loan on a qualified plan must be paid"
  },
  {
    "id": "af1688",
    "code": "loan_unsuspend_date",
    "usedInTables": 1,
    "tables": "loan",
    "description": "When a loan is suspended, this specifies when the billing of loan payments will resume. On TSA loans the owner is allowed to suspend the loan. This is necessary in order to meet IRS guidelines on the  *(On Loan, LoanUnsuspendDate specifies when billing of loan payments will resume. Note that LoanSuspendDate was added prior to the addition of LoanUnsuspendDate. Thus, for compatibility purposes, we mus)*"
  },
  {
    "id": "af1689",
    "code": "loan_tax_ind",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Used to indicate if the loan is subject to taxation."
  },
  {
    "id": "af1690",
    "code": "loan_repay_due_date",
    "usedInTables": 1,
    "tables": "loan",
    "description": "In concept this is very similar to the date a mortgage payment is due."
  },
  {
    "id": "af1691",
    "code": "leave_of_absence_ind",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Used to indicate that an employee is on leave"
  },
  {
    "id": "af1692",
    "code": "last_activity_date",
    "usedInTables": 1,
    "tables": "loan",
    "description": "The last activity date. *(The last date any change activity was processed against this loan.)*"
  },
  {
    "id": "af1693",
    "code": "last_fin_activity_type",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Indicates the type of activity for the last financial activity processed. *(On Loan, this is used in conjunction with LastActivityDate. This is the last financial activity that occurred on the LastActivityDate.)*"
  },
  {
    "id": "af1694",
    "code": "loan_int_amt_due_a_t_d",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Loan interest on most insurance policies is paid once a year. The LoanIntAmtDueATD represents the interest amount DUE this year regardless of when it is paid by the client (in advance, arrears, amorti"
  },
  {
    "id": "af1695",
    "code": "loan_int_timing",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Defines when loan interest is payable, either at the beginning (advance) or end of policy anniversary year (arrears) (either when it is paid in cash or capitalized)."
  },
  {
    "id": "af1696",
    "code": "loan_int_next_bill_date",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Indicates the next date a bill will be sent for loan interest on this loan."
  },
  {
    "id": "af1697",
    "code": "loan_principal_next_bill_date",
    "usedInTables": 1,
    "tables": "loan",
    "description": "This is the next date a bill or billing notice will be sent for Loan Principal. If this date is in the past then this is the reported next billing date and does not imply that a bill was actually sent"
  },
  {
    "id": "af1698",
    "code": "loan_int_next_capitalization_date",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Next date the loan interest will capitalize if it is not paid in cash by the specified date."
  },
  {
    "id": "af1699",
    "code": "loaned_amt_int_rate",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Interest rate applied to loaned amount. *(On Loan, LoanedAmtIntRate is also known as the Collateral Rate and is the interest rate credited to the loaned amount.)*"
  },
  {
    "id": "af1700",
    "code": "loan_int_amt_earned_a_t_d",
    "usedInTables": 1,
    "tables": "loan",
    "description": "The loan interest EARNED by the company since the last anniversary regardless of when interest is paid by the client. For example, if loan interest on a policy is $10/month, in the third month of the"
  },
  {
    "id": "af1701",
    "code": "loan_int_amt_unearned_a_t_d",
    "usedInTables": 1,
    "tables": "loan",
    "description": "The loan interest paid by the client this year but is UNEARNED by the company. Anniversary is defined by Loan>LoanTiming. For example, if loan interest due for the year is $120 (interest is $10/month)"
  },
  {
    "id": "af1702",
    "code": "loan_default_date",
    "usedInTables": 1,
    "tables": "loan",
    "description": "If in the past, this is the date the loan was defaulted. If in the future, this is the date the loan is projected to default."
  },
  {
    "id": "af1703",
    "code": "loan_int_amt_paid_a_t_d",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Loan interest on most insurance policies is paid once a year. This property represents the interest amount PAID this year by the client. Anniversary is defined by Loan>LoanTiming. For example, if a po"
  },
  {
    "id": "af1704",
    "code": "loan_int_amt_paid_i_t_d",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Loan interest on most insurance policies is paid once a year. The LoanIntAmtPaidITD represents the interest amount PAID by the client since the loan was initiated. This is the total loan interest paid"
  },
  {
    "id": "af1705",
    "code": "loan_int_amt_due_i_t_d",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Loan interest on most insurance policies is paid once a year. The LoanIntAmtDueITD represents the interest amount DUE on the loan since the loan was initiated. This is the total loan interest due sinc"
  },
  {
    "id": "af1706",
    "code": "loan_number",
    "usedInTables": 1,
    "tables": "loan",
    "description": "The loan number used by the company that administers the loan. For example, in the case of a mortgage loan (as indicated by LoanType), this would contain the LoanNumber used by the mortgage company."
  },
  {
    "id": "af1707",
    "code": "loan_origination_date",
    "usedInTables": 1,
    "tables": "loan",
    "description": "This is the original effective date of the loan, even it was replaced or transferred. Every loan should have a loan origination date. If this loan was based upon another loan (for example if a 'grandf"
  },
  {
    "id": "af1708",
    "code": "eff_date",
    "usedInTables": 1,
    "tables": "loan",
    "description": "This will usually indicate when an aggregate is effective (e.g. CommSchedule, LifeParticipant and Participant) or the actual effective date which may be used for the calculation of the anniversary dat *(On Loan, EffDate is the date when this loan was effective. EffDate only applies if the origination date is different than the effective date of this aggregate. For example, if a loan was taken on an a)*"
  },
  {
    "id": "af1709",
    "code": "payoff_balance",
    "usedInTables": 1,
    "tables": "loan",
    "description": "This is the amount the borrower would pay if they were to pay off the loan on the PayoffBalanceAsOf Date. It includes the outstanding principal plus any unpaid interest."
  },
  {
    "id": "af1710",
    "code": "payoff_balance_as_of_date",
    "usedInTables": 1,
    "tables": "loan",
    "description": "This date contains the as of date for the payoff balance information being depicted"
  },
  {
    "id": "af1711",
    "code": "carry_over_loan_int_amt_due",
    "usedInTables": 1,
    "tables": "loan",
    "description": "For a carry-over loan, this tracks the amount of interest due from the portion carried over *(LoanIntAmtDue is the combination of the loan interest amount that was carried over plus the amount from the regular loan.)*"
  },
  {
    "id": "af1712",
    "code": "carry_over_loan_int_credited_amt",
    "usedInTables": 1,
    "tables": "loan",
    "description": "For a carry-over loan, this holds the amount of loan interest that was credited to the new loan. *(This amount is often based on a percentage of the carry over loan princple, and is the interest that will be credited)*"
  },
  {
    "id": "af1713",
    "code": "commitment_date",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Date a formal offer is made by a lender, stipulating explicitly the terms under which it agrees to lend money to a borrower over a certain period of time."
  },
  {
    "id": "af1714",
    "code": "repayment_schedule_desc",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Human readable description of repayment arrangement. For example, this may be something as simple as \"repaid in 50 months at payment of $200.00 per month\". *(On Loan, this may be used to identify payment arrangements presented as a string, rather than as discreet data items specifying payment mode, method, amount, and other pertinent information. This is n)*"
  },
  {
    "id": "af1715",
    "code": "last_paid_date",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Date of last payment *(This date contains the date that reflects the last time a payment was posted for this loan.)*"
  },
  {
    "id": "af1716",
    "code": "responsible_loan_party_type",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Indicates the type of participant that is responsible for repaying the loan. For example, it is common to state that the \"Primary Insured\" is responsible for repaying the loan."
  },
  {
    "id": "af1717",
    "code": "max_available_loan",
    "usedInTables": 1,
    "tables": "loan",
    "description": "When the Loan defines a policy loan, this is the amount of policy value available as a policy loan. If there is an existing loan, this is the amount of additional policy value that may be borrowed. Th *(On Loan, MaxAvailableLoan indicates the maximum available for this individual loan.)*"
  },
  {
    "id": "af1718",
    "code": "loan_avg_daily_bal_a_t_d",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Represents the reported average daily loan balance for the existing loan on the policy for the current policy anniversary year."
  },
  {
    "id": "af1719",
    "code": "grace_period_end_date",
    "usedInTables": 1,
    "tables": "loan",
    "description": "The last date the insurer allows for payment without penalty such as a fee or policy lapse. *(On Loan, the last date that payment can be received before the loan defaults. Indicates the End Date of the loan repayment Grace Period. This may be different than the LoanDefaultDate.)*"
  },
  {
    "id": "af1720",
    "code": "loan_balance_for_impaired",
    "usedInTables": 1,
    "tables": "loan",
    "description": "The loan balance to use for calculating the impaired funds as of the 'As Of' date. 'Impaired funds' means the portion of the policy's account value that is acting as collateral for an outstanding poli *(On Loan, LoanBalanceForImpaired may be used when Loan/ImpairedType = Policy Cash Value. Otherwise, the loan balance can be found on the fund representing the loan collateral fund.)*"
  },
  {
    "id": "af1721",
    "code": "impaired_type",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Indicates the means by which this loan is impaired / collateralized."
  },
  {
    "id": "af1722",
    "code": "loan_timing",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Indicates the date used to establish when loan processing (such as loan interest due) is scheduled such as using the LoanOriginationDate or the policy Effective Date (Policy.EffDate)."
  },
  {
    "id": "af1723",
    "code": "loan_restriction",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Information about a loan restriction."
  },
  {
    "id": "af1724",
    "code": "participant",
    "usedInTables": 1,
    "tables": "loan",
    "description": "An implementation requirement is that a relationship must be built for all participants. Note that MR 04-1.127.03 synchronized the objects, properties, and attributes of Participant and LifeParticipan *(On Loan, Participant is used to indicate the participants in the loan such as the borrower. Participant must not be used here to model the financial institution that is the loan originator. See Loan.F)*"
  },
  {
    "id": "af1725",
    "code": "payoff_condition",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Contains information relating to the conditions under which a loan was paid off."
  },
  {
    "id": "af1726",
    "code": "attachment",
    "usedInTables": 1,
    "tables": "loan",
    "description": "This contains a collection of attachments. Each attachment could contain any of the attachment Types defined. In the Attachment object the three items AttachmentData, AttachmentReference, and Attachme"
  },
  {
    "id": "af1727",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af1728",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Record creation timestamp."
  },
  {
    "id": "af1729",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Record last update timestamp."
  },
  {
    "id": "af1730",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "loan",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af1731",
    "code": "claim_id",
    "usedInTables": 1,
    "tables": "claim",
    "description": "Primary key for Claim."
  },
  {
    "id": "af1732",
    "code": "policy_id",
    "usedInTables": 1,
    "tables": "claim",
    "description": "FK → policy.policy_id"
  },
  {
    "id": "af1733",
    "code": "claim_key",
    "usedInTables": 1,
    "tables": "claim",
    "description": "Claim Key"
  },
  {
    "id": "af1734",
    "code": "claim_sys_key",
    "usedInTables": 1,
    "tables": "claim",
    "description": "Claim System Key"
  },
  {
    "id": "af1735",
    "code": "h_o_claim_reference_i_d",
    "usedInTables": 1,
    "tables": "claim",
    "description": "Home office assigned claim number."
  },
  {
    "id": "af1736",
    "code": "actual_object_type",
    "usedInTables": 1,
    "tables": "claim",
    "description": "The type of the actual object referred to by this detail. *(On Claim, ActualObjectType is the object type for what the claim is made on. ActualObjectType is used to qualify the object is specified by @ActualObjectID.)*"
  },
  {
    "id": "af1737",
    "code": "loss_report_date",
    "usedInTables": 1,
    "tables": "claim",
    "description": "The date the claim was reported."
  },
  {
    "id": "af1738",
    "code": "claim_date_of_loss",
    "usedInTables": 1,
    "tables": "claim",
    "description": "The date on which the loss is claimed to have occurred."
  },
  {
    "id": "af1739",
    "code": "claim_status",
    "usedInTables": 1,
    "tables": "claim",
    "description": "The status of the claim. *(On Claim, ClaimStatus provides a high level status of the claim. ClaimStatusReason and ClaimStatusReasonDesc may be used to provide additional detail regarding the reason for the status.)*"
  },
  {
    "id": "af1740",
    "code": "claim_status_reason",
    "usedInTables": 1,
    "tables": "claim",
    "description": "The reason for the current status of a Claim. *(On Claim, ClaimStatusReason provides additional detail regarding the reason the claim is in its current status.)*"
  },
  {
    "id": "af1741",
    "code": "claim_status_reason_desc",
    "usedInTables": 1,
    "tables": "claim",
    "description": "To provide additional information about the Claim Status Reason. *(On Claim, ClaimStatusReasonDesc is used to provide additional information regarding the Claim's status reason, including when the ClaimStatusReason property is set to \"Other\".)*"
  },
  {
    "id": "af1742",
    "code": "status_change_date",
    "usedInTables": 1,
    "tables": "claim",
    "description": "The date the parent object was changed to its current status. *(On Claim, StatusChangeDate represents that last date on which the status of a Claim changed.)*"
  },
  {
    "id": "af1743",
    "code": "claim_payment_date",
    "usedInTables": 1,
    "tables": "claim",
    "description": "The date when a claim was actually paid."
  },
  {
    "id": "af1744",
    "code": "death_certificate_certified_date",
    "usedInTables": 1,
    "tables": "claim",
    "description": "This is the date the death certificate was certified. The death certificate needs to be certified by a legal entity."
  },
  {
    "id": "af1745",
    "code": "foreign_loss_ind",
    "usedInTables": 1,
    "tables": "claim",
    "description": "TRUE means the loss is claimed to have occurred in a country other than the country in which the policy was issued. FALSE means the loss is NOT claimed to have occurred in a country other than the cou"
  },
  {
    "id": "af1746",
    "code": "claim_type",
    "usedInTables": 1,
    "tables": "claim",
    "description": "Used to specify the type of claim. *(On Claim, ClaimType is used to specify the type of claim (death, etc.) at a high level. ClaimType may be qualified with MannerofLoss to provide more detail as to the nature of the loss (accident, illn)*"
  },
  {
    "id": "af1747",
    "code": "mannerof_loss",
    "usedInTables": 1,
    "tables": "claim",
    "description": "The manner in which an insured incurs a loss that is covered under the terms of the coverage. *(On Claim, MannerofLoss may be used to qualify ClaimType in order to provide more detail as to the nature of the loss (accident, illness, etc.). ClaimType is used to specify the type of claim (death, e)*"
  },
  {
    "id": "af1748",
    "code": "claim_finalized_date",
    "usedInTables": 1,
    "tables": "claim",
    "description": "The date the claim was finalized. The rules surrounding the finalization may vary by carrier and by product. *(On Claim, ClaimFinalizedDate represents the date the claim was finalized. The rules surrounding the finalization may vary by carrier and by product. For example, a claim which has been \"finalized\" mig)*"
  },
  {
    "id": "af1749",
    "code": "total_cost",
    "usedInTables": 1,
    "tables": "claim",
    "description": "The total cost of the claim once it has been finalized"
  },
  {
    "id": "af1750",
    "code": "case_i_d",
    "usedInTables": 1,
    "tables": "claim",
    "description": "Case identifier associated with a claim, which refers to an external Workflow or Business Process system. This is different from claim number which is identified using HOClaimReferenceID *(On Claim, CaseID is different from a claim number identified using HOClaimReferenceID.)*"
  },
  {
    "id": "af1751",
    "code": "amount_paid_to_date",
    "usedInTables": 1,
    "tables": "claim",
    "description": "The amount paid to date. This is the amount, and not the date. *(On Claim, amount paid out on a claim to date. Should be the aggregation of all payments attached to a claim if payment nodes are being added)*"
  },
  {
    "id": "af1752",
    "code": "claim_final_cost",
    "usedInTables": 1,
    "tables": "claim",
    "description": "The final cost of the claim. This value is often used in statistical claim analysis to measure the estimate claim cost to the final claim cost."
  },
  {
    "id": "af1753",
    "code": "claim_final_duration",
    "usedInTables": 1,
    "tables": "claim",
    "description": "The final duration of the claim. This value is often used in statistical claim analysis to measure the estimated claim duration to the final claim duration. Use with DurationUnitMeasure to fully defin"
  },
  {
    "id": "af1754",
    "code": "claim_final_decision",
    "usedInTables": 1,
    "tables": "claim",
    "description": "The final decision of a claim. This property is used for any comments associated with the final outcome of a claim. In the case that a claim is reopened or rescinded, this property is used for the cla"
  },
  {
    "id": "af1755",
    "code": "duration_unit_measure",
    "usedInTables": 1,
    "tables": "claim",
    "description": "Unit of measurement used to define the duration of time. *(On Claim, DurationUnitMeasure should be used with ClaimFinalDuration to fully define the duration.)*"
  },
  {
    "id": "af1756",
    "code": "claim_handling_type",
    "usedInTables": 1,
    "tables": "claim",
    "description": "Identifies the speed with which a claim is processed. *(On Claim, ClaimHandlingType is used to specify situations where claim handling may differ based on the claim amount, underwriting needs or other extenuating circumstances, or at the request of the cla)*"
  },
  {
    "id": "af1757",
    "code": "claim_risk_category_type",
    "usedInTables": 1,
    "tables": "claim",
    "description": "Identifies the level of risk associated with the claim. *(On Claim, ClaimRiskCategoryType is used to specify situations where claim risk category may be based on various criteria such as claim amount, manner of loss, length of time policy has been in-force, )*"
  },
  {
    "id": "af1758",
    "code": "claim_estimate",
    "usedInTables": 1,
    "tables": "claim",
    "description": "Estimate details associated with a claim. These include financial estimates and duration ( e.g. lost working time, time until recovery, percent of full recovery). *(On Claim, there are a number of estimates that will be created when a claim is lodged. These will include estimated return to work date, estimated cost of claim (in days) estimated cost of claim (in c)*"
  },
  {
    "id": "af1759",
    "code": "participant",
    "usedInTables": 1,
    "tables": "claim",
    "description": "An implementation requirement is that a relationship must be built for all participants. Note that MR 04-1.127.03 synchronized the objects, properties, and attributes of Participant and LifeParticipan *(On Claim, Participant is used to specify individuals or organizations that may provide information or be associated with the claim. Participants associated with a claim could include witnesses, contac)*"
  },
  {
    "id": "af1760",
    "code": "requirement_info",
    "usedInTables": 1,
    "tables": "claim",
    "description": "Provides requested, outstanding and completed requirements associated with the issuance of a Policy, a Producers Appointments/Licenses/Registrations or Claims processing. *(On Claim, RequirementInfo provides for a list of documents/items that need to be produced (or requested from the claimant) for a claim based on the claim information given.)*"
  },
  {
    "id": "af1761",
    "code": "claim_med_condition_info",
    "usedInTables": 1,
    "tables": "claim",
    "description": "Provides the linkage between the Claim structure and a MedicalCondition object that is the justification or underlying cause of the Claim."
  },
  {
    "id": "af1762",
    "code": "claim_review",
    "usedInTables": 1,
    "tables": "claim",
    "description": "Records the outcome of initial determination of benefits or subsequent review of continuation of benefits *(On Claim, ClaimReview is used to specify reviews that have been made for the claim benefits to be paid from point in time to the next review (if recurrent).)*"
  },
  {
    "id": "af1763",
    "code": "restriction_info",
    "usedInTables": 1,
    "tables": "claim",
    "description": "Contains information relating to Restrictions. *(On Claim, RestrictionInfo is used to specify the restrictions on a Claim, which may be different from those on Holding and specific to a particular Claim)*"
  },
  {
    "id": "af1764",
    "code": "medical_transport",
    "usedInTables": 1,
    "tables": "claim",
    "description": "Information related to the use of a medical transport. Medical transport includes things like ambulance services. Note that if a single logical trip contains more than one trip segment or leg, Medical *(On Claim, used to document information related to a claim for medical transport services such as emergency ambulance transport or medivac helicopter. While often used for emergency transport may also )*"
  },
  {
    "id": "af1765",
    "code": "attachment",
    "usedInTables": 1,
    "tables": "claim",
    "description": "This contains a collection of attachments. Each attachment could contain any of the attachment Types defined. In the Attachment object the three items AttachmentData, AttachmentReference, and Attachme *(On Claim, Attachment is used to capture notes written by claims personnel or other parties associated with the Claim during Claim processing.)*"
  },
  {
    "id": "af1766",
    "code": "keyed_value",
    "usedInTables": 1,
    "tables": "claim",
    "description": "Generic object used to extend object hierarchy for proprietary data requirements. Each proprietary data item is represented using a KeyedValue object. A collection of KeyedValue objects is utilized to"
  },
  {
    "id": "af1767",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "claim",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af1768",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "claim",
    "description": "Record creation timestamp."
  },
  {
    "id": "af1769",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "claim",
    "description": "Record last update timestamp."
  },
  {
    "id": "af1770",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "claim",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af1771",
    "code": "reinsurance_info_id",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Primary key for Reinsurance Info."
  },
  {
    "id": "af1772",
    "code": "policy_id",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "FK → policy.policy_id"
  },
  {
    "id": "af1773",
    "code": "party_id",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "FK → party.party_id"
  },
  {
    "id": "af1774",
    "code": "reinsurance_info_key",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "ReinsuranceInfo Key"
  },
  {
    "id": "af1775",
    "code": "reinsurance_info_sys_key",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "ReinsuranceInfo System Key"
  },
  {
    "id": "af1776",
    "code": "admin_fee",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The Third Party Administrator (TPA) fee the cedant pays to the reinsurer to administer a coverage."
  },
  {
    "id": "af1777",
    "code": "cedents_treaty_ident",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "A unique identification number assigned by cedant."
  },
  {
    "id": "af1778",
    "code": "reinsurers_treaty_ident",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "A unique identifier assigned by the reinsurer."
  },
  {
    "id": "af1779",
    "code": "retention_pct",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The percent of the face amount retained."
  },
  {
    "id": "af1780",
    "code": "reinsurance_risk_basis",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The basis the risk was evaluated as when business was assumed."
  },
  {
    "id": "af1781",
    "code": "reinsurance_eff_date",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The date the reinsurance is effective. On converted policies, this may be the date the original policy was reinsured."
  },
  {
    "id": "af1782",
    "code": "reinsurance_purch_meth",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The method used to purchase reinsurance."
  },
  {
    "id": "af1783",
    "code": "reinsurance_pay_mode",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The mode the reinsurance premium is paid."
  },
  {
    "id": "af1784",
    "code": "reinsurance_paid_to_date",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The date to which reinsurance premiums have been paid."
  },
  {
    "id": "af1785",
    "code": "reinsurance_paid_up_to_date",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The date to which the reinsurance premiums will be payable. If a limited pay coverage, this is the date on which reinsurance will cease. This only applies in coinsurance or modified coinsurance. *(On ReinsuranceInfo, ReinsurancePaidUpToDate is similar to billed to date on policy.)*"
  },
  {
    "id": "af1786",
    "code": "reinsurance_issue_age",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The issue age used for the reinsurance Yearly Renewable Term (YRT) rates, which is distinct from the direct insurance."
  },
  {
    "id": "af1787",
    "code": "reinsured_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The amount reinsured."
  },
  {
    "id": "af1788",
    "code": "modal_gross_std_prem_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The gross (i.e. before reinsurance expense allowance) standard premium for the re-insured amount for the coverage, based on the mode the cedant is paying the reinsurance company (not the policy owner'"
  },
  {
    "id": "af1789",
    "code": "modal_gross_std_allowance_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The base allowance amount for the reinsurance billing period."
  },
  {
    "id": "af1790",
    "code": "modal_gross_subst_allowance_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The allowance amount for the rated portion of the premium (but not including the flat extra)."
  },
  {
    "id": "af1791",
    "code": "modal_gross_substd_prem_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The substandard component of the premium (not including flat extra)."
  },
  {
    "id": "af1792",
    "code": "modal_expense_allowance_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Used to go from the \"Modal Gross Standard Premium\" (i.e. the amount the cedant is paying the reinsurer on a modal basis) to the \"Modal Net Standard Premium\". This is the expense allowance the reinsura"
  },
  {
    "id": "af1793",
    "code": "retention_level",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The level of retention on the coverage."
  },
  {
    "id": "af1794",
    "code": "retention_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The amount of coverage face that the ceding company is retaining."
  },
  {
    "id": "af1795",
    "code": "ultimate_ceded_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "For coverages that have an increasing risk amount, this is the maximum amount that will ever be reinsured."
  },
  {
    "id": "af1796",
    "code": "reinsurance_premium_tax_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "This is the reinsurer's portion of the state premium tax."
  },
  {
    "id": "af1797",
    "code": "reinsurance_prem_status",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Reinsurance Premium Status"
  },
  {
    "id": "af1798",
    "code": "experience_refunding_ind",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "TRUE indicates experience refunding is in effect. FALSE indicates experience refunding is NOT in effect."
  },
  {
    "id": "af1799",
    "code": "recapture_fee_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "If the ceding company reduces or cancels the reinsurance before the \"recapture period\" ends, this is the penalty fee they must pay the reinsurer."
  },
  {
    "id": "af1800",
    "code": "policy_fee_allowance_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Expense allowance for policy fee when \"coinsurance\" reinsurance is in effect."
  },
  {
    "id": "af1801",
    "code": "lapse_charge_back_ind",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "TRUE indicates that in a lapse situation, there should be a refund of the reinsurance allowance. FALSE indicates there should NOT be a refund of the reinsurance allowance."
  },
  {
    "id": "af1802",
    "code": "reinsurance_valuation_net_prem_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The reinsurer's proportion of the policy's net amount (not rate)."
  },
  {
    "id": "af1803",
    "code": "reinsurance_waived_premium_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The reinsurer's amount of a specific coverage's premium to be waived (when waiver is in effect), calculated based on the proportion of the Waiver of Premium coverage that was reinsured."
  },
  {
    "id": "af1804",
    "code": "reinsurance_recapture_date",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The date after the reinsurance premium is fully earned."
  },
  {
    "id": "af1805",
    "code": "reinsurance_premium_tax_reimbursement_code",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The method for calculating the portion of the Premium Taxes reimbursed to the direct insurer."
  },
  {
    "id": "af1806",
    "code": "net_amt_at_risk",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The net amount of risk for this coverage. Cost of Insurance charges are often associated with this amount."
  },
  {
    "id": "af1807",
    "code": "reserve_method",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Indicates the method of calculating reserves on this coverage and is used by valuation programs to find the correct reserves for this coverage."
  },
  {
    "id": "af1808",
    "code": "increasing_risk_ind",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "TRUE indicates the underlying coverage has an increasing amount at risk. FALSE indicates the underlying coverage does NOT have an increasing amount at risk."
  },
  {
    "id": "af1809",
    "code": "interest_rate",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The rate used in the calculation of the policy reserves. (For Example; 4%)."
  },
  {
    "id": "af1810",
    "code": "reserve_function",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The method used to calculate reserves. Defines the mortality function used to calculate reserves and net premium for valuation."
  },
  {
    "id": "af1811",
    "code": "reserve_valuation_type",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The type of valuation performed."
  },
  {
    "id": "af1812",
    "code": "mortality_or_morbidity_table",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Identifies the mortality rate table to use, to obtain the mortality rate used to calculate the policy reserves. Each plan (i.e., layer of coverage) may have its own mortality table definition within P"
  },
  {
    "id": "af1813",
    "code": "substd_policy_reserve_method",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "This is a code list from Life Reinsurance Activity Report (LREACT) UGP, UPP, etc. Describes the actuarial methodology used to calculate the substandard policy reserves, for example \"Net Level\", \"Tripl"
  },
  {
    "id": "af1814",
    "code": "reserve_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The actual reserve amount held on the standard portion of the coverage."
  },
  {
    "id": "af1815",
    "code": "substd_reserve_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The actual reserve amount held on the substandard portion of the coverage."
  },
  {
    "id": "af1816",
    "code": "statistical_prem",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "This is the annualized standard reinsurance premium."
  },
  {
    "id": "af1817",
    "code": "substd_statistical_prem_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "This is the annualized substandard reinsurance premium including flat extra."
  },
  {
    "id": "af1818",
    "code": "deficiency_reserve_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Deferred deficiency reserves as of date of the underlying Holding. Per $1000 amount that ceding company's reserve is deficient."
  },
  {
    "id": "af1819",
    "code": "deferred_net_premium_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Deferred net premium as of date of the underlying Holding. The coverage's gross premium RATE/$1000 less interest and expenses. Used for valuation purposes."
  },
  {
    "id": "af1820",
    "code": "disability_waiting_period",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The waiting period before the disability benefit will be payable."
  },
  {
    "id": "af1821",
    "code": "premium_rate_table",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The premium table used to find the premium rate."
  },
  {
    "id": "af1822",
    "code": "cash_surr_value",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Cash Surrender Value"
  },
  {
    "id": "af1823",
    "code": "last_div_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The amount of the most recent dividend."
  },
  {
    "id": "af1824",
    "code": "loan_int_amt_a_t_d",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Loan interest paid or accumulated since the last policy anniversary."
  },
  {
    "id": "af1825",
    "code": "pol_fee",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "For Life policies, this is a flat amount added to the basic premium rate to reflect the cost of issuing a policy, establishing the required records, sending premium notices, and other related expenses"
  },
  {
    "id": "af1826",
    "code": "requested_amt_all_reinsurers",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The total amount being requested by all reinsurers on this particular coverage."
  },
  {
    "id": "af1827",
    "code": "ultimate_face_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The maximum face amount that will ever be reinsured for coverages that have an increasing risk amount."
  },
  {
    "id": "af1828",
    "code": "paid_from_date",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The beginning date of the current period from which the reinsurance Premium is paid."
  },
  {
    "id": "af1829",
    "code": "point_in_duration",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The duration of reinsurance. The date of last underwriting. *(On ReinsuranceInfo, PointInDuration could differ from the coverage issue date when added after issue or on a conversion.)*"
  },
  {
    "id": "af1830",
    "code": "reinsurance_submission_type",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "A type code that indicates the reason the policy has been submitted for facultative reinsurance."
  },
  {
    "id": "af1831",
    "code": "flat_extra_reserve_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Amount reserved for flat extra purposes."
  },
  {
    "id": "af1832",
    "code": "tax_reserve_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Amount reserved for tax purposes."
  },
  {
    "id": "af1833",
    "code": "annual_allowance_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Total annual allowance amount including base and rated portions."
  },
  {
    "id": "af1834",
    "code": "prior_net_risk_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "In the case of a reissue or continuation of a reinsurance policy, this indicates the prior net amount at risk for this coverage."
  },
  {
    "id": "af1835",
    "code": "death_benefit_claim_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The amount due the ceding company on a death claim. This includes the death benefit, plus any interest and/or extraordinary expenses that may be due."
  },
  {
    "id": "af1836",
    "code": "annual_gross_flat_extra_allowance_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Total of all flat extra allowance amounts on policy applicable for reinsurance purposes, annualized."
  },
  {
    "id": "af1837",
    "code": "annual_gross_flat_extra_prem_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Total of all flat extra premium amounts on policy applicable for reinsurance purposes, annualized."
  },
  {
    "id": "af1838",
    "code": "annual_gross_std_allowance_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The base allowance amount, annualized."
  },
  {
    "id": "af1839",
    "code": "annual_gross_substd_allowance_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The allowance amount for the rated portion of the premium (but not including the flat extra), annualized."
  },
  {
    "id": "af1840",
    "code": "allowance_point_in_duration",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The duration number, specified in years, associated with the plan allowance information reported on this data stream. Please note the Plan Allowance Duration does NOT have to equal the Plan Duration a"
  },
  {
    "id": "af1841",
    "code": "premium_point_in_duration",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The duration number, specified in years, associated with the plan premium information reported on this data stream. Please note the Plan Premium Duration does NOT have to equal the Plan Duration as re"
  },
  {
    "id": "af1842",
    "code": "change_point_in_duration",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The reinsurance cession duration at the time the transaction took place. In the case of a termination, the change duration may not be the same as the policy duration. If a policy lapses on the first a"
  },
  {
    "id": "af1843",
    "code": "recapture_eligibility_cd",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "This field indicates whether a plan is eligible for recapture by the original insurer."
  },
  {
    "id": "af1844",
    "code": "retrocession_risk_basis",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The basis this risk was evaluated as for purposes of retrocessioning. This differs from ReinsuranceBasis which looks at the policy from how the business was assumed. This property evaluates it from ho"
  },
  {
    "id": "af1845",
    "code": "retro_direct_type_cd",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Indicates if the policy being reinsured in this case was ceded by the direct carrier or by a reinsurer."
  },
  {
    "id": "af1846",
    "code": "policy_fee_commission_ind",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Indicates if commissions are applicable on a plan's policy fee. TRUE indicates commissions are applicable. FALSE indicates commissions are NOT applicable."
  },
  {
    "id": "af1847",
    "code": "issue_category",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Identifies how a cession was issued by the reinsurer."
  },
  {
    "id": "af1848",
    "code": "billing_frequency_mode",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The frequency of receiving a billing statement from the original insurer for reinsurance under this treaty. *(On ReinsuranceInfo, BillingFrequencyMode may be different than ReinsurancePayMode.)*"
  },
  {
    "id": "af1849",
    "code": "g_a_a_p_factor",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Standard GAAP (Generally Accepted Accounting Principles) factors related base premium."
  },
  {
    "id": "af1850",
    "code": "g_a_a_p_reserve_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Standard GAAP (Generally Accepted Accounting Principles) reserve amount related to base premium."
  },
  {
    "id": "af1851",
    "code": "substd_g_a_a_p_factor",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "GAAP (Generally Accepted Accounting Principles) factor specific to substandard premiums."
  },
  {
    "id": "af1852",
    "code": "substd_g_a_a_p_reserve_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Amount reserved for substandard GAAP (Generally Accepted Accounting Principles) purposes."
  },
  {
    "id": "af1853",
    "code": "g_a_a_p_reserve_calculation_basis_cd",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The basis used in calculating the standard GAAP reserve. The standard GAAP Reserve Factor was applied to the amount indicated to calculate the standard GAAP Reserve Amount."
  },
  {
    "id": "af1854",
    "code": "substd_g_a_a_p_reserve_calculation_basis_cd",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The basis used in calculating the substandard GAAP reserve. The substandard GAAP reserve factor was applied to the amount indicated to calculate the substandard GAAP reserve amount."
  },
  {
    "id": "af1855",
    "code": "substd_deficiency_reserve_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Deferred Deficiency Reserves specific to substandard premiums."
  },
  {
    "id": "af1856",
    "code": "modal_gross_flat_extra_allowance_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "An amount payable to the ceding company by the reinsurer in lieu of actual commissions and expenses incurred by the ceding company. *(On ReinsuranceInfo, ModalGrossFlatExtraAllowanceAmt represents the total of all flat extra allowance amounts on policy applicable for reinsurance purposes, on modal basis.)*"
  },
  {
    "id": "af1857",
    "code": "modal_gross_flat_extra_prem_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The gross amount payable to the ceding company by the reinsurer in lieu of actual commissions and expenses incurred by the ceding company. *(On ReinsuranceInfo, ModalGrossFlatExtraPremAmt represents the total of all flat extra premium amounts on policy applicable for reinsurance purposes, on modal basis.)*"
  },
  {
    "id": "af1858",
    "code": "as_of_date",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "As of date of information. Purpose dependent on where it is used. *(On ReinsuranceInfo, this contains the as of date of the reinsurance information being depicted.)*"
  },
  {
    "id": "af1859",
    "code": "carrier_code",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Uniquely represents the manufacturer of the financial product, such as an insurance company or fund manager. Note that the CarrierCode on PolicyProduct may reference the unique identifier of an insura *(On ReinsuranceInfo, CarrierCode is the carrier code used by reinsurer. This is a denormalized property of the reinsurer. If additional information is needed about the reinsurer, this can be obtained v)*"
  },
  {
    "id": "af1860",
    "code": "carrier_name",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Full name of issuing company or legal fund manager name. *(On ReinsuranceInfo, this is the name used by reinsurer. This is a denormalized property of the reinsurer. If additional information is needed about the reinsurer, this can be obtained via the @Carrier)*"
  },
  {
    "id": "af1861",
    "code": "reinsured_pct",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The percentage of the face amount of an insurance contract ceded by the insurance company to the reinsurer. Prior to version 2.28.00, ReinsuredPct was implemented as data type real. The type was chang"
  },
  {
    "id": "af1862",
    "code": "modal_gross_total_prem_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "This is the total of the standard and substandard premium amounts."
  },
  {
    "id": "af1863",
    "code": "reinsurance_end_date",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The end date for the reinsurance contract."
  },
  {
    "id": "af1864",
    "code": "cash_surr_value_per_unit_end_curr_yr",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "This is the expected unit cash surrender value that will be accrued by the end of current year."
  },
  {
    "id": "af1865",
    "code": "cash_surr_value_per_unit_prior_yr",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "This is the unit cash surrender value that was accrued as of the policy anniversary of the prior year. For example, if the Last Anniversary Date is 1995, then the figure displayed in this field is the"
  },
  {
    "id": "af1866",
    "code": "paid_in_advance_prem_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "This is the amount of premium that has been paid in advance."
  },
  {
    "id": "af1867",
    "code": "reserve_amt_next_year",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "This is the amount of reserve that will be needed for next year."
  },
  {
    "id": "af1868",
    "code": "statistical_prem_per_unit",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The amount of per unit of insurance."
  },
  {
    "id": "af1869",
    "code": "total_allowance_amt_i_t_d",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Total allowance amount from policy issue to current as of date."
  },
  {
    "id": "af1870",
    "code": "total_prem_amt_i_t_d",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Total premium amount paid from policy issue to current as of date."
  },
  {
    "id": "af1871",
    "code": "interest_duration",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "This reflects the total number of years the interest rate is in effect, unless otherwise specified via InterestDurationQualifier"
  },
  {
    "id": "af1872",
    "code": "interest_duration_qualifier",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "This reflects whether the interest duration is based on a monthly, yearly, or other duration."
  },
  {
    "id": "af1873",
    "code": "employment_class",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The occupational rating for the policy, coverage or rider to which this object is attached. The rating affects the calculation of the premium for the parent object. It is typically used to define the"
  },
  {
    "id": "af1874",
    "code": "product_code",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "This is a carrier assigned code used to identify the object that contains this property. Because the code is assigned by a carrier, it is typically used in conjunction with a CarrierCode to create a u *(On ReinsuranceInfo, ProductCode is the product code for the reinsurance product itself under which this policy is reinsured.)*"
  },
  {
    "id": "af1875",
    "code": "modal_prem_net_due_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "This is the net premium due to the reinsurer. The algorithm used to calculate this amount is company specific. The term 'Net Due Amount' is a common industry term for this information in the reinsuran"
  },
  {
    "id": "af1876",
    "code": "modal_net_std_prem_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The premium amount paid by cedant to reinsurer for standard risks."
  },
  {
    "id": "af1877",
    "code": "modal_net_std_allowance_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "An amount payable to the ceding company by the reinsurer in lieu of actual commissions and expenses incurred by the ceding company. Use for standard risks."
  },
  {
    "id": "af1878",
    "code": "modal_net_substd_prem_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The premium amount paid by cedant to reinsurer for substandard risks."
  },
  {
    "id": "af1879",
    "code": "modal_net_substd_allowance_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "An amount payable to the ceding company by the reinsurer in lieu of actual commissions and expenses incurred by the ceding company. Used for sub-standard risks."
  },
  {
    "id": "af1880",
    "code": "modal_net_flat_extra_prem_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "An extra premium charged to cover any extra hazard or special risk such as aviation or hazardous activities."
  },
  {
    "id": "af1881",
    "code": "modal_net_flat_extra_allowance_amt",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "An amount payable to the ceding company by the reinsurer in lieu of actual commissions and expenses incurred by the ceding company."
  },
  {
    "id": "af1882",
    "code": "bill_number",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "The unique billing reference number to a block of business. *(On ReinsuranceInfo, identifies the unique identifer or set of identifiers that links this block of business to the specific reinsurance terms. This may be a pool, layer, or statement name or number an)*"
  },
  {
    "id": "af1883",
    "code": "system_message",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "A collection of Messages that are returned by one processing system to another. These messages are not transaction related but rather general status messages. *(On ReinsuranceInfo, SystemMessage contains the system messages as being reported by the reinsurer.)*"
  },
  {
    "id": "af1884",
    "code": "additional_interest_rate_info",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "This contains information about interest rates and associated periods *(On ReinsuranceInfo, AdditionalInterestRateInfo contains the interests rates that apply in addition to the initial interest rate that pertains to this reinsurance policy. The initial interest rate info)*"
  },
  {
    "id": "af1885",
    "code": "keyed_value",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Generic object used to extend object hierarchy for proprietary data requirements. Each proprietary data item is represented using a KeyedValue object. A collection of KeyedValue objects is utilized to"
  },
  {
    "id": "af1886",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af1887",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Record creation timestamp."
  },
  {
    "id": "af1888",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Record last update timestamp."
  },
  {
    "id": "af1889",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "reinsurance_info",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af1890",
    "code": "transfer_info_id",
    "usedInTables": 1,
    "tables": "transfer_info",
    "description": "Primary key for Transfer Info."
  },
  {
    "id": "af1891",
    "code": "policy_id",
    "usedInTables": 1,
    "tables": "transfer_info",
    "description": "FK → policy.policy_id"
  },
  {
    "id": "af1892",
    "code": "party_id",
    "usedInTables": 1,
    "tables": "transfer_info",
    "description": "FK → party.party_id"
  },
  {
    "id": "af1893",
    "code": "transfer_info_key",
    "usedInTables": 1,
    "tables": "transfer_info",
    "description": "TransferInfo Key"
  },
  {
    "id": "af1894",
    "code": "transfer_info_sys_key",
    "usedInTables": 1,
    "tables": "transfer_info",
    "description": "TransferInfo System Key"
  },
  {
    "id": "af1895",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "transfer_info",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af1896",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "transfer_info",
    "description": "Record creation timestamp."
  },
  {
    "id": "af1897",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "transfer_info",
    "description": "Record last update timestamp."
  },
  {
    "id": "af1898",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "transfer_info",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af1899",
    "code": "form_instance_id",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "Primary key for Form Instance."
  },
  {
    "id": "af1900",
    "code": "policy_id",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "FK → policy.policy_id"
  },
  {
    "id": "af1901",
    "code": "party_id",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "FK → party.party_id"
  },
  {
    "id": "af1902",
    "code": "form_instance_key",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "Key (identifier) that provides a way for you to request the object in a subsequent transaction. It is expected to be returned on all search transactions but may be included in other transactions."
  },
  {
    "id": "af1903",
    "code": "form_instance_sys_key",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "FormInstance System Key"
  },
  {
    "id": "af1904",
    "code": "form_name",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "This contains the name of the document. It may be used to identify the specific document(s) by whatever names the Carrier deems appropriate. E.g. Specification Page, Policy, 3x5 cards, Cancel letter,"
  },
  {
    "id": "af1905",
    "code": "primary_form_ind",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "TRUE if this is a primary form, FALSE if it is attached to or inserted into another form."
  },
  {
    "id": "af1906",
    "code": "provider_form_number",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "Form number assigned by provider."
  },
  {
    "id": "af1907",
    "code": "form_version",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "Indicates the version of the underlying form used in the FormInstance. Note that the underlying \"form\" may actually be a specific set of questions used in a tele-interview at one point in time or some"
  },
  {
    "id": "af1908",
    "code": "submit_date",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "Date form was submitted."
  },
  {
    "id": "af1909",
    "code": "completion_date",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "Completion Date"
  },
  {
    "id": "af1910",
    "code": "image_submission_type",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "Used to account for forms or images that are not provided electronically. *(On FormInstance, this relates to where form image can be obtained. For example: if the form is not provided electronically but it can be created or reproduced from the responses and data captured.)*"
  },
  {
    "id": "af1911",
    "code": "original_input_mode",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "Means by which the form was originally entered."
  },
  {
    "id": "af1912",
    "code": "form_instance_category",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "The carrier defined category of the document. and may be used to segregate the documents by whatever categories the Carrier deems appropriate - e.g. New Business, correspondence, billing, etc."
  },
  {
    "id": "af1913",
    "code": "carrier_code",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "Uniquely represents the manufacturer of the financial product, such as an insurance company or fund manager. Note that the CarrierCode on PolicyProduct may reference the unique identifier of an insura"
  },
  {
    "id": "af1914",
    "code": "pol_number",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "Policy Number"
  },
  {
    "id": "af1915",
    "code": "creation_date",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "The date the XML stream was last updated. Since the source represents the most recent source, the assumption is that it was created by that most recent source. This date reflects when it was most rece *(On FormInstance, CreationDate is used to indicate the date on which the FormInstance was created.)*"
  },
  {
    "id": "af1916",
    "code": "creation_time",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "The time the XML stream was last updated. Since the source represents the most recent source, the assumption is that it was created by that most recent source. This time reflects when it was most rece *(On FormInstance, CreationTime is used to indicate the time at which the FormInstance was created.)*"
  },
  {
    "id": "af1917",
    "code": "company_producer_i_d",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "The carrier identification number for the producer"
  },
  {
    "id": "af1918",
    "code": "related_object_type",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "Object type associated with the related object."
  },
  {
    "id": "af1919",
    "code": "form_instance_tracking_i_d",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "This is a unique ID assigned by the carrier for the purposes of tracking the document. This is often the ID used by the cold storage system."
  },
  {
    "id": "af1920",
    "code": "form_instance_version",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "Used to store multiple revisions to the information on a particular FormInstance (thus, this \"instance\" of the form) subsequent versions would be differentiated by their FormInstanceVersion. This woul"
  },
  {
    "id": "af1921",
    "code": "document_control_number",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "A unique ID assigned to a completed form or document from the Administrative system. This ID can encompass multiple images (example: multiple pages) to a single Document Control number [DCN]. The DCN"
  },
  {
    "id": "af1922",
    "code": "document_control_type",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "DocumentControlType further describes and qualifies the DocumentControlNumber."
  },
  {
    "id": "af1923",
    "code": "form_instance_status",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "Indicates the status of this FormInstance. This indicates if the document will still exist, but not be accessible to end users (deleted), or if the attachment is to be purged. *(On FormInstance, FormInstanceStatus is used in conjunction with the FormInstanceStatusDate to indicate when the attachment should be deleted, purged, etc.)*"
  },
  {
    "id": "af1924",
    "code": "update_mode",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "This field represents when an object should be updated - Real-Time, Near Real-time or Off-line. If this is not present, the default is Real-Time. Some updates can be made via a batch process which wou"
  },
  {
    "id": "af1925",
    "code": "form_instance_update_reason",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "Indicates any comments or description of the reason for updating the attachment."
  },
  {
    "id": "af1926",
    "code": "form_instance_status_date",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "This is the date of the current attachment status, or the date for the new status in the associated request to take effect. If this property is absent, the default will be Real-Time, current date. Thi"
  },
  {
    "id": "af1927",
    "code": "image_form",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "Used to indicate the type of imaging mode for the FormInstance or Attachment on the FormInstance. An indicator for each FormInstance that confirms if the image is immediately available for access elec"
  },
  {
    "id": "af1928",
    "code": "user_code",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "The ID or reference number that identifies the customer service rep associated with the transaction. *(On FormInstance, this is the UserCode of the representative that added or updated the form.)*"
  },
  {
    "id": "af1929",
    "code": "originating_trans_type",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "Originating Transaction Type that is associated with the FormInstance being communicated in this message. *(On FormInstance, Originating Transaction Type is used to reference the type of transaction which was sent previously that is associated with the FormInstance being communicated. For example, on FormIn)*"
  },
  {
    "id": "af1930",
    "code": "originating_trans_sub_type",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "Originating Transaction Sub Types provide additional granularity for their parent transactions. This aids in directing transactions for processing as well as defining expected objects and properties t"
  },
  {
    "id": "af1931",
    "code": "form_response",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "An object defining a question/answer pair and associated metadata."
  },
  {
    "id": "af1932",
    "code": "signature_info",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "Signature Information states the who, what, where and how a form is or should be signed. This can be used whenever a signature or initials need to be collected to verify and track that a disclosure or"
  },
  {
    "id": "af1933",
    "code": "attachment",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "This contains a collection of attachments. Each attachment could contain any of the attachment Types defined. In the Attachment object the three items AttachmentData, AttachmentReference, and Attachme"
  },
  {
    "id": "af1934",
    "code": "jurisdiction_approval",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "The jurisdiction(s) in which the item is available. If the item is available in all jurisdictions, each jurisdiction should be stated explicitly unless it is stated on a related higher level \"parent\"  *(On FormInstance, used to explicitly identify the state for which this form applies. Can be used in situations where the FormName property does not vary by state even though the form itself does. For e)*"
  },
  {
    "id": "af1935",
    "code": "keyed_value",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "Generic object used to extend object hierarchy for proprietary data requirements. Each proprietary data item is represented using a KeyedValue object. A collection of KeyedValue objects is utilized to"
  },
  {
    "id": "af1936",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af1937",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "Record creation timestamp."
  },
  {
    "id": "af1938",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "Record last update timestamp."
  },
  {
    "id": "af1939",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "form_instance",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af1940",
    "code": "attachment_id",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "Primary key for Attachment."
  },
  {
    "id": "af1941",
    "code": "policy_id",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "FK → policy.policy_id"
  },
  {
    "id": "af1942",
    "code": "party_id",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "FK → party.party_id"
  },
  {
    "id": "af1943",
    "code": "attachment_key",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "Attachment Key"
  },
  {
    "id": "af1944",
    "code": "attachment_sys_key",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "Attachment System Key"
  },
  {
    "id": "af1945",
    "code": "date_created",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "Date on which the object was created, typically the System date."
  },
  {
    "id": "af1946",
    "code": "user_code",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "The ID or reference number that identifies the customer service rep associated with the transaction."
  },
  {
    "id": "af1947",
    "code": "user_name",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "Name of user *(On Attachment, UserName provides a human readable representation of the user that corresponds to the UserCode.)*"
  },
  {
    "id": "af1948",
    "code": "attachment_basic_type",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "This describes the basic type of attachment. If it is other than text, you must look at AttachmentType and MimeTypeTC to correctly use the data."
  },
  {
    "id": "af1949",
    "code": "attachment_source",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "Source of the Attachment. For example, this can be used to indicate the application that created the attachment."
  },
  {
    "id": "af1950",
    "code": "description",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "The Description field defines a human readable, displayable, paragraph of detailed information for the corresponding object/concept. It provides a more detailed explanatory narrative for the object/co *(On Attachment, Description is used to describe the type of attachment provided.)*"
  },
  {
    "id": "af1951",
    "code": "attachment_data",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "Either the URL Location, MIME reference or binary representation of an attached file. *(On Attachment, AttachmentData is used when specified by the value in AttachmentLocation. If AttachmentLocation is 1 (Inline), then use the AttachmentData property as a binary representation of the dat)*"
  },
  {
    "id": "af1952",
    "code": "attachment_reference",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "Attachment Reference is used to refer to another Attachment aggregate. *(On Attachment, AttachmentReference is used when specified by the value in AttachmentLocation. If AttachmentLocation is 4 (Attachment IDREF), then use the AttachmentReference property to point to the A)*"
  },
  {
    "id": "af1953",
    "code": "attachment_data64_binary",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "The MIME reference or binary representation of an attached file encoded as base64Binary. For a description of XOP:Include, please refer to the W3C Web site at http://www.w3.org/TR/xop10/#xop_include. *(On Attachment, AttachmentData64Binary is used when specified by the value in AttachmentLocation. If AttachmentLocation is 5 (XOP), then the entire message is sent as part of an XOP message and the Att)*"
  },
  {
    "id": "af1954",
    "code": "attachment_type",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "Type of attachment."
  },
  {
    "id": "af1955",
    "code": "mime_type_t_c",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "Describes the Multipurpose Internet Mail Extensions (MIME) format of the attachment data. If the attachment data is an image file then this describes the MIME format of the file despite the contents ( *(On Attachment, MimeTypeTC provides a detailed classification of the contents of the attachment. A high level classification may be supplied in the ImageType property.)*"
  },
  {
    "id": "af1956",
    "code": "transfer_encoding_type_t_c",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "Type of encoding. E.g. 7bit, binary, etc."
  },
  {
    "id": "af1957",
    "code": "image_type",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "Describes the format of the Imaged file regardless of its contents (forms, letters, notes, etc.). *(On Attachment, ImageType provides a high level classification of the contents of the attachment. It may be used to provide detail when the AttachmentBasicType is set to \"Image\". More specific details )*"
  },
  {
    "id": "af1958",
    "code": "attachment_location",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "Indicates how an attachment is stored, such as inline or URL Reference. *(On Attachment, AttachmentLocation is used to specify which of the elements (AttachmentData, AttachmentReference, or AttachmentData64Binary) holds the contents of the Attachment.)*"
  },
  {
    "id": "af1959",
    "code": "last_update",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "The date last modified. *(On Attachment, LastUpdate is used to indicate the last date the Attachment was modified.)*"
  },
  {
    "id": "af1960",
    "code": "last_update_time",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "The time of the last update date this activity was last modified. *(On Attachment, LastUpdateTime is used to indicate the last time the Attachment was modified.)*"
  },
  {
    "id": "af1961",
    "code": "follow_up_date",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "The date follow up action is needed."
  },
  {
    "id": "af1962",
    "code": "follow_up_time",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "The time follow up action is needed."
  },
  {
    "id": "af1963",
    "code": "image_submission_type",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "Used to account for forms or images that are not provided electronically. *(On Attachment, when AttachmentBasicType = 2 (Image), this identifies the location of the image. For example: if the image of a lab report is contained in the client file, this can be specified in Imag)*"
  },
  {
    "id": "af1964",
    "code": "priority",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "The priority indicates the order of urgency the notes have concerning the applicant, the status of requirement or anything else important in determining risk or about the contract so appropriate actio *(On Attachment, Priority is used to indicate the level of urgency the text attachment representing the Underwriter, Exception or General Notes has. Priority also indicates the order of urgency the note)*"
  },
  {
    "id": "af1965",
    "code": "purge_date",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "The date when the note attachment is to be automatically deleted from the contract record. *(On Attachment, PurgeDate is essential in defining the retention period applicable to a given note. It is an effective way to retain only the pertinent notes that truly need attention in addition to co)*"
  },
  {
    "id": "af1966",
    "code": "purge_time",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "The time when the note attachment is to be automatically deleted from the contract record. *(On Attachment, PurgeTime is essential in defining the retention period applicable to a given note. It is an effective way to retain only the pertinent notes that truly need attention in addition to co)*"
  },
  {
    "id": "af1967",
    "code": "archive_number",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "This field represents a unique id assigned to a microfilm or micro fiche roll which contracts multiple attachments that have been scanned and imaged."
  },
  {
    "id": "af1968",
    "code": "archive_ref_number",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "The reference number assigned to a roll of microfilm for later retrieval. Usually this number involves key information about where the microfilm roll is stored and the date of storage. The reference n"
  },
  {
    "id": "af1969",
    "code": "attachment_category_t_c",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "A classification or categorization of the type of attachment."
  },
  {
    "id": "af1970",
    "code": "file_name",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "This is name of the file included in the attachment aggregate."
  },
  {
    "id": "af1971",
    "code": "sequence",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "This element is used for ordering and sorting purposes. Sequencing should start with \"1\". Nodes within the same object should not duplicate a Sequence that applies to any one application or policy unl *(On Attachment, Sequence describes the sequencing of Attachments when multiple Attachments need to be sorted for processing.)*"
  },
  {
    "id": "af1972",
    "code": "received_date",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "Date parent object was received *(On Attachment, this is the date the attachment was received by the receiving system.)*"
  },
  {
    "id": "af1973",
    "code": "attachment_hash_value",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "The hash result or digest used to verify the attachment content against data corruption independent of the file type (PDF, TIFF, etc)"
  },
  {
    "id": "af1974",
    "code": "attachment_hash_type",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "The type of data hash algorithm which is used to verify the attachment content against data corruption independent of the file type (PDF, TIFF, etc)"
  },
  {
    "id": "af1975",
    "code": "originating_source_type",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "Nature of scanned paper document (such as original versus a copy)."
  },
  {
    "id": "af1976",
    "code": "creation_time",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "The time the XML stream was last updated. Since the source represents the most recent source, the assumption is that it was created by that most recent source. This time reflects when it was most rece *(On Attachment, this is the time the Attachment was created. One usage of CreationTime is to capture the time the Attachment may have been scanned for storage in an imaging database.)*"
  },
  {
    "id": "af1977",
    "code": "page_count",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "The number of pages within the attachment as documented by the creator of the attachment."
  },
  {
    "id": "af1978",
    "code": "signature_info",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "Signature Information states the who, what, where and how a form is or should be signed. This can be used whenever a signature or initials need to be collected to verify and track that a disclosure or *(On Attachment, SignatureInfo is used to describe the parties (and their roles) who signed the form when the Attachment is an image of a signed form. This allows straight through processing and busines)*"
  },
  {
    "id": "af1979",
    "code": "attachment_anomaly",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "Specifies metadata about abnormalities relating to an attachment that may indicate a need for manual review or other additional action. *(On Attachment, AttachmentAnomaly is used to describe anomalies about the contents of an attachment such as handwritten notes on a scanned image.)*"
  },
  {
    "id": "af1980",
    "code": "attachment_mark",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "A means of marking, tagging, or labeling an attachment based on knowledge of its contents. The tags are informational only and they are not binding on the part of the recipient. For example, an attach"
  },
  {
    "id": "af1981",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af1982",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "Record creation timestamp."
  },
  {
    "id": "af1983",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "Record last update timestamp."
  },
  {
    "id": "af1984",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "attachment",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af1985",
    "code": "holding_id",
    "usedInTables": 1,
    "tables": "holding",
    "description": "Primary key for Holding."
  },
  {
    "id": "af1986",
    "code": "policy_id",
    "usedInTables": 1,
    "tables": "holding",
    "description": "FK → policy.policy_id"
  },
  {
    "id": "af1987",
    "code": "party_id",
    "usedInTables": 1,
    "tables": "holding",
    "description": "FK → party.party_id"
  },
  {
    "id": "af1988",
    "code": "holding_key",
    "usedInTables": 1,
    "tables": "holding",
    "description": "Holding Key"
  },
  {
    "id": "af1989",
    "code": "holding_sys_key",
    "usedInTables": 1,
    "tables": "holding",
    "description": "Holding System Key"
  },
  {
    "id": "af1990",
    "code": "account_designation",
    "usedInTables": 1,
    "tables": "holding",
    "description": "This property defines the available valid Account Designations for the parent object. *(On Holding, AccountDesignation defines the specific Account Designation that applies to the Holding.)*"
  },
  {
    "id": "af1991",
    "code": "holding_type_code",
    "usedInTables": 1,
    "tables": "holding",
    "description": "Type of Holding...Asset, Liability, Policy, etc."
  },
  {
    "id": "af1992",
    "code": "holding_name",
    "usedInTables": 1,
    "tables": "holding",
    "description": "A descriptive string that is used to indicate what the holding represents."
  },
  {
    "id": "af1993",
    "code": "holding_status",
    "usedInTables": 1,
    "tables": "holding",
    "description": "Holding Status"
  },
  {
    "id": "af1994",
    "code": "purpose",
    "usedInTables": 1,
    "tables": "holding",
    "description": "Code showing purpose / goal of client for which this was sold. *(On Holding, it is preferred that Intent be used rather than Purpose. The object can support single or multiple purposes because it repeats. If a coverage is being purchased for a different reason than)*"
  },
  {
    "id": "af1995",
    "code": "currency_type_code",
    "usedInTables": 1,
    "tables": "holding",
    "description": "The type of currency. It is assumed that all currency fields for this object (including sub-objects) are of the same currency type. *(On Holding, CurrencyTypeCode defines the type of currency to be used for a specified Holding. It is assumed that all currency fields for this object (including sub-objects) are of the same currency ty)*"
  },
  {
    "id": "af1996",
    "code": "carrier_admin_system",
    "usedInTables": 1,
    "tables": "holding",
    "description": "The carrier assigned system identification where the information resides or originated."
  },
  {
    "id": "af1997",
    "code": "carrier_admin_sub_system",
    "usedInTables": 1,
    "tables": "holding",
    "description": "The subsystem within the carrier administration where the event was generated."
  },
  {
    "id": "af1998",
    "code": "cost_basis",
    "usedInTables": 1,
    "tables": "holding",
    "description": "Purchase price, including commissions and other expenses. Used to determine capital gains and capital losses for tax purposes. Also called tax basis. For life insurance, this would be benefits + premi"
  },
  {
    "id": "af1999",
    "code": "component_of_package",
    "usedInTables": 1,
    "tables": "holding",
    "description": "Indicates whether holding is part of a package of holdings. TRUE indicates it is part of a package of holdings, FALSE if not. Please note that in the case where a holding is part of a package, overall"
  },
  {
    "id": "af2000",
    "code": "asset_value",
    "usedInTables": 1,
    "tables": "holding",
    "description": "The current gross asset value of the Holding."
  },
  {
    "id": "af2001",
    "code": "liability_value",
    "usedInTables": 1,
    "tables": "holding",
    "description": "The current liability value of the Holding."
  },
  {
    "id": "af2002",
    "code": "as_of_date",
    "usedInTables": 1,
    "tables": "holding",
    "description": "As of date of information. Purpose dependent on where it is used."
  },
  {
    "id": "af2003",
    "code": "last_fin_activity_date",
    "usedInTables": 1,
    "tables": "holding",
    "description": "The date of the most recent transaction in a customer account. Such activity may include, but is not limited to cash sweeps, dividends, check writing, purchases and/or redemptions."
  },
  {
    "id": "af2004",
    "code": "last_fin_activity_type",
    "usedInTables": 1,
    "tables": "holding",
    "description": "Indicates the type of activity for the last financial activity processed. *(On Holding, LastFinActivityType is used in conjunction with LastFinancialActivityDate.)*"
  },
  {
    "id": "af2005",
    "code": "last_non_fin_activity_date",
    "usedInTables": 1,
    "tables": "holding",
    "description": "The date of the most recent adjustment to an account. Such change may be activity related or associated with the account setup."
  },
  {
    "id": "af2006",
    "code": "last_anniversary_date",
    "usedInTables": 1,
    "tables": "holding",
    "description": "Last anniversary date processed."
  },
  {
    "id": "af2007",
    "code": "next_anniversary_date",
    "usedInTables": 1,
    "tables": "holding",
    "description": "This is the anniversary date of any anniversary notification amounts. The next anniversary date is the date that anniversary changes will be processed. This date should not be confused with the next m"
  },
  {
    "id": "af2008",
    "code": "holding_form",
    "usedInTables": 1,
    "tables": "holding",
    "description": "Form of holding. Designates the basic form (legal) of the policy. A group policy would be in a group master contract, an individual policy is on an insurance form filed with the jurisdiction. An Inves"
  },
  {
    "id": "af2009",
    "code": "assignment_code",
    "usedInTables": 1,
    "tables": "holding",
    "description": "A code indicating if the Holding is assigned."
  },
  {
    "id": "af2010",
    "code": "qualified_code",
    "usedInTables": 1,
    "tables": "holding",
    "description": "Indicates if qualified, non qualified or either. *(On Holding, QualifiedCode is used to specify whether the Holding is being held in a tax qualified plan.)*"
  },
  {
    "id": "af2011",
    "code": "restriction_code",
    "usedInTables": 1,
    "tables": "holding",
    "description": "The type of restriction. *(On Holding, RestrictionCode specifies whether the Holding has some restriction.)*"
  },
  {
    "id": "af2012",
    "code": "distributor_client_acct_num",
    "usedInTables": 1,
    "tables": "holding",
    "description": "The account number for the client and/or policy which is assigned by the distributor. This value describes the identifier provided by the distributor for this client and/or policy. This value may also"
  },
  {
    "id": "af2013",
    "code": "commission_hold_ind",
    "usedInTables": 1,
    "tables": "holding",
    "description": "Hold Commission Indicator. TRUE indicates commissions should be withheld and FALSE indicates they should not be withheld on this Holding."
  },
  {
    "id": "af2014",
    "code": "product_compensation_type",
    "usedInTables": 1,
    "tables": "holding",
    "description": "Used to specify the product compensation structure. For example, is the product fee based or commission based for the advisor's compensation?"
  },
  {
    "id": "af2015",
    "code": "market_type",
    "usedInTables": 1,
    "tables": "holding",
    "description": "Market in which the qualified plan type(s) or holding/policy being described was sold."
  },
  {
    "id": "af2016",
    "code": "share_class",
    "usedInTables": 1,
    "tables": "holding",
    "description": "Share class represents the general category to describe the cost structure"
  },
  {
    "id": "af2017",
    "code": "market_val_adjust_ind",
    "usedInTables": 1,
    "tables": "holding",
    "description": "TRUE indicates that market value adjustments apply. FALSE indicates market value adjustments do not apply. A market value adjustment increases or decreases a value based on the difference between the  *(On Holding, MarketValAdjustInd is used to indicate whether or not the contract may be subject to market value adjustments. This is determined by the funds available to support the product. If MarketVa)*"
  },
  {
    "id": "af2018",
    "code": "policy",
    "usedInTables": 1,
    "tables": "holding",
    "description": "If the holding is a policy, this object pertains. It contains all the policy properties that are generic across insurance policy types. If the policy has investment options, the investment portion of"
  },
  {
    "id": "af2019",
    "code": "investment",
    "usedInTables": 1,
    "tables": "holding",
    "description": "If a holding is an investment, this object pertains. If a holding is an insurance policy that has investment options, such as a variable life insurance product, this object contains the investment inf"
  },
  {
    "id": "af2020",
    "code": "attachment",
    "usedInTables": 1,
    "tables": "holding",
    "description": "This contains a collection of attachments. Each attachment could contain any of the attachment Types defined. In the Attachment object the three items AttachmentData, AttachmentReference, and Attachme"
  },
  {
    "id": "af2021",
    "code": "compensation_payment",
    "usedInTables": 1,
    "tables": "holding",
    "description": "Reflects the payments made (or to be made) to agents/brokers for a particular holding. Note that this object is not meant to represent all information on compensations, commissions, etc., but only the *(On Holding, CompensationPayment is used to reflect the payments made to agents/brokers for a particular holding. CompensationPayment reflects the commission payment from the perspective of the Holding)*"
  },
  {
    "id": "af2022",
    "code": "intent",
    "usedInTables": 1,
    "tables": "holding",
    "description": "This aggregate provides the reasons for a Holding being purchased; i.e. The reason or intent of a buyer for purchasing this Holding. *(It is preferred that Intent, rather than Purpose, be used at the Holding level. The object can support a single or multiple purposes because it repeats. If a Coverage is being purchased for a differen)*"
  },
  {
    "id": "af2023",
    "code": "arrangement",
    "usedInTables": 1,
    "tables": "holding",
    "description": "Collection of arrangements for this holding."
  },
  {
    "id": "af2024",
    "code": "loan",
    "usedInTables": 1,
    "tables": "holding",
    "description": "Loan detail for a specific Holding."
  },
  {
    "id": "af2025",
    "code": "system_message",
    "usedInTables": 1,
    "tables": "holding",
    "description": "A collection of Messages that are returned by one processing system to another. These messages are not transaction related but rather general status messages."
  },
  {
    "id": "af2026",
    "code": "banking",
    "usedInTables": 1,
    "tables": "holding",
    "description": "This object contains the banking information (account numbers, account types, pointer to the Party containing the Financial Institution, etc.). For example a CD, Credit Card, or Savings Account. *(On Holding, if Banking is specified then Policy or Investment objects should not be present. The Banking object can only appear in Holdings where the HoldingTypeCode is 7 - Banking.)*"
  },
  {
    "id": "af2027",
    "code": "authorization",
    "usedInTables": 1,
    "tables": "holding",
    "description": "The Authorization object identifies those entities that are allowed to complete specified financial and non-financial transactions by specified means. *(On Holding, Authorization provides all Authorizations that were selected.)*"
  },
  {
    "id": "af2028",
    "code": "holding_x_lat",
    "usedInTables": 1,
    "tables": "holding",
    "description": "The string fields for the data model are represented in the language specified by OLifE/CurrentLanguage. This object contains the string fields that were deemed pertinent to be presented in one or mor *(On Holding, HoldingXLat is used to represent string elements in a language other than the default language specified by OLifE/CurrentLanguage.)*"
  },
  {
    "id": "af2029",
    "code": "fee",
    "usedInTables": 1,
    "tables": "holding",
    "description": "An aggregate describing fees to be charged."
  },
  {
    "id": "af2030",
    "code": "restriction_info",
    "usedInTables": 1,
    "tables": "holding",
    "description": "Contains information relating to Restrictions. *(On Holding, RestrictionInfo is used to document restrictions placed on activities within the Holding. To restrict coverage on a policy, please refer to the Endorsement object.)*"
  },
  {
    "id": "af2031",
    "code": "policy_values",
    "usedInTables": 1,
    "tables": "holding",
    "description": "This object contains policy values that may be the result of a Holding inquiry or transmittal. *(On Holding, the PolicyValues object can be found on Holding when returning policy values as part of an inquiry or transmittal.)*"
  },
  {
    "id": "af2032",
    "code": "surrender_charge_schedule",
    "usedInTables": 1,
    "tables": "holding",
    "description": "The surrender charge schedule *(On Holding, SurrenderChargeSchedule indicates the specific surrender charge schedule which applies to this Holding.)*"
  },
  {
    "id": "af2033",
    "code": "integrator",
    "usedInTables": 1,
    "tables": "holding",
    "description": "An Integrator defines a situation where the Holding receives a discount or additional benefit as the result of a cross-selling situation. This aggregate identifies the Integrator associated with the p"
  },
  {
    "id": "af2034",
    "code": "keyed_value",
    "usedInTables": 1,
    "tables": "holding",
    "description": "Generic object used to extend object hierarchy for proprietary data requirements. Each proprietary data item is represented using a KeyedValue object. A collection of KeyedValue objects is utilized to"
  },
  {
    "id": "af2035",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "holding",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af2036",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "holding",
    "description": "Record creation timestamp."
  },
  {
    "id": "af2037",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "holding",
    "description": "Record last update timestamp."
  },
  {
    "id": "af2038",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "holding",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af2039",
    "code": "application_info_id",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Primary key for Application Info."
  },
  {
    "id": "af2040",
    "code": "policy_id",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "FK → policy.policy_id"
  },
  {
    "id": "af2041",
    "code": "party_id",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "FK → party.party_id"
  },
  {
    "id": "af2042",
    "code": "h_o_assigned_app_number",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Unique ID of application assigned by the carrier's home office used for tracking purposes of a holding until a policy number is assigned. The tracking ID used by the carrier's home office to identify"
  },
  {
    "id": "af2043",
    "code": "tracking_i_d",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "This is the Case/Tracking Number used to identify the application to reference the Holding until a policy number is assigned. Once a policy number is assigned, the reference to the Holding should be i *(On ApplicationInfo, TrackingID is a tracking ID assigned from the submitter to be used until the carrier assigns a policy number. Unique ID of application used for tracking of a Holding. This could be)*"
  },
  {
    "id": "af2044",
    "code": "tracking_i_d_vendor_code",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "An ACORD assigned unique vendor code that represents the creator of the TrackingID, which could be a vendor or a carrier."
  },
  {
    "id": "af2045",
    "code": "h_o_app_form_number",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "This property contains they actual form number of identifier assigned by the carrier for the form. *(On ApplicationInfo, HOAppFormNumber is used to specify the first form number. If multiple form numbers need to be captured, then put each and every form number in a FormInstance with the ProviderFormN)*"
  },
  {
    "id": "af2046",
    "code": "application_type",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "ApplicationType defines the type of new business submission, such as an application for new business, reinstatement or conversion. This commonly drives the overall new business process. This is not th *(On ApplicationInfo, ApplicationType should be specified for conversion, exchange or replacement applications as well as establishing the association between Holding of application and other Holdings ()*"
  },
  {
    "id": "af2047",
    "code": "application_jurisdiction",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "This establishes the legal jurisdiction of the application which is usually where the application was signed. This is the state in which a prospect is solicited for the purchase of an insurance produc *(On ApplicationInfo, ApplicationJurisdiction may also be called the Solicitation State. If the application was signed in a different state, refer to the ApplicationSignedState property.)*"
  },
  {
    "id": "af2048",
    "code": "application_county",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "County where the application was signed."
  },
  {
    "id": "af2049",
    "code": "application_country",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Country where application was signed."
  },
  {
    "id": "af2050",
    "code": "territory",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "A carrier assigned territory used for routing or marketing purposes. *(On ApplicationInfo, Territory represents the carrier assigned territory from which the application was submitted.)*"
  },
  {
    "id": "af2051",
    "code": "formal_app_ind",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Defines if the application is a formal or informal application. The trial or informal process is intended to result in a nonbinding proposal for the purpose of ratings and premiums. As such, during th"
  },
  {
    "id": "af2052",
    "code": "counter_offer_o_k",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "TRUE indicates it is OK to give a counter offer for this client. FALSE indicates the client has already determined they would not consider a counter offer (e.g. higher rating)."
  },
  {
    "id": "af2053",
    "code": "signed_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Date the application was signed by the Applicant(s). *(On ApplicationInfo, when there is more than one applicant, use the date the primary applicant or annuitant (the \"primary person\") signed the application for SignedDate here and then record remaining a)*"
  },
  {
    "id": "af2054",
    "code": "submission_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "The date the application was submitted to home office. This is typically the carrier home office."
  },
  {
    "id": "af2055",
    "code": "submission_time",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "The time the application was submitted to home office. This is typically the carrier home office."
  },
  {
    "id": "af2056",
    "code": "submission_type",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Indicates how the item was submitted to the receiver. *(On ApplicationInfo, SubmissionType relates to how the application forms were submitted to the carrier.)*"
  },
  {
    "id": "af2057",
    "code": "application_collection_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "The date the case was collected from the applicant. *(On ApplicationInfo, ApplicationCollectionDate specifies when the application is collected over a period of time, this date should be the last date information regarding the application was collected.)*"
  },
  {
    "id": "af2058",
    "code": "h_o_receipt_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Date application was received by the carrier's home office. *(On ApplicationInfo, HOReceiptDate is only valued by the carrier to indicate when the application was received.)*"
  },
  {
    "id": "af2059",
    "code": "carrier_input_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Date the application was keyed, entered or uploaded into the carrier's system. *(On ApplicationInfo, this property is only valued by the carrier to indicate when it was processed/entered.)*"
  },
  {
    "id": "af2060",
    "code": "resubmit_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Date the agent most recently submitted application to home office. This is useful if the Home Office does not have a record of receiving the application and it must be resent. It assumes the applicati"
  },
  {
    "id": "af2061",
    "code": "case_rewrite_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "This is the date on which the case is most recently drawn up again. Cases that were incorrectly drawn up (for example the insured's name was misspelled) are required to be done again or rewritten."
  },
  {
    "id": "af2062",
    "code": "h_o_completion_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Date application was either approved or rejected by the home office, once all underwriting requirements are completed or waived. This date describes the underwriting decision; it does not necessarily"
  },
  {
    "id": "af2063",
    "code": "requested_issue_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Provides for a request to forward or back date the policy *issue* date. This DOES NOT affect the policy effective date. *(On ApplicationInfo, RequestedIssueDate is used to designate a specific issue date. To request a specific effective date, used RequestedPolDate and BackDateType.)*"
  },
  {
    "id": "af2064",
    "code": "policy_delivered_ind",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "TRUE indicates the carrier has delivered the policy. FALSE indicates the carrier has NOT delivered the policy."
  },
  {
    "id": "af2065",
    "code": "h_o_policy_mail_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Date at which the home office initially mailed the policy to the agent/insured. *(On ApplicationInfo, HOPolicyMailDate is the date the policy was delivered by carrier, regardless of delivery method. See ActualPolicyDeliveryMethod for delivery method used.)*"
  },
  {
    "id": "af2066",
    "code": "h_o_policy_remail_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Date at which the home office most recently remailed the policy to the agent/insured. *(On ApplicationInfo, HOPolicyRemailDate is the date the policy was most recently resent by carrier, regardless of delivery method. See ActualPolicyDeliveryMethod for delivery method used.)*"
  },
  {
    "id": "af2067",
    "code": "placement_end_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Final date that insurance must be placed or application is not approved. This is the final date that all underwriting requirements must be completed."
  },
  {
    "id": "af2068",
    "code": "agent_c_w_a_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "The date the agent received the initial payment that accompanied the application."
  },
  {
    "id": "af2069",
    "code": "h_o_c_w_a_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "The date the home office received the initial payment that accompanied the application."
  },
  {
    "id": "af2070",
    "code": "policy_delivery_receipt_ind",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "TRUE indicates the policy delivery receipt has been signed. FALSE indicates it has NOT been signed."
  },
  {
    "id": "af2071",
    "code": "policy_delivery_receipt_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "The date the policy delivery receipt was signed by the new policyholder."
  },
  {
    "id": "af2072",
    "code": "t_i_a_signed_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "The date which the applicant signed the temporary insurance agreement."
  },
  {
    "id": "af2073",
    "code": "app_request_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "The date of the policy application request. Especially useful for policy conversions."
  },
  {
    "id": "af2074",
    "code": "initial_bill_to_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "The date used to establish the initial billing date."
  },
  {
    "id": "af2075",
    "code": "requested_pol_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Provides for a request of a specific policy effective date (Policy\\EffDate), which may include a forward or back dated policy effective date. This is mutually exclusive to BackDateType (e.g. Save Age) *(On ApplicationInfo, RequestedPolDate might be used to synch up the policy date with a mortgage or other related event.)*"
  },
  {
    "id": "af2076",
    "code": "c_w_a_amt",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Cash With Application (CWA) includes the TOTAL amount of money received with the application when it is submitted to the carrier to fund the contract which is received via a wire and/or check, and/or  *(On ApplicationInfo, CWAAmt is the sum of monies submitted with the application that is sent to the carrier. Additional monies added later during the underwriting phase are documented in the TotalCWAAm)*"
  },
  {
    "id": "af2077",
    "code": "total_c_w_a_amt",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Cash With Application (CWA) can be received any time during the underwriting process, not just at application submit. Currently, the model supports CWAAmt, which is defined as the total amount receive *(On ApplicationInfo, TotalCWAAmt details are found in FinancialActivity.)*"
  },
  {
    "id": "af2078",
    "code": "total_expected_premium_amt",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "The estimated premium expected. One use case is an annuity contract which might include estimated amounts for one or more exchanges, replacements, or transfers. This would be the total of these amount *(On ApplicationInfo, TotalExpectedPremiumAmt details are found in FinancialActivity.)*"
  },
  {
    "id": "af2079",
    "code": "prem_bal_due",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Once the approval basis has been determined, this field will contain the dollar amount of additional funds the carrier has calculated will be required of the applicant to place the policy in force on"
  },
  {
    "id": "af2080",
    "code": "max_risk_amt",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "The highest total risk amount on the primary insured approved by the Underwriter without needing additional requirements."
  },
  {
    "id": "af2081",
    "code": "case_org_code_function",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Note this is read/write because the organization itself may not be identified."
  },
  {
    "id": "af2082",
    "code": "case_org_code",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Internal organization code used to identify case location. Read only from organization."
  },
  {
    "id": "af2083",
    "code": "case_location_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "The date the case was sent to its current location."
  },
  {
    "id": "af2084",
    "code": "blanket_authorization_ind",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "TRUE Indicates a blanket authorization has been signed. FALSE Indicates a blanket authorization has NOT been signed."
  },
  {
    "id": "af2085",
    "code": "default_enrollment_ind",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "TRUE indicates plan defaults were automatically assigned because no enrollment decision was made by the individual. FALSE indicates plan defaults were NOT automatically assigned."
  },
  {
    "id": "af2086",
    "code": "pref_language",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Preferred Language for doing business. *(On ApplicationInfo, PrefLanguage is the language of the application itself when it was printed or displayed. It is generally used in situations where the carrier offers an application in multiple lang)*"
  },
  {
    "id": "af2087",
    "code": "n_b_contact_name",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Contact person in the New Business Area at Carrier."
  },
  {
    "id": "af2088",
    "code": "h_o_underwriter_name",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Used to store the Home Office Underwriter name. Frequently specified in NAILBA transactions."
  },
  {
    "id": "af2089",
    "code": "last_underwriting_activity_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "The date of last underwriting activity."
  },
  {
    "id": "af2090",
    "code": "last_underwriting_activity_time",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Time at which the most recent underwriting activity took place."
  },
  {
    "id": "af2091",
    "code": "additional_ind",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "TRUE indicates the contract is to be considered, for underwriting purposes, as an additional contract to the related contract. FALSE indicates the contract is NOT to be considered, for underwriting pu *(On ApplicationInfo, AdditionalInd and AlternateInd are used when more than one application is submitted to the same carrier at the same time and are intended to be underwritten together. If either of )*"
  },
  {
    "id": "af2092",
    "code": "alternate_ind",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "TRUE indicates the contract is to be considered, for underwriting purposes, as an alternate contract to the related contract. FALSE indicates the contract is NOT to be considered, for underwriting pur *(On ApplicationInfo, AlternateInd and AdditionalInd are used when more than one application is submitted to the same carrier at the same time and are intended to be underwritten together. If either of )*"
  },
  {
    "id": "af2093",
    "code": "client_materials_ind",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "TRUE indicates the Consumer Privacy Notice and other required materials have been given to the potential insured and FALSE indicates the materials have not been given to the potential insured. Example"
  },
  {
    "id": "af2094",
    "code": "consumer_info_ind",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "TRUE indicates the Consumer Information Statement has been filed with the selling Broker/Dealer for this Activity. FALSE indicates the Consumer Information Statement has NOT been filed with the sellin"
  },
  {
    "id": "af2095",
    "code": "disclosure_ind",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "TRUE indicates the Carrier's prospectus and/or disclosure was used in the sale and FALSE indicates the prospectus and/or disclosure may not have been used in the sale."
  },
  {
    "id": "af2096",
    "code": "h_i_v_consent_auth_ind",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "TRUE indicates the proposed insured was given a copy of the HIV Informed Consent Authorization. FALSE indicates the proposed insured was NOT given a copy of the HIV Informed Consent Authorization."
  },
  {
    "id": "af2097",
    "code": "h_i_v_tested_ind",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "TRUE indicates person has been tested for HIV. FALSE indicates they have NOT been tested for HIV."
  },
  {
    "id": "af2098",
    "code": "home_office_purchase_ind",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "TRUE indicates the proposed contract is eligible for carrier defined discounts or other special consideration due to being a privileged or special class of policyholder. FALSE indicates the proposed c"
  },
  {
    "id": "af2099",
    "code": "replacement_ind",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Used to indicate the response to a replacement question on an application. TRUE indicates there is a replacement to be used in funding a proposed policy. FALSE indicates there is NO replacement. *(On ApplicationInfo, ReplacementInd is where the AGENT (via the application) indicates if there is a replacement. Use ReplacementInd on Risk to specify the CLIENT is indicating a replacement. The value)*"
  },
  {
    "id": "af2100",
    "code": "sales_material_ind",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "TRUE indicates the Carrier's approved sales materials were used for the sale. FALSE indicates the Carrier's approved sales materials were NOT used for the sale."
  },
  {
    "id": "af2101",
    "code": "suitabilty_performed_ind",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "TRUE indicates the questions were asked and answered. It does not indicate what the answers to the questions were. FALSE indicates the questions were NOT asked or answered. *(On ApplicationInfo, SuitabiltyPerformedInd with a value of true indicates only that a suitability check has been performed. Use SuitabilityInd to specify if the coverage has been deemed suitable for t)*"
  },
  {
    "id": "af2102",
    "code": "suitability_ind",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "TRUE indicates the characteristics of the application, (for example face amount) have been deemed suitable for the applicant(s). FALSE indicates the characteristics of the application, (for example fa *(On ApplicationInfo, SuitabilityInd indicates if the coverage has been deemed suitable for the applicant. Use SuitabiltyPerformedInd to specify that the suitability check has been performed.)*"
  },
  {
    "id": "af2103",
    "code": "application_signature_type",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Type of signature collected on the application."
  },
  {
    "id": "af2104",
    "code": "funding_disclosure_ind",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "TRUE indicates the Client is using funds from an existing contract as per the Agent. FALSE indicates the Client is NOT using funds from an existing contract as per the Agent. *(On ApplicationInfo, FundingDisclosureInd is where the AGENT indicates if the Client is using funds from an existing contract. Use FundingDisclosureInd on Risk to specify if the CLIENT is indicating re)*"
  },
  {
    "id": "af2105",
    "code": "replacement_reason",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "The reason why the Applicant is replacing the existing coverage."
  },
  {
    "id": "af2106",
    "code": "producer_replacement_disclosure_ind",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Used for the producer to verify the Replacement Disclosure (s) have been made. TRUE Indicates the Producer has discussed the advantages / disadvantages of Replacement with the applicant. FALSE Indicat"
  },
  {
    "id": "af2107",
    "code": "producer_replacement_appropriateness_ind",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "TRUE indicates the Producer has determined the replacement financing is appropriate for the applicant. FALSE indicates the Producer has determined the replacement financing is NOT appropriate for the"
  },
  {
    "id": "af2108",
    "code": "user_code",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "The ID or reference number that identifies the customer service rep associated with the transaction."
  },
  {
    "id": "af2109",
    "code": "agent_related_ind",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "TRUE Indicates the agent/producer is related to the insured. FALSE Indicates the agent/producer is NOT related to the insured. If the specific relationship between parties is gathered/known, it should"
  },
  {
    "id": "af2110",
    "code": "illustration_confirmation_num",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Used to ensure the illustration was run and can be confirmed. The purpose of Illustration Confirmation Number is to correlate a sales illustration report with the New Business Application. Presumably,"
  },
  {
    "id": "af2111",
    "code": "illustration_run_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "The date the illustration was run, not signed."
  },
  {
    "id": "af2112",
    "code": "illustration_expiration_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "The end (expiration) date of the illustration or quote."
  },
  {
    "id": "af2113",
    "code": "illustration_provided_ind",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "TRUE indicates the producer attests that an illustration was provided to the applicant. FALSE indicates the producer attests that an illustration was NOT provided to the applicant. *(On ApplicationInfo, IllustrationProvidedInd reflects whether the agent attests to providing an illustration. Use IllustrationConfirmationNum to provide the illustration confirmation number.)*"
  },
  {
    "id": "af2114",
    "code": "back_date_type",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "This property is a request from the applicant for the carrier to back date the policy effective date by calculating the policy effective date using their procedures & rules (and likely date of birth,"
  },
  {
    "id": "af2115",
    "code": "quoted_premium_amt",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "If the quoted premium amount provided to the applicant is different than the actual premium amount (and known) then specify actual premium amount in Policy\\PaymentAmt and specify the quoted premium in"
  },
  {
    "id": "af2116",
    "code": "quoted_premium_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "The date on which the quoted premium amount was calculated. *(On ApplicationInfo, QuotedPremiumDate is the date on which QuotedPremiumAmt was calculated.)*"
  },
  {
    "id": "af2117",
    "code": "h_o_app_form_type",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Refers to the type of application/form that the data represents."
  },
  {
    "id": "af2118",
    "code": "application_origin",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Describes the source or origination of the current application. For example, represents that this application is a result of an informal application."
  },
  {
    "id": "af2119",
    "code": "quoted_premium_mode",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "If the quoted premium mode provided to the applicant is different than the actual premium mode (and known) then specify actual premium mode in Policy\\PaymentMode and specify the quoted premium mode in"
  },
  {
    "id": "af2120",
    "code": "distrib_initial_submission_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "The date the financial professional submits the electronic order to the distributor home office for the first time."
  },
  {
    "id": "af2121",
    "code": "distrib_final_submission_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "The date the financial professional submits the electronic order to the distributor home office for the final time, which could include reworks and/or edits to the original/initial submitted electroni"
  },
  {
    "id": "af2122",
    "code": "distributor_receipt_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Represents date the first Distributor received the application from the Producer. Can be used along with other date elements such as CarrierInputDate to determine if there was a delay in the applicati"
  },
  {
    "id": "af2123",
    "code": "req_policy_delivery_method",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Identifies the requested method to use for policy delivery. Value will determine how the policy will be delivered to the designated recipient. Used in conjunction with the ReqPolicyDeliverToPartyID to"
  },
  {
    "id": "af2124",
    "code": "actual_policy_delivery_method",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "This indicates the actual policy delivery method used by carrier. Value determines how the policy was delivered to the designated recipient. May be used in conjunction with the ReqPolicyDeliverToParty *(On ApplicationInfo, ActualPolicyDeliveryMethod reflects the actual method used to deliver the policy. See ReqPolicyDeliveryMethod to determine what was originally requested by the client. The requeste)*"
  },
  {
    "id": "af2125",
    "code": "application_county_t_c",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "The county of the state in which the application was signed."
  },
  {
    "id": "af2126",
    "code": "credit_card_offered",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "TRUE indicates a credit card was offered as an option for the payment of premium. FALSE indicates a credit card was NOT offered as an option for the payment of premium."
  },
  {
    "id": "af2127",
    "code": "contract_situs_differs_ind",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Indicator if a sale was a non-resident solicitation (i.e. the contract was sold outside the client's resident state). TRUE indicates a non-resident solicitation did occur. FALSE indicates a non-reside"
  },
  {
    "id": "af2128",
    "code": "contract_situs_reason_code",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "A lookup table that provides a list of coded reasons as to why a contract was sold outside of the client's resident state (non-resident solicitation). *(On ApplicationInfo, ContractSitusReasonCode records the Producer's documented reason as to why a contract was solicited/sold outside of the client's resident state. This code only applies when Contrac)*"
  },
  {
    "id": "af2129",
    "code": "cash_on_delivery_ind",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "TRUE Indicates the payment is Cash On Delivery (COD). FALSE Indicates the payment is NOT Cash On Delivery (COD). *(On ApplicationInfo, CashOnDeliveryInd indicates whether or not the payment for the policy is Cash On Delivery. Cash on delivery means the applicant expects to pay the entire initial premium when the p)*"
  },
  {
    "id": "af2130",
    "code": "anticipated_enrollment_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "For group plans, this is the date the employer plans to start the enrollment process."
  },
  {
    "id": "af2131",
    "code": "anticipated_enrollment_end_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "For group plans, this is the date the employer plans to end the enrollment process."
  },
  {
    "id": "af2132",
    "code": "questions_from_carrier_due_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "For group plans, This is the date the employer needs to get any questions from the carrier back so they can be fulfilled."
  },
  {
    "id": "af2133",
    "code": "proposal_due_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "For group plans, this is the date the employer wants to see a firm proposal."
  },
  {
    "id": "af2134",
    "code": "anticipated_client_inten_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "For group insurance purposes, this is the anticipated date the employer (client in this scenario) plans on stating their intent on whether or not to accept the proposal."
  },
  {
    "id": "af2135",
    "code": "application_signed_state",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Signature state of the application. Physical location (state) where the application was signed. *(On ApplicationInfo, ApplicationSignedState may be used when the application is signed in a different state other than the legal jurisdiction specified in ApplicationJurisdiction. SignatureInfo may use)*"
  },
  {
    "id": "af2136",
    "code": "signed_state_participant_based_on",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Indicates which contract role player(s) (e.g. owner, annuitant, insured, etc.) drives the business logic around the determination of the signed state. *(On ApplicationInfo, SignedStateParticipantBasedOn specifies the role used to determine the ApplicationSignedState.)*"
  },
  {
    "id": "af2137",
    "code": "requested_presentation_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Date the submitter would like the carrier to present the Request For Proposal (RFP). *(On ApplicationInfo, RequestedPresentationDate applies to employee benefits proposals.)*"
  },
  {
    "id": "af2138",
    "code": "proposal_due_time",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "The time the proposal is due back to the submitter. *(On ApplicationInfo, ProposalDueTime applies to employee benefits proposals.)*"
  },
  {
    "id": "af2139",
    "code": "application_collection_time",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "The time the case was collected from the applicant. If the application is collected over a period of time this time should be the last time information regarding when the application was collected."
  },
  {
    "id": "af2140",
    "code": "app_package_type",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Defines the type of application package used, which provides insight as to its contents."
  },
  {
    "id": "af2141",
    "code": "solicitation_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "The date when the insurance product is first presented/proposed to the prospective customer. The beginning point of the 'sale'."
  },
  {
    "id": "af2142",
    "code": "order_solicitation_ind",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Indicates this application was solicited by the agent/advisor as opposed to having a client request the purchase. TRUE means the agent solicited the client. FALSE indicates the client directed the age *(On ApplicationInfo, OrderSolicitationInd indicates the order was or was not solicited.)*"
  },
  {
    "id": "af2143",
    "code": "client_purchase_agreement_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "The date the client agrees to purchase the insurance product."
  },
  {
    "id": "af2144",
    "code": "app_acceptably_completed_ind",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Producer indicates by a Yes or No answer on the application that it was completed using acceptable carrier procedures. TRUE indicates the application was completed using acceptable carrier procedures."
  },
  {
    "id": "af2145",
    "code": "insured_impairment_ind",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Producer indicates by a Yes or No answer on the application whether they are aware of any physical or cognitive impairment of the proposed insured. TRUE indicates they are aware of physical or cogniti"
  },
  {
    "id": "af2146",
    "code": "info_true_complete_ind",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Producer indicates by a Yes or No answer on the application that the information they provided in the application is true and complete. TRUE indicates the information they provided in the application"
  },
  {
    "id": "af2147",
    "code": "last_maintenance_activity_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Date of the last maintenance on a new business case excluding any underwriting activity. Examples of activities that will occur and result in an update of this date are the initial establishment of a"
  },
  {
    "id": "af2148",
    "code": "requested_policy_date_reason",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "This property describes why the requested policy date was requested."
  },
  {
    "id": "af2149",
    "code": "policy_delivery_jurisdiction",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "The jurisdiction or state in which the policy is expected to be delivered."
  },
  {
    "id": "af2150",
    "code": "distribution_channel",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Type of distribution channel. A high level description of the distribution channel - Captive, Independent, Direct, Bank etc. *(On ApplicationInfo, DistributionChannel is used to indicate the channel through which the application is being sold.)*"
  },
  {
    "id": "af2151",
    "code": "application_initiation_date",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "This date represents when the electronic application process was initiated/started. Represents when the electronic application was started regardless of if the application was sent back for changes or"
  },
  {
    "id": "af2152",
    "code": "signature_info",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Signature Information states the who, what, where and how a form is or should be signed. This can be used whenever a signature or initials need to be collected to verify and track that a disclosure or"
  },
  {
    "id": "af2153",
    "code": "identity_verification",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "This object is used to document that a person's identity has been verified. It includes the information relating to the type of identification used in the verification, audit information relating to t *(On ApplicationInfo, IdentityVerification may only apply to the identity of one single individual being verified. If there is a need to verify the identity of multiple individuals, then multiple Identi)*"
  },
  {
    "id": "af2154",
    "code": "interview",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "This object contains the details surrounding an interview. *(On ApplicationInfo, Interview is used to describe an interaction between two parties as it relates to an insurance application. This interaction may take place in different forms, such as a face to fa)*"
  },
  {
    "id": "af2155",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af2156",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Record creation timestamp."
  },
  {
    "id": "af2157",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Record last update timestamp."
  },
  {
    "id": "af2158",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "application_info",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af2159",
    "code": "signature_info_id",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "Primary key for Signature Info."
  },
  {
    "id": "af2160",
    "code": "policy_id",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "FK → policy.policy_id"
  },
  {
    "id": "af2161",
    "code": "party_id",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "FK → party.party_id"
  },
  {
    "id": "af2162",
    "code": "signature_info_key",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "SignatureInfo Key"
  },
  {
    "id": "af2163",
    "code": "signature_code",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "Identifier for the signature event information, often referred to as the signature ceremony. This information may or may not actually be rendered on a form."
  },
  {
    "id": "af2164",
    "code": "signature_info_sys_key",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "SignatureInfo System Key"
  },
  {
    "id": "af2165",
    "code": "signature_role_code",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "Role code describing signer's relationship to the form. *(On SignatureInfo, SignatureRoleCode is used to qualify the party specified in SignaturePartyID. In order to model a delegated signing scenario such as a proxy signature, use DelegatedSignerPartyID to )*"
  },
  {
    "id": "af2166",
    "code": "signature_date",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "Date on which a signature takes place. *(On SignatureInfo, documents the date on which the signature party performed the signature.)*"
  },
  {
    "id": "af2167",
    "code": "signature_time",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "Time at which a signature takes place. *(On SignatureInfo, documents the time at which the signature party performed the signature.)*"
  },
  {
    "id": "af2168",
    "code": "signature_city",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "City where a signature takes place."
  },
  {
    "id": "af2169",
    "code": "signature_county",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "The county of the state in which the signature took place. *(On SignatureInfo, SignatureCounty is used to specify the county where the signature took place when a string representation is needed.)*"
  },
  {
    "id": "af2170",
    "code": "signature_county_t_c",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "The county of the state in which the signature took place. *(On SignatureInfo, SignatureCountyTC is used to specify the county where the signature took place when a type code representation is needed.)*"
  },
  {
    "id": "af2171",
    "code": "signature_state",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "State where a signature takes place."
  },
  {
    "id": "af2172",
    "code": "signature_zip",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "ZIP where a signature takes place. This field contains the ZIP Code for the City and State where the signature ceremony took place."
  },
  {
    "id": "af2173",
    "code": "signature_country",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "Country where a signature takes place. This field contains the Country for the City, State and Zip where the signature ceremony took place."
  },
  {
    "id": "af2174",
    "code": "submission_type",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "Indicates how the item was submitted to the receiver. *(On SignatureInfo, SubmissionType defines how signature was obtained.)*"
  },
  {
    "id": "af2175",
    "code": "signature_purpose",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "Categorizes the type of signature. This provides a mechanism for defining various types of signatures for any type of attestation, declaration or other assertion which needs to be documented."
  },
  {
    "id": "af2176",
    "code": "signature_text",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "Actual signature text (printed or typed value)."
  },
  {
    "id": "af2177",
    "code": "signature_render_type",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "Used to specify if the SignatureCode should contain a Full Signature or just Initials."
  },
  {
    "id": "af2178",
    "code": "signature_o_k",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "TRUE indicates the signature on the form is present and has been verified."
  },
  {
    "id": "af2179",
    "code": "electronic_authentication_type",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "Describes the means used to authenticate an electronic submission component such as a signature."
  },
  {
    "id": "af2180",
    "code": "i_p_address",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "Internet Protocol Address *(On SignatureInfo, IPAddress captures \"where\" an E-Signature is given. It is used to communicate the IP Address of the machine used for an E-Signature.)*"
  },
  {
    "id": "af2181",
    "code": "signature_on_file_type",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "Type of an authorized signature on file."
  },
  {
    "id": "af2182",
    "code": "delegated_signer_role",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "Role of the delegated signer *(On SignatureInfo, DelegatedSignerRole is used to specify the role of the delegated signer, e.g. proxy or power of attorney. This property should only be used when a document is known to have been sign)*"
  },
  {
    "id": "af2183",
    "code": "attachment",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "This contains a collection of attachments. Each attachment could contain any of the attachment Types defined. In the Attachment object the three items AttachmentData, AttachmentReference, and Attachme *(On SignatureInfo, Attachment should not repeat. Only a single Attachment should be used to capture the image of the signature.)*"
  },
  {
    "id": "af2184",
    "code": "keyed_value",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "Generic object used to extend object hierarchy for proprietary data requirements. Each proprietary data item is represented using a KeyedValue object. A collection of KeyedValue objects is utilized to"
  },
  {
    "id": "af2185",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af2186",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "Record creation timestamp."
  },
  {
    "id": "af2187",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "Record last update timestamp."
  },
  {
    "id": "af2188",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "signature_info",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af2189",
    "code": "user_auth_request_id",
    "usedInTables": 1,
    "tables": "user_auth_request",
    "description": "Primary key for User Auth Request."
  },
  {
    "id": "af2190",
    "code": "policy_id",
    "usedInTables": 1,
    "tables": "user_auth_request",
    "description": "FK → policy.policy_id"
  },
  {
    "id": "af2191",
    "code": "party_id",
    "usedInTables": 1,
    "tables": "user_auth_request",
    "description": "FK → party.party_id"
  },
  {
    "id": "af2192",
    "code": "user_login_name",
    "usedInTables": 1,
    "tables": "user_auth_request",
    "description": "User Login Name, user-friendly name for the user. Some implementation may allow a user to change his or her UserLoginName. Conditional part of key either UserLoginName and UserPswd or UserSessionKey c"
  },
  {
    "id": "af2193",
    "code": "user_pswd",
    "usedInTables": 1,
    "tables": "user_auth_request",
    "description": "The UserPswd object is meant to hold user password information. The <CryptPswd> property is optional and if present always appears above the other data items. The <Pswd> and <CryptPswd> properties are"
  },
  {
    "id": "af2194",
    "code": "user_authentication",
    "usedInTables": 1,
    "tables": "user_auth_request",
    "description": "Security questions that will authenticate a user *(On UserAuthRequest, if used, UserPswd must not be included.)*"
  },
  {
    "id": "af2195",
    "code": "user_session_key",
    "usedInTables": 1,
    "tables": "user_auth_request",
    "description": "User Session Key"
  },
  {
    "id": "af2196",
    "code": "user_domain",
    "usedInTables": 1,
    "tables": "user_auth_request",
    "description": "Domain Name that the user can be validated in."
  },
  {
    "id": "af2197",
    "code": "user_date",
    "usedInTables": 1,
    "tables": "user_auth_request",
    "description": "Date the message was generated."
  },
  {
    "id": "af2198",
    "code": "user_time",
    "usedInTables": 1,
    "tables": "user_auth_request",
    "description": "User Time"
  },
  {
    "id": "af2199",
    "code": "vendor_app",
    "usedInTables": 1,
    "tables": "user_auth_request",
    "description": "This aggregate defines the vendor or source application details."
  },
  {
    "id": "af2200",
    "code": "proxy_vendor",
    "usedInTables": 1,
    "tables": "user_auth_request",
    "description": "Proxy Vendor *(On UserAuthRequest, ProxyVendor is used to track all entities/parties that have touched a message. The following will occur: When the message is first created, the message source will satisfy the appr)*"
  },
  {
    "id": "af2201",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "user_auth_request",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af2202",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "user_auth_request",
    "description": "Record creation timestamp."
  },
  {
    "id": "af2203",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "user_auth_request",
    "description": "Record last update timestamp."
  },
  {
    "id": "af2204",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "user_auth_request",
    "description": "Source admin/carrier system identifier."
  },
  {
    "id": "af2205",
    "code": "system_message_id",
    "usedInTables": 1,
    "tables": "system_message",
    "description": "Primary key for System Message."
  },
  {
    "id": "af2206",
    "code": "policy_id",
    "usedInTables": 1,
    "tables": "system_message",
    "description": "FK → policy.policy_id"
  },
  {
    "id": "af2207",
    "code": "party_id",
    "usedInTables": 1,
    "tables": "system_message",
    "description": "FK → party.party_id"
  },
  {
    "id": "af2208",
    "code": "system_message_key",
    "usedInTables": 1,
    "tables": "system_message",
    "description": "SystemMessage Key"
  },
  {
    "id": "af2209",
    "code": "system_message_sys_key",
    "usedInTables": 1,
    "tables": "system_message",
    "description": "SystemMessage System Key"
  },
  {
    "id": "af2210",
    "code": "message_code",
    "usedInTables": 1,
    "tables": "system_message",
    "description": "The Carrier assigned message code"
  },
  {
    "id": "af2211",
    "code": "carrier_admin_system",
    "usedInTables": 1,
    "tables": "system_message",
    "description": "The carrier assigned system identification where the information resides or originated."
  },
  {
    "id": "af2212",
    "code": "sequence",
    "usedInTables": 1,
    "tables": "system_message",
    "description": "This element is used for ordering and sorting purposes. Sequencing should start with \"1\". Nodes within the same object should not duplicate a Sequence that applies to any one application or policy unl"
  },
  {
    "id": "af2213",
    "code": "related_object_type",
    "usedInTables": 1,
    "tables": "system_message",
    "description": "Object type associated with the related object."
  },
  {
    "id": "af2214",
    "code": "message_description",
    "usedInTables": 1,
    "tables": "system_message",
    "description": "A carrier assigned description of the system message."
  },
  {
    "id": "af2215",
    "code": "message_severity_code",
    "usedInTables": 1,
    "tables": "system_message",
    "description": "The severity as determined by the carrier system."
  },
  {
    "id": "af2216",
    "code": "message_start_date",
    "usedInTables": 1,
    "tables": "system_message",
    "description": "The date when this message was added to the policy."
  },
  {
    "id": "af2217",
    "code": "message_end_date",
    "usedInTables": 1,
    "tables": "system_message",
    "description": "The date when this message is no longer applicable. It can also be the date when any further information regarding this will be sent in a request for system messages or is applicable to the contract."
  },
  {
    "id": "af2218",
    "code": "keyed_value",
    "usedInTables": 1,
    "tables": "system_message",
    "description": "Generic object used to extend object hierarchy for proprietary data requirements. Each proprietary data item is represented using a KeyedValue object. A collection of KeyedValue objects is utilized to"
  },
  {
    "id": "af2219",
    "code": "o_lif_e_extension",
    "usedInTables": 1,
    "tables": "system_message",
    "description": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "af2220",
    "code": "created_at",
    "usedInTables": 1,
    "tables": "system_message",
    "description": "Record creation timestamp."
  },
  {
    "id": "af2221",
    "code": "updated_at",
    "usedInTables": 1,
    "tables": "system_message",
    "description": "Record last update timestamp."
  },
  {
    "id": "af2222",
    "code": "source_system",
    "usedInTables": 1,
    "tables": "system_message",
    "description": "Source admin/carrier system identifier."
  }
];

export const ACORD_CODES: CodeValueEntry[] = [
  {
    "id": "ac1",
    "codeTable": "ACORD Table",
    "code": "TXLIFE",
    "name": "txlife",
    "description": "Transaction aggregate - 9 columns"
  },
  {
    "id": "ac2",
    "codeTable": "ACORD Table",
    "code": "TXLIFE_REQUEST",
    "name": "txlife_request",
    "description": "Transaction aggregate - 47 columns"
  },
  {
    "id": "ac3",
    "codeTable": "ACORD Table",
    "code": "TXLIFE_RESPONSE",
    "name": "txlife_response",
    "description": "Transaction aggregate - 44 columns"
  },
  {
    "id": "ac4",
    "codeTable": "ACORD Table",
    "code": "PARTY",
    "name": "party",
    "description": "Party aggregate - 69 columns"
  },
  {
    "id": "ac5",
    "codeTable": "ACORD Table",
    "code": "ADDRESS",
    "name": "address",
    "description": "Party aggregate - 47 columns"
  },
  {
    "id": "ac6",
    "codeTable": "ACORD Table",
    "code": "PHONE",
    "name": "phone",
    "description": "Party aggregate - 34 columns"
  },
  {
    "id": "ac7",
    "codeTable": "ACORD Table",
    "code": "EMAIL_ADDRESS",
    "name": "email_address",
    "description": "Party aggregate - 22 columns"
  },
  {
    "id": "ac8",
    "codeTable": "ACORD Table",
    "code": "POLICY",
    "name": "policy",
    "description": "Policy aggregate - 168 columns"
  },
  {
    "id": "ac9",
    "codeTable": "ACORD Table",
    "code": "LIFE",
    "name": "life",
    "description": "Policy aggregate - 165 columns"
  },
  {
    "id": "ac10",
    "codeTable": "ACORD Table",
    "code": "ANNUITY",
    "name": "annuity",
    "description": "Policy aggregate - 134 columns"
  },
  {
    "id": "ac11",
    "codeTable": "ACORD Table",
    "code": "COVERAGE",
    "name": "coverage",
    "description": "Coverage aggregate - 194 columns"
  },
  {
    "id": "ac12",
    "codeTable": "ACORD Table",
    "code": "COV_OPTION",
    "name": "cov_option",
    "description": "Coverage aggregate - 142 columns"
  },
  {
    "id": "ac13",
    "codeTable": "ACORD Table",
    "code": "LIFE_PARTICIPANT",
    "name": "life_participant",
    "description": "Participant aggregate - 107 columns"
  },
  {
    "id": "ac14",
    "codeTable": "ACORD Table",
    "code": "RELATION",
    "name": "relation",
    "description": "Participant aggregate - 57 columns"
  },
  {
    "id": "ac15",
    "codeTable": "ACORD Table",
    "code": "FINANCIAL_ACTIVITY",
    "name": "financial_activity",
    "description": "Financial aggregate - 91 columns"
  },
  {
    "id": "ac16",
    "codeTable": "ACORD Table",
    "code": "SUB_ACCOUNT",
    "name": "sub_account",
    "description": "Financial aggregate - 196 columns"
  },
  {
    "id": "ac17",
    "codeTable": "ACORD Table",
    "code": "PAYMENT",
    "name": "payment",
    "description": "Payment aggregate - 37 columns"
  },
  {
    "id": "ac18",
    "codeTable": "ACORD Table",
    "code": "MEDICAL_EXAM",
    "name": "medical_exam",
    "description": "Underwriting aggregate - 77 columns"
  },
  {
    "id": "ac19",
    "codeTable": "ACORD Table",
    "code": "PRODUCER",
    "name": "producer",
    "description": "Distribution aggregate - 23 columns"
  },
  {
    "id": "ac20",
    "codeTable": "ACORD Table",
    "code": "LOAN",
    "name": "loan",
    "description": "Policy aggregate - 67 columns"
  },
  {
    "id": "ac21",
    "codeTable": "ACORD Table",
    "code": "CLAIM",
    "name": "claim",
    "description": "Claim aggregate - 40 columns"
  },
  {
    "id": "ac22",
    "codeTable": "ACORD Table",
    "code": "REINSURANCE_INFO",
    "name": "reinsurance_info",
    "description": "Reinsurance aggregate - 119 columns"
  },
  {
    "id": "ac23",
    "codeTable": "ACORD Table",
    "code": "TRANSFER_INFO",
    "name": "transfer_info",
    "description": "Reinsurance aggregate - 9 columns"
  },
  {
    "id": "ac24",
    "codeTable": "ACORD Table",
    "code": "FORM_INSTANCE",
    "name": "form_instance",
    "description": "Document aggregate - 41 columns"
  },
  {
    "id": "ac25",
    "codeTable": "ACORD Table",
    "code": "ATTACHMENT",
    "name": "attachment",
    "description": "Document aggregate - 45 columns"
  },
  {
    "id": "ac26",
    "codeTable": "ACORD Table",
    "code": "HOLDING",
    "name": "holding",
    "description": "Holding aggregate - 54 columns"
  },
  {
    "id": "ac27",
    "codeTable": "ACORD Table",
    "code": "APPLICATION_INFO",
    "name": "application_info",
    "description": "Application aggregate - 120 columns"
  },
  {
    "id": "ac28",
    "codeTable": "ACORD Table",
    "code": "SIGNATURE_INFO",
    "name": "signature_info",
    "description": "Application aggregate - 30 columns"
  },
  {
    "id": "ac29",
    "codeTable": "ACORD Table",
    "code": "USER_AUTH_REQUEST",
    "name": "user_auth_request",
    "description": "Security aggregate - 16 columns"
  },
  {
    "id": "ac30",
    "codeTable": "ACORD Table",
    "code": "SYSTEM_MESSAGE",
    "name": "system_message",
    "description": "System aggregate - 18 columns"
  }
];

export const ACORD_TERMS: TermEntry[] = [
  {
    "id": "atm1",
    "index": 1,
    "term": "txlife_id",
    "relatedCode": "txlife_id",
    "definition": "Primary key for TXLife Transaction."
  },
  {
    "id": "atm2",
    "index": 2,
    "term": "user_auth_request",
    "relatedCode": "user_auth_request",
    "definition": "The UserAuthRequest object is used for security checking. This object can be used in a number of different configurations to provide the security checking. The UserDomain, UserDate, and UserTime prope"
  },
  {
    "id": "atm3",
    "index": 3,
    "term": "t_x_life_request",
    "relatedCode": "t_x_life_request",
    "definition": "This aggregate provides a container for a TXLife message request's details. Its complement is TXLifeResponse."
  },
  {
    "id": "atm4",
    "index": 4,
    "term": "user_auth_response",
    "relatedCode": "user_auth_response",
    "definition": "This aggregate provides details regarding the User (Sender) of a TXLife Msg."
  },
  {
    "id": "atm5",
    "index": 5,
    "term": "t_x_life_response",
    "relatedCode": "t_x_life_response",
    "definition": "This aggregate provides a container for a TXLife message response's details. Its complement is TXLifeRequest."
  },
  {
    "id": "atm6",
    "index": 6,
    "term": "o_lif_e_extension",
    "relatedCode": "o_lif_e_extension",
    "definition": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "atm7",
    "index": 7,
    "term": "created_at",
    "relatedCode": "created_at",
    "definition": "Record creation timestamp."
  },
  {
    "id": "atm8",
    "index": 8,
    "term": "updated_at",
    "relatedCode": "updated_at",
    "definition": "Record last update timestamp."
  },
  {
    "id": "atm9",
    "index": 9,
    "term": "source_system",
    "relatedCode": "source_system",
    "definition": "Source admin/carrier system identifier."
  },
  {
    "id": "atm10",
    "index": 10,
    "term": "txlife_request_id",
    "relatedCode": "txlife_request_id",
    "definition": "Primary key for TXLife Request."
  },
  {
    "id": "atm11",
    "index": 11,
    "term": "txlife_id",
    "relatedCode": "txlife_id",
    "definition": "FK → txlife.txlife_id"
  },
  {
    "id": "atm12",
    "index": 12,
    "term": "trans_ref_g_u_i_d",
    "relatedCode": "trans_ref_g_u_i_d",
    "definition": "Universally unique identifier. Created by sending/client application. This ID provides a correlation between the request and all associated responses. It is expected to be echoed back in any subsequen"
  },
  {
    "id": "atm13",
    "index": 13,
    "term": "trans_tracking_i_d",
    "relatedCode": "trans_tracking_i_d",
    "definition": "This element is valued by the provider for future reference to link responses together. For polling and retrieval purposes for pending responses - this element is used for handling pending responses i"
  },
  {
    "id": "atm14",
    "index": 14,
    "term": "trans_type",
    "relatedCode": "trans_type",
    "definition": "Transaction Type name with associated attribute type code (tc)"
  },
  {
    "id": "atm15",
    "index": 15,
    "term": "trans_sub_type",
    "relatedCode": "trans_sub_type",
    "definition": "Transaction Sub Types provide additional granularity for their parent transactions. This aids in directing transactions for processing as well as defining expected objects and properties that may be d"
  },
  {
    "id": "atm16",
    "index": 16,
    "term": "business_service",
    "relatedCode": "business_service",
    "definition": "Provides information about a specific service supporting a business process. A business process is made up of one or more business services. Each business service then maps one-to-one to a specific me"
  },
  {
    "id": "atm17",
    "index": 17,
    "term": "object_type_c_c",
    "relatedCode": "object_type_c_c",
    "definition": "This aggregate defines the available Object Types for selection on the parent object. *(Although this object does not meet all of the rules of a CC as described in the \"Expressing Choice Collections\" "
  },
  {
    "id": "atm18",
    "index": 18,
    "term": "trans_exe_date",
    "relatedCode": "trans_exe_date",
    "definition": "Transaction Execution Date *(On TXLifeRequest, TransExeDate represents the date the transaction was submitted.)*"
  },
  {
    "id": "atm19",
    "index": 19,
    "term": "trans_exe_time",
    "relatedCode": "trans_exe_time",
    "definition": "Transaction Execution Time"
  },
  {
    "id": "atm20",
    "index": 20,
    "term": "trans_eff_date",
    "relatedCode": "trans_eff_date",
    "definition": "Effective Date for the action that was or will be taken *(On a TXLifeRequest, this is the date that the requester would like to make the transaction effective.)*"
  },
  {
    "id": "atm21",
    "index": 21,
    "term": "trans_mode",
    "relatedCode": "trans_mode",
    "definition": "Indicates the mode used to process this transaction type. Applies to transactions that initiate a business process that takes time to complete, (e.g. NB submission)."
  },
  {
    "id": "atm22",
    "index": 22,
    "term": "inquiry_level",
    "relatedCode": "inquiry_level",
    "definition": "InquiryLevel indicates the level or amount of information either requested or returned (depending on context) in the associated message. InquiryLevel is only applicable for Inquiry and Search transact"
  },
  {
    "id": "atm23",
    "index": 23,
    "term": "inquiry_view",
    "relatedCode": "inquiry_view",
    "definition": "The aggregate contains information about the view that you are inquiring about. There is a key for predefined views and codes that can be filled in to determine a new view. This object contains inform"
  },
  {
    "id": "atm24",
    "index": 24,
    "term": "max_records",
    "relatedCode": "max_records",
    "definition": "Indicates the maximum number of records to return to a result set from a search. Use the MaxRecords property to limit the number of records the provider returns. The MaxRecords property is read/write"
  },
  {
    "id": "atm25",
    "index": 25,
    "term": "next_record",
    "relatedCode": "next_record",
    "definition": "Provides the value of the next record available for a subsequent query *(On TXLifeRequest, use StartRecord on TXLifeRequest to indicate the number of the first record to return in a search.)*"
  },
  {
    "id": "atm26",
    "index": 26,
    "term": "start_record",
    "relatedCode": "start_record",
    "definition": "Applies to searches. Indicates the number of the first record to return in a search. As the search progresses, the next record will usually be incremented by the MaxRecords to bump down through the se"
  },
  {
    "id": "atm27",
    "index": 27,
    "term": "start_date",
    "relatedCode": "start_date",
    "definition": "The start date is inclusive. The default is the beginning of time."
  },
  {
    "id": "atm28",
    "index": 28,
    "term": "start_time",
    "relatedCode": "start_time",
    "definition": "Start Time *(On TXLifeRequest, StartTime is used in conjunction with StartDate when a time parameter is needed.)*"
  },
  {
    "id": "atm29",
    "index": 29,
    "term": "end_date",
    "relatedCode": "end_date",
    "definition": "The last date for which the aggregate is available, effective or active. The end date is inclusive. For example, 2004-12-31 indicates that the aggregate is no longer available on or after January 1, 2"
  },
  {
    "id": "atm30",
    "index": 30,
    "term": "end_time",
    "relatedCode": "end_time",
    "definition": "End Time *(On TXLifeRequest, EndTime is used in conjunction with EndDate when a time parameter is needed.)*"
  },
  {
    "id": "atm31",
    "index": 31,
    "term": "pending_response_o_k",
    "relatedCode": "pending_response_o_k",
    "definition": "TRUE indicates that it is ok to send a pending Response. FALSE indicates that it is not acceptable to pend the transaction. If it cannot immediately be processed, a failure Response should be sent. If"
  },
  {
    "id": "atm32",
    "index": 32,
    "term": "no_response_o_k",
    "relatedCode": "no_response_o_k",
    "definition": "TRUE indicates that a response is not needed to the message. This is particularly useful for the Transmittal Request messages. Default is FALSE, and if it is used, you must provide a response. This is"
  },
  {
    "id": "atm33",
    "index": 33,
    "term": "test_indicator",
    "relatedCode": "test_indicator",
    "definition": "TRUE indicates this is a test file. A test file should not be processed against live data. It is used to identify transactions that are in a test mode."
  },
  {
    "id": "atm34",
    "index": 34,
    "term": "u_r_l_target_request_ind",
    "relatedCode": "u_r_l_target_request_ind",
    "definition": "True indicates notifying called system that the calling (client) application would like to get a URL that he could pass control to."
  },
  {
    "id": "atm35",
    "index": 35,
    "term": "supress_notifications_ind",
    "relatedCode": "supress_notifications_ind",
    "definition": "TRUE indicates that notifications attached to the response to a request are not desired. This is used to indicate that no other notifications regarding other messages can be returned in the response t"
  },
  {
    "id": "atm36",
    "index": 36,
    "term": "case_status_on_response_ind",
    "relatedCode": "case_status_on_response_ind",
    "definition": "TRUE indicates that case status information should be returned as part of the response to this request."
  },
  {
    "id": "atm37",
    "index": 37,
    "term": "benefits_inquiry_type",
    "relatedCode": "benefits_inquiry_type",
    "definition": "Identifies that the data being requested or returned is depicting in-network information, out-of-network information, or both."
  },
  {
    "id": "atm38",
    "index": 38,
    "term": "primary_object_type",
    "relatedCode": "primary_object_type",
    "definition": "Type of top-level object being referenced. In some cases such as XTbML, PrimaryObjectType may also reference a root element. *(On TXLifeRequest, PrimaryObjectType describes the object referenced by th"
  },
  {
    "id": "atm39",
    "index": 39,
    "term": "transaction_context",
    "relatedCode": "transaction_context",
    "definition": "Uniquely identifies a Search Context, Applies to searches. This identifier must be unique per session, since a session may have made multiple search requests. This identifier can expire at any time. *"
  },
  {
    "id": "atm40",
    "index": 40,
    "term": "correlation_g_u_i_d",
    "relatedCode": "correlation_g_u_i_d",
    "definition": "A globally unique ID which creates a correlation between two or more TXLife transaction which are part of the same business process. It is the responsibility of the creator of the first TXLife in the"
  },
  {
    "id": "atm41",
    "index": 41,
    "term": "correlation_g_u_i_d_state",
    "relatedCode": "correlation_g_u_i_d_state",
    "definition": "When a CorrelationGUID is specified this companion property indicates if the CorrelationGUID is the initial (first time) response, part of an ongoing response or the last of a series of responses. Thi"
  },
  {
    "id": "atm42",
    "index": 42,
    "term": "support_multiple_responses_ind",
    "relatedCode": "support_multiple_responses_ind",
    "definition": "TRUE indicates that entities participating in this message (sender /receiver) support multiple messages: a pending Response message along with a later subsequent Response message if the Request messag"
  },
  {
    "id": "atm43",
    "index": 43,
    "term": "criteria_expression",
    "relatedCode": "criteria_expression",
    "definition": "A collection of Logical Operators and Criteria to generate complex selections."
  },
  {
    "id": "atm44",
    "index": 44,
    "term": "illustration_request",
    "relatedCode": "illustration_request",
    "definition": "This is used to request an illustration, and includes all the necessary parameters used to guide processing. This transaction is used to request an illustration calculation engine to calculate and ret"
  },
  {
    "id": "atm45",
    "index": 45,
    "term": "m_i_b_request",
    "relatedCode": "m_i_b_request",
    "definition": "Used to request MIB information. The MIBRequest object contains a \"Start Group: XOR Required\" grouping containing the object <MIBServiceDescriptor> and the property <MIBServiceConfigurationID>. When u"
  },
  {
    "id": "atm46",
    "index": 46,
    "term": "reinsurance_request",
    "relatedCode": "reinsurance_request",
    "definition": "Used to request reinsurance information."
  },
  {
    "id": "atm47",
    "index": 47,
    "term": "change_sub_type",
    "relatedCode": "change_sub_type",
    "definition": "Used to indicate that a specific change is being reported-by or requested in the associated transaction. *(On TXLifeRequest, ChangeSubType is used as a wrapper-level indicator of specific changes taki"
  },
  {
    "id": "atm48",
    "index": 48,
    "term": "form_instance_request",
    "relatedCode": "form_instance_request",
    "definition": "Used to request a document. This aggregate contains information about the document that is being requested."
  },
  {
    "id": "atm49",
    "index": 49,
    "term": "distinguished_object",
    "relatedCode": "distinguished_object",
    "definition": "A principal object among an ensemble of objects that provides a starting point for navigation, especially when there can be multiple ensembles, each ensemble needing to identify a starting object for "
  },
  {
    "id": "atm50",
    "index": 50,
    "term": "processing_instruction",
    "relatedCode": "processing_instruction",
    "definition": "Contains the instructions for guiding processing. *(On TXLifeRequest, this object contains instructions for guiding the processing for this transaction. This may include automated as well as manual in"
  },
  {
    "id": "atm51",
    "index": 51,
    "term": "o_lif_e",
    "relatedCode": "o_lif_e",
    "definition": "OLifE is a \"Root\" element. This forms the basis of the business data for the ACORD Life and Annuity Standard. In OLifE, the SourceInfo object is an optional, singly occurring object and if it appears "
  },
  {
    "id": "atm52",
    "index": 52,
    "term": "x_tb_m_l",
    "relatedCode": "x_tb_m_l",
    "definition": "The aggregates for XTbML, which is used to define the Society of Actuaries (SOA) ACORD tabular standard."
  },
  {
    "id": "atm53",
    "index": 53,
    "term": "o_lif_e_extension",
    "relatedCode": "o_lif_e_extension",
    "definition": "Object used for extending the ACORD model. OLifE Extension uses the ANY construct to allow for any valid XML to be contained in the extension. See section 4.10 How to extend XML for Life Insurance for"
  },
  {
    "id": "atm54",
    "index": 54,
    "term": "created_at",
    "relatedCode": "created_at",
    "definition": "Record creation timestamp."
  },
  {
    "id": "atm55",
    "index": 55,
    "term": "updated_at",
    "relatedCode": "updated_at",
    "definition": "Record last update timestamp."
  },
  {
    "id": "atm56",
    "index": 56,
    "term": "source_system",
    "relatedCode": "source_system",
    "definition": "Source admin/carrier system identifier."
  },
  {
    "id": "atm57",
    "index": 57,
    "term": "txlife_response_id",
    "relatedCode": "txlife_response_id",
    "definition": "Primary key for TXLife Response."
  },
  {
    "id": "atm58",
    "index": 58,
    "term": "txlife_id",
    "relatedCode": "txlife_id",
    "definition": "FK → txlife.txlife_id"
  },
  {
    "id": "atm59",
    "index": 59,
    "term": "trans_ref_g_u_i_d",
    "relatedCode": "trans_ref_g_u_i_d",
    "definition": "Universally unique identifier. Created by sending/client application. This ID provides a correlation between the request and all associated responses. It is expected to be echoed back in any subsequen"
  },
  {
    "id": "atm60",
    "index": 60,
    "term": "trans_tracking_i_d",
    "relatedCode": "trans_tracking_i_d",
    "definition": "This element is valued by the provider for future reference to link responses together. For polling and retrieval purposes for pending responses - this element is used for handling pending responses i"
  }
];

export const ACORD_NAMING: NamingEntry[] = [
  {
    "id": "an1",
    "prefix": "TXLI*",
    "meaning": "ACORD Transaction table prefix",
    "example": "TXLIFE"
  },
  {
    "id": "an2",
    "prefix": "PART*",
    "meaning": "ACORD Party table prefix",
    "example": "PARTY"
  },
  {
    "id": "an3",
    "prefix": "ADDR*",
    "meaning": "ACORD Party table prefix",
    "example": "ADDRESS"
  },
  {
    "id": "an4",
    "prefix": "PHON*",
    "meaning": "ACORD Party table prefix",
    "example": "PHONE"
  },
  {
    "id": "an5",
    "prefix": "EMAI*",
    "meaning": "ACORD Party table prefix",
    "example": "EMAIL_ADDRESS"
  },
  {
    "id": "an6",
    "prefix": "POLI*",
    "meaning": "ACORD Policy table prefix",
    "example": "POLICY"
  },
  {
    "id": "an7",
    "prefix": "LIFE*",
    "meaning": "ACORD Policy table prefix",
    "example": "LIFE"
  },
  {
    "id": "an8",
    "prefix": "ANNU*",
    "meaning": "ACORD Policy table prefix",
    "example": "ANNUITY"
  },
  {
    "id": "an9",
    "prefix": "COVE*",
    "meaning": "ACORD Coverage table prefix",
    "example": "COVERAGE"
  },
  {
    "id": "an10",
    "prefix": "COV*",
    "meaning": "ACORD Coverage table prefix",
    "example": "COV_OPTION"
  },
  {
    "id": "an11",
    "prefix": "RELA*",
    "meaning": "ACORD Participant table prefix",
    "example": "RELATION"
  },
  {
    "id": "an12",
    "prefix": "FINA*",
    "meaning": "ACORD Financial table prefix",
    "example": "FINANCIAL_ACTIVITY"
  },
  {
    "id": "an13",
    "prefix": "SUB*",
    "meaning": "ACORD Financial table prefix",
    "example": "SUB_ACCOUNT"
  },
  {
    "id": "an14",
    "prefix": "PAYM*",
    "meaning": "ACORD Payment table prefix",
    "example": "PAYMENT"
  },
  {
    "id": "an15",
    "prefix": "MEDI*",
    "meaning": "ACORD Underwriting table prefix",
    "example": "MEDICAL_EXAM"
  },
  {
    "id": "an16",
    "prefix": "PROD*",
    "meaning": "ACORD Distribution table prefix",
    "example": "PRODUCER"
  },
  {
    "id": "an17",
    "prefix": "LOAN*",
    "meaning": "ACORD Policy table prefix",
    "example": "LOAN"
  },
  {
    "id": "an18",
    "prefix": "CLAI*",
    "meaning": "ACORD Claim table prefix",
    "example": "CLAIM"
  },
  {
    "id": "an19",
    "prefix": "REIN*",
    "meaning": "ACORD Reinsurance table prefix",
    "example": "REINSURANCE_INFO"
  },
  {
    "id": "an20",
    "prefix": "TRAN*",
    "meaning": "ACORD Reinsurance table prefix",
    "example": "TRANSFER_INFO"
  },
  {
    "id": "an21",
    "prefix": "FORM*",
    "meaning": "ACORD Document table prefix",
    "example": "FORM_INSTANCE"
  },
  {
    "id": "an22",
    "prefix": "ATTA*",
    "meaning": "ACORD Document table prefix",
    "example": "ATTACHMENT"
  },
  {
    "id": "an23",
    "prefix": "HOLD*",
    "meaning": "ACORD Holding table prefix",
    "example": "HOLDING"
  },
  {
    "id": "an24",
    "prefix": "APPL*",
    "meaning": "ACORD Application table prefix",
    "example": "APPLICATION_INFO"
  },
  {
    "id": "an25",
    "prefix": "SIGN*",
    "meaning": "ACORD Application table prefix",
    "example": "SIGNATURE_INFO"
  },
  {
    "id": "an26",
    "prefix": "USER*",
    "meaning": "ACORD Security table prefix",
    "example": "USER_AUTH_REQUEST"
  },
  {
    "id": "an27",
    "prefix": "SYST*",
    "meaning": "ACORD System table prefix",
    "example": "SYSTEM_MESSAGE"
  }
];

export const ACORD_DEPS: DependencyEntry[] = [
  {
    "id": "ad1",
    "level": 2,
    "description": "txlife depends on 1 child/related aggregate(s)"
  },
  {
    "id": "ad2",
    "level": 2,
    "description": "txlife_request depends on 2 child/related aggregate(s)"
  },
  {
    "id": "ad3",
    "level": 2,
    "description": "txlife_response depends on 2 child/related aggregate(s)"
  },
  {
    "id": "ad4",
    "level": 2,
    "description": "party depends on 2 child/related aggregate(s)"
  },
  {
    "id": "ad5",
    "level": 2,
    "description": "address depends on 1 child/related aggregate(s)"
  },
  {
    "id": "ad6",
    "level": 2,
    "description": "phone depends on 1 child/related aggregate(s)"
  },
  {
    "id": "ad7",
    "level": 2,
    "description": "email_address depends on 1 child/related aggregate(s)"
  },
  {
    "id": "ad8",
    "level": 2,
    "description": "policy depends on 2 child/related aggregate(s)"
  },
  {
    "id": "ad9",
    "level": 2,
    "description": "life depends on 3 child/related aggregate(s)"
  },
  {
    "id": "ad10",
    "level": 2,
    "description": "annuity depends on 3 child/related aggregate(s)"
  },
  {
    "id": "ad11",
    "level": 2,
    "description": "coverage depends on 2 child/related aggregate(s)"
  },
  {
    "id": "ad12",
    "level": 2,
    "description": "cov_option depends on 3 child/related aggregate(s)"
  },
  {
    "id": "ad13",
    "level": 2,
    "description": "life_participant depends on 3 child/related aggregate(s)"
  },
  {
    "id": "ad14",
    "level": 2,
    "description": "relation depends on 3 child/related aggregate(s)"
  },
  {
    "id": "ad15",
    "level": 2,
    "description": "financial_activity depends on 3 child/related aggregate(s)"
  },
  {
    "id": "ad16",
    "level": 2,
    "description": "sub_account depends on 3 child/related aggregate(s)"
  },
  {
    "id": "ad17",
    "level": 2,
    "description": "payment depends on 3 child/related aggregate(s)"
  },
  {
    "id": "ad18",
    "level": 2,
    "description": "medical_exam depends on 3 child/related aggregate(s)"
  },
  {
    "id": "ad19",
    "level": 2,
    "description": "producer depends on 3 child/related aggregate(s)"
  },
  {
    "id": "ad20",
    "level": 2,
    "description": "loan depends on 3 child/related aggregate(s)"
  },
  {
    "id": "ad21",
    "level": 2,
    "description": "claim depends on 2 child/related aggregate(s)"
  },
  {
    "id": "ad22",
    "level": 2,
    "description": "reinsurance_info depends on 3 child/related aggregate(s)"
  },
  {
    "id": "ad23",
    "level": 2,
    "description": "transfer_info depends on 3 child/related aggregate(s)"
  },
  {
    "id": "ad24",
    "level": 2,
    "description": "form_instance depends on 3 child/related aggregate(s)"
  },
  {
    "id": "ad25",
    "level": 2,
    "description": "attachment depends on 3 child/related aggregate(s)"
  },
  {
    "id": "ad26",
    "level": 2,
    "description": "holding depends on 3 child/related aggregate(s)"
  },
  {
    "id": "ad27",
    "level": 2,
    "description": "application_info depends on 3 child/related aggregate(s)"
  },
  {
    "id": "ad28",
    "level": 2,
    "description": "signature_info depends on 3 child/related aggregate(s)"
  },
  {
    "id": "ad29",
    "level": 2,
    "description": "user_auth_request depends on 3 child/related aggregate(s)"
  },
  {
    "id": "ad30",
    "level": 2,
    "description": "system_message depends on 3 child/related aggregate(s)"
  }
];

export const ACORD_OVERVIEW: OverviewEntry[] = [
  {
    "id": "ao1",
    "domain": "Transaction",
    "tableCount": 3,
    "coreEntities": "txlife, txlife_request, txlife_response",
    "description": "Transaction domain - 3 aggregate(s) defined in ACORD Life Standards."
  },
  {
    "id": "ao2",
    "domain": "Party",
    "tableCount": 4,
    "coreEntities": "party, address, phone, email_address",
    "description": "Party domain - 4 aggregate(s) defined in ACORD Life Standards."
  },
  {
    "id": "ao3",
    "domain": "Policy",
    "tableCount": 4,
    "coreEntities": "policy, life, annuity, loan",
    "description": "Policy domain - 4 aggregate(s) defined in ACORD Life Standards."
  },
  {
    "id": "ao4",
    "domain": "Coverage",
    "tableCount": 2,
    "coreEntities": "coverage, cov_option",
    "description": "Coverage domain - 2 aggregate(s) defined in ACORD Life Standards."
  },
  {
    "id": "ao5",
    "domain": "Participant",
    "tableCount": 2,
    "coreEntities": "life_participant, relation",
    "description": "Participant domain - 2 aggregate(s) defined in ACORD Life Standards."
  },
  {
    "id": "ao6",
    "domain": "Financial",
    "tableCount": 2,
    "coreEntities": "financial_activity, sub_account",
    "description": "Financial domain - 2 aggregate(s) defined in ACORD Life Standards."
  },
  {
    "id": "ao7",
    "domain": "Payment",
    "tableCount": 1,
    "coreEntities": "payment",
    "description": "Payment domain - 1 aggregate(s) defined in ACORD Life Standards."
  },
  {
    "id": "ao8",
    "domain": "Underwriting",
    "tableCount": 1,
    "coreEntities": "medical_exam",
    "description": "Underwriting domain - 1 aggregate(s) defined in ACORD Life Standards."
  },
  {
    "id": "ao9",
    "domain": "Distribution",
    "tableCount": 1,
    "coreEntities": "producer",
    "description": "Distribution domain - 1 aggregate(s) defined in ACORD Life Standards."
  },
  {
    "id": "ao10",
    "domain": "Claim",
    "tableCount": 1,
    "coreEntities": "claim",
    "description": "Claim domain - 1 aggregate(s) defined in ACORD Life Standards."
  },
  {
    "id": "ao11",
    "domain": "Reinsurance",
    "tableCount": 2,
    "coreEntities": "reinsurance_info, transfer_info",
    "description": "Reinsurance domain - 2 aggregate(s) defined in ACORD Life Standards."
  },
  {
    "id": "ao12",
    "domain": "Document",
    "tableCount": 2,
    "coreEntities": "form_instance, attachment",
    "description": "Document domain - 2 aggregate(s) defined in ACORD Life Standards."
  },
  {
    "id": "ao13",
    "domain": "Holding",
    "tableCount": 1,
    "coreEntities": "holding",
    "description": "Holding domain - 1 aggregate(s) defined in ACORD Life Standards."
  },
  {
    "id": "ao14",
    "domain": "Application",
    "tableCount": 2,
    "coreEntities": "application_info, signature_info",
    "description": "Application domain - 2 aggregate(s) defined in ACORD Life Standards."
  },
  {
    "id": "ao15",
    "domain": "Security",
    "tableCount": 1,
    "coreEntities": "user_auth_request",
    "description": "Security domain - 1 aggregate(s) defined in ACORD Life Standards."
  },
  {
    "id": "ao16",
    "domain": "System",
    "tableCount": 1,
    "coreEntities": "system_message",
    "description": "System domain - 1 aggregate(s) defined in ACORD Life Standards."
  }
];

export const ACORD_BUNDLE: StandardBundle = {
  standard: {
    id: 'acord',
    abbreviation: 'ACORD',
    name: 'ACORD Life Standards',
    description: 'ACORD Life & Annuity Data Model - 30 aggregates covering policy, party, claim, reinsurance, and financial activity for life/annuity transactions.',
    version: '2.49.00',
    status: 'active',
    sourceUrl: 'https://www.acord.org/standards/life-standards',
    tags: ['insurance', 'life', 'annuity', 'ACORD', 'data model']
  },
  entries: {
    tables: ACORD_TABLES,
    fields: ACORD_FIELDS,
    codes: ACORD_CODES,
    terms: ACORD_TERMS,
    naming: ACORD_NAMING,
    dependencies: ACORD_DEPS,
    overview: ACORD_OVERVIEW
  }
};
