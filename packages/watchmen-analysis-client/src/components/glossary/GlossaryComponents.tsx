import React, { useState, useEffect } from 'react';
import { Plus, BookOpen, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  type SectionId,
  type Standard,
  getFieldsForSection,
  SECTION_LABELS,
} from '@/model/businessGlossary';

// ----- Local sub-components -----

export const SectionHeader: React.FC<{ title: string; description: string; onAdd?: () => void }> = ({
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

export interface ColumnDef<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export function DataTable<T extends { id: string }>({
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

export const EditEntryDialog: React.FC<{
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

export const EditStandardDialog: React.FC<{
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

export const ConfirmDeleteDialog: React.FC<{
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
