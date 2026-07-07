import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, Plus, Pencil, Trash2, ExternalLink, ChevronRight,
  BookOpen
} from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { SECTIONS, STANDARDS } from '@/data/glossarySeedData';
import {
  SectionHeader, DataTable, EditEntryDialog, EditStandardDialog, ConfirmDeleteDialog
} from '@/components/glossary/GlossaryComponents';
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
} from '@/model/businessGlossary';

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

  // Active section filtered count for search hint
  const activeSectionFiltered = useMemo(() => {
    switch (activeSection) {
      case 'overview': return filteredOverview.length;
      case 'tables': return filteredTables.length;
      case 'fields': return filteredFields.length;
      case 'codes': return filteredCodes.length;
      case 'terms': return filteredTerms.length;
      case 'naming': return filteredNaming.length;
      case 'dependencies': return filteredDeps.length;
    }
  }, [activeSection, filteredOverview, filteredTables, filteredFields, filteredCodes, filteredTerms, filteredNaming, filteredDeps]);

  const hasSearch = searchLower.length > 0;
  const hasNoResults = hasSearch && activeSectionFiltered === 0;

  return (
    <div className={cn(
      "min-h-screen flex flex-col transition-all duration-300",
      collapsed ? "ml-[80px]" : "ml-[224px]"
    )}>
      <Sidebar />
      <Header />

      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Business Glossary</h1>
            <p className="text-gray-500 mt-1">Manage industry standards and regulatory frameworks</p>
          </div>
          <Button className="flex items-center gap-2" onClick={() => setIsAddingStandard(true)}>
            <Plus className="h-4 w-4" />
            Add Standard
          </Button>
        </div>

        <div className="flex gap-6">
          {/* Left: standards list — fixed width sidebar */}
          <div className="w-60 shrink-0">
            <Card>
              <CardContent className="p-2">
                <ScrollArea className="max-h-[calc(100vh-220px)]">
                  <ul className="space-y-0.5">
                    {bundles.map(b => {
                      const total = b.entries.tables.length + b.entries.fields.length + b.entries.codes.length
                        + b.entries.terms.length + b.entries.naming.length + b.entries.dependencies.length;
                      const isActive = b.standard.id === activeStandardId;
                      return (
                        <li key={b.standard.id}>
                          <button
                            onClick={() => setActiveStandardId(b.standard.id)}
                            className={cn(
                              "w-full text-left rounded-md px-3 py-2.5 transition-colors",
                              isActive
                                ? "bg-blue-50 text-blue-700"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-sm">{b.standard.abbreviation}</span>
                              <ChevronRight className={cn("h-3.5 w-3.5", isActive ? "text-blue-500" : "text-gray-300")} />
                            </div>
                            <p className="text-[11px] mt-0.5 line-clamp-1 text-gray-500">{b.standard.name}</p>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <Badge variant="outline" className="text-[9px] px-1 py-0">v{b.standard.version}</Badge>
                              <span className={cn('text-[9px] px-1 py-0 rounded font-medium', STATUS_COLORS[b.standard.status])}>
                                {b.standard.status}
                              </span>
                              <span className="text-[9px] text-gray-400 ml-auto">{total}</span>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right: standard detail */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Standard header — compact horizontal bar */}
            <Card>
              <CardContent className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 text-sm font-bold">
                      {standard.abbreviation.slice(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-900 truncate">{standard.name}</h2>
                        <Badge variant="outline" className="shrink-0">v{standard.version}</Badge>
                        <span className={cn('shrink-0 inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium', STATUS_COLORS[standard.status])}>
                          {standard.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{standard.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 ml-4 shrink-0">
                    {/* Inline stats */}
                    <div className="flex items-center gap-3 text-center">
                      <div>
                        <p className="text-lg font-bold text-gray-900">{totalEntries}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">Total</p>
                      </div>
                      <Separator orientation="vertical" className="h-8" />
                      <div>
                        <p className="text-lg font-bold text-green-700">{counts.tables}</p>
                        <p className="text-[10px] text-gray-500">Tables</p>
                      </div>
                      <Separator orientation="vertical" className="h-8" />
                      <div>
                        <p className="text-lg font-bold text-purple-700">{counts.fields + counts.codes}</p>
                        <p className="text-[10px] text-gray-500">Fields/Codes</p>
                      </div>
                      <Separator orientation="vertical" className="h-8" />
                      <div>
                        <p className="text-lg font-bold text-amber-700">{counts.terms + counts.naming}</p>
                        <p className="text-[10px] text-gray-500">Terms</p>
                      </div>
                    </div>
                    <Separator orientation="vertical" className="h-8" />
                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {standard.sourceUrl && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={standard.sourceUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingStandard(standard)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => setPendingDelete({ kind: 'standard', id: standard.id, label: `standard "${standard.abbreviation}"` })}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
                {/* Tags row */}
                {standard.tags.length > 0 && (
                  <div className="flex items-center gap-1 mt-2.5 ml-[52px]">
                    {standard.tags.map(t => <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>)}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Search + Tabs — integrated */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search in this standard..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {hasSearch && (
                  <span className="text-xs text-gray-500 shrink-0 whitespace-nowrap">
                    {activeSectionFiltered} match{activeSectionFiltered !== 1 ? 'es' : ''} in <span className="font-medium">{SECTIONS.find(s => s.id === activeSection)?.label}</span>
                  </span>
                )}
              </div>

              <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as SectionId)}>
                <TabsList>
                  {SECTIONS.map(s => (
                    <TabsTrigger key={s.id} value={s.id} className="flex items-center gap-1.5 text-xs">
                      <s.icon size={13} />
                      {s.label}
                      <Badge variant="secondary" className="ml-0.5 text-[10px] px-1.5 py-0 min-w-[18px] justify-center">
                        {counts[s.id]}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* No results banner */}
                {hasNoResults && (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Search className="h-8 w-8 mb-2" />
                    <p className="text-sm">No results for &ldquo;{searchQuery}&rdquo; in this section</p>
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => setSearchQuery('')}>
                      Clear search
                    </Button>
                  </div>
                )}

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
                            <div className="flex items-center gap-1">
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
                            <span className="font-medium text-gray-700">Core Entities: </span>{o.coreEntities}
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
                      { key: 'description', label: 'Description', render: r => <span className="text-sm text-gray-600">{r.description || '\u2014'}</span> },
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
                      { key: 'relatedCode', label: 'Code', render: r => r.relatedCode ? <span className="font-mono text-blue-700 text-xs">{r.relatedCode}</span> : <span className="text-gray-300">{'\u2014'}</span> },
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
                            <Badge variant="outline" className="mt-0.5 shrink-0">Level {d.level}</Badge>
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

export default BusinessGlossary;
