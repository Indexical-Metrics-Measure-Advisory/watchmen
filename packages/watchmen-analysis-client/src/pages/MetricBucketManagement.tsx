import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, RefreshCw, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious
} from '@/components/ui/pagination';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table';
import MetricBucketFormDialog from '@/components/metric-buckets/MetricBucketFormDialog';
import { useToast } from '@/hooks/use-toast';
import type { MetricBucket } from '@/model/metricBucket';
import { metricBucketService } from '@/services/metricBucketService';
import { formatMetricBucketSegments } from '@/utils/metricBucket';

const PAGE_SIZE = 10;

const MetricBucketManagement: React.FC = () => {
	const { t } = useTranslation(['common', 'metricBuckets']);
	const { toast } = useToast();
	const [rows, setRows] = useState<MetricBucket[]>([]);
	const [loading, setLoading] = useState(true);
	const [keywordInput, setKeywordInput] = useState('');
	const [keyword, setKeyword] = useState('');
	const [pageNumber, setPageNumber] = useState(1);
	const [pageCount, setPageCount] = useState(1);
	const [itemCount, setItemCount] = useState(0);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editing, setEditing] = useState<MetricBucket | undefined>();
	const [loadingDetail, setLoadingDetail] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const result = await metricBucketService.pageBuckets({
				query_name: keyword || undefined,
				pageNumber,
				pageSize: PAGE_SIZE
			});
			setRows(result.data ?? []);
			setItemCount(result.itemCount ?? 0);
			setPageCount(Math.max(1, result.pageCount ?? 1));
			if (result.pageNumber && result.pageNumber !== pageNumber) {
				setPageNumber(result.pageNumber);
			}
		} catch (error) {
			toast({
				title: t('metricBuckets:list.loadFailed'),
				description: error instanceof Error ? error.message : String(error),
				variant: 'destructive'
			});
		} finally {
			setLoading(false);
		}
	}, [keyword, pageNumber, t, toast]);

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => {
		const timer = setTimeout(() => {
			setKeyword(keywordInput.trim());
			setPageNumber(1);
		}, 350);
		return () => clearTimeout(timer);
	}, [keywordInput]);

	const openCreate = () => {
		setEditing(undefined);
		setDialogOpen(true);
	};

	const openEdit = async (bucket: MetricBucket) => {
		setLoadingDetail(true);
		try {
			setEditing(await metricBucketService.getBucket(bucket.bucketId));
			setDialogOpen(true);
		} catch (error) {
			toast({
				title: t('metricBuckets:list.loadDetailFailed'),
				description: error instanceof Error ? error.message : String(error),
				variant: 'destructive'
			});
		} finally {
			setLoadingDetail(false);
		}
	};

	const handleSave = async (bucket: Partial<MetricBucket>) => {
		try {
			await metricBucketService.saveBucket(bucket);
			toast({ title: t('metricBuckets:list.saved') });
			await load();
		} catch (error) {
			toast({
				title: t('metricBuckets:list.saveFailed'),
				description: error instanceof Error ? error.message : String(error),
				variant: 'destructive'
			});
			throw error;
		}
	};

	return (
		<div className="min-h-screen bg-background">
			<main className="container space-y-6 py-8">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<h1 className="text-2xl font-bold tracking-tight">{t('metricBuckets:list.title')}</h1>
						<p className="text-muted-foreground">{t('metricBuckets:list.subtitle')}</p>
					</div>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
							{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
							{t('common:refresh')}
						</Button>
						<Button size="sm" onClick={openCreate}>
							<Plus className="mr-2 h-4 w-4" />
							{t('metricBuckets:list.create')}
						</Button>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<div className="relative">
						<Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							className="w-64 pl-8"
							value={keywordInput}
							onChange={event => setKeywordInput(event.target.value)}
							placeholder={t('metricBuckets:list.searchPlaceholder')}
						/>
					</div>
					<span className="ml-auto text-xs text-muted-foreground">
						{t('metricBuckets:list.totalCount', { count: itemCount })}
					</span>
				</div>

				<Card>
					{loading ? (
						<div className="flex h-64 items-center justify-center">
							<Loader2 className="h-8 w-8 animate-spin text-primary" />
						</div>
					) : (
						<>
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>{t('metricBuckets:list.colName')}</TableHead>
											<TableHead>{t('metricBuckets:list.colType')}</TableHead>
											<TableHead>{t('metricBuckets:list.colSegments')}</TableHead>
											<TableHead>{t('metricBuckets:list.colDescription')}</TableHead>
											<TableHead className="text-right">{t('common:actions')}</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{rows.length === 0 && (
											<TableRow>
												<TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
													{t('metricBuckets:list.empty')}
												</TableCell>
											</TableRow>
										)}
										{rows.map(bucket => (
											<TableRow key={bucket.bucketId}>
												<TableCell className="font-medium">{bucket.name}</TableCell>
												<TableCell>
													<Badge variant="secondary">{t(`metricBuckets:types.${bucket.type}`)}</Badge>
												</TableCell>
												<TableCell className="max-w-md">
													<div className="truncate text-xs" title={formatMetricBucketSegments(bucket.segments ?? [], bucket.include)}>
														{formatMetricBucketSegments(bucket.segments ?? [], bucket.include)}
													</div>
												</TableCell>
												<TableCell className="max-w-xs">
													<div className="truncate text-sm text-muted-foreground" title={bucket.description}>
														{bucket.description || '-'}
													</div>
												</TableCell>
												<TableCell className="text-right">
													<Button variant="ghost" size="sm" disabled={loadingDetail} onClick={() => void openEdit(bucket)}>
														{t('common:edit')}
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
							{pageCount > 1 && (
								<div className="flex justify-center border-t py-4">
									<Pagination>
										<PaginationContent>
											<PaginationItem>
												<PaginationPrevious
													href="#"
													onClick={event => {
														event.preventDefault();
														setPageNumber(page => Math.max(1, page - 1));
													}}
												/>
											</PaginationItem>
											{Array.from({ length: pageCount }, (_, index) => index + 1)
												.filter(page => page === 1 || page === pageCount || Math.abs(page - pageNumber) <= 1)
												.map((page, index, pages) => (
													<React.Fragment key={page}>
														{index > 0 && pages[index - 1] !== page - 1 && (
															<PaginationItem><span className="px-2 text-muted-foreground">…</span></PaginationItem>
														)}
														<PaginationItem>
															<PaginationLink
																href="#"
																isActive={page === pageNumber}
																onClick={event => {
																	event.preventDefault();
																	setPageNumber(page);
																}}
															>
																{page}
															</PaginationLink>
														</PaginationItem>
													</React.Fragment>
												))}
											<PaginationItem>
												<PaginationNext
													href="#"
													onClick={event => {
														event.preventDefault();
														setPageNumber(page => Math.min(pageCount, page + 1));
													}}
												/>
											</PaginationItem>
										</PaginationContent>
									</Pagination>
								</div>
							)}
						</>
					)}
				</Card>
			</main>
			<MetricBucketFormDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				initial={editing}
				onSave={handleSave}
			/>
		</div>
	);
};

export default MetricBucketManagement;
