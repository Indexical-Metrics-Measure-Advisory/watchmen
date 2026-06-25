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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
			<div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300`}>
				<Header />

				<main className="container py-6">
					{/* Header */}
					<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
						<div>
							<h1 className="text-2xl font-semibold">Virtual Ontology</h1>
							<p className="text-muted-foreground mt-1">
								Semantic layer mapping business objects to physical tables via virtual links
							</p>
						</div>
						<div className="flex flex-wrap gap-3 items-center">
							<div className="flex bg-muted/60 p-1 rounded-lg mr-1 h-10 border">
								<button
									onClick={() => setViewMode('grid')}
									className={cn(
										'px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2',
										viewMode === 'grid'
											? 'bg-background text-foreground shadow-sm ring-1 ring-black/5'
											: 'text-muted-foreground hover:text-foreground'
									)}
								>
									<Grid3x3 className="w-4 h-4" />
									Grid
								</button>
								<button
									onClick={() => setViewMode('graph')}
									className={cn(
										'px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2',
										viewMode === 'graph'
											? 'bg-background text-foreground shadow-sm ring-1 ring-black/5'
											: 'text-muted-foreground hover:text-foreground'
									)}
								>
									<Network className="w-4 h-4" />
									Graph
								</button>
							</div>
							<Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setKeyboardShortcutsOpen(true)} title="Keyboard shortcuts">
								<Keyboard className="w-4 h-4" />
							</Button>
							<Button className="gap-2 h-10" onClick={openCreateOntology}>
								<Plus className="w-4 h-4" />
								Create Virtual Ontology
							</Button>
						</div>
					</div>

					{/* Search */}
					<div className="glass-card p-4 mb-6">
						<div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
							<div className="relative flex-1">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
								<Input
									id="ontology-search"
									placeholder="Search virtual ontologies by name or description..."
									value={searchQuery}
									onChange={e => setSearchQuery(e.target.value)}
									onFocus={() => setIsSearchFocused(true)}
									onBlur={() => setIsSearchFocused(false)}
									className="pl-9 pr-20"
								/>
								<div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
									{searchQuery && (
										<button
											onClick={() => setSearchQuery('')}
											className="p-1 hover:bg-muted rounded transition-colors"
										>
											<X className="w-3.5 h-3.5 text-muted-foreground" />
										</button>
									)}
									{!isSearchFocused && !searchQuery && (
										<kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs text-muted-foreground bg-muted rounded border">
											<span className="text-[10px]">⌘</span>K
										</kbd>
									)}
								</div>
							</div>
							<div className="flex items-center gap-3">
								{(searchQuery || filterTag !== 'all') && (
									<div className="text-sm text-muted-foreground whitespace-nowrap">
										<span className="font-medium text-foreground">{filteredOntologies.length}</span> of {ontologies.length} ontologies
									</div>
								)}
								<div className="w-full md:w-64">
									<Select value={filterTag} onValueChange={setFilterTag}>
										<SelectTrigger>
											<SelectValue placeholder="Filter by tag" />
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
						</div>
					</div>

					{/* Architecture overview */}
					<Card className="mb-6">
						<CardHeader className="pb-4">
							<CardTitle className="flex items-center gap-3 text-lg">
								<div className="p-2 bg-indigo-100 rounded-lg">
									<Workflow className="w-5 h-5 text-indigo-600" />
								</div>
								Virtual Ontology Architecture
							</CardTitle>
							<CardDescription>
								Business Object → Mapping (Link / Field) → Physical Table
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
								<StatCard icon={<Boxes className="w-5 h-5 text-indigo-600" />} bg="bg-indigo-50" label="Virtual Objects" value={totalObjects} />
								<StatCard icon={<Link2 className="w-5 h-5 text-emerald-600" />} bg="bg-emerald-50" label="Virtual Links" value={totalLinks} />
								<StatCard icon={<Table2 className="w-5 h-5 text-purple-600" />} bg="bg-purple-50" label="Physical Tables" value={totalPhysicalTables} />
								<StatCard icon={<Sigma className="w-5 h-5 text-amber-600" />} bg="bg-amber-50" label="Derived Attributes" value={totalDerived} />
								<StatCard icon={<Layers className="w-5 h-5 text-blue-600" />} bg="bg-blue-50" label="Ontologies" value={ontologies.length} />
							</div>
						</CardContent>
					</Card>

					{/* Content */}
				{loading ? (
					<Card className="mt-6">
						<CardContent className="flex flex-col items-center justify-center py-12">
							<Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-3" />
							<div className="text-sm text-muted-foreground">Loading ontologies...</div>
						</CardContent>
					</Card>
				) : viewMode === 'graph' ? (
						<div className="bg-background rounded-xl border shadow-sm overflow-hidden">
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
					{filteredOntologies.length === 0 && (
						<Card className="mt-6">
							<CardContent className="flex flex-col items-center justify-center py-12">
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
							</CardContent>
						</Card>
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
	<div className="bg-muted/30 p-4 rounded-xl border">
		<div className="flex items-center justify-between mb-2">
			<div className={cn('p-2 rounded-lg', bg)}>{icon}</div>
			<span className="text-2xl font-bold">{value}</span>
		</div>
		<div className="font-semibold text-sm">{label}</div>
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
		<Card className="group hover:shadow-md transition-all border">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<div className="flex items-center gap-2 mb-2">
							<div className="p-1.5 bg-indigo-50 rounded-md">
								<Layers className="w-5 h-5 text-indigo-600" />
							</div>
							<CardTitle className="text-lg">{ontology.name}</CardTitle>
						</div>
						<CardDescription className="line-clamp-2">{ontology.description}</CardDescription>
					</div>
					<Badge className={`${sensitivityConfig[ontology.sensitivity].className} border-0`}>
						{sensitivityConfig[ontology.sensitivity].icon} {sensitivityConfig[ontology.sensitivity].label}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg border">
					<MiniStat icon={<Boxes className="w-4 h-4 text-indigo-500" />} value={ontology.virtualObjects.length} label="Objects" />
					<MiniStat icon={<Link2 className="w-4 h-4 text-emerald-500" />} value={ontology.virtualLinks.length} label="Links" />
					<MiniStat icon={<Table2 className="w-4 h-4 text-purple-500" />} value={totalPhysical} label="Tables" />
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
			</CardContent>
		</Card>
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
