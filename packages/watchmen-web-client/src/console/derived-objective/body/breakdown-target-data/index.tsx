import {BreakdownTarget, DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {ObjectiveTarget} from '@/services/data/tuples/objective-types';
import {isBlank} from '@/services/utils';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {useEffect, useState} from 'react';
import {useBreakdownTargetEventBus} from '../breakdown-target/breakdown-target-event-bus';
import {BreakdownTargetEventTypes} from '../breakdown-target/breakdown-target-event-bus-types';
import {DefForBreakdownDimension} from '../types';
import {
	BreakdownTargetDataContainer,
	BreakdownTargetDataNoDimension,
	BreakdownTargetDataTable,
	BreakdownTargetDataTableHeader,
	BreakdownTargetDataTableHeaderCell
} from './widgets';

interface Column {
	name: string;
	width: string | number;
}

const buildValueColumns = (target: ObjectiveTarget): Array<Column> => {
	const columns: Array<Column> = [];

	columns.push({name: Lang.INDICATOR.OBJECTIVE.TARGET_CURRENT_VALUE, width: 100});
	if (target.askPreviousCycle) {
		columns.push({name: Lang.INDICATOR.OBJECTIVE.TARGET_PREVIOUS_VALUE, width: 100});
	}
	if (target.askChainCycle) {
		columns.push({name: Lang.INDICATOR.OBJECTIVE.TARGET_CHAIN_VALUE, width: 100});
	}

	return columns;
};

const buildColumns = (target: ObjectiveTarget, breakdown: BreakdownTarget, def: DefForBreakdownDimension): Array<Column> => {
	const columns: Array<Column> = [];

	const dimensions = breakdown.dimensions ?? [];
	dimensions.forEach(dimension => {
		const factorOrColumnId = dimension.factorOrColumnId;
		if (isBlank(factorOrColumnId)) {
			return;
		}
		if (def.topic != null) {
			// eslint-disable-next-line eqeqeq
			const factor = (def.topic.factors ?? []).find(factor => factor.factorId == factorOrColumnId);
			if (factor != null) {
				columns.push({name: factor.label || factor.name || 'Noname Dimension', width: '1fr'});
			}
		} else if (def.subject != null) {
			// eslint-disable-next-line eqeqeq
			const column = (def.subject.dataset?.columns ?? []).find(column => column.columnId == factorOrColumnId);
			if (column != null) {
				columns.push({name: column.alias || 'Noname Dimension', width: '1fr'});
			}
		}
	});

	columns.push(...buildValueColumns(target));
	return columns;
};

export const BreakdownTargetData = (props: {
	derivedObjective: DerivedObjective;
	target: ObjectiveTarget; breakdown: BreakdownTarget;
	def: DefForBreakdownDimension;
}) => {
	const {derivedObjective, target, breakdown, def} = props;

	const {on: onBreakdown, off: offBreakdown} = useBreakdownTargetEventBus();
	const [painted, setPainted] = useState(false);
	const [columns, setColumns] = useState<Array<Column>>(buildColumns(target, breakdown, def));
	const forceUpdate = useForceUpdate();
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
	}, [onBreakdown, offBreakdown, painted, target, breakdown, def]);

	const hasDimension = (breakdown.dimensions ?? []).length !== 0;

	if (!painted) {
		if (!hasDimension) {
			return <BreakdownTargetDataContainer>
				<BreakdownTargetDataNoDimension>
					{Lang.CONSOLE.DERIVED_OBJECTIVE.BREAKDOWN_NO_DIMENSION}
				</BreakdownTargetDataNoDimension>
			</BreakdownTargetDataContainer>;
		}
	}

	return <BreakdownTargetDataContainer>
		<BreakdownTargetDataTable>
			<BreakdownTargetDataTableHeader columns={columns.map(column => column.width)}>
				{columns.map((column, index) => {
					return <BreakdownTargetDataTableHeaderCell key={`${column.name}-${index}`}>
						{column.name}
					</BreakdownTargetDataTableHeaderCell>;
				})}
			</BreakdownTargetDataTableHeader>
		</BreakdownTargetDataTable>
	</BreakdownTargetDataContainer>;
};
