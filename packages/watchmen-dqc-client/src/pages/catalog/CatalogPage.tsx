import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { catalogService } from '@/services/catalogService';
import { topicService } from '@/services/topicService';
import { userService } from '@/services/userService';
import type { Catalog, CatalogCriteria } from '@/models/catalog';

const ALL = '__all__';
const NONE = '__none__';

interface CatalogDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	catalog?: Catalog | null;
	onSaved: () => void;
}

/** Create/edit catalog dialog. */
const CatalogDialog: React.FC<CatalogDialogProps> = ({ open, onOpenChange, catalog, onSaved }) => {
	const { t } = useTranslation(['dqc', 'common']);
	const [name, setName] = useState('');
	const [topicIds, setTopicIds] = useState<string[]>([]);
	const [techOwnerId, setTechOwnerId] = useState<string>(NONE);
	const [bizOwnerId, setBizOwnerId] = useState<string>(NONE);
	const [tags, setTags] = useState('');
	const [description, setDescription] = useState('');

	React.useEffect(() => {
		if (!open) return;
		setName(catalog?.name ?? '');
		setTopicIds(catalog?.topicIds ?? []);
		setTechOwnerId(catalog?.techOwnerId ?? NONE);
		setBizOwnerId(catalog?.bizOwnerId ?? NONE);
		setTags((catalog?.tags ?? []).join(', '));
		setDescription(catalog?.description ?? '');
	}, [open, catalog]);

	const topicsQuery = useQuery({ queryKey: ['dqc', 'topics'], queryFn: () => topicService.getAllTopics() });
	const usersQuery = useQuery({ queryKey: ['dqc', 'users'], queryFn: () => userService.listUsersByName() });
	const topics = topicsQuery.data ?? [];
	const users = usersQuery.data ?? [];

	const saveMutation = useMutation({
		mutationFn: (payload: Catalog) => catalogService.saveCatalog(payload),
		onSuccess: () => {
			toast.success(t('dqc:catalog.saved'));
			onOpenChange(false);
			onSaved();
		},
		onError: (err: any) => toast.error(err?.message || t('dqc:catalog.saveFailed')),
	});

	const toggleTopic = (topicId: string, checked: boolean) => {
		setTopicIds((prev) => (checked ? [...new Set([...prev, topicId])] : prev.filter((id) => id !== topicId)));
	};

	const submit = () => {
		saveMutation.mutate({
			catalogId: catalog?.catalogId,
			name,
			topicIds,
			techOwnerId: techOwnerId === NONE ? undefined : techOwnerId,
			bizOwnerId: bizOwnerId === NONE ? undefined : bizOwnerId,
			tags: tags.split(',').map((x) => x.trim()).filter((x) => x.length > 0),
			description,
			tenantId: catalog?.tenantId,
			version: catalog?.version,
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>{catalog ? t('dqc:catalog.editCatalog') : t('dqc:catalog.newCatalog')}</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col gap-3">
					<div className="flex flex-col gap-1.5">
						<Label>{t('common:name')}</Label>
						<Input value={name} onChange={(e) => setName(e.target.value)} />
					</div>
					<div className="flex flex-col gap-1.5">
						<Label>{t('dqc:catalog.topics')}</Label>
						<div className="max-h-40 overflow-auto rounded-md border p-2">
							{topics.map((topic) => (
								<label key={topic.topicId} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-accent/10">
									<Checkbox
										checked={topicIds.includes(topic.topicId!)}
										onCheckedChange={(checked) => toggleTopic(topic.topicId!, checked === true)}
									/>
									{topic.name}
								</label>
							))}
						</div>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col gap-1.5">
							<Label>{t('dqc:catalog.techOwner')}</Label>
							<Select value={techOwnerId} onValueChange={setTechOwnerId}>
								<SelectTrigger><SelectValue /></SelectTrigger>
								<SelectContent>
									<SelectItem value={NONE}>{t('common:none')}</SelectItem>
									{users.map((user) => (
										<SelectItem key={user.userId} value={user.userId!}>{user.name}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label>{t('dqc:catalog.bizOwner')}</Label>
							<Select value={bizOwnerId} onValueChange={setBizOwnerId}>
								<SelectTrigger><SelectValue /></SelectTrigger>
								<SelectContent>
									<SelectItem value={NONE}>{t('common:none')}</SelectItem>
									{users.map((user) => (
										<SelectItem key={user.userId} value={user.userId!}>{user.name}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label>{t('common:tags')} ({t('dqc:catalog.tagsHint')})</Label>
						<Input value={tags} onChange={(e) => setTags(e.target.value)} />
					</div>
					<div className="flex flex-col gap-1.5">
						<Label>{t('common:description')}</Label>
						<Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>{t('common:cancel')}</Button>
					<Button onClick={submit} disabled={!name.trim() || saveMutation.isPending}>
						{t('common:save')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

const CatalogPage: React.FC = () => {
	const { t } = useTranslation(['dqc', 'common']);
	const queryClient = useQueryClient();
	const [nameFilter, setNameFilter] = useState('');
	const [topicFilter, setTopicFilter] = useState<string>(ALL);
	const [criteria, setCriteria] = useState<CatalogCriteria>({});
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingCatalog, setEditingCatalog] = useState<Catalog | null>(null);
	const [deletingCatalog, setDeletingCatalog] = useState<Catalog | null>(null);

	const topicsQuery = useQuery({ queryKey: ['dqc', 'topics'], queryFn: () => topicService.getAllTopics() });
	const usersQuery = useQuery({ queryKey: ['dqc', 'users'], queryFn: () => userService.listUsersByName() });
	const topics = useMemo(() => topicsQuery.data ?? [], [topicsQuery.data]);
	const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
	const topicNameOf = (id: string) => topics.find((topic) => topic.topicId === id)?.name ?? id;
	const userNameOf = (id?: string) => (id ? users.find((user) => user.userId === id)?.name ?? id : '-');

	const catalogsQuery = useQuery({
		queryKey: ['dqc', 'catalogs', criteria],
		queryFn: () => catalogService.findByCriteria(criteria),
	});
	const catalogs = catalogsQuery.data ?? [];

	const deleteMutation = useMutation({
		mutationFn: (catalogId: string) => catalogService.deleteCatalog(catalogId),
		onSuccess: () => {
			toast.success(t('dqc:catalog.deleted'));
			setDeletingCatalog(null);
			queryClient.invalidateQueries({ queryKey: ['dqc', 'catalogs'] });
		},
		onError: (err: any) => toast.error(err?.message || t('dqc:catalog.deleteFailed')),
	});

	const runSearch = () => {
		setCriteria({
			name: nameFilter.trim() || undefined,
			topicId: topicFilter === ALL ? undefined : topicFilter,
		});
	};

	return (
		<div className="flex flex-col gap-4">
			<Card>
				<CardContent className="flex flex-wrap items-end gap-3 p-4">
					<div className="flex w-64 flex-col gap-1.5">
						<Label>{t('common:name')}</Label>
						<Input
							placeholder={t('dqc:catalog.searchPlaceholder')}
							value={nameFilter}
							onChange={(e) => setNameFilter(e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && runSearch()}
						/>
					</div>
					<div className="flex w-56 flex-col gap-1.5">
						<Label>{t('dqc:catalog.topicFilter')}</Label>
						<Select value={topicFilter} onValueChange={setTopicFilter}>
							<SelectTrigger><SelectValue /></SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL}>{t('common:all')}</SelectItem>
								{topics.map((topic) => (
									<SelectItem key={topic.topicId} value={topic.topicId!}>{topic.name}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<Button variant="outline" onClick={runSearch} disabled={catalogsQuery.isFetching}>
						<Search className="mr-1.5 h-4 w-4" />
						{t('common:search')}
					</Button>
					<div className="ml-auto">
						<Button onClick={() => { setEditingCatalog(null); setDialogOpen(true); }}>
							<Plus className="mr-1.5 h-4 w-4" />
							{t('dqc:catalog.newCatalog')}
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="p-0">
					{catalogsQuery.isLoading ? (
						<div className="flex flex-col gap-2 p-4">
							{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}
						</div>
					) : catalogs.length === 0 ? (
						<p className="p-8 text-center text-sm text-muted-foreground">{t('dqc:catalog.noCatalogs')}</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t('common:name')}</TableHead>
									<TableHead>{t('dqc:catalog.topics')}</TableHead>
									<TableHead>{t('dqc:catalog.techOwner')}</TableHead>
									<TableHead>{t('dqc:catalog.bizOwner')}</TableHead>
									<TableHead>{t('common:tags')}</TableHead>
									<TableHead>{t('common:description')}</TableHead>
									<TableHead className="w-24 text-right">{t('common:actions')}</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{catalogs.map((catalog) => (
									<TableRow key={catalog.catalogId}>
										<TableCell className="font-medium">{catalog.name}</TableCell>
										<TableCell className="max-w-48">
											<div className="flex flex-wrap gap-1">
												{(catalog.topicIds ?? []).slice(0, 3).map((topicId) => (
													<Badge key={topicId} variant="outline" className="text-[11px]">{topicNameOf(topicId)}</Badge>
												))}
												{(catalog.topicIds ?? []).length > 3 && (
													<Badge variant="outline" className="text-[11px]">+{(catalog.topicIds ?? []).length - 3}</Badge>
												)}
											</div>
										</TableCell>
										<TableCell className="text-sm">{userNameOf(catalog.techOwnerId)}</TableCell>
										<TableCell className="text-sm">{userNameOf(catalog.bizOwnerId)}</TableCell>
										<TableCell className="max-w-36">
											<div className="flex flex-wrap gap-1">
												{(catalog.tags ?? []).map((tag) => (
													<Badge key={tag} variant="secondary" className="text-[11px]">{tag}</Badge>
												))}
											</div>
										</TableCell>
										<TableCell className="max-w-56 truncate text-sm text-muted-foreground" title={catalog.description}>
											{catalog.description}
										</TableCell>
										<TableCell className="text-right">
											<Button
												variant="ghost" size="icon" className="h-7 w-7"
												onClick={() => { setEditingCatalog(catalog); setDialogOpen(true); }}
											>
												<Pencil className="h-3.5 w-3.5" />
											</Button>
											<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeletingCatalog(catalog)}>
												<Trash2 className="h-3.5 w-3.5" />
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<CatalogDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				catalog={editingCatalog}
				onSaved={() => queryClient.invalidateQueries({ queryKey: ['dqc', 'catalogs'] })}
			/>

			<AlertDialog open={!!deletingCatalog} onOpenChange={(open) => !open && setDeletingCatalog(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('common:deleteConfirmTitle')}</AlertDialogTitle>
						<AlertDialogDescription>
							{deletingCatalog?.name} — {t('common:deleteConfirmMessage')}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => deletingCatalog?.catalogId && deleteMutation.mutate(deletingCatalog.catalogId)}
						>
							{t('common:delete')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default CatalogPage;
