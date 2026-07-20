import React, { useEffect, useMemo, useState } from 'react';
import {
	Search, Plus, Layers, Grid3x3, Eye, Tag, Network,
	Pencil, X, Keyboard, Boxes, Link2, Sigma, Table2, ArrowRight, Workflow,
	Trash2, Loader2,
} from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { VirtualOntologyEditorDialog } from '@/components/ontology/VirtualOntologyEditorDialog';
import { VirtualOntologyDetailDialog } from '@/components/ontology/VirtualOntologyDetailDialog';
import { VirtualOntologyGraph } from '@/components/ontology/VirtualOntologyGraph';
import {
	VirtualOntology,
	sensitivityConfig,
	joinTypeConfig,
} from '@/model/ontology';
import { ontologyService } from '@/services/ontologyService';

const BusinessDomainMap: React.FC = () => {
	const { collapsed } = useSidebar();
	const [ontologies, setOntologies] = useState<VirtualOntology[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [filterTag, setFilterTag] = useState('all');
	const [viewMode, setViewMode] = useState<'grid' | 'graph'>('graph');
	const [selectedOntology, setSelectedOntology] = useState<VirtualOntology | null>(null);
	const [detailOpen, setDetailOpen] = useState(false);
	const [editorOpen, setEditorOpen] = useState(false);
	const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
	const [editingOntology, setEditingOntology] = useState<VirtualOntology | null>(null);
	const [keyboardShortcutsOpen, setKeyboardShortcutsOpen] = useState(false);
	const [pendingDelete, setPendingDelete] = useState<VirtualOntology | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [isSearchFocused, setIsSearchFocused] = useState(false);

	const allTags = useMemo(() => Array.from(new Set(ontologies.flatMap(o => o.tags))).sort(), [ontologies]);

	const filteredOntologies = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		return ontologies.filter(o => {
			const matchesSearch = q.length === 0 || o.name.toLowerCase().includes(q) || o.description.toLowerCase().includes(q);
			const matchesTag = filterTag === 'all' || o.tags.includes(filterTag);
			return matchesSearch && matchesTag;
		});
	}, [ontologies, filterTag, searchQuery]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
				document.getElementById('ontology-search')?.focus();
			}
			if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'n') {
				e.preventDefault();
				openCreateOntology();
			}
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, []);

	useEffect(() => {
		const saved = localStorage.getItem('ontologyViewMode');
		if (saved === 'grid' || saved === 'graph') setViewMode(saved);
	}, []);

	useEffect(() => {
		localStorage.setItem('ontologyViewMode', viewMode);
	}, [viewMode]);

	// Load ontologies from backend service
	const reloadOntologies = async () => {
		setLoading(true);
		try {
			const list = await ontologyService.list();
			setOntologies(list);
		} catch (e) {
			console.error('[BusinessDomainMap] failed to load ontologies', e);
			setOntologies([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		reloadOntologies();
	}, []);

	const openOntologyDetail = (ontology: VirtualOntology) => {
		setSelectedOntology(ontology);
		setDetailOpen(true);
	};

	const openCreateOntology = () => {
		setEditorMode('create');
		setEditingOntology(null);
		setEditorOpen(true);
	};

	const openEditOntology = (ontology: VirtualOntology) => {
		setEditorMode('edit');
		setEditingOntology(ontology);
		setEditorOpen(true);
	};

	const handleSaveOntology = async (saved: VirtualOntology) => {
		try {
			const result = await ontologyService.save(saved);
			setOntologies(prev => {
				const exists = prev.some(o => o.id === result.id);
				return exists ? prev.map(o => (o.id === result.id ? result : o)) : [...prev, result];
			});
			setSelectedOntology(result);
		} catch (e) {
			console.error('[BusinessDomainMap] failed to save ontology', e);
			alert('保存失败，请重试');
		}
	};

	const handleDeleteOntology = (ontology: VirtualOntology) => {
		setPendingDelete(ontology);
	};

	const cancelDeleteOntology = () => {
		if (deleting) return;
		setPendingDelete(null);
	};

	const confirmDeleteOntology = async () => {
		if (!pendingDelete) return;
		const target = pendingDelete;
		setDeleting(true);
		try {
			await ontologyService.remove(target.ontologyId ?? target.id);
			setOntologies(prev => prev.filter(o => o.id !== target.id));
			if (selectedOntology?.id === target.id) {
				setSelectedOntology(null);
				setDetailOpen(false);
			}
			setPendingDelete(null);
		} catch (e) {
			console.error('[BusinessDomainMap] failed to delete ontology', e);
			alert('删除失败，请重试');
		} finally {
			setDeleting(false);
		}
	};

	// aggregate stats
	const totalObjects = ontologies.reduce((s, o) => s + o.virtualObjects.length, 0);
	const totalLinks = ontologies.reduce((s, o) => s + o.virtualLinks.length, 0);
	const totalPhysicalTables = ontologies.reduce(
		(s, o) => s + o.virtualObjects.reduce((ss, vo) => ss + vo.physicalTables.length, 0), 0
	);
	const totalDerived = ontologies.reduce(
		(s, o) => s + o.virtualObjects.reduce((ss, vo) => ss + vo.derivedAttributes.length, 0), 0
	);

	return (
		<div className="min-h-screen bg-background">
			<Sidebar />
			<div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300 flex flex-col`}>
				<Header />

				<main className="flex-1 overflow-y-auto p-6">
					{/* Page Header — matches design: 24px bold title, 13px subtitle */}
					<div className="flex items-start justify-between mb-5">
						<div>
							<h1 className="text-2xl font-bold leading-tight">Virtual Ontology</h1>
							<p className="text-[13px] text-muted-foreground mt-1 leading-normal">
								Semantic layer mapping business objects to physical tables
							</p>
						</div>
						<div className="flex items-center gap-2 mt-1">
							{/* View toggle — design: active pill is solid indigo */}
							<div className="flex items-center bg-muted p-0.5 rounded-lg gap-0.5">
								<button
									onClick={() => setViewMode('grid')}
									className={cn(
										'px-3 py-1.5 rounded-md text-[13px] font-medium transition-all flex items-center gap-1.5',
										viewMode === 'grid'
											? 'bg-primary text-primary-foreground shadow-sm'
											: 'text-muted-foreground hover:text-foreground'
									)}
								>
									<Grid3x3 className="w-3.5 h-3.5" />
									Grid
								</button>
								<button
									onClick={() => setViewMode('graph')}
									className={cn(
										'px-3 py-1.5 rounded-md text-[13px] font-medium transition-all flex items-center gap-1.5',
										viewMode === 'graph'
											? 'bg-primary text-primary-foreground shadow-sm'
											: 'text-muted-foreground hover:text-foreground'
									)}
								>
									<Network className="w-3.5 h-3.5" />
									Graph
								</button>
							</div>
							<Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setKeyboardShortcutsOpen(true)} title="Keyboard shortcuts">
								<Keyboard className="w-4 h-4" />
							</Button>
							<Button className="gap-1.5 h-9 text-[13px] font-semibold" onClick={openCreateOntology}>
								<Plus className="w-3.5 h-3.5" />
								Create Virtual Ontology
							</Button>
						</div>
					</div>

					{/* Search — design: inline card with search + count + tag filter */}
					<div className="bg-card border border-border rounded-lg p-3 mb-4 flex items-center gap-3">
						<div className="relative flex-1 flex items-center gap-2.5">
							<Search className="w-[18px] h-[18px] text-muted-foreground/70 shrink-0" />
							<Input
								id="ontology-search"
								placeholder="Search virtual ontologies by name or description..."
								value={searchQuery}
								onChange={e => setSearchQuery(e.target.value)}
								onFocus={() => setIsSearchFocused(true)}
								onBlur={() => setIsSearchFocused(false)}
								className="border-0 shadow-none bg-transparent pl-0 pr-0 focus-visible:ring-0 h-auto py-0 text-[13px]"
							/>
						</div>
						<div className="flex items-center gap-3 shrink-0">
							{(searchQuery || filterTag !== 'all') && (
								<span className="text-xs text-muted-foreground whitespace-nowrap">
									<span className="font-medium text-foreground">{filteredOntologies.length}</span> of {ontologies.length} ontologies
								</span>
							)}
							{!isSearchFocused && !searchQuery && (
								<kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[11px] text-muted-foreground bg-muted rounded border font-mono">
									<span className="text-[10px]">⌘</span>K
								</kbd>
							)}
							<Select value={filterTag} onValueChange={setFilterTag}>
								<SelectTrigger className="h-8 text-[13px] w-auto">
									<SelectValue placeholder="All Tags" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Tags</SelectItem>
									{allTags.map(tag => (
										<SelectItem key={tag} value={tag}>
											{tag}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Stats Row — design: 5-col horizontal cards, icon circle + number + label */}
					<div className="grid grid-cols-5 gap-3 mb-5">
						<StatCard icon={<Boxes className="w-5 h-5 text-primary" />} bg="bg-primary/10" label="Virtual Objects" value={totalObjects} />
						<StatCard icon={<Link2 className="w-5 h-5 text-emerald-600" />} bg="bg-emerald-50" label="Virtual Links" value={totalLinks} />
						<StatCard icon={<Table2 className="w-5 h-5 text-violet-600" />} bg="bg-violet-50" label="Physical Tables" value={totalPhysicalTables} />
						<StatCard icon={<Sigma className="w-5 h-5 text-amber-600" />} bg="bg-amber-50" label="Derived Attributes" value={totalDerived} />
						<StatCard icon={<Layers className="w-5 h-5 text-blue-600" />} bg="bg-blue-50" label="Ontologies" value={ontologies.length} />
					</div>

					{/* Content */}
				{loading ? (
					<div className="bg-card border border-border rounded-lg flex flex-col items-center justify-center py-12">
						<Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-3" />
						<div className="text-sm text-muted-foreground">Loading ontologies...</div>
					</div>
				) : viewMode === 'graph' ? (
						<div className="bg-card border border-border rounded-lg overflow-hidden flex-1 min-h-0 flex flex-col">
							<div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
								<span className="text-[13px] font-semibold">Ontology Graph</span>
								<span className="text-[11px] text-muted-foreground font-mono font-medium px-2.5 py-1 bg-muted rounded">Zoom: 100%</span>
							</div>
							<VirtualOntologyGraph ontologies={filteredOntologies} onSelectOntology={openOntologyDetail} />
						</div>
					) : (
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							{filteredOntologies.map(ontology => (
								<OntologyCard
									key={ontology.id}
									ontology={ontology}
									onView={() => openOntologyDetail(ontology)}
									onEdit={() => openEditOntology(ontology)}
									onDelete={() => handleDeleteOntology(ontology)}
								/>
							))}
						</div>
					)}

					{/* Empty state */}
					{filteredOntologies.length === 0 && !loading && (
						<div className="bg-card border border-border rounded-lg flex flex-col items-center justify-center py-12 mt-6">
							<div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
								<Layers className="w-8 h-8 text-muted-foreground" />
							</div>
							<div className="text-lg font-medium mb-1">No virtual ontologies found</div>
							<div className="text-sm text-muted-foreground text-center max-w-sm mb-4">
								{searchQuery || filterTag !== 'all'
									? 'Try adjusting your search or filters to find what you\'re looking for.'
									: 'Get started by creating your first virtual ontology to map business objects to physical tables.'}
							</div>
							{(searchQuery || filterTag !== 'all') ? (
								<Button
									variant="outline"
									onClick={() => { setSearchQuery(''); setFilterTag('all'); }}
									className="gap-2"
								>
									<X className="w-4 h-4" />
									Clear filters
								</Button>
							) : (
								<Button onClick={openCreateOntology} className="gap-2">
									<Plus className="w-4 h-4" />
									Create Virtual Ontology
								</Button>
							)}
						</div>
					)}
				</main>
			</div>

			{/* Dialogs */}
			<VirtualOntologyDetailDialog
				ontology={selectedOntology}
				open={detailOpen}
				onOpenChange={setDetailOpen}
				onEdit={(o) => { setDetailOpen(false); openEditOntology(o); }}
			/>
			<VirtualOntologyEditorDialog
				open={editorOpen}
				onOpenChange={setEditorOpen}
				mode={editorMode}
				ontology={editingOntology}
				onSave={handleSaveOntology}
			/>

			{/* Delete confirmation */}
			<Dialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) cancelDeleteOntology(); }}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>删除虚拟本体</DialogTitle>
					</DialogHeader>
					<div className="text-sm text-muted-foreground py-2">
						确定要删除 <span className="font-semibold text-foreground">"{pendingDelete?.name}"</span> 吗？该操作不可撤销。
					</div>
					<div className="flex justify-end gap-2 pt-2">
						<Button variant="outline" onClick={cancelDeleteOntology} disabled={deleting}>
							取消
						</Button>
						<Button variant="destructive" onClick={confirmDeleteOntology} disabled={deleting}>
							{deleting ? '删除中...' : '删除'}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Keyboard shortcuts */}
			<Dialog open={keyboardShortcutsOpen} onOpenChange={setKeyboardShortcutsOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Keyboard Shortcuts</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<ShortcutRow keys={['⌘', 'K']} desc="Focus search" />
						<ShortcutRow keys={['⌘', '⇧', 'N']} desc="Create new virtual ontology" />
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
};

// ============================================================================
// Sub components
// ============================================================================

const StatCard: React.FC<{ icon: React.ReactNode; bg: string; label: string; value: number }> = ({ icon, bg, label, value }) => (
	<div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
		<div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', bg)}>{icon}</div>
		<div>
			<div className="text-xl font-bold tabular-nums leading-tight">{value}</div>
			<div className="text-xs text-muted-foreground mt-0.5">{label}</div>
		</div>
	</div>
);

const OntologyCard: React.FC<{
	ontology: VirtualOntology;
	onView: () => void;
	onEdit: () => void;
	onDelete: () => void;
}> = ({ ontology, onView, onEdit, onDelete }) => {
	const totalPhysical = ontology.virtualObjects.reduce((s, vo) => s + vo.physicalTables.length, 0);

	return (
		<div className="bg-card border border-border rounded-lg group hover:shadow-medium transition-all">
			<div className="p-5 pb-3">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<div className="flex items-center gap-2 mb-2">
							<div className="p-1.5 bg-primary/10 rounded-md">
								<Layers className="w-5 h-5 text-primary" />
							</div>
							<h3 className="text-lg font-semibold">{ontology.name}</h3>
						</div>
						<p className="text-sm text-muted-foreground line-clamp-2">{ontology.description}</p>
					</div>
					<Badge className={`${sensitivityConfig[ontology.sensitivity].className} border-0`}>
						{sensitivityConfig[ontology.sensitivity].icon} {sensitivityConfig[ontology.sensitivity].label}
					</Badge>
				</div>
			</div>
			<div className="px-5 pb-5 space-y-4">
				<div className="grid grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg border">
					<MiniStat icon={<Boxes className="w-4 h-4 text-primary" />} value={ontology.virtualObjects.length} label="Objects" />
					<MiniStat icon={<Link2 className="w-4 h-4 text-emerald-500" />} value={ontology.virtualLinks.length} label="Links" />
					<MiniStat icon={<Table2 className="w-4 h-4 text-violet-500" />} value={totalPhysical} label="Tables" />
				</div>

				<div className="flex flex-wrap gap-2">
					{ontology.tags.map(tag => (
						<Badge key={tag} variant="secondary" className="text-xs">
							<Tag className="w-3 h-3 mr-1.5" />
							{tag}
						</Badge>
					))}
				</div>

				{/* Virtual objects preview */}
				<div className="space-y-2">
					<div className="flex items-center gap-2 text-sm font-semibold">
						<Boxes className="w-4 h-4 text-indigo-500" />
						Virtual Objects
						<span className="text-muted-foreground font-normal">({ontology.virtualObjects.length})</span>
					</div>
					<div className="space-y-2">
						{ontology.virtualObjects.slice(0, 4).map(vo => (
							<div key={vo.id} className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/20">
								<span className="text-base">{vo.icon || '📦'}</span>
								<span className="font-medium truncate flex-1" title={vo.name}>{vo.name}</span>
								<Badge variant="outline" className="text-[10px]">
									{vo.physicalTables.length} tables
								</Badge>
								{vo.derivedAttributes.length > 0 && (
									<Badge variant="outline" className="text-[10px]">
										<Sigma className="w-3 h-3 mr-1" />
										{vo.derivedAttributes.length}
									</Badge>
								)}
							</div>
						))}
						{ontology.virtualObjects.length > 4 && (
							<div className="text-xs text-muted-foreground font-medium">
								+{ontology.virtualObjects.length - 4} more...
							</div>
						)}
					</div>
				</div>

				{/* Virtual links preview */}
				{ontology.virtualLinks.length > 0 && (
					<div className="space-y-2">
						<div className="flex items-center gap-2 text-sm font-semibold">
							<Link2 className="w-4 h-4 text-emerald-500" />
							Virtual Links
							<span className="text-muted-foreground font-normal">({ontology.virtualLinks.length})</span>
						</div>
						<div className="space-y-1">
							{ontology.virtualLinks.slice(0, 2).map(link => {
								const source = ontology.virtualObjects.find(vo => vo.id === link.sourceObjectId);
								const target = ontology.virtualObjects.find(vo => vo.id === link.targetObjectId);
								return (
									<div key={link.id} className="flex items-center gap-2 text-xs p-1.5 rounded-md bg-muted/20">
										<span className="font-medium">{source?.name || '?'}</span>
										<ArrowRight className="w-3 h-3 text-muted-foreground" />
										<span className="font-medium">{target?.name || '?'}</span>
										<Badge variant="outline" className="text-[10px] ml-auto">
											{joinTypeConfig[link.joinType].label}
										</Badge>
									</div>
								);
							})}
						</div>
					</div>
				)}

				<div className="flex pt-3 border-t gap-2 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
					<Button variant="outline" size="sm" className="flex-1 gap-2" onClick={onView}>
						<Eye className="w-4 h-4" />
						View
					</Button>
					<Button variant="secondary" size="sm" className="flex-1 gap-2" onClick={onEdit}>
						<Pencil className="w-4 h-4" />
						Edit
					</Button>
					<Button variant="outline" size="sm" className="gap-2 text-red-600 hover:text-red-700" onClick={onDelete}>
						<Trash2 className="w-4 h-4" />
						Delete
					</Button>
				</div>
			</div>
		</div>
	);
};

const MiniStat: React.FC<{ icon: React.ReactNode; value: number; label: string }> = ({ icon, value, label }) => (
	<div className="text-center">
		<div className="flex items-center justify-center gap-1.5 mb-1">
			{icon}
			<span className="text-lg font-bold">{value}</span>
		</div>
		<div className="text-xs text-muted-foreground">{label}</div>
	</div>
);

const ShortcutRow: React.FC<{ keys: string[]; desc: string }> = ({ keys, desc }) => (
	<div className="flex items-center justify-between">
		<span className="text-sm text-muted-foreground">{desc}</span>
		<div className="flex gap-1">
			{keys.map((k, i) => (
				<kbd key={i} className="px-1.5 py-0.5 text-xs bg-muted rounded border">
					{k}
				</kbd>
			))}
		</div>
	</div>
);

export default BusinessDomainMap;
