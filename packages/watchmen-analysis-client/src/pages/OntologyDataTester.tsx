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
import { Input } from '@/components/ui/input';
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
			<div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300 flex flex-col`}>
				<Header />
				<main className="flex-1 overflow-y-auto p-6">
					{/* Title — design: 24px bold, 13px subtitle */}
					<div className="flex items-start justify-between mb-5">
						<div>
							<h1 className="text-2xl font-bold leading-tight flex items-center gap-2">
								<FlaskConical className="w-6 h-6 text-primary" />
								{t('pageTitle')}
							</h1>
							<p className="text-[13px] text-muted-foreground mt-1 leading-normal">
								{t('pageSubtitle')}
							</p>
						</div>
						<Button variant="outline" size="icon" className="h-9 w-9" onClick={reloadOntologies} title={t('refreshOntologies')} disabled={loadingMeta}>
							<RefreshCw className={cn('w-4 h-4', loadingMeta && 'animate-spin')} />
						</Button>
					</div>

					{loadingMeta ? (
						<div className="bg-card border border-border rounded-lg flex items-center justify-center py-12">
							<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
						</div>
					) : (
						<div className="flex gap-6 items-start">
							{/* ═══ LEFT PANEL — Configuration ═══ */}
							<div className="w-[360px] min-w-[360px] space-y-5">
								{/* Card 1: Selection */}
								<div className="bg-card border border-border rounded-lg p-5">
									<div className="flex items-center gap-2 mb-4">
										<Boxes className="w-4 h-4 text-primary" />
										<h2 className="text-sm font-semibold">{t('configSelection')}</h2>
									</div>
									<div className="space-y-3">
										<div>
											<label className="block mb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('virtualOntology')}</label>
											<Select value={ontologyId} onValueChange={onSelectOntology}>
												<SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder={t('selectOntology')} /></SelectTrigger>
												<SelectContent>
													{ontologies.map((o) => (
														<SelectItem key={o.ontologyId ?? o.id} value={o.ontologyId ?? o.id}>
															{o.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div>
											<label className="block mb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('virtualObject')}</label>
											<Select value={objectId} onValueChange={setObjectId} disabled={!ontology}>
												<SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder={t('selectVirtualObject')} /></SelectTrigger>
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
											<div className="flex items-center gap-2 text-xs text-muted-foreground pt-3 border-t border-border">
												<Database className="w-3.5 h-3.5 text-emerald-600" />
												{t('datasourceBound', { id: virtualObject.datasourceId })}
											</div>
										)}
										{virtualObject && !virtualObject.datasourceId && (
											<div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
												<AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
												<span>{t('noDatasourceWarning')}</span>
											</div>
										)}
									</div>
								</div>

								{/* Card 2: Query Builder */}
								{virtualObject && (
									<div className="bg-card border border-border rounded-lg p-5">
										<div className="flex items-center gap-2 mb-1">
											<span className="text-base">{virtualObject.icon || '📦'}</span>
											<h2 className="text-sm font-semibold">{virtualObject.name}</h2>
										</div>
										<p className="text-xs text-muted-foreground mb-4">{virtualObject.description}</p>

										{/* Return fields */}
										<div className="mb-4">
											<div className="flex items-center justify-between mb-2">
												<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('returnFields')}</span>
												<button className="text-[11px] font-medium text-primary hover:underline"
													onClick={() => setSelectedFields(selectedFields.length === 0 ? allAttributeNames : [])}>
													{selectedFields.length === 0 ? t('selectAll') : t('clear')}
												</button>
											</div>
											<p className="text-[11px] text-muted-foreground mb-2">{t('emptyReturnsAll')}</p>
											<div className="flex flex-wrap gap-1.5">
												{(virtualObject.attributes ?? []).map((a) => {
													const on = selectedFields.includes(a.name);
													return (
														<button key={a.name} onClick={() => toggleField(a.name)}
															className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors font-medium',
																on ? 'bg-primary/10 text-primary border-primary/30' : 'bg-card text-muted-foreground border-border hover:bg-muted')}>
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
											<div className="mb-4 pt-4 border-t border-border">
												<div className="flex items-center gap-1.5 mb-2">
													<Sigma className="w-3.5 h-3.5 text-primary" />
													<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('derivedAttributes')}</span>
												</div>
												<div className="flex flex-wrap gap-1.5">
													{(virtualObject.derivedAttributes ?? []).map((d) => {
														const on = selectedDerived.includes(d.name);
														const cfg = aggregateConfig[d.aggregate] ?? aggregateConfig.count;
														return (
															<button key={d.id} onClick={() => toggleDerived(d.name)}
																className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors inline-flex items-center gap-1 font-medium',
																	on ? 'bg-primary/10 text-primary border-primary/30' : 'bg-card text-muted-foreground border-border hover:bg-muted')}>
																<span>{cfg.icon}</span>{d.name}
															</button>
														);
													})}
												</div>
											</div>
										)}

										{/* Filters */}
										<div className="mb-4 pt-4 border-t border-border">
											<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
												{t('filters')} <span className="text-red-500">*</span>
											</span>
											<div className="mt-2">
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
															<p className="text-[11px] text-amber-600 mt-2">{t('filtersRequired')}</p>
														)}
													</>
												)}
											</div>
										</div>

										{/* Pagination */}
										<div className="pt-4 border-t border-border">
											<div className="flex items-center gap-4">
												<div>
													<label className="block mb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('limit')}</label>
													<Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
														<SelectTrigger className="w-20 h-8 text-xs font-mono"><SelectValue /></SelectTrigger>
														<SelectContent>
															{ROW_LIMIT_OPTIONS.map((n) => (
																<SelectItem key={n} value={String(n)}>{n}</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>
												<div>
													<label className="block mb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('offset')}</label>
													<Input type="number" min={0} value={offset} className="w-20 h-8 font-mono text-xs"
														onChange={(e) => setOffset(Math.max(0, Number(e.target.value) || 0))} />
												</div>
											</div>
										</div>
									</div>
								)}
							</div>

							{/* ═══ RIGHT PANEL — Results ═══ */}
							<div className="flex-1 space-y-5 min-w-0">
								{/* Card 3: Compiled SQL */}
								<div className="bg-card border border-border rounded-lg p-5">
									<div className="flex items-center justify-between mb-3">
										<div className="flex items-center gap-2">
											<FlaskConical className="w-4 h-4 text-primary" />
											<h2 className="text-sm font-semibold">{t('compiledSql')}</h2>
										</div>
										<div className="flex items-center gap-2">
											<Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs"
												onClick={runCompile} disabled={compiling || !virtualObject}>
												{compiling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
												{t('compile')}
											</Button>
											<Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs"
												onClick={copySql} disabled={!compileResult?.sql}>
												{copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
												{copied ? t('copied') : t('copy')}
											</Button>
										</div>
									</div>

									{compileResult ? (
										<>
											{compileResult.labels.length > 0 && (
												<div className="flex flex-wrap gap-1.5 mb-3">
													{compileResult.labels.map((l) => (
														<span key={l} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{l}</span>
													))}
												</div>
											)}
											{/* SQL Terminal — dark IDE style */}
											<div className="rounded-lg overflow-hidden border border-border">
												<div className="flex items-center px-3 py-1.5 border-b border-border bg-muted/60">
													<span className="text-[11px] font-medium px-2 py-0.5 rounded-t bg-zinc-900 text-indigo-300">SQL Preview</span>
													<span className="text-[10px] ml-auto text-muted-foreground font-mono">postgresql</span>
												</div>
												<pre className="font-mono text-[13px] bg-zinc-900 text-slate-200 p-3 overflow-auto max-h-[280px] leading-relaxed">
													{compileResult.sql}
												</pre>
											</div>
										</>
									) : (
										<div className="rounded-lg overflow-hidden border border-border">
											<div className="flex items-center px-3 py-1.5 border-b border-border bg-muted/60">
												<span className="text-[11px] font-medium px-2 py-0.5 rounded-t bg-zinc-900 text-indigo-300">SQL Preview</span>
											</div>
											<pre className="font-mono text-[13px] bg-zinc-900 text-slate-500 p-3 min-h-[120px] leading-relaxed">
												{virtualObject ? t('clickCompileHint') : t('selectObjectFirst')}
											</pre>
										</div>
									)}
									<div className="flex items-center justify-end mt-3">
										<Button className="gap-2 h-9 text-xs font-semibold" onClick={runQuery} disabled={running || !virtualObject}>
											{running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
											{running ? t('running') : t('executeQuery')}
										</Button>
									</div>
								</div>

								{/* Error */}
								{error && (
									<div className="bg-red-50 border border-red-200 rounded-lg p-4">
										<div className="flex items-start gap-2 text-sm text-red-700">
											<AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
											<div>
												<div className="font-medium mb-1">{t('failed')}</div>
												<pre className="whitespace-pre-wrap text-xs text-red-600">{error}</pre>
											</div>
										</div>
									</div>
								)}

								{/* Card 4: Query Results */}
								{queryResult && (
									<div className="bg-card border border-border rounded-lg p-5">
										<div className="flex items-center justify-between mb-3">
											<div className="flex items-center gap-2">
												<Table2 className="w-4 h-4 text-primary" />
												<h2 className="text-sm font-semibold">{t('queryResults')}</h2>
											</div>
											<span className="text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
												{t('rowsLabel', { count: queryResult.rows.length })}
												{queryResult.total != null ? t('totalLabel', { count: queryResult.total }) : ''}
												{' × '}{t('columnsLabel', { count: resultColumns.length })}
											</span>
										</div>
										<ResultTable columns={resultColumns} rows={queryResult.rows} t={t} />
									</div>
								)}

								{/* Card 5: Virtual Objects List */}
								{ontology && ontology.virtualObjects.length > 0 && (
									<div className="bg-card border border-border rounded-lg p-5">
										<div className="flex items-center gap-2 mb-3">
											<h2 className="text-sm font-semibold">{t('virtualObjectsList')} <span className="font-normal text-muted-foreground">({ontology.virtualObjects.length})</span></h2>
										</div>
										<div className="space-y-0.5">
											{ontology.virtualObjects.map((vo) => {
												const expanded = expandedObjects.has(vo.id);
												const isActive = vo.id === objectId;
												return (
													<div key={vo.id}>
														<div className={cn('flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer border transition-colors',
																isActive ? 'bg-primary/10 border-primary/30' : 'border-transparent hover:bg-muted')}
															onClick={() => setObjectId(vo.id)}>
															<button onClick={(e) => { e.stopPropagation(); toggleObject(vo.id); }} className="p-0.5">
																{expanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
															</button>
															<span className="text-sm">{vo.icon || '📦'}</span>
															<span className={cn('text-[13px] flex-1 truncate', isActive ? 'font-semibold text-primary' : 'font-medium')}>{vo.name}</span>
															<span className={cn('text-[11px] px-1.5 py-0.5 rounded font-medium',
																isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
																{t('tablesLabel', { count: vo.physicalTables.length })}
															</span>
														</div>
														{expanded && (
															<div className="space-y-0.5">
																{(vo.physicalTables ?? []).map((pt, i) => {
																	const cfg = physicalTableKindConfig[pt.kind] ?? physicalTableKindConfig.detail;
																	return (
																		<div key={i} className="flex items-center gap-2 px-3 py-1.5 pl-11 text-xs text-muted-foreground">
																			<Database className="w-3 h-3 text-muted-foreground/60" />
																			<span className="font-mono text-[12px] text-foreground">{resolvePhysicalTableLabel(pt)}</span>
																			<span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', cfg.className)}>{cfg.icon} {cfg.label}</span>
																			<span className="text-[10px] text-muted-foreground">{t('fieldsLabel', { count: pt.fields.length })}</span>
																		</div>
																	);
																})}
															</div>
														)}
													</div>
												);
											})}
										</div>
									</div>
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
				<div key={field} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/40 border border-border rounded text-xs">
					<span className="text-[11px] font-semibold font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">{field}</span>
					<span className="text-muted-foreground">=</span>
					<Input className="h-6 text-xs flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 px-1 font-mono" value={value}
						onChange={(e) => updateFilter(field, e.target.value)}
						placeholder={t('filterValuePlaceholder')} />
					<button className="p-0.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors shrink-0" onClick={() => removeFilter(field)}>
						<X className="w-3 h-3" />
					</button>
				</div>
			))}
			{available.length > 0 && (
				<div className="flex items-center gap-2">
					<Select value={pendingField} onValueChange={setPendingField}>
						<SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder={t('selectAttribute')} /></SelectTrigger>
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
		<div className="overflow-auto max-h-[340px] rounded-lg border border-border">
			<table className="w-full text-[13px] border-collapse">
				<thead className="sticky top-0">
					<tr>
						{columns.map((c) => (
							<th key={c} className="text-left font-semibold text-[11px] uppercase tracking-wide text-muted-foreground px-3 py-2 border-b border-border bg-muted/60 whitespace-nowrap">{c}</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row, ri) => (
						<tr key={ri} className={cn('border-b border-border last:border-b-0 hover:bg-primary/5', ri % 2 === 1 && 'bg-muted/20')}>
							{columns.map((c) => (
								<td key={c} className="px-3 py-2 align-top whitespace-nowrap font-mono text-[12px] max-w-[320px] truncate" title={formatCell(row[c])}>
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
