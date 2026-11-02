import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import type { MetricBucket } from '@/model/metricBucket';
import { metricBucketService } from '@/services/metricBucketService';
import { formatMetricBucketSegments } from '@/utils/metricBucket';

export interface ValueBucketSelectProps {
	value?: string;
	onChange: (value: string) => void;
	queryName?: string;
	disabled?: boolean;
	className?: string;
}

const ValueBucketSelect: React.FC<ValueBucketSelectProps> = ({
	value,
	onChange,
	queryName,
	disabled = false,
	className
}) => {
	const { t } = useTranslation('metricBuckets');
	const [buckets, setBuckets] = useState<MetricBucket[]>([]);
	const [loading, setLoading] = useState(false);
	const [loadFailed, setLoadFailed] = useState(false);

	useEffect(() => {
		let alive = true;
		setLoading(true);
		setLoadFailed(false);
		metricBucketService.listNumericValueBuckets(queryName)
			.then(result => {
				if (alive) {
					setBuckets(result);
				}
			})
			.catch(() => {
				if (alive) {
					setBuckets([]);
					setLoadFailed(true);
				}
			})
			.finally(() => {
				if (alive) {
					setLoading(false);
				}
			});
		return () => {
			alive = false;
		};
	}, [queryName]);

	const placeholder = loading
		? t('select.loading')
		: loadFailed
			? t('select.loadFailed')
			: t('select.placeholder');

	return (
		<Select
			value={value || 'none'}
			onValueChange={selected => onChange(selected === 'none' ? '' : selected)}
			disabled={disabled || loading || loadFailed}
		>
			<SelectTrigger className={className}>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="none">{t('select.none')}</SelectItem>
				{buckets.length === 0 ? (
					<div className="px-3 py-2 text-sm text-muted-foreground">{t('select.empty')}</div>
				) : buckets.map(bucket => (
					<SelectItem key={bucket.bucketId} value={bucket.bucketId} className="items-start">
						<div className="flex flex-col gap-0.5">
							<span>{bucket.name}</span>
							<span className="text-xs text-muted-foreground">
								{formatMetricBucketSegments(bucket.segments ?? [], bucket.include)}
							</span>
						</div>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
};

export default ValueBucketSelect;
