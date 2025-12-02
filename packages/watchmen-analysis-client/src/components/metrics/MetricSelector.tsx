import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getMetrics } from '@/services/metricsManagementService';
import type { MetricDefinition } from '@/model/metricsManagement';

type MetricSelectorProps = {
  categories: { id: string; name: string }[];
  initialCategoryId?: string;
  initialSearch?: string;
  selectedMetricId?: string;
  onSelect: (metric: MetricDefinition) => void;
};

const useDebounce = <T,>(value: T, delay = 300): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

export const MetricSelector: React.FC<MetricSelectorProps> = ({
  categories,
  initialCategoryId = '',
  initialSearch = '',
  selectedMetricId,
  onSelect,
}) => {
  const [search, setSearch] = useState(initialSearch);
  const [categoryId, setCategoryId] = useState<string>(initialCategoryId);
  const [sortBy, setSortBy] = useState<'relevance' | 'name_asc' | 'name_desc'>('relevance');
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 50;
  const debouncedSearch = useDebounce(search, 300);
  const listRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const favorites = useMemo<string[]>(() => {
    try {
      const raw = localStorage.getItem('bi.favoriteMetrics');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, [loading]);

  const toggleFavorite = useCallback((id: string) => {
    try {
      const raw = localStorage.getItem('bi.favoriteMetrics');
      const favs: string[] = raw ? JSON.parse(raw) : [];
      const next = favs.includes(id) ? favs.filter(x => x !== id) : [...favs, id];
      localStorage.setItem('bi.favoriteMetrics', JSON.stringify(next));
    } catch {}
  }, []);

  const resetAndLoad = useCallback(() => {
    setMetrics([]);
    setOffset(0);
    setHasMore(true);
  }, []);

  useEffect(() => {
    resetAndLoad();
  }, [debouncedSearch, categoryId, sortBy, favoritesOnly, groupByCategory, resetAndLoad]);

  useEffect(() => {
    let alive = true;
    const fetchPage = async () => {
      if (!hasMore || loading) return;
      setLoading(true);
      try {
        // Fetch full filtered list from service; slice locally for paging
        const result = await getMetrics({ searchTerm: debouncedSearch, categoryId });
        console.log('result', result);
        if (!alive) return;
        const full = Array.isArray(result) ? result : [];
        console.log('full', full);
        // Apply favorites and client-side sorting on the full set for consistent ordering
        let ordered = full;
        
        // if (sortBy === 'name_asc') {
        //   ordered = [...ordered].sort((a, b) => (a.label || a.name).localeCompare(b.label || b.name));
        // } else if (sortBy === 'name_desc') {
        //   ordered = [...ordered].sort((a, b) => (b.label || b.name).localeCompare(a.label || a.name));
        // }

        const page = ordered.slice(offset, offset + limit);
        setMetrics(prev => (offset === 0 ? page : [...prev, ...page]));
        setHasMore(offset + limit < ordered.length);
      } catch (e) {
        setHasMore(false);
      } finally {
        if (alive) setLoading(false);
      }
    };
    fetchPage();
    return () => { alive = false; };
  }, [debouncedSearch, categoryId, limit, offset, hasMore, loading, favoritesOnly, sortBy, favorites]);

  const sortedFiltered = useMemo(() => {
    let list = metrics;
    if (favoritesOnly) {
      list = list.filter(m => favorites.includes(m.id ?? m.name));
    }
    if (sortBy === 'name_asc') {
      list = [...list].sort((a, b) => (a.label || a.name).localeCompare(b.label || b.name));
    } else if (sortBy === 'name_desc') {
      list = [...list].sort((a, b) => (b.label || b.name).localeCompare(a.label || a.name));
    }
    return list;
  }, [metrics, sortBy, favoritesOnly, favorites]);

  const grouped = useMemo(() => {
    if (!groupByCategory) return [{ key: 'all', label: 'All Metrics', items: sortedFiltered }];
    const map = new Map<string, MetricDefinition[]>();
    sortedFiltered.forEach(m => {
      const key = m.categoryId || 'uncategorized';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
    const order = categories.map(c => ({ key: c.id, label: c.name }));
    const sections = order
      .filter(o => map.has(o.key))
      .map(o => ({ key: o.key, label: o.label, items: map.get(o.key)! }));
    if (map.has('uncategorized')) sections.push({ key: 'uncategorized', label: 'Uncategorized', items: map.get('uncategorized')! });
    return sections;
  }, [sortedFiltered, groupByCategory, categories]);

  const onScroll = useCallback(() => {
    const el = listRef.current;
    if (!el || loading || !hasMore) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 24;
    if (nearBottom) setOffset(prev => prev + limit);
  }, [loading, hasMore, limit]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const handler = () => onScroll();
    el.addEventListener('scroll', handler);
    return () => el.removeEventListener('scroll', handler);
  }, [onScroll]);

  const suggestions = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) return [] as MetricDefinition[];
    const score = (m: MetricDefinition) => {
      const name = (m.label || m.name || '').toLowerCase();
      const desc = (m.description || '').toLowerCase();
      let s = 0;
      if (name.includes(term)) s += 5;
      if (desc.includes(term)) s += 2;
      if ((m.tags || []).some(t => t.toLowerCase().includes(term))) s += 3;
      return s;
    };
    return [...metrics].sort((a, b) => score(b) - score(a)).slice(0, 8);
  }, [debouncedSearch, metrics]);

  const highlight = (text: string) => {
    const term = debouncedSearch.trim();
    if (!term) return text;
    const idx = text.toLowerCase().indexOf(term.toLowerCase());
    if (idx === -1) return text;
    return (
      <span>
        {text.slice(0, idx)}
        <span className="bg-yellow-200">{text.slice(idx, idx + term.length)}</span>
        {text.slice(idx + term.length)}
      </span>
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0) {
        const m = suggestions[activeIndex];
        onSelect(m);
        try {
          const raw = localStorage.getItem('bi.recentMetrics');
          const recents: string[] = raw ? JSON.parse(raw) : [];
          const id = m.id ?? m.name;
          const next = [id, ...recents.filter(r => r !== id)].slice(0, 20);
          localStorage.setItem('bi.recentMetrics', JSON.stringify(next));
        } catch {}
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-12">
          <div className="relative">
            <Input placeholder="Search metrics" value={search} onChange={(e) => { setSearch(e.target.value); setActiveIndex(-1); }} onKeyDown={handleKeyDown} />
            {suggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded border bg-white shadow">
                {suggestions.map((m, i) => (
                  <button
                    key={m.id ?? m.name}
                    className={`flex w-full items-center justify-between px-2 py-1 text-sm ${i === activeIndex ? 'bg-slate-100' : ''}`}
                    onMouseEnter={() => setActiveIndex(i)}
                    onMouseLeave={() => setActiveIndex(-1)}
                    onClick={() => onSelect(m)}
                  >
                    <div className="flex-1 text-left">
                      <div className="font-medium">{highlight(m.label || m.name)}</div>
                      {m.description && (<div className="text-slate-500 text-xs line-clamp-1">{highlight(m.description)}</div>)}
                    </div>
                    <Badge variant="outline">Suggest</Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="col-span-6">
          <Select value={categoryId === '' ? 'all' : categoryId} onValueChange={(v) => setCategoryId(v === 'all' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="Filter by category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-6">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger><SelectValue placeholder="Sort by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="name_asc">Name A→Z</SelectItem>
              <SelectItem value="name_desc">Name Z→A</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-12 flex items-center gap-2">
          <Button variant={groupByCategory ? 'default' : 'outline'} size="sm" onClick={() => setGroupByCategory(v => !v)}>
            {groupByCategory ? 'Grouped by Category' : 'Group by Category'}
          </Button>
          <Button variant={favoritesOnly ? 'default' : 'outline'} size="sm" onClick={() => setFavoritesOnly(v => !v)}>
            {favoritesOnly ? 'Favorites Only' : 'Show Favorites'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setCategoryId(''); setSortBy('relevance'); setGroupByCategory(false); setFavoritesOnly(false); }}>
            Clear Filters
          </Button>
        </div>
      </div>

      <div ref={listRef} className="max-h-56 overflow-auto space-y-2">
        {grouped.map(section => (
          <div key={section.key}>
            {groupByCategory && (
              <div className="sticky top-0 bg-white z-0 text-xs font-semibold text-slate-500 py-1">{section.label}</div>
            )}
            {section.items.map((m) => {
              const id = m.id ?? m.name;
              const isSelected = selectedMetricId === id;
              const isFav = favorites.includes(id);
              return (
                <label key={id} className={`flex items-center justify-between rounded border px-2 py-1 text-sm ${isSelected ? 'border-primary' : 'border-slate-200'}`}>
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      {highlight(m.label || m.name)}
                      {isFav && <Badge variant="secondary">★ Favorite</Badge>}
                    </div>
                    {m.description && <div className="text-slate-500 text-xs line-clamp-1">{highlight(m.description)}</div>}
                    {Array.isArray(m.tags) && m.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {m.tags.slice(0, 4).map(t => (<Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>))}
                        {m.tags.length > 4 && (<Badge variant="outline" className="text-[10px]">+{m.tags.length - 4}</Badge>)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant={isSelected ? 'default' : 'outline'} size="sm" onClick={() => onSelect(m)}>
                      {isSelected ? 'Selected' : 'Select'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggleFavorite(id)} title={isFav ? 'Unfavorite' : 'Favorite'}>
                      {isFav ? '★' : '☆'}
                    </Button>
                  </div>
                </label>
              );
            })}
          </div>
        ))}

        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded border p-2 animate-pulse">
                <div className="h-3 w-1/3 bg-slate-200 rounded" />
                <div className="mt-2 h-3 w-2/3 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        )}

        {!loading && !metrics.length && (
          <div className="text-xs text-slate-500">No metrics found. Try adjusting filters.</div>
        )}
      </div>

      {!loading && hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setOffset(prev => prev + limit)}>Load more</Button>
        </div>
      )}
    </div>
  );
};

export default MetricSelector;