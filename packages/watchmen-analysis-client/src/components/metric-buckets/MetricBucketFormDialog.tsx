import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
	CATEGORY_MEASURE_METHODS,
	VALUE_MEASURE_METHODS,
	type MetricBucket,
	type MetricBucketInclude,
	type MetricBucketMeasure,
	type MetricBucketSegment,
	type MetricBucketType
} from '@/model/metricBucket';
import type { Enumeration, EnumerationItem } from '@/model/enumeration';
import { getEnumeration, listEnumerations } from '@/services/enumerationService';
import {
	isMetricBucketRangeValue,
	isNumericMetricBucketType,
	validateMetricBucket,
	type MetricBucketValidationIssue
} from '@/utils/metricBucket';
import CategoryBucketSegmentsEditor from './CategoryBucketSegmentsEditor';
import EnumBucketSegmentsEditor from './EnumBucketSegmentsEditor';
import MetricBucketSegmentsEditor from './MetricBucketSegmentsEditor';

interface MetricBucketFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initial?: MetricBucket;
	onSave: (bucket: Partial<MetricBucket>) => Promise<void>;
}

const BUCKET_TYPES: MetricBucketType[] = ['value', 'value-measure', 'category-measure', 'enum-measure'];

const MetricBucketFormDialog: React.FC<MetricBucketFormDialogProps> = ({
	open,
	onOpenChange,
	initial,
	onSave
}) => {
	const { t } = useTranslation(['common', 'metricBuckets']);
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [type, setType] = useState<MetricBucketType>('value');
	const [measure, setMeasure] = useState<MetricBucketMeasure | undefined>();
	const [enumId, setEnumId] = useState('');
	const [include, setInclude] = useState<MetricBucketInclude>('include-min');
	const [segments, setSegments] = useState<MetricBucketSegment[]>([{ name: '', value: {} }]);
	const [enumerations, setEnumerations] = useState<Enumeration[]>([]);
	const [enumItems, setEnumItems] = useState<EnumerationItem[]>([]);
	const [enumLoading, setEnumLoading] = useState(false);
	const [enumError, setEnumError] = useState('');
	const [issues, setIssues] = useState<MetricBucketValidationIssue[]>([]);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!open) {
			return;
		}
		setName(initial?.name ?? '');
		setDescription(initial?.description ?? '');
		setType(initial?.type ?? 'value');
		setMeasure(initial?.measure);
		setEnumId(initial?.enumId ?? '');
		setInclude(initial?.include ?? 'include-min');
		setSegments(initial?.segments.map(segment => ({
			name: segment.name,
			value: Array.isArray(segment.value)
				? [...segment.value]
				: { min: segment.value.min ?? '', max: segment.value.max ?? '' }
		})) ?? [{ name: '', value: {} }]);
		setEnumerations([]);
		setEnumItems([]);
		setEnumError('');
		setIssues([]);
		setSaving(false);
	}, [open, initial]);

	useEffect(() => {
		if (!open || type !== 'enum-measure') {
			return;
		}
		let cancelled = false;
		setEnumLoading(true);
		setEnumError('');
		listEnumerations()
			.then(items => {
				if (!cancelled) {
					setEnumerations(items);
				}
			})
			.catch(error => {
				if (!cancelled) {
					setEnumError(error instanceof Error ? error.message : String(error));
				}
			})
			.finally(() => {
				if (!cancelled) {
					setEnumLoading(false);
				}
			});
		return () => {
			cancelled = true;
		};
	}, [open, type]);

	useEffect(() => {
		if (!open || type !== 'enum-measure' || !enumId) {
			setEnumItems([]);
			return;
		}
		let cancelled = false;
		setEnumLoading(true);
		setEnumError('');
		getEnumeration(enumId)
			.then(enumeration => {
				if (!cancelled) {
					setEnumItems(enumeration.items ?? []);
				}
			})
			.catch(error => {
				if (!cancelled) {
					setEnumItems([]);
					setEnumError(error instanceof Error ? error.message : String(error));
				}
			})
			.finally(() => {
				if (!cancelled) {
					setEnumLoading(false);
				}
			});
		return () => {
			cancelled = true;
		};
	}, [open, type, enumId]);

	const handleTypeChange = (value: MetricBucketType) => {
		setType(value);
		setMeasure(value === 'enum-measure' ? 'enum' : undefined);
		setEnumId('');
		setEnumItems([]);
		setInclude('include-min');
		setSegments([{ name: '', value: isNumericMetricBucketType(value) ? {} : [] }]);
		setIssues([]);
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		const validationIssues = validateMetricBucket({ name, type, measure, enumId, segments });
		setIssues(validationIssues);
		if (validationIssues.length > 0) {
			return;
		}
		setSaving(true);
		try {
			await onSave({
				...initial,
				name: name.trim(),
				type,
				include: isNumericMetricBucketType(type) ? include : undefined,
				measure: type === 'value' ? undefined : measure,
				enumId: type === 'enum-measure' ? enumId : undefined,
				segments: segments.map(segment => ({
					name: segment.name.trim(),
					value: isNumericMetricBucketType(type) && isMetricBucketRangeValue(segment.value)
						? {
							min: segment.value.min?.trim() || undefined,
							max: segment.value.max?.trim() || undefined
						}
						: Array.isArray(segment.value) ? segment.value.map(value => value.trim()) : []
				})),
				description: description.trim() || undefined
			});
			onOpenChange(false);
		} catch {
			return;
		} finally {
			setSaving(false);
		}
	};

	const measureMethods = type === 'value-measure' ? VALUE_MEASURE_METHODS : CATEGORY_MEASURE_METHODS;
	const enumerationOptions = initial?.enumId && !enumerations.some(item => item.enumId === initial.enumId)
		? [...enumerations, { enumId: initial.enumId, name: initial.enumId }]
		: enumerations;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{initial ? t('metricBuckets:form.editTitle') : t('metricBuckets:form.createTitle')}</DialogTitle>
					<DialogDescription>{t('metricBuckets:form.description')}</DialogDescription>
				</DialogHeader>
				<form onSubmit={event => void handleSubmit(event)} className="space-y-5">
					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="metric-bucket-name">{t('metricBuckets:form.name')}</Label>
							<Input
								id="metric-bucket-name"
								value={name}
								onChange={event => setName(event.target.value)}
								placeholder={t('metricBuckets:form.namePlaceholder')}
							/>
						</div>
						<div className="space-y-2">
							<Label>{t('metricBuckets:form.type')}</Label>
							<Select value={type} disabled={Boolean(initial)} onValueChange={value => handleTypeChange(value as MetricBucketType)}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{BUCKET_TYPES.map(bucketType => (
										<SelectItem key={bucketType} value={bucketType}>{t(`metricBuckets:types.${bucketType}`)}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="space-y-2">
						<Label htmlFor="metric-bucket-description">{t('metricBuckets:form.descriptionLabel')}</Label>
						<Textarea
							id="metric-bucket-description"
							value={description}
							onChange={event => setDescription(event.target.value)}
							placeholder={t('metricBuckets:form.descriptionPlaceholder')}
						/>
					</div>
					{type !== 'value' && type !== 'enum-measure' && (
						<div className="space-y-2">
							<Label>{t('metricBuckets:form.measureLabel')}</Label>
							<Select
								value={measure}
								disabled={Boolean(initial)}
								onValueChange={value => setMeasure(value as MetricBucketMeasure)}
							>
								<SelectTrigger className="md:w-80">
									<SelectValue placeholder={t('metricBuckets:form.measurePlaceholder')} />
								</SelectTrigger>
								<SelectContent>
									{measureMethods.map(method => (
										<SelectItem key={method} value={method}>{t(`metricBuckets:measures.${method}`)}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}
					{type === 'enum-measure' && (
						<div className="space-y-2">
							<Label>{t('metricBuckets:form.enumeration')}</Label>
							<Select value={enumId} disabled={Boolean(initial) || enumLoading} onValueChange={setEnumId}>
								<SelectTrigger className="md:w-80">
									<SelectValue placeholder={t('metricBuckets:form.enumerationPlaceholder')} />
								</SelectTrigger>
								<SelectContent>
									{enumerationOptions.map(enumeration => (
										<SelectItem key={enumeration.enumId} value={enumeration.enumId}>{enumeration.name}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}
					{isNumericMetricBucketType(type) && (
						<div className="space-y-2">
							<Label>{t('metricBuckets:form.include')}</Label>
							<Select value={include} onValueChange={value => setInclude(value as MetricBucketInclude)}>
								<SelectTrigger className="md:w-80">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="include-min">{t('metricBuckets:includes.include-min')}</SelectItem>
									<SelectItem value="include-max">{t('metricBuckets:includes.include-max')}</SelectItem>
								</SelectContent>
							</Select>
							<p className="text-xs text-muted-foreground">{t('metricBuckets:form.includeHint')}</p>
						</div>
					)}
					<div className="space-y-2">
						<Label>{t('metricBuckets:form.segments')}</Label>
						<p className="text-xs text-muted-foreground">
							{t(isNumericMetricBucketType(type) ? 'metricBuckets:form.segmentsHint' : 'metricBuckets:form.categorySegmentsHint')}
						</p>
						{isNumericMetricBucketType(type) && <MetricBucketSegmentsEditor segments={segments} onChange={setSegments} />}
						{type === 'category-measure' && <CategoryBucketSegmentsEditor segments={segments} onChange={setSegments} />}
						{type === 'enum-measure' && (
							enumLoading
								? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t('metricBuckets:form.loadingEnumeration')}</div>
								: <EnumBucketSegmentsEditor segments={segments} items={enumItems} onChange={setSegments} />
						)}
					</div>
					{isNumericMetricBucketType(type) && (
						<p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{t('metricBuckets:form.unmatchedHint')}</p>
					)}
					{enumError && <p className="text-sm text-destructive">{enumError}</p>}
					{issues.length > 0 && (
						<div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
							{issues.map((issue, index) => (
								<div key={`${issue.code}-${issue.segmentIndex ?? 'form'}-${index}`}>
									{t(`metricBuckets:validation.${issue.code}`, { index: (issue.segmentIndex ?? 0) + 1 })}
								</div>
							))}
						</div>
					)}
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
							{t('common:cancel')}
						</Button>
						<Button type="submit" disabled={saving || (type === 'enum-measure' && enumLoading)}>
							{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							{initial ? t('common:saveChanges') : t('common:create')}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};

export default MetricBucketFormDialog;
