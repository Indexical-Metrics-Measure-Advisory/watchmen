import { FactorType } from "../../tuples/factor-types";
import { QueryTopic } from "../../tuples/query-topic-types";
import { Topic, TopicKind, TopicLayer, TopicType } from "../../tuples/topic-types";
import { getCurrentTime } from "../../utils";
import { MOCK_ENUM_CITY_ID, MOCK_ENUM_GENDER_ID } from "./mock-enum";

export const Quotation: Topic = {
	topicId: "1",
	name: "Quotation",
	kind: TopicKind.BUSINESS,
	type: TopicType.DISTINCT,
	layer: TopicLayer.DOMAIN,
	factors: [
		{ factorId: "101", name: "quotationId", label: "Quotation Sequence", type: FactorType.SEQUENCE },
		{ factorId: "102", name: "quoteNo", label: "Quotation No.", type: FactorType.TEXT },
		{ factorId: "103", name: "quoteDate", label: "Quotation Create Date", type: FactorType.DATETIME },
		{ factorId: "104", name: "orderHolderId", label: "Order Holder Id", type: FactorType.SEQUENCE },
		{ factorId: "105", name: "premium", label: "Premium", type: FactorType.NUMBER },
		{ factorId: "106", name: "issued", label: "Issued", type: FactorType.BOOLEAN },
	],
	version: 1,
	createdAt: getCurrentTime(),
	lastModifiedAt: getCurrentTime(),
};
export const Order: Topic = {
	topicId: "2",
	name: "Order",
	kind: TopicKind.BUSINESS,
	type: TopicType.DISTINCT,
	layer: TopicLayer.DOMAIN,
	factors: [
		{ factorId: "201", name: "orderId", label: "Order Sequence", type: FactorType.SEQUENCE },
		{ factorId: "202", name: "quotationNo", label: "Quotation No.", type: FactorType.TEXT, indexGroup: "u-1" },
		{
			factorId: "203",
			name: "quoteDate",
			label: "Quotation Create Date",
			type: FactorType.DATETIME,
			indexGroup: "i-1",
		},
		{ factorId: "204", name: "orderNo", label: "Order No.", type: FactorType.TEXT },
		{ factorId: "205", name: "issueDate", label: "Order Issue Date", type: FactorType.DATETIME },
		{ factorId: "206", name: "orderHolderId", label: "Order Holder Id", type: FactorType.SEQUENCE },
		{ factorId: "207", name: "premium", label: "Premium", type: FactorType.NUMBER },
		{ factorId: "208", name: "ensureProvince", label: "Ensure Province", type: FactorType.PROVINCE },
		{ factorId: "209", name: "ensureCity", label: "Ensure City", type: FactorType.ENUM, enumId: MOCK_ENUM_CITY_ID },
	],
	version: 1,
	createdAt: getCurrentTime(),
	lastModifiedAt: getCurrentTime(),
};
export const Participant: Topic = {
	topicId: "3",
	name: "Participant",
	kind: TopicKind.BUSINESS,
	type: TopicType.DISTINCT,
	layer: TopicLayer.DOMAIN,
	description: "Participant of quotation or order, including order holder, insureds, etc.",
	factors: [
		{ factorId: "301", name: "participantId", label: "Participant Sequence", type: FactorType.SEQUENCE },
		{ factorId: "302", name: "firstName", label: "First Name", type: FactorType.TEXT },
		{ factorId: "303", name: "lastName", label: "Last Name", type: FactorType.TEXT },
		{ factorId: "304", name: "fullName", label: "Full Name", type: FactorType.TEXT },
		{ factorId: "305", name: "dateOfBirth", label: "Birth Date", type: FactorType.DATETIME },
		{ factorId: "306", name: "gender", label: "Gender", type: FactorType.ENUM, enumId: MOCK_ENUM_GENDER_ID },
		{ factorId: "307", name: "city", label: "City", type: FactorType.ENUM, enumId: MOCK_ENUM_CITY_ID },
	],
	version: 1,
	createdAt: getCurrentTime(),
	lastModifiedAt: getCurrentTime(),
};
export const RawQuotation: Topic = {
	topicId: "4",
	name: "Raw Quotation",
	kind: TopicKind.BUSINESS,
	type: TopicType.RAW,
	layer: TopicLayer.Raw,
	factors: [
		{ factorId: "401", name: "quotationId", label: "Quotation Sequence", type: FactorType.SEQUENCE },
		{ factorId: "402", name: "quotationNo", label: "Quotation No.", type: FactorType.TEXT },
		{ factorId: "403", name: "quoteDate", label: "Quotation Create Date", type: FactorType.DATETIME },
		{ factorId: "404", name: "orderNo", label: "Order No.", type: FactorType.TEXT },
		{ factorId: "405", name: "issueDate", label: "Issue Date", type: FactorType.DATETIME },
		{ factorId: "406", name: "holder", label: "Holder", type: FactorType.OBJECT },
		{ factorId: "407", name: "holder.holderId", label: "Holder Id", type: FactorType.SEQUENCE },
		{ factorId: "408", name: "holder.firstName", label: "Holder First Name", type: FactorType.TEXT },
		{ factorId: "409", name: "holder.lastName", label: "Holder Last Name", type: FactorType.TEXT },
		{
			factorId: "410",
			name: "holder.dateOfBirth",
			label: "Order Holder Birth Date",
			type: FactorType.DATE_OF_BIRTH,
		},
		{ factorId: "411", name: "holder.gender", label: "Holder Gender", type: FactorType.GENDER },
		{ factorId: "412", name: "holder.city", label: "Holder City", type: FactorType.CITY },
		{ factorId: "413", name: "premium", label: "Premium", type: FactorType.NUMBER },
	],
	version: 1,
	createdAt: getCurrentTime(),
	lastModifiedAt: getCurrentTime(),
};
export const WeeklyOrderPremium: Topic = {
	topicId: "5",
	name: "Weekly Order Premium",
	kind: TopicKind.BUSINESS,
	type: TopicType.TIME,
	layer: TopicLayer.MART,
	factors: [
		{ factorId: "501", name: "year", label: "Year", type: FactorType.YEAR },
		{ factorId: "502", name: "week", label: "Week", type: FactorType.WEEK_OF_YEAR },
		{ factorId: "503", name: "premium", label: "Premium Sum", type: FactorType.NUMBER },
	],
	version: 1,
	createdAt: getCurrentTime(),
	lastModifiedAt: getCurrentTime(),
};
export const MonthlyOrderPremium: Topic = {
	topicId: "6",
	name: "Monthly Order Premium",
	kind: TopicKind.BUSINESS,
	type: TopicType.TIME,
	layer: TopicLayer.MART,
	factors: [
		{ factorId: "601", name: "year", label: "Year", type: FactorType.YEAR },
		{ factorId: "602", name: "month", label: "Month", type: FactorType.MONTH },
		{ factorId: "603", name: "premium", label: "Premium Sum", type: FactorType.NUMBER },
		{ factorId: "604", name: "city", label: "City", type: FactorType.ENUM, enumId: MOCK_ENUM_CITY_ID },
		{ factorId: "605", name: "floor", label: "Floor", type: FactorType.FLOOR },
	],
	version: 1,
	createdAt: getCurrentTime(),
	lastModifiedAt: getCurrentTime(),
};
export const RawEndorsement: Topic = {
	topicId: "7",
	name: "Raw Endorsement",
	kind: TopicKind.BUSINESS,
	type: TopicType.RAW,
	layer: TopicLayer.Raw,
	factors: [
		{ factorId: "701", name: "endorsementId", label: "Endorsement Sequence", type: FactorType.SEQUENCE },
		{ factorId: "702", name: "endorsementNo", label: "Endorsement No.", type: FactorType.TEXT },
		{ factorId: "703", name: "endorsementDate", label: "Endorsement Create Date", type: FactorType.DATETIME },
		{ factorId: "704", name: "orderNo", label: "Order No.", type: FactorType.TEXT },
		{ factorId: "705", name: "effectiveDate", label: "Effective Date", type: FactorType.DATETIME },
		{ factorId: "706", name: "premium", label: "Premium", type: FactorType.NUMBER },
	],
	version: 1,
	createdAt: getCurrentTime(),
	lastModifiedAt: getCurrentTime(),
};
export const WeeklyOrderPremiumIncrement: Topic = {
	topicId: "8",
	name: "Weekly Order Premium Increment",
	kind: TopicKind.BUSINESS,
	type: TopicType.RATIO,
	layer: TopicLayer.MART,
	factors: [
		{ factorId: "801", name: "year", label: "Year", type: FactorType.YEAR },
		{ factorId: "802", name: "week", label: "Week", type: FactorType.WEEK_OF_YEAR },
		{ factorId: "803", name: "incrementRatio", label: "Increment Ratio", type: FactorType.NUMBER },
	],
	version: 1,
	createdAt: getCurrentTime(),
	lastModifiedAt: getCurrentTime(),
};
export const Products: Topic = {
	topicId: "9",
	name: "Products",
	kind: TopicKind.SYNONYM,
	type: TopicType.DISTINCT,
	layer: TopicLayer.DOMAIN,
	factors: [
		{ factorId: "901", name: "code", label: "Product Code", type: FactorType.TEXT },
		{ factorId: "902", name: "name", label: "Product Name", type: FactorType.TEXT },
	],
	version: 1,
	createdAt: getCurrentTime(),
	lastModifiedAt: getCurrentTime(),
};
export const DemoTopics: Array<Topic> = [
	Quotation,
	Order,
	Participant,
	RawQuotation,
	WeeklyOrderPremium,
	MonthlyOrderPremium,
	RawEndorsement,
	WeeklyOrderPremiumIncrement,
	Products,
].map((t) => ({ ...t, tenantId: "1" }));
const asQueryTopic = (topic: Topic): QueryTopic => {
	const { topicId, name, type, kind, description, createdAt, lastModifiedAt } = topic;
	return { topicId, name, type, kind, description, createdAt, lastModifiedAt } as QueryTopic;
};
export const DemoQueryTopics: Array<QueryTopic> = [
	asQueryTopic(Quotation),
	asQueryTopic(Order),
	asQueryTopic(Participant),
	asQueryTopic(RawQuotation),
	asQueryTopic(WeeklyOrderPremium),
	asQueryTopic(MonthlyOrderPremium),
	asQueryTopic(RawEndorsement),
	asQueryTopic(WeeklyOrderPremiumIncrement),
	asQueryTopic(Products),
];


