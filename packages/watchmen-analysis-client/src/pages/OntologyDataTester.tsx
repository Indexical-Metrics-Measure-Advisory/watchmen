import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Boxes, Table2, FlaskConical, RefreshCw, Play, Copy, Check, Loader2,
	AlertTriangle, Sigma, Plus, X, Database, ChevronDown, ChevronRight,
} from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { VirtualOntology, physicalTableKindConfig, aggregateConfig } from '@/model/ontology';
import { ontologyService, resolvePhysicalTableLabel } from '@/services/ontologyService';
import {
	ontologyQueryService, OntologyQueryRequest, OntologyCompileResult, OntologyQueryResult,
} from '@/services/ontologyQueryService';

const ROW_LIMIT_OPTIONS = [10, 50, 100, 200, 500];

const OntologyDataTester: React.FC = () => {
	const { t } = useTranslation('ontologyDataTester');
	const { collapsed } = useSidebar();

	const [ontologies, setOntologies] = useState<VirtualOntology[]>([]);
	const [loadingMeta, setLoadingMeta] = useState(true);

	const [ontologyId, setOntologyId] = useState<string>('');
	const [objectId, setObjectId] = useState<string>('');

	// 查询参数
	const [selectedFields, setSelectedFields] = useState<string[]>([]); // 空 = 全部 attribute
	const [selectedDerived, setSelectedDerived] = useState<string[]>([]);
	const [filters, setFilters] = useState<Record<string, string>>({});
	const [limit, setLimit] = useState<number>(100);
	const [offset, setOffset] = useState<number>(0);

	// 结果状态
	const [compileResult, setCompileResult] = useState<OntologyCompileResult | null>(null);
	const [compiling, setCompiling] = useState(false);
	const [queryResult, setQueryResult] = useState<OntologyQueryResult | null>(null);
	const [running, setRunning] = useState(false);
	const [error, setError] = useState<string>('');
	const [copied, setCopied] = useState(false);

	const [expandedObjects, setExpandedObjects] = useState<Set<string>>(new Set());

	// ---- 加载本体论列表 ----
	const reloadOntologies = async () => {
		setLoadingMeta(true);
		try {
			const list = await ontologyService.list();
			setOntologies(list);
		} catch (e) {
			console.error('[OntologyDataTester] failed to load ontologies', e);
		} finally {
			setLoadingMeta(false);
		}
	};

	useEffect(() => {
		reloadOntologies();
	}, []);

	const ontology = useMemo(
		() => ontologies.find((o) => (o.ontologyId ?? o.id) === ontologyId) ?? null,
		[ontologies, ontologyId],
	);

	const virtualObject = useMemo(
		() => ontology?.virtualObjects.find((vo) => vo.id === objectId) ?? null,
		[ontology, objectId],
	);

	// ---- Reset query parameters when switching objects ----
	useEffect(() => {
		setSelectedFields([]);
		setSelectedDerived([]);
		setFilters({});
		setOffset(0);
		setCompileResult(null);
		setQueryResult(null);
		setError('');
	}, [objectId]);

	// ---- Assemble OntologyQueryRequest ----
	const buildRequest = (): OntologyQueryRequest | null => {
		if (!virtualObject) return null;
		const cleanFilters: Record<string, unknown> = {};
		Object.entries(filters).forEach(([k, v]) => {
			if (v.trim() !== '') cleanFilters[k] = v.trim();
		});
		return {
			virtualObjectId: virtualObject.id,
			fields: selectedFields,
			includeDerived: selectedDerived,
			filters: cleanFilters,
			limit,
			offset,
		};
	};

	// ---- Compile SQL (preview) ----
	const runCompile = async () => {
		const req = buildRequest();
		if (!req || !ontologyId) return;
		setCompiling(true);
		setError('');
		try {
			const res = await ontologyQueryService.compile(ontologyId, req);
			setCompileResult(res);
		} catch (e) {
			setError((e as Error).message || t('compilationFailed'));
			setCompileResult(null);
		} finally {
			setCompiling(false);
		}
	};

	// ---- 执行查询 ----
	const runQuery = async () => {
		const req = buildRequest();
		if (!req || !ontologyId) return;
		setRunning(true);
		setError('');
		setQueryResult(null);
		try {
			// Refresh SQL preview simultaneously for comparison
			const [compile, query] = await Promise.all([
				ontologyQueryService.compile(ontologyId, req),
				ontologyQueryService.query(ontologyId, req),
			]);
			setCompileResult(compile);
			setQueryResult(query);
		} catch (e) {
			// 后端返回的错误消息（包括 'filters is required...'）会被完整展示
			setError((e as Error).message || t('queryFailed'));
		} finally {
			setRunning(false);
		}
	};

	const copySql = async () => {
		if (!compileResult?.sql) return;
		try {
			await navigator.clipboard.writeText(compileResult.sql);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			/* ignore */
		}
	};

	const onSelectOntology = (id: string) => {
		setOntologyId(id);
		const ont = ontologies.find((o) => (o.ontologyId ?? o.id) === id);
		setObjectId(ont?.virtualObjects[0]?.id ?? '');
	};

	const toggleField = (name: string) => {
		setSelectedFields((prev) => (prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name]));
	};
	const toggleDerived = (name: string) => {
		setSelectedDerived((prev) => (prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name]));
	};
	const toggleObject = (id: string) => {
		setExpandedObjects((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const allAttributeNames = useMemo(
		() => (virtualObject?.attributes ?? []).map((a) => a.name).filter(Boolean),
		[virtualObject],
	);
	const allDerivedNames = useMemo(
		() => (virtualObject?.derivedAttributes ?? []).map((d) => d.name).filter(Boolean),
		[virtualObject],
	);

	// Result columns: based on row keys returned by query, fallback to compile labels
	const resultColumns = useMemo(() => {
		if (queryResult?.rows?.length) return Object.keys(queryResult.rows[0]);
		return compileResult?.labels ?? [];
	}, [queryResult, compileResult]);

	return (
		<div className="min-h-screen bg-background">
			<Sidebar />
			<div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300`}>
				<Header />
				<main className="container py-6">
					{/* 标题区 */}
					<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
						<div>
							<h1 className="text-2xl font-semibold flex items-center gap-2">
								<FlaskConical className="w-6 h-6 text-indigo-600" />
								{t('pageTitle')}
							</h1>
							<p className="text-muted-foreground mt-1">
								{t('pageSubtitle')}
							</p>
						</div>
						<Button variant="ghost" size="icon" onClick={reloadOntologies} title={t('refreshOntologies')} disabled={loadingMeta}>
							<RefreshCw className={cn('w-4 h-4', loadingMeta && 'animate-spin')} />
						</Button>
					</div>

					{loadingMeta ? (
						<Card>
							<CardContent className="flex items-center justify-center py-12">
								<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
							</CardContent>
						</Card>
					) : (
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							{/* 左侧：配置面板 */}
							<div className="lg:col-span-1 space-y-4">
								<Card>
									<CardHeader className="pb-3">
										<CardTitle className="text-base flex items-center gap-2">
											<Boxes className="w-4 h-4 text-indigo-500" />
											{t('configSelection')}
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="space-y-2">
											<label className="text-xs font-medium text-muted-foreground">{t('virtualOntology')}</label>
											<Select value={ontologyId} onValueChange={onSelectOntology}>
												<SelectTrigger><SelectValue placeholder={t('selectOntology')} /></SelectTrigger>
												<SelectContent>
													{ontologies.map((o) => (
														<SelectItem key={o.ontologyId ?? o.id} value={o.ontologyId ?? o.id}>
															{o.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>

										<div className="space-y-2">
											<label className="text-xs font-medium text-muted-foreground">{t('virtualObject')}</label>
											<Select value={objectId} onValueChange={setObjectId} disabled={!ontology}>
												<SelectTrigger><SelectValue placeholder={t('selectVirtualObject')} /></SelectTrigger>
												<SelectContent>
													{(ontology?.virtualObjects ?? []).map((vo) => (
														<SelectItem key={vo.id} value={vo.id}>
															<span className="mr-1">{vo.icon || '📦'}</span>{vo.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>

										{virtualObject?.datasourceId && (
											<div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
												<Database className="w-3.5 h-3.5" />
												{t('datasourceBound', { id: virtualObject.datasourceId })}
											</div>
										)}
										{virtualObject && !virtualObject.datasourceId && (
											<div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
												<AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
												<span>{t('noDatasourceWarning')}</span>
											</div>
										)}
									</CardContent>
								</Card>

								{/* 属性 / 衍生 / 过滤 */}
								{virtualObject && (
									<Card>
										<CardHeader className="pb-3">
											<CardTitle className="text-base flex items-center gap-2">
												<Table2 className="w-4 h-4 text-purple-500" />
												{virtualObject.icon || '📦'} {virtualObject.name}
											</CardTitle>
											<CardDescription className="line-clamp-2">{virtualObject.description}</CardDescription>
										</CardHeader>
										<CardContent className="space-y-4">
											{/* Return fields */}
											<div className="space-y-2">
												<div className="flex items-center justify-between">
													<label className="text-xs font-medium text-muted-foreground">{t('returnFields')}</label>
													<Button variant="ghost" size="sm" className="h-6 text-xs px-2"
														onClick={() => setSelectedFields(selectedFields.length === 0 ? allAttributeNames : [])}>
														{selectedFields.length === 0 ? t('selectAll') : t('clear')}
													</Button>
												</div>
												<p className="text-[11px] text-muted-foreground/80">{t('emptyReturnsAll')}</p>
												<div className="flex flex-wrap gap-1.5">
													{(virtualObject.attributes ?? []).map((a) => {
														const on = selectedFields.includes(a.name);
														return (
															<button key={a.name} onClick={() => toggleField(a.name)}
																className={cn('text-xs px-2 py-1 rounded-md border transition-colors',
																	on ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-muted/30 hover:bg-muted border-transparent')}>
																{a.name}
															</button>
														);
													})}
													{allAttributeNames.length === 0 && (
														<span className="text-xs text-muted-foreground">{t('noAttributes')}</span>
													)}
												</div>
											</div>

											{/* Derived attributes */}
											{allDerivedNames.length > 0 && (
												<div className="space-y-2">
													<label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
														<Sigma className="w-3 h-3" /> {t('derivedAttributes')}
													</label>
													<div className="flex flex-wrap gap-1.5">
														{(virtualObject.derivedAttributes ?? []).map((d) => {
															const on = selectedDerived.includes(d.name);
															const cfg = aggregateConfig[d.aggregate] ?? aggregateConfig.count;
															return (
																<button key={d.id} onClick={() => toggleDerived(d.name)}
																	className={cn('text-xs px-2 py-1 rounded-md border transition-colors inline-flex items-center gap-1',
																		on ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-muted/30 hover:bg-muted border-transparent')}>
																	<span>{cfg.icon}</span>{d.name}
																</button>
															);
														})}
													</div>
												</div>
											)}

											{/* Filters */}
											<div className="space-y-2">
												<label className="text-xs font-medium text-muted-foreground">
													{t('filters')} <span className="text-red-500">*</span>
												</label>
												{allAttributeNames.length === 0 ? (
													<span className="text-xs text-muted-foreground">{t('noAttributesForFilter')}</span>
												) : (
													<>
														<FilterEditor
															attributeNames={allAttributeNames}
															filters={filters}
															onChange={setFilters}
															t={t}
														/>
														{Object.keys(filters).length === 0 && (
															<p className="text-[11px] text-amber-600">{t('filtersRequired')}</p>
														)}
													</>
												)}
											</div>

											{/* Pagination */}
											<div className="grid grid-cols-2 gap-3">
												<div className="space-y-2">
													<label className="text-xs font-medium text-muted-foreground">{t('limit')}</label>
													<Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
														<SelectTrigger><SelectValue /></SelectTrigger>
														<SelectContent>
															{ROW_LIMIT_OPTIONS.map((n) => (
																<SelectItem key={n} value={String(n)}>{n}</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>
												<div className="space-y-2">
													<label className="text-xs font-medium text-muted-foreground">{t('offset')}</label>
													<Input type="number" min={0} value={offset}
														onChange={(e) => setOffset(Math.max(0, Number(e.target.value) || 0))} />
												</div>
											</div>
										</CardContent>
									</Card>
								)}
							</div>

							{/* 右侧：SQL 预览 + 结果 */}
							<div className="lg:col-span-2 space-y-4">
								<Card>
									<CardHeader className="pb-3">
										<div className="flex items-center justify-between">
											<CardTitle className="text-base flex items-center gap-2">
												<FlaskConical className="w-4 h-4 text-indigo-500" />
												{t('compiledSql')}
											</CardTitle>
											<div className="flex items-center gap-2">
												<Button variant="ghost" size="sm" className="gap-1.5 h-8"
													onClick={runCompile} disabled={compiling || !virtualObject}>
													{compiling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
													{t('compile')}
												</Button>
												<Button variant="ghost" size="sm" className="gap-1.5 h-8"
													onClick={copySql} disabled={!compileResult?.sql}>
													{copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
													{copied ? t('copied') : t('copy')}
												</Button>
											</div>
										</div>
				    				</CardHeader>
									<CardContent className="space-y-3">
										{compileResult ? (
											<>
												{compileResult.labels.length > 0 && (
													<div className="flex flex-wrap items-center gap-1.5 text-xs">
														<span className="text-muted-foreground">{t('columns')}:</span>
														{compileResult.labels.map((l) => (
															<Badge key={l} variant="secondary" className="text-[10px]">{l}</Badge>
														))}
													</div>
												)}
												<pre className="font-mono text-xs bg-muted/40 border rounded-md p-3 overflow-auto max-h-[240px] whitespace-pre-wrap break-all">
													{compileResult.sql}
												</pre>
											</>
										) : (
											<pre className="font-mono text-xs text-muted-foreground bg-muted/20 border rounded-md p-3 min-h-[120px]">
												{virtualObject ? t('clickCompileHint') : t('selectObjectFirst')}
											</pre>
										)}
										<div className="flex items-center justify-end">
											<Button className="gap-2" onClick={runQuery} disabled={running || !virtualObject}>
												{running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
												{running ? t('running') : t('executeQuery')}
											</Button>
										</div>
									</CardContent>
								</Card>

								{/* Error */}
								{error && (
									<Card className="border-red-200">
										<CardContent className="py-4">
											<div className="flex items-start gap-2 text-sm text-red-700">
												<AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
												<div>
													<div className="font-medium mb-1">{t('failed')}</div>
													<pre className="whitespace-pre-wrap text-xs text-red-600">{error}</pre>
												</div>
											</div>
										</CardContent>
									</Card>
								)}

								{/* Query results */}
								{queryResult && (
									<Card>
										<CardHeader className="pb-3">
											<div className="flex items-center justify-between">
												<CardTitle className="text-base flex items-center gap-2">
													<Table2 className="w-4 h-4 text-emerald-500" />
													{t('queryResults')}
												</CardTitle>
												<span className="text-xs text-muted-foreground">
													{t('rowsLabel', { count: queryResult.rows.length })}
													{queryResult.total != null ? t('totalLabel', { count: queryResult.total }) : ''}
													{' × '}{t('columnsLabel', { count: resultColumns.length })}
												</span>
											</div>
										</CardHeader>
										<CardContent>
											<ResultTable columns={resultColumns} rows={queryResult.rows} t={t} />
										</CardContent>
									</Card>
								)}

								{/* Virtual objects list */}
								{ontology && ontology.virtualObjects.length > 0 && (
									<Card>
										<CardHeader className="pb-3">
											<CardTitle className="text-base flex items-center gap-2">
												<Boxes className="w-4 h-4 text-indigo-500" />
												{t('virtualObjectsList')}
												<span className="text-muted-foreground font-normal text-sm">({ontology.virtualObjects.length})</span>
											</CardTitle>
										</CardHeader>
										<CardContent className="space-y-1">
											{ontology.virtualObjects.map((vo) => {
												const expanded = expandedObjects.has(vo.id);
												const isActive = vo.id === objectId;
												return (
													<div key={vo.id} className={cn('rounded-md border', isActive ? 'border-indigo-300 bg-indigo-50/40' : 'border-transparent')}>
														<div className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted/40 rounded-md" onClick={() => setObjectId(vo.id)}>
															<button onClick={(e) => { e.stopPropagation(); toggleObject(vo.id); }} className="p-0.5 hover:bg-muted rounded">
																{expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
															</button>
															<span>{vo.icon || '📦'}</span>
															<span className={cn('text-sm flex-1 truncate', isActive && 'font-semibold')}>{vo.name}</span>
															<Badge variant="outline" className="text-[10px]">{t('tablesLabel', { count: vo.physicalTables.length })}</Badge>
														</div>
														{expanded && (
															<div className="px-7 pb-2 text-xs text-muted-foreground space-y-1">
																{(vo.physicalTables ?? []).map((pt, i) => {
																	const cfg = physicalTableKindConfig[pt.kind] ?? physicalTableKindConfig.detail;
																	return (
																		<div key={i} className="flex items-center gap-1.5">
																			<Database className="w-3 h-3" />
																			<span>{resolvePhysicalTableLabel(pt)}</span>
																			<Badge variant="outline" className={cn('text-[10px]', cfg.className)}>{cfg.icon} {cfg.label}</Badge>
																			<span className="text-muted-foreground/70">· {t('fieldsLabel', { count: pt.fields.length })}</span>
																		</div>
																	);
																})}
															</div>
														)}
													</div>
												);
											})}
										</CardContent>
									</Card>
								)}
							</div>
						</div>
					)}
				</main>
			</div>
		</div>
	);
};

// ============================================================================
// Filter editor: attribute name + equality input
// ============================================================================
const FilterEditor: React.FC<{
	attributeNames: string[];
	filters: Record<string, string>;
	onChange: (next: Record<string, string>) => void;
	t: (key: string, options?: Record<string, unknown>) => string;
}> = ({ attributeNames, filters, onChange, t }) => {
	const [pendingField, setPendingField] = useState<string>('');

	const addFilter = () => {
		if (!pendingField || filters[pendingField] !== undefined) return;
		onChange({ ...filters, [pendingField]: '' });
		setPendingField('');
	};
	const updateFilter = (field: string, value: string) => onChange({ ...filters, [field]: value });
	const removeFilter = (field: string) => {
		const next = { ...filters };
		delete next[field];
		onChange(next);
	};

	const available = attributeNames.filter((n) => filters[n] === undefined);

	return (
		<div className="space-y-2">
			{Object.entries(filters).map(([field, value]) => (
				<div key={field} className="flex items-center gap-2">
					<Badge variant="outline" className="text-xs shrink-0">{field}</Badge>
					<span className="text-xs text-muted-foreground">=</span>
					<Input className="h-7 text-xs flex-1" value={value}
						onChange={(e) => updateFilter(field, e.target.value)}
						placeholder={t('filterValuePlaceholder')} />
					<Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeFilter(field)}>
						<X className="w-3.5 h-3.5" />
					</Button>
				</div>
			))}
			{available.length > 0 && (
				<div className="flex items-center gap-2">
					<Select value={pendingField} onValueChange={setPendingField}>
						<SelectTrigger className="h-7 text-xs"><SelectValue placeholder={t('selectAttribute')} /></SelectTrigger>
						<SelectContent>
							{available.map((n) => (<SelectItem key={n} value={n}>{n}</SelectItem>))}
						</SelectContent>
					</Select>
					<Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addFilter} disabled={!pendingField}>
						<Plus className="w-3 h-3" />{t('add')}
					</Button>
				</div>
			)}
		</div>
	);
};

// ============================================================================
// Result table
// ============================================================================
const ResultTable: React.FC<{
	columns: string[];
	rows: Record<string, unknown>[];
	t: (key: string, options?: Record<string, unknown>) => string;
}> = ({ columns, rows, t }) => {
	if (rows.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-10 text-sm text-muted-foreground">
				<Table2 className="w-8 h-8 mb-2 opacity-40" />
				{t('queryReturnedZeroRows')}
			</div>
		);
	}
	return (
		<div className="overflow-auto max-h-[480px] rounded-md border">
			<table className="w-full text-xs">
				<thead className="sticky top-0 bg-muted/80 backdrop-blur">
					<tr>
						{columns.map((c) => (
							<th key={c} className="text-left font-semibold px-3 py-2 border-b whitespace-nowrap">{c}</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row, ri) => (
						<tr key={ri} className="hover:bg-muted/30 border-b last:border-b-0">
							{columns.map((c) => (
								<td key={c} className="px-3 py-1.5 align-top whitespace-nowrap max-w-[320px] truncate" title={formatCell(row[c])}>
									{formatCell(row[c])}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};

const formatCell = (v: unknown): string => {
	if (v === null || v === undefined) return '∅';
	if (typeof v === 'object') return JSON.stringify(v);
	return String(v);
};

export default OntologyDataTester;
