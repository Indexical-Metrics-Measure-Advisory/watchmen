import {
    BreakdownTarget,
    DerivedObjective,
    ObjectiveTargetBreakdownValues
} from '@/services/data/tuples/derived-objective-types';
import {ObjectiveTarget} from '@/services/data/tuples/objective-types';
import {Lang} from '@/widgets/langs';
import {useEffect, useState} from 'react';
import {useBreakdownTargetEventBus} from '../breakdown-target/breakdown-target-event-bus';
import {BreakdownTargetEventTypes} from '../breakdown-target/breakdown-target-event-bus-types';
import {DefForBreakdownDimension} from '../types';
import {DataBody} from './data-body';
import {ObjectiveValuesHandler} from './objective-values-handler';
import {Column} from './types';
import {buildColumns} from './utils';
import {ValuesHandler} from './values-holder';
import {
    BreakdownTargetDataContainer,
    BreakdownTargetDataNoDimension,
    BreakdownTargetDataTable,
    BreakdownTargetDataTableHeader,
    BreakdownTargetDataTableHeaderCell
} from './widgets';

export const BreakdownTargetData = (props: {
	derivedObjective: DerivedObjective;
	target: ObjectiveTarget; breakdown: BreakdownTarget;
	def: DefForBreakdownDimension;
}) => {
	const {derivedObjective, target, breakdown, def} = props;

	const {on: onBreakdown, off: offBreakdown, fire: fireBreakdown} = useBreakdownTargetEventBus();
	const [painted, setPainted] = useState(false);
	const [columns, setColumns] = useState<Array<Column>>(buildColumns(target, breakdown, def));
	const [values, setValues] = useState<ObjectiveTargetBreakdownValues | null>(null);
	useEffect(() => {
		const rebuildColumns = () => {
			if (!painted) {
				setColumns(buildColumns(target, breakdown, def));
			}
		};
		const onDimensionAdded = () => rebuildColumns();
		const onDimensionChanged = () => rebuildColumns();
		const onDimensionRemoved = () => rebuildColumns();
		onBreakdown(BreakdownTargetEventTypes.DIMENSION_ADDED, onDimensionAdded);
		onBreakdown(BreakdownTargetEventTypes.DIMENSION_CHANGED, onDimensionChanged);
		onBreakdown(BreakdownTargetEventTypes.DIMENSION_REMOVED, onDimensionRemoved);
		return () => {
			offBreakdown(BreakdownTargetEventTypes.DIMENSION_ADDED, onDimensionAdded);
			offBreakdown(BreakdownTargetEventTypes.DIMENSION_CHANGED, onDimensionChanged);
			offBreakdown(BreakdownTargetEventTypes.DIMENSION_REMOVED, onDimensionRemoved);
		};
	}, [onBreakdown, offBreakdown, painted, target, breakdown, def]);
	useEffect(() => {
		const onValuesFetched = (values: ObjectiveTargetBreakdownValues) => {
			setColumns(buildColumns(target, breakdown, def));
			setValues(values);
			setPainted(true);
		};
		onBreakdown(BreakdownTargetEventTypes.VALUES_FETCHED, onValuesFetched);
		return () => {
			offBreakdown(BreakdownTargetEventTypes.VALUES_FETCHED, onValuesFetched);
		};
	}, [onBreakdown, offBreakdown, target, breakdown, def]);
	useEffect(() => {
		if (painted) {
			return;
		}
		const hasDimension = (breakdown.dimensions ?? []).length !== 0;
		if (!hasDimension) {
			return;
		}
		fireBreakdown(BreakdownTargetEventTypes.ASK_VALUES);
	}, [fireBreakdown, painted, breakdown.dimensions]);

	const hasDimension = (breakdown.dimensions ?? []).length !== 0;

	if (!painted && !hasDimension) {
		return <BreakdownTargetDataContainer>
			<BreakdownTargetDataNoDimension>
				{Lang.CONSOLE.DERIVED_OBJECTIVE.BREAKDOWN_NO_DIMENSION}
			</BreakdownTargetDataNoDimension>
		</BreakdownTargetDataContainer>;
	}

	const gridColumns = columns.map(column => column.width);

	return <BreakdownTargetDataContainer>
		<ValuesHandler derivedObjective={derivedObjective} target={target} breakdown={breakdown}/>
		<BreakdownTargetDataTable>
			<BreakdownTargetDataTableHeader columns={gridColumns}>
				{columns.map((column, index) => {
					return <BreakdownTargetDataTableHeaderCell key={`${column.name}-${index}`}>
						{column.name}
					</BreakdownTargetDataTableHeaderCell>;
				})}
			</BreakdownTargetDataTableHeader>
			<DataBody derivedObjective={derivedObjective} target={target} breakdown={breakdown}
			          columns={columns} values={values ?? (void 0)}/>
		</BreakdownTargetDataTable>
		<ObjectiveValuesHandler/>
	</BreakdownTargetDataContainer>;
};
