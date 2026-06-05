import React, { useState, useMemo } from 'react';
import {
  Search, Plus, Pencil, Trash2, BookOpen, ExternalLink,
  Database, Tag, Code2, Library, Network, FileText, ChevronRight
} from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// ----- Types -----
type SectionId = 'tables' | 'fields' | 'codes' | 'terms' | 'naming' | 'dependencies' | 'overview';

interface Standard {
  id: string;
  abbreviation: string;
  name: string;
  description: string;
  version: string;
  status: 'active' | 'deprecated' | 'draft';
  sourceUrl: string;
  tags: string[];
}

interface TableEntry {
  id: string;
  domain: string;
  name: string;
  abbreviation: string;
  fieldCount: number;
}

interface FieldCodeEntry {
  id: string;
  code: string;
  usedInTables: number;
  tables: string;
  description: string;
}

interface CodeValueEntry {
  id: string;
  code: string;
  name: string;
  description: string;
  codeTable: string;
}

interface TermEntry {
  id: string;
  index: number;
  term: string;
  relatedCode: string;
  definition: string;
}

interface NamingEntry {
  id: string;
  prefix: string;
  meaning: string;
  example: string;
}

interface DependencyEntry {
  id: string;
  level: number;
  description: string;
}

interface OverviewEntry {
  id: string;
  domain: string;
  tableCount: number;
  coreEntities: string;
  description: string;
}

type EntryMap = {
  tables: TableEntry[];
  fields: FieldCodeEntry[];
  codes: CodeValueEntry[];
  terms: TermEntry[];
  naming: NamingEntry[];
  dependencies: DependencyEntry[];
  overview: OverviewEntry[];
};

interface StandardBundle {
  standard: Standard;
  entries: EntryMap;
}

// ----- Section metadata -----
const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'overview',     label: 'Overview',     icon: <Library size={14} />,   description: 'High-level summary of business domains' },
  { id: 'tables',       label: 'Data Tables',  icon: <Database size={14} />,  description: 'Tables defined in the standard, grouped by domain' },
  { id: 'fields',       label: 'Field Codes',  icon: <Tag size={14} />,       description: 'Cross-table field codes and their meanings' },
  { id: 'codes',        label: 'Code Values',  icon: <Code2 size={14} />,     description: 'Enumerated values for business code fields' },
  { id: 'terms',        label: 'Terms',        icon: <BookOpen size={14} />,  description: 'Core business term definitions' },
  { id: 'naming',       label: 'Naming',       icon: <FileText size={14} />,  description: 'Naming conventions for fields and tables' },
  { id: 'dependencies', label: 'Dependencies', icon: <Network size={14} />,   description: 'Load order and inter-table dependencies' },
];

// ----- EAST seed data (extracted from EAST_business_glossary.md) -----
const EAST_TABLES: TableEntry[] = [
  // A.1 公共信息
  { id: 't1',  domain: '公共信息', name: '机构股权信息表',     abbreviation: 'JGGQXXB',  fieldCount: 18 },
  { id: 't2',  domain: '公共信息', name: '分支机构信息表',     abbreviation: 'FZJGXXB',  fieldCount: 20 },
  { id: 't3',  domain: '公共信息', name: '中介机构信息表',     abbreviation: 'ZJJGXXB',  fieldCount: 21 },
  { id: 't4',  domain: '公共信息', name: '员工信息表',         abbreviation: 'YGXXB',    fieldCount: 20 },
  { id: 't5',  domain: '公共信息', name: '董监高履职信息表',   abbreviation: 'DJGLZXXB', fieldCount: 15 },
  { id: 't6',  domain: '公共信息', name: '销售人员信息表',     abbreviation: 'XSRYXXB',  fieldCount: 22 },
  // A.2 财务信息
  { id: 't7',  domain: '财务信息', name: '总账会计全科目表',   abbreviation: 'ZZKJQKMB', fieldCount: 19 },
  { id: 't8',  domain: '财务信息', name: '内部科目对照表',     abbreviation: 'NBKMDZB',  fieldCount: 9 },
  { id: 't9',  domain: '财务信息', name: '财务凭证信息表',     abbreviation: 'CWPZXXB',  fieldCount: 27 },
  { id: 't10', domain: '财务信息', name: '业务及管理费分科目明细账表', abbreviation: 'YWJGLFFKMMXZB', fieldCount: 19 },
  { id: 't11', domain: '财务信息', name: '手续费及佣金分科目明细账表', abbreviation: 'SXFJYJFKMMXZB', fieldCount: 19 },
  { id: 't12', domain: '财务信息', name: '银行账户信息表',     abbreviation: 'YHZHXXB',  fieldCount: 12 },
  // A.3 客户信息
  { id: 't13', domain: '客户信息', name: '个人客户信息表',     abbreviation: 'GRKHXXB',  fieldCount: 23 },
  { id: 't14', domain: '客户信息', name: '团体客户信息表',     abbreviation: 'TTKHXXB',  fieldCount: 26 },
  { id: 't15', domain: '客户信息', name: '客户保单对照表',     abbreviation: 'KHBDDZB',  fieldCount: 10 },
  // A.4 产品与保单
  { id: 't16', domain: '产品与保单', name: '保单投诉信息表',   abbreviation: 'BDTSXXB',  fieldCount: 14 },
  { id: 't17', domain: '产品与保单', name: '险种定义表',       abbreviation: 'XZDYB',    fieldCount: 28 },
  { id: 't18', domain: '产品与保单', name: '个人保单表',       abbreviation: 'GRBDB',    fieldCount: 42 },
  { id: 't19', domain: '产品与保单', name: '个人险种表',       abbreviation: 'GRXZB',    fieldCount: 31 },
  { id: 't20', domain: '产品与保单', name: '被保险人表',       abbreviation: 'BBXRB',    fieldCount: 15 },
  { id: 't21', domain: '产品与保单', name: '团体保单表',       abbreviation: 'TTBDB',    fieldCount: 42 },
  { id: 't22', domain: '产品与保单', name: '团体险种表',       abbreviation: 'TTXZB',    fieldCount: 28 },
  // A.5 销售与渠道
  { id: 't23', domain: '销售与渠道', name: '保单佣金信息表',   abbreviation: 'BDYJXXB',  fieldCount: 19 },
  { id: 't24', domain: '销售与渠道', name: '客户回访表',       abbreviation: 'KHHFB',    fieldCount: 20 },
  { id: 't25', domain: '销售与渠道', name: '保单销售人员关联表', abbreviation: 'BDXSRYGLB', fieldCount: 12 },
  // A.6 保费与支付
  { id: 't26', domain: '保费与支付', name: '保费明细表',       abbreviation: 'BFMXB',    fieldCount: 18 },
  { id: 't27', domain: '保费与支付', name: '付费明细表',       abbreviation: 'FFMXB',    fieldCount: 20 },
  { id: 't28', domain: '保费与支付', name: '团体保费表',       abbreviation: 'TTBFB',    fieldCount: 16 },
  // A.7 再保险
  { id: 't29', domain: '再保险', name: '再保产品信息表',         abbreviation: 'ZBCPXXB',  fieldCount: 21 },
  { id: 't30', domain: '再保险', name: '再保合同信息表',         abbreviation: 'ZBHTXXB',  fieldCount: 16 },
  { id: 't31', domain: '再保险', name: '再保账单信息表',         abbreviation: 'ZBZDXXB',  fieldCount: 24 },
  // A.8 理赔
  { id: 't32', domain: '理赔', name: '出险人信息表',             abbreviation: 'CXRXXB',   fieldCount: 15 },
  { id: 't33', domain: '理赔', name: '理赔保单明细表',           abbreviation: 'LPBDMXB',  fieldCount: 23 },
  // A.9 年金
  { id: 't34', domain: '年金', name: '年金计划信息表',           abbreviation: 'NJJHXXB',  fieldCount: 47 },
  { id: 't35', domain: '年金', name: '年金计划管理情况表',       abbreviation: 'NJJHGLQKB', fieldCount: 19 },
  { id: 't36', domain: '年金', name: '年金计划运营明细表',       abbreviation: 'NJJHYYMXB', fieldCount: 23 },
  { id: 't37', domain: '年金', name: '年金投资情况表',           abbreviation: 'NJTZQKB',  fieldCount: 20 },
  // A.10 养老保障
  { id: 't38', domain: '养老保障', name: '养老保障业务信息表',     abbreviation: 'YLBZYWXXB', fieldCount: 26 },
  { id: 't39', domain: '养老保障', name: '养老保障产品信息情况表', abbreviation: 'YLBZCPXXQKB', fieldCount: 21 },
  // A.11 投资
  { id: 't40', domain: '投资', name: '自主投资账户信息汇总表',   abbreviation: 'ZZTZZHXXHZB', fieldCount: 16 },
  { id: 't41', domain: '投资', name: '自主投资账户持仓明细表',   abbreviation: 'ZZTZZHCCMXB', fieldCount: 18 },
  { id: 't42', domain: '投资', name: '自主投资交易流水表',       abbreviation: 'ZZTZJYLSB', fieldCount: 22 },
  { id: 't43', domain: '投资', name: '委托投资情况表',           abbreviation: 'WTTZQKB',  fieldCount: 29 },
  // A.12 关联交易
  { id: 't44', domain: '关联交易', name: '关联方信息表',         abbreviation: 'GLFXXB',   fieldCount: 14 },
  { id: 't45', domain: '关联交易', name: '重大关联交易表',       abbreviation: 'ZDGLJYB',  fieldCount: 10 },
  { id: 't46', domain: '关联交易', name: '关联交易汇总表',       abbreviation: 'GLJYHZB',  fieldCount: 9 },
];

const EAST_FIELDS: FieldCodeEntry[] = [
  { id: 'f1',  code: 'BXJGDM', usedInTables: 46, tables: 'JGGQXXB, FZJGXXB, ZJJGXXB, YGXXB 等', description: '管理养老保障产品管理的保险机构代码。' },
  { id: 'f2',  code: 'BXJGMC', usedInTables: 46, tables: 'JGGQXXB, FZJGXXB, ZJJGXXB, YGXXB 等', description: '保险行业保险公司总保险机构名称。' },
  { id: 'f3',  code: 'LSH',    usedInTables: 46, tables: 'JGGQXXB, FZJGXXB, ZJJGXXB, YGXXB 等', description: '保险机构代码+日期（YYYYMMDD）+10位流水。' },
  { id: 'f4',  code: 'HBDM',   usedInTables: 14, tables: 'ZZKJQKMB, CWPZXXB, YWJGLFFKMMXZB 等', description: '持有资产的币种代码，默认为人民币。' },
  { id: 'f5',  code: 'TTBDH',  usedInTables: 13, tables: 'KHBDDZB, BDTSXXB, GRBDB, GRXZB 等', description: '团体保单合同号，个人保单及未记录保单号的统一报送 000000。' },
  { id: 'f6',  code: 'GRBDH',  usedInTables: 11, tables: 'KHBDDZB, BDTSXXB, GRBDB, GRXZB 等', description: '个人保单合同号，团体保单分单号。' },
  { id: 'f7',  code: 'BDTGXZ', usedInTables: 10, tables: 'KHBDDZB, XZDYB, GRBDB, GRXZB 等', description: '按个人、集体等特征划分的保单分类。01-个人，02-团体，99-其他。' },
  { id: 'f8',  code: 'GLJGDM', usedInTables: 10, tables: 'FZJGXXB, GRBDB, GRXZB, BBXRB 等', description: '负责向所属监管辖区银保监局报送数据的机构代码。' },
  { id: 'f9',  code: 'GLJGMC', usedInTables: 10, tables: 'FZJGXXB, GRBDB, GRXZB, BBXRB 等', description: '负责向所属监管辖区银保监局报送数据的机构名称。' },
  { id: 'f10', code: 'CPBM',   usedInTables: 9,  tables: 'XZDYB, GRXZB, TTXZB, BDYJXXB 等', description: '保险公司内部使用的保险产品缩写标识。' },
  { id: 'f11', code: 'FZJGDM', usedInTables: 6,  tables: 'FZJGXXB, ZZKJQKMB, CWPZXXB 等', description: '公司给自身分支机构的编码。' },
  { id: 'f12', code: 'JZRQ',   usedInTables: 6,  tables: 'CWPZXXB, YWJGLFFKMMXZB, SXFJYJFKMMXZB 等', description: '下次应交保费日期。' },
  { id: 'f13', code: 'KHBH',   usedInTables: 6,  tables: 'GRKHXXB, TTKHXXB, KHBDDZB, GLFXXB 等', description: '若为保险公司本身，则填写保险机构代码；若为自然人，则填写系统内唯一识别编号。' },
  { id: 'f14', code: 'TJRQ',   usedInTables: 6,  tables: 'NJJHGLQKB, NJJHYYMXB, NJTZQKB 等', description: '进行数据统计的当日。' },
  { id: 'f15', code: 'WTRZJLX',usedInTables: 6,  tables: 'NJJHXXB, NJJHGLQKB, NJJHYYMXB, NJTZQKB', description: '1-统一社会信用代码，2-组织机构代码证，3-税务登记证，4-营业执照，5-事业单位法人证书，6-社会团体法人证书，7-民办非企业单位登记证书，8-基金会法人。' },
];

const EAST_CODES: CodeValueEntry[] = [
  { id: 'c1',  code: '100',  name: '活期',     description: '基本户',         codeTable: '账户类型' },
  { id: 'c2',  code: '1001', name: '基本户',   description: '',                 codeTable: '账户类型' },
  { id: 'c3',  code: '1002', name: '一般户',   description: '',                 codeTable: '账户类型' },
  { id: 'c4',  code: '200',  name: '定期',     description: '',                 codeTable: '账户类型' },
  { id: 'c5',  code: '9',    name: '其他',     description: '',                 codeTable: '账户类型' },
  { id: 'c6',  code: '156',  name: '人民币元', description: 'CNY',              codeTable: '货币代码' },
  { id: 'c7',  code: '036',  name: '澳大利亚元', description: 'AUD',            codeTable: '货币代码' },
  { id: 'c8',  code: '840',  name: '美元',     description: 'USD',              codeTable: '货币代码' },
  { id: 'c9',  code: '978',  name: '欧元',     description: 'EUR',              codeTable: '货币代码' },
  { id: 'c10', code: '392',  name: '日元',     description: 'JPY',              codeTable: '货币代码' },
  { id: 'c11', code: '826',  name: '英镑',     description: 'GBP',              codeTable: '货币代码' },
  { id: 'c12', code: '110000', name: '北京',   description: '北京监管局',       codeTable: '监管辖区' },
  { id: 'c13', code: '310000', name: '上海',   description: '上海监管局',       codeTable: '监管辖区' },
  { id: 'c14', code: '440000', name: '广东',   description: '广东监管局',       codeTable: '监管辖区' },
  { id: 'c15', code: '440300', name: '深圳',   description: '深圳监管局',       codeTable: '监管辖区' },
  { id: 'c16', code: '01',   name: '学生平安险', description: '被保险人为未成年人的学平险业务', codeTable: '特殊业务' },
  { id: 'c17', code: '02',   name: '航空意外险及替代产品', description: '单航次航意险及 7 天以内交通工具意外险', codeTable: '特殊业务' },
  { id: 'c18', code: '09',   name: '建筑工人意外伤害险',   description: '简称"建工险"', codeTable: '特殊业务' },
  { id: 'c19', code: '11',   name: '普通意外险', description: '对被保险人、时间、地点不做限制的意外险', codeTable: '特殊业务' },
  { id: 'c20', code: '22',   name: '高端医疗',   description: '针对高端人群的医疗费用保险', codeTable: '特殊业务' },
];

const EAST_TERMS: TermEntry[] = [
  { id: 'tm1',  index: 1,  term: '保险机构代码',     relatedCode: 'BXJGDM', definition: '保险公司在全国范围内唯一的机构编码，由中国银保监会统一分配。' },
  { id: 'tm2',  index: 2,  term: '分支机构',         relatedCode: 'FZJG',   definition: '保险公司在各地设立的省级、市级分公司及支公司。' },
  { id: 'tm3',  index: 3,  term: '保单号',           relatedCode: 'BDHM',   definition: '保险合同的唯一标识编码，是连接保费、理赔、客户等环节的核心主键。' },
  { id: 'tm4',  index: 4,  term: '被保险人',         relatedCode: '',       definition: '受保险合同保障、享有保险金请求权的人。' },
  { id: 'tm5',  index: 5,  term: '投保人',           relatedCode: '',       definition: '与保险人订立保险合同，并按照合同约定负有支付保险费义务的人。' },
  { id: 'tm6',  index: 6,  term: '个人客户',         relatedCode: 'GRKH',   definition: '以自然人身份购买保险产品的客户。' },
  { id: 'tm7',  index: 7,  term: '团体客户',         relatedCode: 'TTKH',   definition: '以法人或其他组织身份购买团体保险的客户。' },
  { id: 'tm8',  index: 8,  term: '险种',             relatedCode: 'XZ',     definition: '保险产品的分类，如寿险、健康险、意外险、年金险等。' },
  { id: 'tm9',  index: 10, term: '保单佣金',         relatedCode: '',       definition: '保险公司支付给销售人员或中介机构的业务报酬，按保费比例计算。' },
  { id: 'tm10', index: 11, term: '保费',             relatedCode: 'BF',     definition: '投保人根据保险合同约定向保险公司支付的费用。' },
  { id: 'tm11', index: 12, term: '付费',             relatedCode: 'FF',     definition: '保险公司根据合同约定向投保人或受益人支付的款项。' },
  { id: 'tm12', index: 13, term: '再保险',           relatedCode: 'ZB',     definition: '保险公司将其承保的风险部分转移给其他保险公司的行为。' },
  { id: 'tm13', index: 16, term: '理赔',             relatedCode: 'LP',     definition: '保险人根据合同约定对保险事故进行核定并给付保险金的过程。' },
  { id: 'tm14', index: 18, term: '年金计划',         relatedCode: 'NJJH',   definition: '保险公司为团体或个人设立的养老金或年金管理计划。' },
  { id: 'tm15', index: 22, term: '关联交易',         relatedCode: 'GLJY',   definition: '保险公司与关联方之间发生的交易。' },
  { id: 'tm16', index: 26, term: '董监高',           relatedCode: 'DJG',    definition: '董事、监事、高级管理人员的统称。' },
  { id: 'tm17', index: 27, term: '销售人员',         relatedCode: 'XSRY',   definition: '从事保险产品销售的个人。' },
  { id: 'tm18', index: 28, term: '中介机构',         relatedCode: 'ZJJG',   definition: '为保险公司提供销售、理赔、公估等专业服务的第三方机构。' },
  { id: 'tm19', index: 33, term: 'EAST报送',         relatedCode: '',       definition: 'Examination and Analysis System Technology 的缩写，银保监会要求的监管数据标准化报送系统。' },
  { id: 'tm20', index: 37, term: '联合主键',         relatedCode: '',       definition: '由多个字段共同组成的主键，用于唯一标识表中的一条记录。' },
];

const EAST_NAMING: NamingEntry[] = [
  { id: 'n1',  prefix: 'BXJG', meaning: '保险机构', example: 'BXJGDM（保险机构代码）' },
  { id: 'n2',  prefix: 'FZJG', meaning: '分支机构', example: 'FZJGDM（分支机构代码）' },
  { id: 'n3',  prefix: 'GR',   meaning: '个人',     example: 'GRKHXXB（个人客户信息表）' },
  { id: 'n4',  prefix: 'TT',   meaning: '团体',     example: 'TTKHXXB（团体客户信息表）' },
  { id: 'n5',  prefix: 'BD',   meaning: '保单',     example: 'BDHM（保单号码）' },
  { id: 'n6',  prefix: 'XZ',   meaning: '险种',     example: 'XZDYB（险种定义表）' },
  { id: 'n7',  prefix: 'KH',   meaning: '客户',     example: 'KHBDDZB（客户保单对照表）' },
  { id: 'n8',  prefix: 'BF',   meaning: '保费',     example: 'BFMXB（保费明细表）' },
  { id: 'n9',  prefix: 'FF',   meaning: '付费',     example: 'FFMXB（付费明细表）' },
  { id: 'n10', prefix: 'YJ',   meaning: '佣金',     example: 'BDYJXXB（保单佣金信息表）' },
  { id: 'n11', prefix: 'ZB',   meaning: '再保',     example: 'ZBCPXXB（再保产品信息表）' },
  { id: 'n12', prefix: 'LP',   meaning: '理赔',     example: 'LPBDMXB（理赔保单明细表）' },
  { id: 'n13', prefix: 'NJ',   meaning: '年金',     example: 'NJJHXXB（年金计划信息表）' },
  { id: 'n14', prefix: 'YL',   meaning: '养老',     example: 'YLBZYWXXB（养老保障业务信息表）' },
  { id: 'n15', prefix: 'TZ',   meaning: '投资',     example: 'ZZTZZHXXHZB（自主投资账户信息汇总表）' },
  { id: 'n16', prefix: 'GL',   meaning: '关联',     example: 'GLJYHZB（关联交易汇总表）' },
  { id: 'n17', prefix: 'XXB',  meaning: '信息表后缀', example: 'GRKHXXB（个人客户信息表）' },
  { id: 'n18', prefix: 'DZB',  meaning: '对照表后缀', example: 'KHBDDZB（客户保单对照表）' },
  { id: 'n19', prefix: 'MXB',  meaning: '明细表后缀', example: 'BFMXB（保费明细表）' },
  { id: 'n20', prefix: 'HZB',  meaning: '汇总表后缀', example: 'GLJYHZB（关联交易汇总表）' },
];

const EAST_DEPS: DependencyEntry[] = [
  { id: 'd1', level: 0, description: '基础主数据：保险机构 → 分支机构、中介机构、员工、关联方' },
  { id: 'd2', level: 1, description: '人员与客户：员工 → 董监高、销售人员；个人客户 + 团体客户' },
  { id: 'd3', level: 2, description: '产品定义：险种定义 → 个人险种、团体险种' },
  { id: 'd4', level: 3, description: '保单核心：个人保单 + 团体保单 → 被保险人；客户保单对照' },
  { id: 'd5', level: 4, description: '保单扩展：保费/付费明细、佣金、回访、投诉' },
  { id: 'd6', level: 5, description: '业务专项：再保产品/合同/账单；理赔；年金；养老；投资；关联交易' },
  { id: 'd7', level: 6, description: '财务核算：总账科目 → 内部科目对照 → 财务凭证 → 费用/佣金明细；银行账户' },
];

const EAST_OVERVIEW: OverviewEntry[] = [
  { id: 'o1',  domain: '公共信息',   tableCount: 6, coreEntities: '保险机构、分支机构、员工、中介机构、董监高、销售人员', description: '公司治理与组织架构的基础信息' },
  { id: 'o2',  domain: '财务信息',   tableCount: 6, coreEntities: '总账科目、内部科目对照、财务凭证、费用明细、佣金明细、银行账户', description: '财务核算与费用管理信息' },
  { id: 'o3',  domain: '客户信息',   tableCount: 3, coreEntities: '个人客户、团体客户、客户保单对照', description: '客户身份标识及与保单的关联关系' },
  { id: 'o4',  domain: '产品与保单', tableCount: 7, coreEntities: '险种定义、个人/团体保单、个人/团体险种、被保险人、投诉', description: '产品定义与保单生命周期管理' },
  { id: 'o5',  domain: '销售与渠道', tableCount: 3, coreEntities: '保单佣金、客户回访、销售人员关联', description: '销售过程管理与渠道追溯' },
  { id: 'o6',  domain: '保费与支付', tableCount: 3, coreEntities: '保费明细、付费明细、团体保费', description: '保费收入与保险金支付' },
  { id: 'o7',  domain: '再保险',     tableCount: 3, coreEntities: '再保产品、再保合同、再保账单', description: '再保险分出与分入管理' },
  { id: 'o8',  domain: '理赔',       tableCount: 2, coreEntities: '出险人、理赔保单明细', description: '保险事故核定与赔付处理' },
  { id: 'o9',  domain: '年金',       tableCount: 4, coreEntities: '年金计划、计划管理、运营明细、投资情况', description: '年金计划全生命周期管理' },
  { id: 'o10', domain: '养老保障',   tableCount: 2, coreEntities: '养老保障业务、养老保障产品', description: '养老保障产品的业务与产品信息' },
  { id: 'o11', domain: '投资',       tableCount: 4, coreEntities: '自主投资账户、持仓明细、交易流水、委托投资', description: '保险资金运用管理' },
  { id: 'o12', domain: '关联交易',   tableCount: 3, coreEntities: '关联方、重大关联交易、关联交易汇总', description: '关联方识别与交易披露' },
];

// Lightweight bundles for the other standards (placeholder so UI works for them too)
const emptyBundle = (standard: Standard): StandardBundle => ({
  standard,
  entries: { tables: [], fields: [], codes: [], terms: [], naming: [], dependencies: [], overview: [] }
});

const STANDARDS: StandardBundle[] = [
  {
    standard: {
      id: 'east', abbreviation: 'EAST', name: 'EAST 人身保险公司版 — 业务术语表',
      description: '银保监会监管数据标准化报送规范，涵盖 12 个业务领域、46 张数据表、20 个业务代码表。',
      version: '2024', status: 'active', sourceUrl: 'doc/EAST_business_glossary.md',
      tags: ['Insurance', 'Banking', '监管', '报送', '中国银保监会']
    },
    entries: { tables: EAST_TABLES, fields: EAST_FIELDS, codes: EAST_CODES, terms: EAST_TERMS, naming: EAST_NAMING, dependencies: EAST_DEPS, overview: EAST_OVERVIEW }
  },
  emptyBundle({
    id: 'acrod', abbreviation: 'ACROD', name: 'Australian Captive Records and Obligations Data',
    description: 'Australian regulatory reporting standard for captive insurers.',
    version: '2.1', status: 'active', sourceUrl: 'https://www.apra.gov.au',
    tags: ['APRA', 'captive insurance', 'regulatory reporting']
  }),
  emptyBundle({
    id: 'iso', abbreviation: 'ISO', name: 'International Organization for Standardization',
    description: 'Worldwide federation of national standards bodies. ISO 20022, ISO 8601, ISO 3166, etc.',
    version: '2024', status: 'active', sourceUrl: 'https://www.iso.org',
    tags: ['international', 'standards']
  }),
];

// ----- Status colors -----
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  deprecated: 'bg-gray-100 text-gray-600',
  draft: 'bg-yellow-100 text-yellow-800'
};

const BusinessGlossary: React.FC = () => {
  const { collapsed } = useSidebar();
  const [bundles] = useState<StandardBundle[]>(STANDARDS);
  const [activeStandardId, setActiveStandardId] = useState<string>(STANDARDS[0].standard.id);
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const activeBundle = useMemo(
    () => bundles.find(b => b.standard.id === activeStandardId) ?? bundles[0],
    [bundles, activeStandardId]
  );
  const { standard, entries } = activeBundle;

  // Counts per section
  const counts = useMemo(() => ({
    overview: entries.overview.length,
    tables: entries.tables.length,
    fields: entries.fields.length,
    codes: entries.codes.length,
    terms: entries.terms.length,
    naming: entries.naming.length,
    dependencies: entries.dependencies.length,
  }), [entries]);

  // Filtered entries by section + search
  const searchLower = searchQuery.trim().toLowerCase();
  const filterBySearch = <T,>(items: T[], keys: (keyof T)[]): T[] => {
    if (searchLower.length === 0) return items;
    return items.filter(item => keys.some(k => {
      const v = item[k];
      return typeof v === 'string' && v.toLowerCase().includes(searchLower);
    }));
  };

  const filteredOverview = filterBySearch(entries.overview, ['domain', 'coreEntities', 'description']);
  const filteredTables = filterBySearch(entries.tables, ['name', 'abbreviation', 'domain']);
  const filteredFields = filterBySearch(entries.fields, ['code', 'tables', 'description']);
  const filteredCodes = filterBySearch(entries.codes, ['code', 'name', 'description', 'codeTable']);
  const filteredTerms = filterBySearch(entries.terms, ['term', 'relatedCode', 'definition']);
  const filteredNaming = filterBySearch(entries.naming, ['prefix', 'meaning', 'example']);
  const filteredDeps = filterBySearch(entries.dependencies, ['description']);

  const totalEntries = entries.tables.length + entries.fields.length + entries.codes.length
    + entries.terms.length + entries.naming.length + entries.dependencies.length;

  return (
    <div className={cn(
      "min-h-screen flex flex-col transition-all duration-300",
      collapsed ? "ml-[80px]" : "ml-[224px]"
    )}>
      <Sidebar />
      <Header />

      <main className="flex-1 p-6">
        {/* Top: Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Business Glossary</h1>
            <p className="text-gray-600 mt-1">Manage industry standards and regulatory frameworks</p>
          </div>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Standard
          </Button>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left: standards list */}
          <div className="col-span-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700">Standards</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul>
                  {bundles.map(b => {
                    const total = b.entries.tables.length + b.entries.fields.length + b.entries.codes.length
                      + b.entries.terms.length + b.entries.naming.length + b.entries.dependencies.length;
                    const isActive = b.standard.id === activeStandardId;
                    return (
                      <li key={b.standard.id}>
                        <button
                          onClick={() => setActiveStandardId(b.standard.id)}
                          className={cn(
                            "w-full text-left px-4 py-3 border-l-2 transition-colors",
                            isActive
                              ? "border-blue-600 bg-blue-50"
                              : "border-transparent hover:bg-gray-50"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className={cn("font-semibold", isActive ? "text-blue-700" : "text-gray-900")}>
                              {b.standard.abbreviation}
                            </span>
                            <ChevronRight className={cn("h-4 w-4", isActive ? "text-blue-600" : "text-gray-300")} />
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{b.standard.name}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="outline" className="text-[10px]">v{b.standard.version}</Badge>
                            <span className={cn('inline-block px-1.5 py-0.5 rounded text-[10px] font-medium', STATUS_COLORS[b.standard.status])}>
                              {b.standard.status}
                            </span>
                            <span className="text-[10px] text-gray-400">{total} entries</span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Right: standard detail */}
          <div className="col-span-9 space-y-6">
            {/* Standard header card */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-gray-900">{standard.name}</h2>
                      <Badge variant="secondary">{standard.abbreviation}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1.5">{standard.description}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <Badge variant="outline">v{standard.version}</Badge>
                      <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[standard.status])}>
                        {standard.status}
                      </span>
                      {standard.sourceUrl && (
                        <a href={standard.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                          Source <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {standard.tags.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-3 mt-5">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-600">Total Entries</p>
                    <p className="text-xl font-bold text-blue-700">{totalEntries}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-green-600">Tables</p>
                    <p className="text-xl font-bold text-green-700">{counts.tables}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs text-purple-600">Fields + Codes</p>
                    <p className="text-xl font-bold text-purple-700">{counts.fields + counts.codes}</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3">
                    <p className="text-xs text-amber-600">Terms + Naming</p>
                    <p className="text-xl font-bold text-amber-700">{counts.terms + counts.naming}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section tabs + search */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search in this standard..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as SectionId)}>
              <TabsList className="flex-wrap h-auto">
                {SECTIONS.map(s => (
                  <TabsTrigger key={s.id} value={s.id} className="flex items-center gap-1.5">
                    {s.icon}
                    {s.label}
                    <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                      {counts[s.id]}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Overview */}
              <TabsContent value="overview" className="mt-4">
                <SectionHeader title="Domain Overview" description="High-level summary of business domains covered by this standard." />
                <div className="grid grid-cols-2 gap-3">
                  {filteredOverview.map(o => (
                    <Card key={o.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-gray-900">{o.domain}</h4>
                          <Badge variant="outline">{o.tableCount} tables</Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          <span className="font-medium text-gray-700">核心实体：</span>{o.coreEntities}
                        </p>
                        <p className="text-xs text-gray-600 mt-1.5">{o.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Data Tables */}
              <TabsContent value="tables" className="mt-4">
                <SectionHeader title="Data Tables" description="Tables defined in this standard, grouped by business domain." />
                <DataTable<TableEntry>
                  rows={filteredTables}
                  columns={[
                    { key: 'domain', label: 'Domain', render: r => <Badge variant="secondary">{r.domain}</Badge> },
                    { key: 'abbreviation', label: 'Abbreviation', render: r => <span className="font-mono font-semibold text-blue-700">{r.abbreviation}</span> },
                    { key: 'name', label: 'Name (CN)' },
                    { key: 'fieldCount', label: 'Fields', render: r => <span className="text-gray-600">{r.fieldCount}</span> },
                  ]}
                  emptyText="No tables in this standard yet."
                />
              </TabsContent>

              {/* Field Codes */}
              <TabsContent value="fields" className="mt-4">
                <SectionHeader title="Field Codes" description="Cross-table field codes and their meanings." />
                <DataTable<FieldCodeEntry>
                  rows={filteredFields}
                  columns={[
                    { key: 'code', label: 'Code', render: r => <span className="font-mono font-semibold text-blue-700">{r.code}</span> },
                    { key: 'usedInTables', label: 'Used In', render: r => <span className="text-gray-600">{r.usedInTables} tables</span> },
                    { key: 'tables', label: 'Sample Tables', render: r => <span className="text-xs text-gray-500">{r.tables}</span> },
                    { key: 'description', label: 'Description', render: r => <span className="text-sm text-gray-700">{r.description}</span> },
                  ]}
                  emptyText="No field codes defined."
                />
              </TabsContent>

              {/* Code Values */}
              <TabsContent value="codes" className="mt-4">
                <SectionHeader title="Code Values" description="Enumerated values for business code fields." />
                <DataTable<CodeValueEntry>
                  rows={filteredCodes}
                  columns={[
                    { key: 'codeTable', label: 'Code Table', render: r => <Badge variant="outline">{r.codeTable}</Badge> },
                    { key: 'code', label: 'Code', render: r => <span className="font-mono font-semibold">{r.code}</span> },
                    { key: 'name', label: 'Name' },
                    { key: 'description', label: 'Description', render: r => <span className="text-sm text-gray-600">{r.description || '—'}</span> },
                  ]}
                  emptyText="No code values defined."
                />
              </TabsContent>

              {/* Terms */}
              <TabsContent value="terms" className="mt-4">
                <SectionHeader title="Core Business Terms" description="Core business term definitions." />
                <DataTable<TermEntry>
                  rows={filteredTerms}
                  columns={[
                    { key: 'index', label: '#', render: r => <span className="text-gray-400">{r.index}</span> },
                    { key: 'term', label: 'Term', render: r => <span className="font-medium text-gray-900">{r.term}</span> },
                    { key: 'relatedCode', label: 'Code', render: r => r.relatedCode ? <span className="font-mono text-blue-700 text-xs">{r.relatedCode}</span> : <span className="text-gray-300">—</span> },
                    { key: 'definition', label: 'Definition', render: r => <span className="text-sm text-gray-700">{r.definition}</span> },
                  ]}
                  emptyText="No terms defined."
                />
              </TabsContent>

              {/* Naming */}
              <TabsContent value="naming" className="mt-4">
                <SectionHeader title="Naming Conventions" description="Prefix and suffix conventions for fields and tables." />
                <DataTable<NamingEntry>
                  rows={filteredNaming}
                  columns={[
                    { key: 'prefix', label: 'Prefix / Suffix', render: r => <span className="font-mono font-semibold text-blue-700">{r.prefix}</span> },
                    { key: 'meaning', label: 'Meaning' },
                    { key: 'example', label: 'Example', render: r => <span className="text-sm text-gray-600">{r.example}</span> },
                  ]}
                  emptyText="No naming conventions defined."
                />
              </TabsContent>

              {/* Dependencies */}
              <TabsContent value="dependencies" className="mt-4">
                <SectionHeader title="Table Dependencies" description="Load order and inter-table dependencies." />
                <Card>
                  <CardContent className="p-0">
                    <ul>
                      {filteredDeps.map(d => (
                        <li key={d.id} className="flex items-start gap-3 px-4 py-3 border-b last:border-0">
                          <Badge variant="outline" className="mt-0.5">Level {d.level}</Badge>
                          <span className="text-sm text-gray-700">{d.description}</span>
                        </li>
                      ))}
                      {filteredDeps.length === 0 && (
                        <li className="px-4 py-8 text-center text-sm text-gray-500">No dependencies defined.</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
};

// ----- Local sub-components -----
const SectionHeader: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="mb-3">
    <h3 className="text-base font-semibold text-gray-900">{title}</h3>
    <p className="text-xs text-gray-500 mt-0.5">{description}</p>
  </div>
);

interface ColumnDef<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

function DataTable<T extends { id: string }>({ rows, columns, emptyText }: {
  rows: T[];
  columns: ColumnDef<T>[];
  emptyText: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              {columns.map(c => (
                <th key={c.key} className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-b last:border-0 hover:bg-gray-50">
                {columns.map(c => (
                  <td key={c.key} className={cn("px-4 py-3 align-top", c.className)}>
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-gray-500">
                  <BookOpen className="h-6 w-6 mx-auto mb-2 text-gray-300" />
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default BusinessGlossary;
