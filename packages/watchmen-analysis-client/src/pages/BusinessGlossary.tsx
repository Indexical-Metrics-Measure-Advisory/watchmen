import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, Plus, Pencil, Trash2, BookOpen, ExternalLink,
  Database, Tag, Code2, Library, Network, FileText, ChevronRight
} from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  type SectionId,
  type Standard,
  type TableEntry,
  type FieldCodeEntry,
  type CodeValueEntry,
  type TermEntry,
  type NamingEntry,
  type DependencyEntry,
  type OverviewEntry,
  type StandardBundle,
  SECTION_LABELS,
  STATUS_COLORS,
  getFieldsForSection,
  ACORD_BUNDLE
} from '@/model/businessGlossary';

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
  { id: 'f1',  code: 'BXJGDM', usedInTables: 46, tables: 'JGGQXXB, FZJGXXB, ZJJGXXB, YGXXB, DJGLZXXB, XSRYXXB, ZZKJQKMB, NBKMDZB, CWPZXXB, YWJGLFFKMMXZB, SXFJYJFKMMXZB, YHZHXXB, GRKHXXB, TTKHXXB, KHBDDZB, BDTSXXB, XZDYB, GRBDB, GRXZB, BBXRB, TTBDB, TTXZB, BDYJXXB, KHHFB, BDXSRYGLB, BFMXB, FFMXB, TTBFB, ZBCPXXB, ZBHTXXB, ZBZDXXB, CXRXXB, LPBDMXB, NJJHXXB, NJJHGLQKB, NJJHYYMXB, NJTZQKB, YLBZYWXXB, YLBZCPXXQKB, ZZTZZHXXHZB, ZZTZZHCCMXB, ZZTZJYLSB, WTTZQKB, GLFXXB, ZDGLJYB, GLJYHZB', description: '保险行业保险公司总保险机构代码。' },
  { id: 'f2',  code: 'BXJGMC', usedInTables: 46, tables: 'JGGQXXB, FZJGXXB, ZJJGXXB, YGXXB, DJGLZXXB, XSRYXXB, ZZKJQKMB, NBKMDZB, CWPZXXB, YWJGLFFKMMXZB, SXFJYJFKMMXZB, YHZHXXB, GRKHXXB, TTKHXXB, KHBDDZB, BDTSXXB, XZDYB, GRBDB, GRXZB, BBXRB, TTBDB, TTXZB, BDYJXXB, KHHFB, BDXSRYGLB, BFMXB, FFMXB, TTBFB, ZBCPXXB, ZBHTXXB, ZBZDXXB, CXRXXB, LPBDMXB, NJJHXXB, NJJHGLQKB, NJJHYYMXB, NJTZQKB, YLBZYWXXB, YLBZCPXXQKB, ZZTZZHXXHZB, ZZTZZHCCMXB, ZZTZJYLSB, WTTZQKB, GLFXXB, ZDGLJYB, GLJYHZB', description: '保险行业保险公司总保险机构名称。' },
  { id: 'f3',  code: 'LSH',    usedInTables: 46, tables: 'JGGQXXB, FZJGXXB, ZJJGXXB, YGXXB, DJGLZXXB, XSRYXXB, ZZKJQKMB, NBKMDZB, CWPZXXB, YWJGLFFKMMXZB, SXFJYJFKMMXZB, YHZHXXB, GRKHXXB, TTKHXXB, KHBDDZB, BDTSXXB, XZDYB, GRBDB, GRXZB, BBXRB, TTBDB, TTXZB, BDYJXXB, KHHFB, BDXSRYGLB, BFMXB, FFMXB, TTBFB, ZBCPXXB, ZBHTXXB, ZBZDXXB, CXRXXB, LPBDMXB, NJJHXXB, NJJHGLQKB, NJJHYYMXB, NJTZQKB, YLBZYWXXB, YLBZCPXXQKB, ZZTZZHXXHZB, ZZTZZHCCMXB, ZZTZJYLSB, WTTZQKB, GLFXXB, ZDGLJYB, GLJYHZB', description: '保险机构代码+日期（YYYYMMDD）+10位流水。' },
  { id: 'f4',  code: 'FZJGDM', usedInTables: 15, tables: 'FZJGXXB, ZJJGXXB, YGXXB, XSRYXXB, ZZKJQKMB, CWPZXXB, YWJGLFFKMMXZB, SXFJYJFKMMXZB, YHZHXXB', description: '公司给自身分支机构的编码。' },
  { id: 'f5',  code: 'FZJGMC', usedInTables: 8, tables: 'FZJGXXB, ZJJGXXB, YGXXB, XSRYXXB', description: '分支机构名称。' },
  { id: 'f6',  code: 'FZJGZT', usedInTables: 1, tables: 'FZJGXXB', description: '分支机构当前状态。1-营业，2-撤销，3-停业，4-接管，5-改建，6-其他。' },
  { id: 'f7',  code: 'FZJGCLSJ', usedInTables: 1, tables: 'FZJGXXB', description: '营业执照上登记的成立日期。' },
  { id: 'f8',  code: 'FZJGZJLX', usedInTables: 2, tables: 'FZJGXXB, ZJJGXXB', description: '优先填报统一社会信用代码。1-统一社会信用代码，2-组织机构代码证，3-税务登记证，4-营业执照，5-事业单位法人证书，6-社会团体法人证书，7-民办非企业单位登记证书，8-基金会法人登记证书，9-工商注册号码，10-其他证件。' },
  { id: 'f9',  code: 'FZJGZJHM', usedInTables: 2, tables: 'FZJGXXB, ZJJGXXB', description: '填报统一社会性信用代码、组织机构代码证、营业执照等有效证件号码。' },
  { id: 'f10', code: 'JGXQDM', usedInTables: 1, tables: 'FZJGXXB', description: '该管理机构所属的监管辖区。' },
  { id: 'f11', code: 'GLJGDM', usedInTables: 3, tables: 'FZJGXXB, YHZHXXB', description: '负责向所属监管辖区银保监局报送数据的机构代码。' },
  { id: 'f12', code: 'GLJGMC', usedInTables: 2, tables: 'FZJGXXB', description: '负责向所属监管辖区银保监局报送数据的机构名称。' },
  { id: 'f13', code: 'FZJGDZ', usedInTables: 1, tables: 'FZJGXXB', description: '以机构营业执照登记地址为准。' },
  { id: 'f14', code: 'FZJGCJ', usedInTables: 1, tables: 'FZJGXXB', description: '分支机构的层级。01-总公司，02-分公司，03-中心支公司，04-支公司，05-营业部或营销服务部，06-电话销售专属机构,07-其他专属机构。' },
  { id: 'f15', code: 'SJJGDM', usedInTables: 1, tables: 'FZJGXXB', description: '该机构的直属上级机构，若为最高级机构，填0。' },
  { id: 'f16', code: 'JYBXYWXKZH', usedInTables: 1, tables: 'FZJGXXB', description: '监管部门核发的保险许可证号。' },
  { id: 'f17', code: 'XKZFFRQ', usedInTables: 1, tables: 'FZJGXXB', description: '保险许可证号的发放日期。' },
  { id: 'f18', code: 'XKZZXRQ', usedInTables: 2, tables: 'FZJGXXB, YHZHXXB', description: '保险许可证号的注销日期，如未注销，填写默认值9999-12-31。' },
  { id: 'f19', code: 'FZRDM', usedInTables: 1, tables: 'FZJGXXB', description: '分支机构实际经营负责人代码，对应到员工信息表的员工代码数据项。' },
  { id: 'f20', code: 'WFWGJL', usedInTables: 2, tables: 'FZJGXXB, ZJJGXXB', description: '最近2年违法违规情况说明。' },
  { id: 'f21', code: 'ZJJGDM', usedInTables: 1, tables: 'ZJJGXXB', description: '公司给自己的中介机构编的代码。' },
  { id: 'f22', code: 'SSFZJGDM', usedInTables: 3, tables: 'ZJJGXXB, YGXXB, DJGLZXXB, XSRYXXB', description: '对应到分支机构信息表的分支机构代码数据项。' },
  { id: 'f23', code: 'ZJJGMC', usedInTables: 1, tables: 'ZJJGXXB', description: '中介机构名称。' },
  { id: 'f24', code: 'ZJJGDZ', usedInTables: 1, tables: 'ZJJGXXB', description: '中介机构营业执照登记地址。' },
  { id: 'f25', code: 'ZJJGLB', usedInTables: 1, tables: 'ZJJGXXB', description: '保险专业代理、经纪等中介机构类别。' },
  { id: 'f26', code: 'ZJJGTYBM', usedInTables: 1, tables: 'ZJJGXXB', description: '中介机构在中介监管系统中登记的机构编码。' },
  { id: 'f27', code: 'HDZJXKZRQ', usedInTables: 1, tables: 'ZJJGXXB', description: '监管机构颁发许可证日期。' },
  { id: 'f28', code: 'ZJXKZDQR', usedInTables: 1, tables: 'ZJJGXXB', description: '许可证到期日期。' },
  { id: 'f29', code: 'QYRQ', usedInTables: 2, tables: 'ZJJGXXB, XSRYXXB', description: '最近一次签署合作协议的日期。' },
  { id: 'f30', code: 'XYDQRHJYR', usedInTables: 1, tables: 'ZJJGXXB', description: '合作协议终止的日期。' },
  { id: 'f31', code: 'ZJYWXKZH', usedInTables: 1, tables: 'ZJJGXXB', description: '经营保险代理、兼业代理、经纪业务许可证左上角的红色流水号。' },
  { id: 'f32', code: 'ZJYWXKZMC', usedInTables: 1, tables: 'ZJJGXXB', description: '中介机构经营业务许可证名称。' },
  { id: 'f33', code: 'YWFW', usedInTables: 1, tables: 'ZJJGXXB', description: '中介机构业务许可证中的业务范围。' },
  { id: 'f34', code: 'JYQY', usedInTables: 1, tables: 'ZJJGXXB', description: '中介机构业务许可证中的地域范围。' },
  { id: 'f35', code: 'FZRXM', usedInTables: 1, tables: 'ZJJGXXB', description: '中介机构实际经营负责人身份证或护照的姓名。' },
  { id: 'f36', code: 'YGDM', usedInTables: 2, tables: 'YGXXB, DJGLZXXB', description: '公司内部自行定义的员工编号，具有唯一性。' },
  { id: 'f37', code: 'YGXM', usedInTables: 1, tables: 'YGXXB', description: '员工身份证或护照的姓名。' },
  { id: 'f38', code: 'XB', usedInTables: 1, tables: 'YGXXB', description: '员工性别。1-男性，2-女性。' },
  { id: 'f39', code: 'MZ', usedInTables: 1, tables: 'YGXXB', description: '员工的民族。' },
  { id: 'f40', code: 'CSRQ', usedInTables: 1, tables: 'YGXXB', description: '员工出生日期。' },
  { id: 'f41', code: 'ZZMM', usedInTables: 1, tables: 'YGXXB', description: '保险公司人力资源系统存储的员工的政治面貌的文本描述。' },
  { id: 'f42', code: 'CJZDRQ', usedInTables: 1, tables: 'YGXXB', description: '参加政党的日期。' },
  { id: 'f43', code: 'ZJLX', usedInTables: 2, tables: 'YGXXB, XSRYXXB', description: '证件类型。' },
  { id: 'f44', code: 'ZJHM', usedInTables: 2, tables: 'YGXXB, XSRYXXB', description: '身份证号、护照号、军官证号等有效证件号码。' },
  { id: 'f45', code: 'LXDH', usedInTables: 2, tables: 'YGXXB, XSRYXXB', description: '联系电话。' },
  { id: 'f46', code: 'XL', usedInTables: 2, tables: 'YGXXB, XSRYXXB', description: '学历。01-博士，02-硕士，03-本科，04-大专，05-高中及同等学历，06-初中，07-小学，99-其他。' },
  { id: 'f47', code: 'ZYJSZG', usedInTables: 1, tables: 'YGXXB', description: '员工专业技术资格等级。' },
  { id: 'f48', code: 'DJGBZ', usedInTables: 1, tables: 'YGXXB', description: '表示是否属于银保监会监管的董事、监事、高管范围。' },
  { id: 'f49', code: 'GW', usedInTables: 1, tables: 'YGXXB', description: '岗位。' },
  { id: 'f50', code: 'RSRQ', usedInTables: 1, tables: 'YGXXB', description: '入职日期。' },
  { id: 'f51', code: 'LSRQ', usedInTables: 2, tables: 'YGXXB, XSRYXXB', description: '离职日期。' },
  { id: 'f52', code: 'XXLB', usedInTables: 1, tables: 'DJGLZXXB', description: '董事、监事、高管履职信息类别。' },
  { id: 'f53', code: 'KSRQ', usedInTables: 1, tables: 'DJGLZXXB', description: '开始日期。' },
  { id: 'f54', code: 'JSRQ', usedInTables: 1, tables: 'DJGLZXXB', description: '结束日期。' },
  { id: 'f55', code: 'PFRQ', usedInTables: 1, tables: 'DJGLZXXB', description: '批复日期。' },
  { id: 'f56', code: 'SRZW', usedInTables: 1, tables: 'DJGLZXXB', description: '时任职务。' },
  { id: 'f57', code: 'CFJG', usedInTables: 1, tables: 'DJGLZXXB', description: '处罚机关。' },
  { id: 'f58', code: 'CFZL', usedInTables: 1, tables: 'DJGLZXXB', description: '处罚种类。' },
  { id: 'f59', code: 'CFYY', usedInTables: 1, tables: 'DJGLZXXB', description: '处罚原因。' },
  { id: 'f60', code: 'CFJE', usedInTables: 1, tables: 'DJGLZXXB', description: '处罚金额。' },
  { id: 'f61', code: 'GWRZXX', usedInTables: 2, tables: 'DJGLZXXB, XSRYXXB', description: '过往任职信息。' },
  { id: 'f62', code: 'XSRYDM', usedInTables: 1, tables: 'XSRYXXB', description: '各保险公司核心系统所存的保险公司的销售人员的工号或编号。' },
  { id: 'f63', code: 'XSRYXM', usedInTables: 1, tables: 'XSRYXXB', description: '销售人员的姓名。' },
  { id: 'f64', code: 'SSQDXX', usedInTables: 1, tables: 'XSRYXXB', description: '销售人员的销售渠道类型。' },
  { id: 'f65', code: 'ZYZSH', usedInTables: 1, tables: 'XSRYXXB', description: '销售人员执业证号码。' },
  { id: 'f66', code: 'ZYZFFRQ', usedInTables: 1, tables: 'XSRYXXB', description: '执业证发放日期。' },
  { id: 'f67', code: 'ZYZZXDQRQ', usedInTables: 1, tables: 'XSRYXXB', description: '执业证注销或到期日期。' },
  { id: 'f68', code: 'SJXSRYDM', usedInTables: 1, tables: 'XSRYXXB', description: '上级销售人员代码。' },
  { id: 'f69', code: 'WGWJJL', usedInTables: 1, tables: 'XSRYXXB', description: '销售人员的内外部违规违纪处理记录。' },
  { id: 'f70', code: 'KHYXMC', usedInTables: 1, tables: 'XSRYXXB', description: '销售人员工资卡对应开户银行的名称。' },
  { id: 'f71', code: 'YXZH', usedInTables: 2, tables: 'XSRYXXB, YHZHXXB', description: '银行账号。' },
  { id: 'f72', code: 'YXZHMC', usedInTables: 2, tables: 'XSRYXXB, YHZHXXB', description: '银行账户名称。' },
  { id: 'f73', code: 'GDBH', usedInTables: 1, tables: 'JGGQXXB', description: '股东编号。' },
  { id: 'f74', code: 'GDMC', usedInTables: 1, tables: 'JGGQXXB', description: '股东名称。' },
  { id: 'f75', code: 'CZRQ', usedInTables: 1, tables: 'JGGQXXB', description: '该股东最近一次持股份额变化的日期。' },
  { id: 'f76', code: 'JGBZ', usedInTables: 1, tables: 'JGGQXXB', description: '股东是否为机构的标志。' },
  { id: 'f77', code: 'JGZJLX', usedInTables: 1, tables: 'JGGQXXB', description: '机构证件类型。' },
  { id: 'f78', code: 'JGZJHM', usedInTables: 1, tables: 'JGGQXXB', description: '机构证件号码。' },
  { id: 'f79', code: 'GRZJLX', usedInTables: 1, tables: 'JGGQXXB', description: '个人证件类型。' },
  { id: 'f80', code: 'GRZJHM', usedInTables: 1, tables: 'JGGQXXB', description: '个人证件号码。' },
  { id: 'f81', code: 'DZ', usedInTables: 1, tables: 'JGGQXXB', description: '地址。' },
  { id: 'f82', code: 'ZCZB', usedInTables: 1, tables: 'JGGQXXB', description: '注册资本。' },
  { id: 'f83', code: 'CGBL', usedInTables: 1, tables: 'JGGQXXB', description: '持股比例。' },
  { id: 'f84', code: 'CZJE', usedInTables: 1, tables: 'JGGQXXB', description: '出资金额。' },
  { id: 'f85', code: 'ZYSL', usedInTables: 1, tables: 'JGGQXXB', description: '质押数量。' },
  { id: 'f86', code: 'ZYBL', usedInTables: 1, tables: 'JGGQXXB', description: '质押比例。' },
  { id: 'f87', code: 'BZ', usedInTables: 1, tables: 'JGGQXXB', description: '备注。' },
  { id: 'f88', code: 'KJRQ', usedInTables: 1, tables: 'ZZKJQKMB', description: '会计记账日期。' },
  { id: 'f89', code: 'BXZTBM', usedInTables: 3, tables: 'ZZKJQKMB, CWPZXXB, YWJGLFFKMMXZB, SXFJYJFKMMXZB', description: '保险公司自己的账套编码。' },
  { id: 'f90', code: 'BXZTMC', usedInTables: 3, tables: 'ZZKJQKMB, CWPZXXB, YWJGLFFKMMXZB, SXFJYJFKMMXZB', description: '保险公司自己的账套名称。' },
  { id: 'f91', code: 'ZZKJKMBH', usedInTables: 4, tables: 'ZZKJQKMB, NBKMDZB, CWPZXXB, YWJGLFFKMMXZB, SXFJYJFKMMXZB', description: '保险公司自己使用的科目编码。' },
  { id: 'f92', code: 'ZZKJKMMC', usedInTables: 4, tables: 'ZZKJQKMB, NBKMDZB, CWPZXXB, YWJGLFFKMMXZB, SXFJYJFKMMXZB', description: '保险公司自己使用的科目名称。' },
  { id: 'f93', code: 'ZZKJKMJC', usedInTables: 2, tables: 'ZZKJQKMB, NBKMDZB', description: '总账会计科目在科目结构中所对应的级次。' },
  { id: 'f94', code: 'KJKMLX', usedInTables: 2, tables: 'ZZKJQKMB, NBKMDZB', description: '总账会计科目分类。' },
  { id: 'f95', code: 'QCJFYE', usedInTables: 1, tables: 'ZZKJQKMB', description: '当前科目期初借方余额。' },
  { id: 'f96', code: 'QCDFYE', usedInTables: 1, tables: 'ZZKJQKMB', description: '当前科目期初贷方余额。' },
  { id: 'f97', code: 'BQJFFSE', usedInTables: 1, tables: 'ZZKJQKMB', description: '当前科目本期借方发生额。' },
  { id: 'f98', code: 'BQDFFSE', usedInTables: 1, tables: 'ZZKJQKMB', description: '当前科目本期贷方发生额。' },
  { id: 'f99', code: 'QMJFYE', usedInTables: 1, tables: 'ZZKJQKMB', description: '当前科目期末借方余额。' },
  { id: 'f100', code: 'QMDFYE', usedInTables: 1, tables: 'ZZKJQKMB', description: '当前科目期末贷方余额。' },
  { id: 'f101', code: 'HBDM', usedInTables: 6, tables: 'ZZKJQKMB, CWPZXXB, YWJGLFFKMMXZB, SXFJYJFKMMXZB, YHZHXXB', description: '国际上表示货币和资金的名称代码。' },
  { id: 'f102', code: 'BSZQ', usedInTables: 3, tables: 'ZZKJQKMB, YWJGLFFKMMXZB, SXFJYJFKMMXZB', description: '报送周期。' },
  { id: 'f103', code: 'SJKMBH', usedInTables: 1, tables: 'NBKMDZB', description: '填报会计科目归属的上级科目。' },
  { id: 'f104', code: 'SJKMMC', usedInTables: 1, tables: 'NBKMDZB', description: '填报会计科目归属的上级科目名称。' },
  { id: 'f105', code: 'GSQJ', usedInTables: 1, tables: 'CWPZXXB', description: '凭证的归属年月。' },
  { id: 'f106', code: 'JZRQ', usedInTables: 3, tables: 'CWPZXXB, YWJGLFFKMMXZB, SXFJYJFKMMXZB', description: '记账日期。' },
  { id: 'f107', code: 'JZPZH', usedInTables: 3, tables: 'CWPZXXB, YWJGLFFKMMXZB, SXFJYJFKMMXZB', description: '记账凭证号。' },
  { id: 'f108', code: 'PZLY', usedInTables: 1, tables: 'CWPZXXB', description: '凭证的系统来源。' },
  { id: 'f109', code: 'ZY', usedInTables: 3, tables: 'CWPZXXB, YWJGLFFKMMXZB, SXFJYJFKMMXZB', description: '记账凭证摘要。' },
  { id: 'f110', code: 'JYBJF', usedInTables: 3, tables: 'CWPZXXB, YWJGLFFKMMXZB, SXFJYJFKMMXZB', description: '交易币借方。' },
  { id: 'f111', code: 'JYBDF', usedInTables: 3, tables: 'CWPZXXB, YWJGLFFKMMXZB, SXFJYJFKMMXZB', description: '交易币贷方。' },
  { id: 'f112', code: 'BWBJF', usedInTables: 3, tables: 'CWPZXXB, YWJGLFFKMMXZB, SXFJYJFKMMXZB', description: '本位币借方。' },
  { id: 'f113', code: 'BWBDF', usedInTables: 3, tables: 'CWPZXXB, YWJGLFFKMMXZB, SXFJYJFKMMXZB', description: '本位币贷方。' },
  { id: 'f114', code: 'YWXTCPBM', usedInTables: 1, tables: 'CWPZXXB', description: '业务系统产品编码。' },
  { id: 'f115', code: 'CWXTCPBM', usedInTables: 1, tables: 'CWPZXXB', description: '财务系统产品编码。' },
  { id: 'f116', code: 'JFFSMC', usedInTables: 1, tables: 'CWPZXXB', description: '缴费方式名称。' },
  { id: 'f117', code: 'QDMC', usedInTables: 1, tables: 'CWPZXXB', description: '渠道名称。' },
  { id: 'f118', code: 'TJFXZ', usedInTables: 1, tables: 'CWPZXXB', description: '统计分险种。' },
  { id: 'f119', code: 'TJCPSJLX', usedInTables: 1, tables: 'CWPZXXB', description: '统计产品设计类型。' },
  { id: 'f120', code: 'TJJFFS', usedInTables: 1, tables: 'CWPZXXB', description: '统计缴费方式。' },
  { id: 'f121', code: 'TJQD', usedInTables: 1, tables: 'CWPZXXB', description: '统计渠道。' },
  { id: 'f122', code: 'PCH', usedInTables: 1, tables: 'CWPZXXB', description: '批次号。' },
  { id: 'f123', code: 'QMJYBYE', usedInTables: 2, tables: 'YWJGLFFKMMXZB, SXFJYJFKMMXZB', description: '期末交易币余额。' },
  { id: 'f124', code: 'QMBWBYE', usedInTables: 2, tables: 'YWJGLFFKMMXZB, SXFJYJFKMMXZB', description: '期末本位币余额。' },
  { id: 'f125', code: 'YXMC', usedInTables: 1, tables: 'YHZHXXB', description: '银行名称。' },
  { id: 'f126', code: 'YXZHLX', usedInTables: 1, tables: 'YHZHXXB', description: '银行账户类型。' },
  { id: 'f127', code: 'YXZHZT', usedInTables: 1, tables: 'YHZHXXB', description: '银行账户状态。' },
  { id: 'f128', code: 'KHRQ', usedInTables: 1, tables: 'YHZHXXB', description: '开户日期。' },
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

// ----- Insurance Data Model (IDM) seed data -----
const IDM_TABLES: TableEntry[] = [
  { id: 'idm-t1', domain: 'Core Insurance', name: 'Insurance Policy', abbreviation: 'INS_POL', fieldCount: 4 },
  { id: 'idm-t2', domain: 'Core Insurance', name: 'Bond Insurance', abbreviation: 'BOND_INS', fieldCount: 3 },
  { id: 'idm-t3', domain: 'Core Insurance', name: 'Insurer', abbreviation: 'INSURER', fieldCount: 3 },
  { id: 'idm-t4', domain: 'Core Insurance', name: 'Policyholder', abbreviation: 'POL_HOLDER', fieldCount: 2 },
  { id: 'idm-t5', domain: 'Core Insurance', name: 'Insurance Company', abbreviation: 'INS_COMP', fieldCount: 2 },
  { id: 'idm-t6', domain: 'Core Insurance', name: 'Insurance Service', abbreviation: 'INS_SVC', fieldCount: 2 },
  { id: 'idm-t7', domain: 'Core Insurance', name: 'Claim', abbreviation: 'CLAIM', fieldCount: 2 },
  { id: 'idm-t8', domain: 'Core Insurance', name: 'Letter of Credit', abbreviation: 'LOC', fieldCount: 2 },
  { id: 'idm-t9', domain: 'Core Insurance', name: 'Guarantee', abbreviation: 'GUARANTEE', fieldCount: 2 },
  { id: 'idm-t10', domain: 'Policy Subtypes', name: 'Life Insurance Policy', abbreviation: 'LIFE_INS', fieldCount: 3 },
  { id: 'idm-t11', domain: 'Policy Subtypes', name: 'Car Insurance Policy', abbreviation: 'CAR_INS', fieldCount: 3 },
  { id: 'idm-t12', domain: 'Policy Subtypes', name: 'Property Insurance Policy', abbreviation: 'PROP_INS', fieldCount: 3 },
  { id: 'idm-t13', domain: 'Policy Subtypes', name: 'Commercial Insurance Policy', abbreviation: 'COMM_INS', fieldCount: 3 },
  { id: 'idm-t14', domain: 'FIB-DM Foundation', name: 'Contract/Agreement', abbreviation: 'CONTRACT', fieldCount: 3 },
  { id: 'idm-t15', domain: 'FIB-DM Foundation', name: 'Legal Entity', abbreviation: 'LEGAL_ENT', fieldCount: 3 },
  { id: 'idm-t16', domain: 'FIB-DM Foundation', name: 'Organization', abbreviation: 'ORG', fieldCount: 3 },
  { id: 'idm-t17', domain: 'FIB-DM Foundation', name: 'Account', abbreviation: 'ACCOUNT', fieldCount: 3 },
  { id: 'idm-t18', domain: 'FIB-DM Foundation', name: 'Payment', abbreviation: 'PAYMENT', fieldCount: 3 },
  { id: 'idm-t19', domain: 'FIB-DM Foundation', name: 'Regulation', abbreviation: 'REG', fieldCount: 3 },
  { id: 'idm-t20', domain: 'FIB-DM Foundation', name: 'Jurisdiction', abbreviation: 'JURIS', fieldCount: 3 },
  { id: 'idm-t21', domain: 'FIB-DM Foundation', name: 'Service', abbreviation: 'SERVICE', fieldCount: 3 },
  { id: 'idm-t22', domain: 'Regulatory', name: 'Solvency II', abbreviation: 'SOLV_II', fieldCount: 4 },
  { id: 'idm-t23', domain: 'Regulatory', name: 'Insurance Undertaking', abbreviation: 'INS_UND', fieldCount: 3 },
  { id: 'idm-t24', domain: 'Regulatory', name: 'Reinsurance Undertaking', abbreviation: 'REINS_UND', fieldCount: 3 },
  { id: 'idm-t25', domain: 'Regulatory', name: 'EIOPA', abbreviation: 'EIOPA', fieldCount: 2 },
  { id: 'idm-t26', domain: 'Regulatory', name: 'Solvency Capital Requirement', abbreviation: 'SCR', fieldCount: 3 },
  { id: 'idm-t27', domain: 'Semantic', name: 'Semantic Compliance', abbreviation: 'SEM_COMP', fieldCount: 3 },
  { id: 'idm-t28', domain: 'Semantic', name: 'Financial Regulation Ontology', abbreviation: 'FRO', fieldCount: 3 },
  { id: 'idm-t29', domain: 'Semantic', name: 'Insurance Regulation Ontology', abbreviation: 'IRO', fieldCount: 3 },
  { id: 'idm-t30', domain: 'Semantic', name: 'FIBO', abbreviation: 'FIBO', fieldCount: 3 },
  { id: 'idm-t31', domain: 'Semantic', name: 'FIB-DM', abbreviation: 'FIB_DM', fieldCount: 3 },
  { id: 'idm-t32', domain: 'Semantic', name: 'RDF', abbreviation: 'RDF', fieldCount: 2 },
  { id: 'idm-t33', domain: 'Semantic', name: 'OWL', abbreviation: 'OWL', fieldCount: 2 },
  { id: 'idm-t34', domain: 'Semantic', name: 'SPARQL', abbreviation: 'SPARQL', fieldCount: 2 },
];

const IDM_FIELDS: FieldCodeEntry[] = [
  { id: 'idm-f1', code: 'hasDateInsured', usedInTables: 1, tables: 'INS_POL', description: 'The date on which insurance coverage becomes effective or was bound.' },
  { id: 'idm-f2', code: 'hasCoverageArea', usedInTables: 1, tables: 'INS_POL', description: 'The geographic or territorial scope within which the insurance coverage applies.' },
  { id: 'idm-f3', code: 'hasEffectiveDate', usedInTables: 1, tables: 'INS_POL', description: 'The date from which the insurance policy\'s terms and conditions are in force.' },
  { id: 'idm-f4', code: 'hasPremiumAmount', usedInTables: 1, tables: 'INS_POL', description: 'The monetary consideration paid by the Policyholder to the Insurer in exchange for coverage.' },
  { id: 'idm-f5', code: 'policyId', usedInTables: 9, tables: 'INS_POL, BOND_INS, LIFE_INS, CAR_INS, PROP_INS, COMM_INS, CLAIM, LOC, GUARANTEE', description: 'Unique identifier for an insurance policy.' },
  { id: 'idm-f6', code: 'insurerId', usedInTables: 5, tables: 'INSURER, INS_COMP, INS_POL, LOC, REINS_UND', description: 'Unique identifier for an insurer entity.' },
  { id: 'idm-f7', code: 'policyholderId', usedInTables: 2, tables: 'POL_HOLDER, INS_POL', description: 'Unique identifier for a policyholder entity.' },
  { id: 'idm-f8', code: 'claimId', usedInTables: 1, tables: 'CLAIM', description: 'Unique identifier for a claim.' },
  { id: 'idm-f9', code: 'locId', usedInTables: 1, tables: 'LOC', description: 'Unique identifier for a letter of credit.' },
  { id: 'idm-f10', code: 'jurisdictionCode', usedInTables: 3, tables: 'INS_POL, INS_UND, REINS_UND', description: 'Code identifying the regulatory jurisdiction.' },
  { id: 'idm-f11', code: 'scrValue', usedInTables: 1, tables: 'SCR', description: 'Solvency Capital Requirement value.' },
  { id: 'idm-f12', code: 'mcrValue', usedInTables: 1, tables: 'SOLV_II', description: 'Minimum Capital Requirement value.' },
  { id: 'idm-f13', code: 'technicalProvisions', usedInTables: 1, tables: 'SOLV_II', description: 'Amount an insurance undertaking must hold to meet its obligations.' },
  { id: 'idm-f14', code: 'orsafFlag', usedInTables: 1, tables: 'INS_UND', description: 'Own Risk and Solvency Assessment flag.' },
];

const IDM_CODES: CodeValueEntry[] = [
  { id: 'idm-c1', code: 'SOLV_II', name: 'Solvency II', description: 'EU prudential regulatory regime', codeTable: 'Regulatory Framework' },
  { id: 'idm-c2', code: 'SCR', name: 'Solvency Capital Requirement', description: 'Capital needed with 99.5% confidence', codeTable: 'Solvency Metrics' },
  { id: 'idm-c3', code: 'MCR', name: 'Minimum Capital Requirement', description: 'Minimum acceptable capital level', codeTable: 'Solvency Metrics' },
  { id: 'idm-c4', code: 'EIOPA', name: 'European Insurance and Occupational Pensions Authority', description: 'EU supervisory authority', codeTable: 'Regulatory Bodies' },
  { id: 'idm-c5', code: 'FIBO', name: 'Financial Industry Business Ontology', description: 'OMG standard ontology', codeTable: 'Ontology Standards' },
  { id: 'idm-c6', code: 'FIB_DM', name: 'Financial Industry Business Data Model', description: 'Relational model from FIBO', codeTable: 'Data Model Standards' },
  { id: 'idm-c7', code: 'RDF', name: 'Resource Description Framework', description: 'W3C standard for triples', codeTable: 'Semantic Web Standards' },
  { id: 'idm-c8', code: 'OWL', name: 'Web Ontology Language', description: 'W3C standard for ontologies', codeTable: 'Semantic Web Standards' },
  { id: 'idm-c9', code: 'SPARQL', name: 'SPARQL Protocol and RDF Query Language', description: 'Query language for RDF', codeTable: 'Semantic Web Standards' },
  { id: 'idm-c10', code: 'FRO', name: 'Financial Regulation Ontology', description: 'Aligns FIBO with legal domain', codeTable: 'Regulatory Ontologies' },
  { id: 'idm-c11', code: 'IRO', name: 'Insurance Regulation Ontology', description: 'Insurance-specific FRO implementation', codeTable: 'Regulatory Ontologies' },
  { id: 'idm-c12', code: 'LKIF', name: 'Legal Knowledge Interchange Format', description: 'EU legal ontology project', codeTable: 'Legal Ontologies' },
  { id: 'idm-c13', code: 'LIFE', name: 'Life Insurance', description: 'Covers mortality risk', codeTable: 'Policy Types' },
  { id: 'idm-c14', code: 'AUTO', name: 'Car/Automobile Insurance', description: 'Covers vehicle damage and liability', codeTable: 'Policy Types' },
  { id: 'idm-c15', code: 'PROPERTY', name: 'Property Insurance', description: 'Covers real and personal property', codeTable: 'Policy Types' },
  { id: 'idm-c16', code: 'COMMERCIAL', name: 'Commercial Insurance', description: 'Covers business operational risks', codeTable: 'Policy Types' },
  { id: 'idm-c17', code: 'BOND', name: 'Bond Insurance', description: 'Guarantees bond principal and interest', codeTable: 'Policy Types' },
  { id: 'idm-c18', code: 'EU', name: 'European Union', description: 'EU jurisdiction', codeTable: 'Jurisdictions' },
  { id: 'idm-c19', code: 'US', name: 'United States', description: 'US jurisdiction', codeTable: 'Jurisdictions' },
  { id: 'idm-c20', code: 'CN', name: 'China', description: 'China jurisdiction', codeTable: 'Jurisdictions' },
];

const IDM_TERMS: TermEntry[] = [
  { id: 'idm-tm1', index: 1, term: 'Insurance Policy', relatedCode: 'INS_POL', definition: 'A Contract issued by an Insurer to a Policyholder; the primary insurance instrument that defines coverage terms, conditions, premiums, and obligations.' },
  { id: 'idm-tm2', index: 2, term: 'Bond Insurance', relatedCode: 'BOND_INS', definition: 'A specialized Insurance Policy subtype that guarantees payment of principal and interest on a bond in the event of default.' },
  { id: 'idm-tm3', index: 3, term: 'Insurer', relatedCode: 'INSURER', definition: 'The party (legal entity) that issues Insurance Policies and Letters of Credit, assuming the financial risk defined in the contract.' },
  { id: 'idm-tm4', index: 4, term: 'Policyholder', relatedCode: 'POL_HOLDER', definition: 'The counterparty to the Insurance Policy contract; the entity that purchases coverage and pays premiums.' },
  { id: 'idm-tm5', index: 5, term: 'Insurance Company', relatedCode: 'INS_COMP', definition: 'A named entity in FIB-DM serving as an organizational anchor for insurance-specific content and extensions.' },
  { id: 'idm-tm6', index: 6, term: 'Insurance Service', relatedCode: 'INS_SVC', definition: 'A named entity in FIB-DM available as an anchor for insurance-specific service extensions.' },
  { id: 'idm-tm7', index: 7, term: 'Claim', relatedCode: 'CLAIM', definition: 'A demand by the Policyholder (or beneficiary) for payment under the terms of an Insurance Policy following a covered loss event.' },
  { id: 'idm-tm8', index: 8, term: 'Letter of Credit', relatedCode: 'LOC', definition: 'A financial instrument issued by Insurers that serves as an insurance-backed or collateralized Guarantee.' },
  { id: 'idm-tm9', index: 9, term: 'Guarantee', relatedCode: 'GUARANTEE', definition: 'A broader concept encompassing insurance-backed and collateralized instruments that ensure performance or payment obligations.' },
  { id: 'idm-tm10', index: 10, term: 'Life Insurance Policy', relatedCode: 'LIFE_INS', definition: 'A policy providing a death benefit to beneficiaries upon the insured\'s death; may include savings/investment components.' },
  { id: 'idm-tm11', index: 11, term: 'Car Insurance Policy', relatedCode: 'CAR_INS', definition: 'A policy covering vehicles against physical damage, bodily injury, and third-party liability arising from traffic collisions.' },
  { id: 'idm-tm12', index: 12, term: 'Property Insurance Policy', relatedCode: 'PROP_INS', definition: 'A policy providing protection against risks to property, including fire, theft, and natural disasters.' },
  { id: 'idm-tm13', index: 13, term: 'Commercial Insurance Policy', relatedCode: 'COMM_INS', definition: 'A policy designed to cover businesses against operational risks, including liability, property damage, business interruption, and workers\' compensation.' },
  { id: 'idm-tm14', index: 14, term: 'Solvency II', relatedCode: 'SOLV_II', definition: 'The prudential regulatory regime for insurance and reinsurance undertakings in the European Union, effective from January 1, 2016.' },
  { id: 'idm-tm15', index: 15, term: 'Insurance Undertaking', relatedCode: 'INS_UND', definition: 'A legal entity licensed to conduct insurance business under Solvency II.' },
  { id: 'idm-tm16', index: 16, term: 'Reinsurance Undertaking', relatedCode: 'REINS_UND', definition: 'A legal entity licensed to conduct reinsurance business under Solvency II.' },
  { id: 'idm-tm17', index: 17, term: 'EIOPA', relatedCode: 'EIOPA', definition: 'European Insurance and Occupational Pensions Authority — the EU-level supervisory authority for insurance and pensions.' },
  { id: 'idm-tm18', index: 18, term: 'Solvency Capital Requirement', relatedCode: 'SCR', definition: 'The capital required to ensure an (re)insurance undertaking can meet its obligations over the next 12 months with 99.5% confidence.' },
  { id: 'idm-tm19', index: 19, term: 'Minimum Capital Requirement', relatedCode: 'MCR', definition: 'The minimum level of capital below which policyholders would be exposed to unacceptable risk.' },
  { id: 'idm-tm20', index: 20, term: 'Technical Provisions', relatedCode: '', definition: 'The amount an (re)insurance undertaking must hold to meet its insurance obligations as they fall due.' },
  { id: 'idm-tm21', index: 21, term: 'Own Risk and Solvency Assessment', relatedCode: 'ORSA', definition: 'An internal process by which the undertaking assesses its overall solvency needs given its risk profile.' },
  { id: 'idm-tm22', index: 22, term: 'Semantic Compliance', relatedCode: 'SEM_COMP', definition: 'A Web 3.0-based architecture for regulatory reporting that stores all metadata as RDF/OWL triples within a unified ontology.' },
  { id: 'idm-tm23', index: 23, term: 'Financial Regulation Ontology', relatedCode: 'FRO', definition: 'An ontology that aligns FIBO (finance) with LKIF (legal), linking financial data to legal/regulatory requirements.' },
  { id: 'idm-tm24', index: 24, term: 'Insurance Regulation Ontology', relatedCode: 'IRO', definition: 'An operational implementation of FRO specific to insurance; extends FIBO and LKIF with insurance-specific regulatory concepts.' },
  { id: 'idm-tm25', index: 25, term: 'FIBO', relatedCode: 'FIBO', definition: 'Financial Industry Business Ontology — an open standard ontology for the financial industry, defining business concepts, their properties, and relationships.' },
  { id: 'idm-tm26', index: 26, term: 'FIB-DM', relatedCode: 'FIB_DM', definition: 'Financial Industry Business Data Model — a relational/logical data model derived from FIBO, providing implementable database schemas.' },
  { id: 'idm-tm27', index: 27, term: 'RDF', relatedCode: 'RDF', definition: 'Resource Description Framework — a W3C standard for representing information as subject-predicate-object triples.' },
  { id: 'idm-tm28', index: 28, term: 'OWL', relatedCode: 'OWL', definition: 'Web Ontology Language — a W3C standard extending RDF with formal semantics for classes, properties, and individuals.' },
  { id: 'idm-tm29', index: 29, term: 'SPARQL', relatedCode: 'SPARQL', definition: 'SPARQL Protocol and RDF Query Language — the standard query language for RDF data.' },
  { id: 'idm-tm30', index: 30, term: 'Ontology Alignment', relatedCode: '', definition: 'The process of identifying corresponding entities across different ontologies.' },
];

const IDM_NAMING: NamingEntry[] = [
  { id: 'idm-n1', prefix: 'INS', meaning: 'Insurance', example: 'INS_POL (Insurance Policy)' },
  { id: 'idm-n2', prefix: 'POL', meaning: 'Policy', example: 'POL_HOLDER (Policyholder)' },
  { id: 'idm-n3', prefix: 'LIFE', meaning: 'Life Insurance', example: 'LIFE_INS (Life Insurance Policy)' },
  { id: 'idm-n4', prefix: 'CAR', meaning: 'Car/Auto Insurance', example: 'CAR_INS (Car Insurance Policy)' },
  { id: 'idm-n5', prefix: 'PROP', meaning: 'Property Insurance', example: 'PROP_INS (Property Insurance Policy)' },
  { id: 'idm-n6', prefix: 'COMM', meaning: 'Commercial Insurance', example: 'COMM_INS (Commercial Insurance Policy)' },
  { id: 'idm-n7', prefix: 'BOND', meaning: 'Bond Insurance', example: 'BOND_INS (Bond Insurance Policy)' },
  { id: 'idm-n8', prefix: 'REINS', meaning: 'Reinsurance', example: 'REINS_UND (Reinsurance Undertaking)' },
  { id: 'idm-n9', prefix: 'LOC', meaning: 'Letter of Credit', example: 'LOC (Letter of Credit)' },
  { id: 'idm-n10', prefix: 'SOLV', meaning: 'Solvency', example: 'SOLV_II (Solvency II)' },
  { id: 'idm-n11', prefix: 'SCR', meaning: 'Solvency Capital Requirement', example: 'SCR (Solvency Capital Requirement)' },
  { id: 'idm-n12', prefix: 'MCR', meaning: 'Minimum Capital Requirement', example: 'MCR (Minimum Capital Requirement)' },
  { id: 'idm-n13', prefix: 'EIOPA', meaning: 'European Insurance and Occupational Pensions Authority', example: 'EIOPA' },
  { id: 'idm-n14', prefix: 'FIB', meaning: 'Financial Industry Business', example: 'FIBO, FIB_DM' },
  { id: 'idm-n15', prefix: 'FRO', meaning: 'Financial Regulation Ontology', example: 'FRO' },
  { id: 'idm-n16', prefix: 'IRO', meaning: 'Insurance Regulation Ontology', example: 'IRO' },
  { id: 'idm-n17', prefix: 'RDF', meaning: 'Resource Description Framework', example: 'RDF' },
  { id: 'idm-n18', prefix: 'OWL', meaning: 'Web Ontology Language', example: 'OWL' },
  { id: 'idm-n19', prefix: 'SPARQL', meaning: 'SPARQL Query Language', example: 'SPARQL' },
  { id: 'idm-n20', prefix: 'has', meaning: 'Property prefix', example: 'hasDateInsured, hasPremiumAmount' },
];

const IDM_DEPS: DependencyEntry[] = [
  { id: 'idm-d1', level: 0, description: 'Foundation: OMG Upper Ontologies → FIBO Foundation (FND) → Business Entities (BE) → Finance Business & Commerce (FBC)' },
  { id: 'idm-d2', level: 1, description: 'Core Entities: Legal Entity → Insurer / Insurance Company; Legal Entity → Policyholder; Contract → Insurance Policy' },
  { id: 'idm-d3', level: 2, description: 'Policy Hierarchy: Insurance Policy → Bond Insurance; Insurance Policy → Life/Car/Property/Commercial Insurance (proposed)' },
  { id: 'idm-d4', level: 3, description: 'Insurance Operations: Insurer issues Insurance Policy; Policyholder holds Insurance Policy; Insurance Policy can have Claim' },
  { id: 'idm-d5', level: 4, description: 'Financial Instruments: Insurer issues Letter of Credit; Letter of Credit is a type of Guarantee' },
  { id: 'idm-d6', level: 5, description: 'Regulatory: Insurance Undertaking / Reinsurance Undertaking subject to Solvency II; EIOPA supervises EU insurance market' },
  { id: 'idm-d7', level: 6, description: 'Semantic: LKIF → FRO → IRO; FIBO → FIB-DM; RDF + OWL + SPARQL enable semantic compliance' },
  { id: 'idm-d8', level: 7, description: 'Alignment: FIBO (finance) aligned with FRO/LKIF (legal) via ontology alignment' },
];

const IDM_OVERVIEW: OverviewEntry[] = [
  { id: 'idm-o1', domain: 'Core Insurance', tableCount: 9, coreEntities: 'Insurance Policy, Insurer, Policyholder, Claim, Letter of Credit, Guarantee, Bond Insurance', description: 'Central insurance domain entities and relationships' },
  { id: 'idm-o2', domain: 'Policy Subtypes', tableCount: 4, coreEntities: 'Life Insurance, Car Insurance, Property Insurance, Commercial Insurance', description: 'Proposed insurance policy subtypes' },
  { id: 'idm-o3', domain: 'FIB-DM Foundation', tableCount: 8, coreEntities: 'Contract, Legal Entity, Organization, Account, Payment, Regulation, Jurisdiction, Service', description: 'FIB-DM foundational entities relevant to insurance' },
  { id: 'idm-o4', domain: 'Regulatory Compliance', tableCount: 5, coreEntities: 'Solvency II, Insurance Undertaking, Reinsurance Undertaking, EIOPA, SCR', description: 'EU insurance regulatory framework and requirements' },
  { id: 'idm-o5', domain: 'Semantic Web', tableCount: 7, coreEntities: 'FIBO, FIB-DM, RDF, OWL, SPARQL, FRO, IRO', description: 'Semantic web technologies and ontologies for insurance' },
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
  ACORD_BUNDLE,
  emptyBundle({
    id: 'iso', abbreviation: 'ISO', name: 'International Organization for Standardization',
    description: 'Worldwide federation of national standards bodies. ISO 20022, ISO 8601, ISO 3166, etc.',
    version: '2024', status: 'active', sourceUrl: 'https://www.iso.org',
    tags: ['international', 'standards']
  }),
  {
    standard: {
      id: 'insurance-ontology', abbreviation: 'IDM', name: 'Insurance Data Model',
      description: 'OMG Insurance Data Model — ontology-based standard for insurance domain entities, attributes, and relationships.',
      version: '1.0', status: 'active', sourceUrl: 'https://insuranceontology.com/insurance-data-model/',
      tags: ['insurance', 'ontology', 'OMG', 'data model']
    },
    entries: { tables: IDM_TABLES, fields: IDM_FIELDS, codes: IDM_CODES, terms: IDM_TERMS, naming: IDM_NAMING, dependencies: IDM_DEPS, overview: IDM_OVERVIEW }
  },
];

const BusinessGlossary: React.FC = () => {
  const { collapsed } = useSidebar();
  const [bundles, setBundles] = useState<StandardBundle[]>(STANDARDS);
  const [activeStandardId, setActiveStandardId] = useState<string>(STANDARDS[0].standard.id);
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [editingEntry, setEditingEntry] = useState<{ section: SectionId; row: Record<string, unknown> | null } | null>(null);
  const [editingStandard, setEditingStandard] = useState<Standard | null>(null);
  const [isAddingStandard, setIsAddingStandard] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ kind: 'standard' | 'entry'; section?: SectionId; id?: string; label: string } | null>(null);

  const activeBundle = useMemo(
    () => bundles.find(b => b.standard.id === activeStandardId) ?? bundles[0],
    [bundles, activeStandardId]
  );
  const { standard, entries } = activeBundle;

  // Ensure active standard always exists (e.g. after deletion)
  useEffect(() => {
    if (!bundles.find(b => b.standard.id === activeStandardId) && bundles.length > 0) {
      setActiveStandardId(bundles[0].standard.id);
    }
  }, [bundles, activeStandardId]);

  // ----- Handlers -----
  const updateBundle = (standardId: string, updater: (b: StandardBundle) => StandardBundle) => {
    setBundles(prev => prev.map(b => b.standard.id === standardId ? updater(b) : b));
  };

  const handleSaveEntry = (section: SectionId, row: Record<string, unknown>) => {
    updateBundle(activeStandardId, b => ({
      ...b,
      entries: { ...b.entries, [section]: [...b.entries[section], row as never] }
    }));
    toast.success('Entry added');
  };

  const handleUpdateEntry = (section: SectionId, row: Record<string, unknown>) => {
    updateBundle(activeStandardId, b => ({
      ...b,
      entries: {
        ...b.entries,
        [section]: b.entries[section].map((e: { id: string }) => e.id === row.id ? row as never : e)
      }
    }));
    toast.success('Entry updated');
  };

  const handleDeleteEntry = (section: SectionId, id: string) => {
    updateBundle(activeStandardId, b => ({
      ...b,
      entries: { ...b.entries, [section]: b.entries[section].filter((e: { id: string }) => e.id !== id) }
    }));
    toast.success('Entry deleted');
  };

  const handleSaveStandard = (s: Standard) => {
    if (bundles.find(b => b.standard.id === s.id)) {
      setBundles(prev => prev.map(b => b.standard.id === s.id ? { ...b, standard: s } : b));
      toast.success('Standard updated');
    } else {
      setBundles(prev => [...prev, { standard: s, entries: { tables: [], fields: [], codes: [], terms: [], naming: [], dependencies: [], overview: [] } }]);
      setActiveStandardId(s.id);
      toast.success('Standard added');
    }
  };

  const handleDeleteStandard = (id: string) => {
    if (bundles.length <= 1) {
      toast.error('Cannot delete the last standard');
      return;
    }
    setBundles(prev => prev.filter(b => b.standard.id !== id));
    toast.success('Standard deleted');
  };

  // Row action buttons used by every DataTable
  const renderEntryActions = (section: Exclude<SectionId, 'overview'>, id: string, label: string) => (
    <div className="inline-flex items-center gap-0.5">
      <Button
        variant="ghost" size="icon" className="h-7 w-7"
        onClick={() => {
          const row = entries[section].find(e => e.id === id);
          if (row) setEditingEntry({ section, row: { ...row } });
        }}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost" size="icon" className="h-7 w-7"
        onClick={() => setPendingDelete({ kind: 'entry', section, id, label: `${SECTION_LABELS[section]} "${label}"` })}
      >
        <Trash2 className="h-3.5 w-3.5 text-red-500" />
      </Button>
    </div>
  );

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
          <Button className="flex items-center gap-2" onClick={() => setIsAddingStandard(true)}>
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
                    <Button variant="ghost" size="icon" onClick={() => setEditingStandard(standard)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPendingDelete({
                        kind: 'standard',
                        id: standard.id,
                        label: `standard "${standard.abbreviation}"`
                      })}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
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
                <SectionHeader
                  title="Domain Overview"
                  description="High-level summary of business domains covered by this standard."
                  onAdd={() => setEditingEntry({ section: 'overview', row: null })}
                />
                <div className="grid grid-cols-2 gap-3">
                  {filteredOverview.map(o => (
                    <Card key={o.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-gray-900">{o.domain}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{o.tableCount} tables</Badge>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => setEditingEntry({ section: 'overview', row: { ...o } })}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => setPendingDelete({
                                kind: 'entry', section: 'overview', id: o.id,
                                label: `overview "${o.domain}"`
                              })}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </div>
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
                <SectionHeader
                  title="Data Tables"
                  description="Tables defined in this standard, grouped by business domain."
                  onAdd={() => setEditingEntry({ section: 'tables', row: null })}
                />
                <DataTable<TableEntry>
                  rows={filteredTables}
                  columns={[
                    { key: 'domain', label: 'Domain', render: r => <Badge variant="secondary">{r.domain}</Badge> },
                    { key: 'abbreviation', label: 'Abbreviation', render: r => <span className="font-mono font-semibold text-blue-700">{r.abbreviation}</span> },
                    { key: 'name', label: 'Name (CN)' },
                    { key: 'fieldCount', label: 'Fields', render: r => <span className="text-gray-600">{r.fieldCount}</span> },
                  ]}
                  emptyText="No tables in this standard yet."
                  renderActions={r => renderEntryActions('tables', r.id, r.name)}
                />
              </TabsContent>

              {/* Field Codes */}
              <TabsContent value="fields" className="mt-4">
                <SectionHeader
                  title="Field Codes"
                  description="Cross-table field codes and their meanings."
                  onAdd={() => setEditingEntry({ section: 'fields', row: null })}
                />
                <DataTable<FieldCodeEntry>
                  rows={filteredFields}
                  columns={[
                    { key: 'code', label: 'Code', render: r => <span className="font-mono font-semibold text-blue-700">{r.code}</span> },
                    { key: 'usedInTables', label: 'Used In', render: r => <span className="text-gray-600">{r.usedInTables} tables</span> },
                    { key: 'tables', label: 'Sample Tables', render: r => <span className="text-xs text-gray-500">{r.tables}</span> },
                    { key: 'description', label: 'Description', render: r => <span className="text-sm text-gray-700">{r.description}</span> },
                  ]}
                  emptyText="No field codes defined."
                  renderActions={r => renderEntryActions('fields', r.id, r.code)}
                />
              </TabsContent>

              {/* Code Values */}
              <TabsContent value="codes" className="mt-4">
                <SectionHeader
                  title="Code Values"
                  description="Enumerated values for business code fields."
                  onAdd={() => setEditingEntry({ section: 'codes', row: null })}
                />
                <DataTable<CodeValueEntry>
                  rows={filteredCodes}
                  columns={[
                    { key: 'codeTable', label: 'Code Table', render: r => <Badge variant="outline">{r.codeTable}</Badge> },
                    { key: 'code', label: 'Code', render: r => <span className="font-mono font-semibold">{r.code}</span> },
                    { key: 'name', label: 'Name' },
                    { key: 'description', label: 'Description', render: r => <span className="text-sm text-gray-600">{r.description || '—'}</span> },
                  ]}
                  emptyText="No code values defined."
                  renderActions={r => renderEntryActions('codes', r.id, `${r.code} ${r.name}`)}
                />
              </TabsContent>

              {/* Terms */}
              <TabsContent value="terms" className="mt-4">
                <SectionHeader
                  title="Core Business Terms"
                  description="Core business term definitions."
                  onAdd={() => setEditingEntry({ section: 'terms', row: null })}
                />
                <DataTable<TermEntry>
                  rows={filteredTerms}
                  columns={[
                    { key: 'index', label: '#', render: r => <span className="text-gray-400">{r.index}</span> },
                    { key: 'term', label: 'Term', render: r => <span className="font-medium text-gray-900">{r.term}</span> },
                    { key: 'relatedCode', label: 'Code', render: r => r.relatedCode ? <span className="font-mono text-blue-700 text-xs">{r.relatedCode}</span> : <span className="text-gray-300">—</span> },
                    { key: 'definition', label: 'Definition', render: r => <span className="text-sm text-gray-700">{r.definition}</span> },
                  ]}
                  emptyText="No terms defined."
                  renderActions={r => renderEntryActions('terms', r.id, r.term)}
                />
              </TabsContent>

              {/* Naming */}
              <TabsContent value="naming" className="mt-4">
                <SectionHeader
                  title="Naming Conventions"
                  description="Prefix and suffix conventions for fields and tables."
                  onAdd={() => setEditingEntry({ section: 'naming', row: null })}
                />
                <DataTable<NamingEntry>
                  rows={filteredNaming}
                  columns={[
                    { key: 'prefix', label: 'Prefix / Suffix', render: r => <span className="font-mono font-semibold text-blue-700">{r.prefix}</span> },
                    { key: 'meaning', label: 'Meaning' },
                    { key: 'example', label: 'Example', render: r => <span className="text-sm text-gray-600">{r.example}</span> },
                  ]}
                  emptyText="No naming conventions defined."
                  renderActions={r => renderEntryActions('naming', r.id, r.prefix)}
                />
              </TabsContent>

              {/* Dependencies */}
              <TabsContent value="dependencies" className="mt-4">
                <SectionHeader
                  title="Table Dependencies"
                  description="Load order and inter-table dependencies."
                  onAdd={() => setEditingEntry({ section: 'dependencies', row: null })}
                />
                <Card>
                  <CardContent className="p-0">
                    <ul>
                      {filteredDeps.map(d => (
                        <li key={d.id} className="flex items-start gap-3 px-4 py-3 border-b last:border-0">
                          <Badge variant="outline" className="mt-0.5">Level {d.level}</Badge>
                          <span className="text-sm text-gray-700 flex-1">{d.description}</span>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => setEditingEntry({ section: 'dependencies', row: { ...d } })}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => setPendingDelete({
                              kind: 'entry', section: 'dependencies', id: d.id,
                              label: `dependency "Level ${d.level}"`
                            })}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
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

      {/* Dialogs */}
      {editingEntry && (
        <EditEntryDialog
          section={editingEntry.section}
          row={editingEntry.row}
          onSave={(row) => {
            if (editingEntry.row) {
              handleUpdateEntry(editingEntry.section, row);
            } else {
              handleSaveEntry(editingEntry.section, row);
            }
            setEditingEntry(null);
          }}
          onClose={() => setEditingEntry(null)}
        />
      )}
      {(editingStandard || isAddingStandard) && (
        <EditStandardDialog
          standard={editingStandard}
          onSave={(s) => {
            handleSaveStandard(s);
            setEditingStandard(null);
            setIsAddingStandard(false);
          }}
          onClose={() => {
            setEditingStandard(null);
            setIsAddingStandard(false);
          }}
        />
      )}
      {pendingDelete && (
        <ConfirmDeleteDialog
          label={pendingDelete.label}
          onConfirm={() => {
            if (pendingDelete.kind === 'standard' && pendingDelete.id) {
              handleDeleteStandard(pendingDelete.id);
            } else if (pendingDelete.kind === 'entry' && pendingDelete.section && pendingDelete.id) {
              handleDeleteEntry(pendingDelete.section, pendingDelete.id);
            }
          }}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
};

// ----- Local sub-components -----
const SectionHeader: React.FC<{ title: string; description: string; onAdd?: () => void }> = ({
  title, description, onAdd
}) => (
  <div className="flex items-start justify-between mb-3">
    <div>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
    </div>
    {onAdd && (
      <Button size="sm" variant="outline" onClick={onAdd} className="flex items-center gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        Add
      </Button>
    )}
  </div>
);

interface ColumnDef<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

function DataTable<T extends { id: string }>({
  rows,
  columns,
  emptyText,
  renderActions,
  pageSize = 25
}: {
  rows: T[];
  columns: ColumnDef<T>[];
  emptyText: string;
  renderActions?: (row: T) => React.ReactNode;
  pageSize?: number;
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const visible = rows.slice(start, start + pageSize);

  // Reset to first page whenever the data set changes.
  useEffect(() => {
    setPage(1);
  }, [rows]);

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
              {renderActions && (
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide w-24">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {visible.map(row => (
              <tr key={row.id} className="border-b last:border-0 hover:bg-gray-50">
                {columns.map(c => (
                  <td key={c.key} className={cn("px-4 py-3 align-top", c.className)}>
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                  </td>
                ))}
                {renderActions && (
                  <td className="px-4 py-3 align-top text-right">
                    {renderActions(row)}
                  </td>
                )}
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={columns.length + (renderActions ? 1 : 0)} className="px-4 py-12 text-center text-sm text-gray-500">
                  <BookOpen className="h-6 w-6 mx-auto mb-2 text-gray-300" />
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length > pageSize && (
        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 text-sm text-gray-600">
          <span>
            Showing <span className="font-medium">{start + 1}</span>–<span className="font-medium">{Math.min(start + pageSize, rows.length)}</span> of <span className="font-medium">{rows.length}</span>
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={safePage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <span>Page {safePage} / {totalPages}</span>
            <Button
              size="sm"
              variant="outline"
              disabled={safePage >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ----- Edit / Add / Delete dialogs -----

const EditEntryDialog: React.FC<{
  section: SectionId;
  row: Record<string, unknown> | null;
  onSave: (row: Record<string, unknown>) => void;
  onClose: () => void;
}> = ({ section, row, onSave, onClose }) => {
  const fields = getFieldsForSection(section);
  const isEdit = row !== null;
  const [form, setForm] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    fields.forEach(f => {
      const v = row ? row[f.key] : '';
      init[f.key] = v === undefined || v === null ? '' : String(v);
    });
    return init;
  });

  const handleSubmit = () => {
    for (const f of fields) {
      if (f.required && !form[f.key]?.trim()) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    const result: Record<string, unknown> = { ...form };
    fields.forEach(f => {
      if (f.type === 'number') {
        const n = parseInt(form[f.key], 10);
        result[f.key] = Number.isFinite(n) ? n : 0;
      }
    });
    if (!isEdit) {
      result.id = `${section}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }
    onSave(result);
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit' : 'Add'} {SECTION_LABELS[section]}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the entry details.' : 'Create a new entry in this section.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {fields.map(f => (
            <div key={f.key} className="grid gap-1.5">
              <Label htmlFor={`f-${f.key}`}>
                {f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}
              </Label>
              {f.type === 'textarea' ? (
                <Textarea
                  id={`f-${f.key}`}
                  value={form[f.key] ?? ''}
                  onChange={(e) => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  rows={3}
                />
              ) : (
                <Input
                  id={`f-${f.key}`}
                  type={f.type === 'number' ? 'number' : 'text'}
                  value={form[f.key] ?? ''}
                  onChange={(e) => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>{isEdit ? 'Save' : 'Add'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const EditStandardDialog: React.FC<{
  standard: Standard | null;
  onSave: (s: Standard) => void;
  onClose: () => void;
}> = ({ standard, onSave, onClose }) => {
  const isEdit = standard !== null;
  const [form, setForm] = useState<Standard>(() => standard ?? {
    id: '', abbreviation: '', name: '', description: '', version: '1.0',
    status: 'draft', sourceUrl: '', tags: []
  });
  const [tagsText, setTagsText] = useState(form.tags.join(', '));

  const handleSubmit = () => {
    if (!form.id.trim() || !form.name.trim() || !form.abbreviation.trim()) {
      toast.error('ID, Abbreviation and Name are required');
      return;
    }
    onSave({
      ...form,
      tags: tagsText.split(',').map(t => t.trim()).filter(Boolean)
    });
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit' : 'Add'} Standard</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the standard details.' : 'Create a new business glossary standard.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid gap-1.5">
            <Label htmlFor="std-id">ID<span className="text-red-500 ml-0.5">*</span></Label>
            <Input
              id="std-id"
              value={form.id}
              disabled={isEdit}
              onChange={(e) => setForm(f => ({ ...f, id: e.target.value }))}
              placeholder="e.g. basel-iii"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="std-abbr">Abbreviation<span className="text-red-500 ml-0.5">*</span></Label>
            <Input
              id="std-abbr"
              value={form.abbreviation}
              onChange={(e) => setForm(f => ({ ...f, abbreviation: e.target.value }))}
              placeholder="e.g. B3"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="std-name">Name<span className="text-red-500 ml-0.5">*</span></Label>
            <Input
              id="std-name"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="std-desc">Description</Label>
            <Textarea
              id="std-desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="std-ver">Version</Label>
              <Input
                id="std-ver"
                value={form.version}
                onChange={(e) => setForm(f => ({ ...f, version: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="std-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm(f => ({ ...f, status: v as Standard['status'] }))}
              >
                <SelectTrigger id="std-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="deprecated">Deprecated</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="std-src">Source URL</Label>
            <Input
              id="std-src"
              value={form.sourceUrl}
              onChange={(e) => setForm(f => ({ ...f, sourceUrl: e.target.value }))}
              placeholder="https://..."
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="std-tags">Tags (comma-separated)</Label>
            <Input
              id="std-tags"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="e.g. insurance, regulatory, 2024"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>{isEdit ? 'Save' : 'Add'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ConfirmDeleteDialog: React.FC<{
  label: string;
  onConfirm: () => void;
  onClose: () => void;
}> = ({ label, onConfirm, onClose }) => (
  <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>Delete {label}?</DialogTitle>
        <DialogDescription>This action cannot be undone.</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          variant="destructive"
          onClick={() => { onConfirm(); onClose(); }}
        >
          Delete
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default BusinessGlossary;
