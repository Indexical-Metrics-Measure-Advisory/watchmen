import React from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MetricBucketRangeValue, MetricBucketSegment } from '@/model/metricBucket';
import { isMetricBucketRangeValue } from '@/utils/metricBucket';

interface MetricBucketSegmentsEditorProps {
	segments: MetricBucketSegment[];
	onChange: (segments: MetricBucketSegment[]) => void;
}

const rangeValue = (segment: MetricBucketSegment): MetricBucketRangeValue =>
	isMetricBucketRangeValue(segment.value) ? segment.value : {};

const MetricBucketSegmentsEditor: React.FC<MetricBucketSegmentsEditorProps> = ({ segments, onChange }) => {
	const { t } = useTranslation('metricBuckets');

	const updateSegment = (index: number, update: Partial<MetricBucketSegment>) => {
		onChange(segments.map((segment, segmentIndex) => segmentIndex === index ? { ...segment, ...update } : segment));
	};

	const updateRange = (index: number, bound: 'min' | 'max', value: string) => {
		onChange(segments.map((segment, segmentIndex) => segmentIndex === index
			? { ...segment, value: { ...rangeValue(segment), [bound]: value } }
			: segment));
	};

	const moveSegment = (index: number, offset: -1 | 1) => {
		const target = index + offset;
		if (target < 0 || target >= segments.length) {
			return;
		}
		const next = [...segments];
		[next[index], next[target]] = [next[target], next[index]];
		onChange(next);
	};

	return (
		<div className="space-y-3">
			<div className="space-y-2">
				{segments.map((segment, index) => (
					<div key={index} className="grid grid-cols-1 gap-3 rounded-md border p-3 md:grid-cols-[minmax(140px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_auto] md:items-end">
						<div className="space-y-1.5">
							<Label htmlFor={`bucket-segment-name-${index}`}>{t('form.segmentName')}</Label>
							<Input
								id={`bucket-segment-name-${index}`}
								value={segment.name}
								onChange={event => updateSegment(index, { name: event.target.value })}
								placeholder={t('form.segmentNamePlaceholder')}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor={`bucket-segment-min-${index}`}>{t('form.minimum')}</Label>
							<Input
								id={`bucket-segment-min-${index}`}
								type="number"
								step="any"
								value={rangeValue(segment).min ?? ''}
								onChange={event => updateRange(index, 'min', event.target.value)}
								placeholder={t('form.openBound')}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor={`bucket-segment-max-${index}`}>{t('form.maximum')}</Label>
							<Input
								id={`bucket-segment-max-${index}`}
								type="number"
								step="any"
								value={rangeValue(segment).max ?? ''}
								onChange={event => updateRange(index, 'max', event.target.value)}
								placeholder={t('form.openBound')}
							/>
						</div>
						<div className="flex items-center gap-1">
							<Button
								type="button"
								variant="ghost"
								size="icon"
								disabled={index === 0}
								onClick={() => moveSegment(index, -1)}
								title={t('form.moveUp')}
								aria-label={t('form.moveUp')}
							>
								<ArrowUp className="h-4 w-4" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								disabled={index === segments.length - 1}
								onClick={() => moveSegment(index, 1)}
								title={t('form.moveDown')}
								aria-label={t('form.moveDown')}
							>
								<ArrowDown className="h-4 w-4" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="text-destructive hover:text-destructive"
								onClick={() => onChange(segments.filter((_, segmentIndex) => segmentIndex !== index))}
								title={t('form.removeSegment')}
								aria-label={t('form.removeSegment')}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					</div>
				))}
			</div>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => onChange([...segments, { name: '', value: {} }])}
			>
				<Plus className="mr-2 h-4 w-4" />
				{t('form.addSegment')}
			</Button>
		</div>
	);
};

export default MetricBucketSegmentsEditor;
