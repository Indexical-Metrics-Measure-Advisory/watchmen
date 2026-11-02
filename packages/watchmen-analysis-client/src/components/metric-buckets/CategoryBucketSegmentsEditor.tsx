import React, { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OTHER_CATEGORY_SEGMENT_VALUE, type MetricBucketSegment } from '@/model/metricBucket';

interface CategoryBucketSegmentsEditorProps {
	segments: MetricBucketSegment[];
	onChange: (segments: MetricBucketSegment[]) => void;
}

interface CategoryValueInputProps {
	disabled: boolean;
	usedValues: Set<string>;
	onAdd: (value: string) => void;
}

const CategoryValueInput: React.FC<CategoryValueInputProps> = ({ disabled, usedValues, onAdd }) => {
	const { t } = useTranslation('metricBuckets');
	const [value, setValue] = useState('');
	const normalized = value.trim();
	const invalid = !normalized || usedValues.has(normalized);
	const add = () => {
		if (invalid) {
			return;
		}
		onAdd(normalized);
		setValue('');
	};

	return (
		<div className="flex gap-2">
			<Input
				value={value}
				disabled={disabled}
				onChange={event => setValue(event.target.value)}
				onKeyDown={event => {
					if (event.key === 'Enter') {
						event.preventDefault();
						add();
					}
				}}
				placeholder={t('form.categoryValuePlaceholder')}
			/>
			<Button type="button" variant="outline" size="sm" disabled={disabled || invalid} onClick={add}>
				<Plus className="h-4 w-4" />
				<span className="sr-only">{t('form.addCategoryValue')}</span>
			</Button>
		</div>
	);
};

const CategoryBucketSegmentsEditor: React.FC<CategoryBucketSegmentsEditorProps> = ({ segments, onChange }) => {
	const { t } = useTranslation('metricBuckets');
	const usedValues = new Set(segments.flatMap(segment => Array.isArray(segment.value) ? segment.value : []));
	const hasOthers = usedValues.has(OTHER_CATEGORY_SEGMENT_VALUE);
	const updateSegment = (index: number, update: Partial<MetricBucketSegment>) => {
		onChange(segments.map((segment, segmentIndex) => segmentIndex === index ? { ...segment, ...update } : segment));
	};

	return (
		<div className="space-y-3">
			{segments.map((segment, index) => {
				const values = Array.isArray(segment.value) ? segment.value : [];
				const other = values.includes(OTHER_CATEGORY_SEGMENT_VALUE);
				return (
					<div key={index} className="space-y-3 rounded-md border p-3">
						<div className="flex items-end gap-2">
							<div className="flex-1 space-y-1.5">
								<Label htmlFor={`category-segment-name-${index}`}>{t('form.segmentName')}</Label>
								<Input
									id={`category-segment-name-${index}`}
									value={segment.name}
									onChange={event => updateSegment(index, { name: event.target.value })}
									placeholder={t('form.segmentNamePlaceholder')}
								/>
							</div>
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
						<div className="flex flex-wrap gap-2">
							{values.map(value => (
								<Badge key={value} variant="secondary" className="gap-1">
									{value === OTHER_CATEGORY_SEGMENT_VALUE ? t('form.otherCategory') : value}
									{!other && (
										<button
											type="button"
											onClick={() => updateSegment(index, { value: values.filter(item => item !== value) })}
											aria-label={t('form.removeCategoryValue', { value })}
										>
											<X className="h-3 w-3" />
										</button>
									)}
								</Badge>
							))}
						</div>
						{!other && (
							<CategoryValueInput
								disabled={hasOthers}
								usedValues={usedValues}
								onAdd={value => updateSegment(index, { value: [...values, value] })}
							/>
						)}
						{!other && !hasOthers && values.length === 0 && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => updateSegment(index, { value: [OTHER_CATEGORY_SEGMENT_VALUE] })}
							>
								{t('form.addOtherCategory')}
							</Button>
						)}
					</div>
				);
			})}
			<Button
				type="button"
				variant="outline"
				size="sm"
				disabled={hasOthers}
				onClick={() => onChange([...segments, { name: '', value: [] }])}
			>
				<Plus className="mr-2 h-4 w-4" />
				{t('form.addSegment')}
			</Button>
		</div>
	);
};

export default CategoryBucketSegmentsEditor;
