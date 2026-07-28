// Topic catalog models — mirror watchmen-model admin/topic.py + factor.py.
// Source: packages/watchmen-model/.../admin/{topic,factor}.py
// Endpoints: /topic, /topic/name, /topic/list/name, /topic/all, /topic/ids, /topic/name/yaml (design doc §4.4)

/** `TopicKind` enum. */
export enum TopicKind {
  SYSTEM = 'system',
  BUSINESS = 'business',
  SYNONYM = 'synonym',
}

/** `TopicType` enum. */
export enum TopicType {
  RAW = 'raw',
  META = 'meta',
  DISTINCT = 'distinct',
  AGGREGATE = 'aggregate',
  TIME = 'time',
  RATIO = 'ratio',
}

/** `FactorEncryptMethod` enum (subset). */
export enum FactorEncryptMethod {
  NONE = 'none',
  AES256_PKCS5_PADDING = 'aes256-pkcs5-padding',
  MD5 = 'md5',
  SHA256 = 'sha256',
  MASK = 'mask',
}

/** `FactorType` — large enum; modeled as a string union with common values. */
export type FactorType =
  | 'SEQUENCE' | 'NUMBER' | 'UNSIGNED' | 'TEXT' | 'BOOLEAN' | 'ENUM'
  | 'DATETIME' | 'DATE' | 'TIME' | 'YEAR' | 'QUARTER' | 'MONTH' | 'HOUR'
  | 'OBJECT' | 'ARRAY'
  | 'CONTINENT' | 'COUNTRY' | 'PROVINCE' | 'CITY' | 'DISTRICT' | 'RESIDENTIAL_AREA'
  | 'EMAIL' | 'PHONE' | 'MOBILE' | 'GENDER' | 'OCCUPATION' | 'AGE' | 'ID_NO'
  | (string & {}); // allow arbitrary backend values

export interface Factor {
  factorId?: string;
  type?: FactorType;
  name?: string;
  enumId?: string;
  label?: string;
  description?: string;
  defaultValue?: any;
  flatten?: boolean;
  indexGroup?: string;
  encrypt?: FactorEncryptMethod;
  precision?: number;
}

export interface Topic {
  topicId?: string;
  name?: string;
  type?: TopicType;
  kind?: TopicKind;
  dataSourceId?: string;
  factors?: Factor[];
  description?: string;
  tenantId?: string;
  version?: number;
  lastModifiedAt?: string;
  lastModifiedBy?: string;
  createdAt?: string;
  createdBy?: string;
}

/** Paginated topic search response (QueryTopicDataPage). */
export interface QueryTopicDataPage {
  data: Topic[];
  itemCount?: number;
  pageCount?: number;
  pageNumber?: number;
  pageSize?: number;
}
