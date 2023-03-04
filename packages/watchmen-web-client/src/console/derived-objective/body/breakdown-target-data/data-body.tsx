import {
	BreakdownTarget,
	DerivedObjective,
	ObjectiveTargetBreakdownValues
} from '@/services/data/tuples/derived-objective-types';
import {ObjectiveTarget, ObjectiveTargetBetterSide} from '@/services/data/tuples/objective-types';
import {Lang} from '@/widgets/langs';
import {asDisplayValue, fromTobe} from '@/widgets/objective/utils';
import {v4} from 'uuid';
import {Column} from './types';
import {BreakdownTargetDataTableBody, BreakdownTargetDataTableRow, BreakdownTargetDataTableRowCell} from './widgets';

export const DataBody = (props: {
	derivedObjective: DerivedObjective; target: ObjectiveTarget; breakdown: BreakdownTarget;
	columns: Array<Column>; values?: ObjectiveTargetBreakdownValues;
}) => {
	const {target, columns, values} = props;

	if (values == null) {
		return null;
	} else if (values.failed) {
		return <BreakdownTargetDataTableBody>
			<BreakdownTargetDataTableRow columns={['1fr']}>
				<BreakdownTargetDataTableRowCell>
					{Lang.CONSOLE.DERIVED_OBJECTIVE.FAILED_ON_FETCH_BREAKDOWN_VALUES}
				</BreakdownTargetDataTableRowCell>
			</BreakdownTargetDataTableRow>
		</BreakdownTargetDataTableBody>;

	} else if ((values.data ?? []).length === 0) {
		return <BreakdownTargetDataTableBody>
			<BreakdownTargetDataTableRow columns={['1fr']}>
				<BreakdownTargetDataTableRowCell>
					{Lang.CONSOLE.DERIVED_OBJECTIVE.NO_DATA_FETCHED_BREAKDOWN_VALUES}
				</BreakdownTargetDataTableRowCell>
			</BreakdownTargetDataTableRow>
		</BreakdownTargetDataTableBody>;
	}

	const {percentage = false} = fromTobe(target.tobe);
	const gridColumns = columns.map(column => column.width);
	if (target.betterSide === ObjectiveTargetBetterSide.LESS) {
		values.data.sort((r1, r2) => {
			return (r1.currentValue ?? 0) - (r2.currentValue ?? 0);
		});
	} else {
		values.data.sort((r1, r2) => {
			return (r2.currentValue ?? 0) - (r1.currentValue ?? 0);
		});
	}

	return <BreakdownTargetDataTableBody>
		{values?.data.map(row => {
			return <BreakdownTargetDataTableRow columns={gridColumns} key={v4()}>
				{(row.dimensions ?? []).map(dimensionValue => {
					return <BreakdownTargetDataTableRowCell key={v4()}>
						{dimensionValue}
					</BreakdownTargetDataTableRowCell>;
				})}
				<BreakdownTargetDataTableRowCell>
					{asDisplayValue({value: row.currentValue ?? 0, percentage})}
				</BreakdownTargetDataTableRowCell>
				{target.askPreviousCycle
					? <BreakdownTargetDataTableRowCell>
						{asDisplayValue({value: row.previousValue ?? 0, percentage})}
					</BreakdownTargetDataTableRowCell>
					: null}
				{target.askChainCycle
					? <BreakdownTargetDataTableRowCell>
						{asDisplayValue({value: row.chainValue ?? 0, percentage})}
					</BreakdownTargetDataTableRowCell>
					: null}
			</BreakdownTargetDataTableRow>;
		})}
	</BreakdownTargetDataTableBody>;
};