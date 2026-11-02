import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { EnumerationItem } from '@/model/enumeration';
import { OTHER_CATEGORY_SEGMENT_VALUE, type MetricBucketSegment } from '@/model/metricBucket';

interface EnumBucketSegmentsEditorProps {
	segments: MetricBucketSegment[];
	items: EnumerationItem[];
	onChange: (segments: MetricBucketSegment[]) => void;
}

const EnumBucketSegmentsEditor: React.FC<EnumBucketSegmentsEditorProps> = ({ segments, items, onChange }) => {
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
								<Label htmlFor={`enum-segment-name-${index}`}>{t('form.segmentName')}</Label>
								<Input
									id={`enum-segment-name-${index}`}
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
						{other ? (
							<Badge variant="secondary">{t('form.otherCategory')}</Badge>
						) : (
							<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
								{items.map(item => {
									const checked = values.includes(item.code);
									const disabled = !checked && usedValues.has(item.code);
									return (
										<div key={item.code} className="flex items-center space-x-2">
											<Checkbox
												id={`enum-segment-${index}-${item.code}`}
												checked={checked}
												disabled={disabled}
												onCheckedChange={selected => updateSegment(index, {
													value: selected === true
														? [...values, item.code]
														: values.filter(value => value !== item.code)
												})}
											/>
											<Label htmlFor={`enum-segment-${index}-${item.code}`} className="font-normal">
												{item.label || item.code} ({item.code})
											</Label>
										</div>
									);
								})}
							</div>
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
			{items.length === 0 && <p className="text-sm text-muted-foreground">{t('form.noEnumItems')}</p>}
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

export default EnumBucketSegmentsEditor;
