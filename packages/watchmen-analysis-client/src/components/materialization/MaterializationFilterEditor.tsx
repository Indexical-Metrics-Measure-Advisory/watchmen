import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import type {
	MaterializationFilter,
	MaterializationFilterOperator,
	MockDimensionOption,
	MockMeasureOption
} from '@/model/materialization';

interface MaterializationFilterEditorProps {
	dimensions: MockDimensionOption[];
	measures: MockMeasureOption[];
	filters: MaterializationFilter[];
	onChange: (filters: MaterializationFilter[]) => void;
}

const OPERATORS: MaterializationFilterOperator[] = ['=', '!=', '>', '>=', '<', '<=', 'IN'];

const MaterializationFilterEditor: React.FC<MaterializationFilterEditorProps> = ({
	dimensions, measures, filters, onChange
}) => {
	const { t } = useTranslation(['materialization']);
	const addFilter = () => {
		const dimension = dimensions[0];
		const measure = measures[0];
		if (!dimension && !measure) return;
		onChange([...filters, {
			field: dimension?.id ?? measure!.id,
			referenceType: dimension ? 'Dimension' : 'Metric',
			operator: '=',
			value: ''
		}]);
	};
	const updateFilter = (index: number, patch: Partial<MaterializationFilter>) => {
		onChange(filters.map((filter, filterIndex) => filterIndex === index ? { ...filter, ...patch } : filter));
	};

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between gap-2">
				<p className="text-xs text-muted-foreground">{t('materialization:form.filtersHint')}</p>
				<Button type="button" variant="outline" size="sm" onClick={addFilter}
					disabled={dimensions.length + measures.length === 0}>
					<Plus className="mr-1 h-3.5 w-3.5" />
					{t('materialization:form.addFilter')}
				</Button>
			</div>
			{filters.length === 0 ? (
				<div className="rounded-md border border-dashed py-4 text-center text-xs text-muted-foreground">
					{t('materialization:form.noFilters')}
				</div>
			) : (
				<div className="space-y-2">
					{filters.map((filter, index) => (
						<div key={`${filter.referenceType}-${filter.field}-${index}`} className="grid grid-cols-[minmax(0,1fr)_76px_minmax(0,1fr)_32px] gap-2">
							<Select
								value={`${filter.referenceType}:${filter.field}`}
								onValueChange={(value) => {
									const separator = value.indexOf(':');
									updateFilter(index, {
										referenceType: value.slice(0, separator) as MaterializationFilter['referenceType'],
										field: value.slice(separator + 1)
									});
								}}
							>
								<SelectTrigger className="min-w-0"><SelectValue /></SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectLabel>{t('materialization:form.filterDimensions')}</SelectLabel>
										{dimensions.map((dimension) => (
											<SelectItem key={dimension.id} value={`Dimension:${dimension.id}`}>{dimension.name}</SelectItem>
										))}
									</SelectGroup>
									<SelectGroup>
										<SelectLabel>{t('materialization:form.filterMeasures')}</SelectLabel>
										{measures.map((measure) => (
											<SelectItem key={measure.id} value={`Metric:${measure.id}`}>{measure.name}</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
							<Select value={filter.operator}
								onValueChange={(operator) => updateFilter(index, { operator: operator as MaterializationFilterOperator })}>
								<SelectTrigger><SelectValue /></SelectTrigger>
								<SelectContent>
									{OPERATORS.map((operator) => <SelectItem key={operator} value={operator}>{operator}</SelectItem>)}
								</SelectContent>
							</Select>
							<Input value={filter.value} onChange={(event) => updateFilter(index, { value: event.target.value })}
								placeholder={filter.operator === 'IN'
									? t('materialization:form.filterValuesPlaceholder')
									: t('materialization:form.filterValuePlaceholder')} />
							<Button type="button" variant="ghost" size="icon" className="h-9 w-8"
								onClick={() => onChange(filters.filter((_, filterIndex) => filterIndex !== index))}
								aria-label={t('materialization:form.removeFilter')}>
								<Trash2 className="h-4 w-4 text-muted-foreground" />
							</Button>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default MaterializationFilterEditor;
