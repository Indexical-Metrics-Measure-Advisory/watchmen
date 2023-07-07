import {Bucket} from '@/services/data/tuples/bucket-types';
import {
	Convergence,
	ConvergenceTimeFrameVariable,
	ConvergenceTimeFrameVariableKind,
	ConvergenceVariable,
	ConvergenceVariableAxis
} from '@/services/data/tuples/convergence-types';
import {isBucketVariable, isFreeWalkVariable, isTimeFrameVariable} from '@/services/data/tuples/convergence-utils';
import {Objective, ObjectiveId} from '@/services/data/tuples/objective-types';
import {generateUuid} from '@/services/data/tuples/utils';
import {isNotBlank} from '@/services/utils';
import {Lang} from '@/widgets/langs';
import {useEffect, useState} from 'react';
import {useConvergencesEventBus} from '../../convergences-event-bus';
import {ConvergencesEventTypes} from '../../convergences-event-bus-types';
import {computeTimeFrameValues} from './utils';
import {
	FreezeButton,
	LeadCorner,
	ObjectiveEditGridContainer,
	TargetCell,
	XAxisFrozenLegendCellContainer,
	YAxisFrozenLegendCellContainer
} from './widgets';

interface State {
	buckets: Array<Bucket>;
	objectives: Array<Objective>;
}

export const ObjectiveEditGrid = (props: { convergence: Convergence, unfreeze: () => void }) => {
	const {convergence, unfreeze} = props;

	const {fire} = useConvergencesEventBus();
	const [state, setState] = useState<State>({buckets: [], objectives: []});
	useEffect(() => {
		const bucketIds = (convergence.variables || [])
			.filter(isBucketVariable)
			.map(variable => variable.bucketId)
			.filter(isNotBlank)
			// eslint-disable-next-line eqeqeq
			.filter(bucketId => state.buckets.every(bucket => bucket.bucketId != bucketId));
		const objectiveIds = Object.keys((convergence.targets || [])
			.filter(target => isNotBlank(target.objectiveId) && isNotBlank(target.targetId))
			.reduce((map, target) => {
				map[`${target.objectiveId}`] = true;
				return map;
			}, {} as Record<ObjectiveId, true>))
			// eslint-disable-next-line eqeqeq
			.filter(objectiveId => state.objectives.every(objective => objective.objectiveId != objectiveId));
		(async () => {
			const [buckets, objectives] = await Promise.all([
				new Promise<Array<Bucket>>(resolve => {
					fire(ConvergencesEventTypes.ASK_BUCKETS, bucketIds, (buckets: Array<Bucket>) => {
						resolve(buckets);
					});
				}),
				new Promise<Array<Objective>>(resolve => {
					fire(ConvergencesEventTypes.ASK_OBJECTIVES, objectiveIds, (objectives: Array<Objective>) => {
						resolve(objectives);
					});
				})
			]);
			setState(state => {
				return {
					buckets: [...state.buckets, ...buckets],
					objectives: [...state.objectives, ...objectives]
				};
			});
		})();
	}, [fire, convergence.targets, convergence.variables, state.buckets, state.objectives]);
	const xVariables = (convergence.variables || []).filter(variable => variable.axis === ConvergenceVariableAxis.X);
	const xRowsCount = xVariables.length ?? 0;
	const yVariables = (convergence.variables || []).filter(variable => variable.axis === ConvergenceVariableAxis.Y);
	const yColumnsCount = yVariables.length ?? 0;

	const onUnFreezeClicked = () => unfreeze();
	const asTimeFrameFrequency = (variable: ConvergenceTimeFrameVariable) => {
		switch (variable.kind) {
			case ConvergenceTimeFrameVariableKind.DAY:
				return Lang.INDICATOR.CONVERGENCE.VARIABLE_TIMEFRAME_KIND_DAY;
			case ConvergenceTimeFrameVariableKind.WEEK:
				return Lang.INDICATOR.CONVERGENCE.VARIABLE_TIMEFRAME_KIND_WEEK;
			case ConvergenceTimeFrameVariableKind.MONTH:
				return Lang.INDICATOR.CONVERGENCE.VARIABLE_TIMEFRAME_KIND_MONTH;
			case ConvergenceTimeFrameVariableKind.QUARTER:
				return Lang.INDICATOR.CONVERGENCE.VARIABLE_TIMEFRAME_KIND_QUARTER;
			case ConvergenceTimeFrameVariableKind.HALF_YEAR:
				return Lang.INDICATOR.CONVERGENCE.VARIABLE_TIMEFRAME_KIND_HALFYEAR;
			case ConvergenceTimeFrameVariableKind.YEAR:
				return Lang.INDICATOR.CONVERGENCE.VARIABLE_TIMEFRAME_KIND_YEAR;
			default:
				return Lang.INDICATOR.CONVERGENCE.VARIABLE_TIMEFRAME_KIND_MONTH;
		}
	};
	const computeAxisSeries = (variables: Array<ConvergenceVariable>) => {
		return variables.map(variable => {
			if (isTimeFrameVariable(variable)) {
				const times = computeTimeFrameValues(variable);
				const values = variable.values;
				return {
					variable, cells: [<>
						{variable.name}: {values[0].start.substring(0, 10)} ~ {values[values.length - 1].end.substring(0, 10)}, {asTimeFrameFrequency(variable)}, {times} {Lang.INDICATOR.CONVERGENCE.VARIABLE_TIMEFRAME_TIMES}
					</>]
				};
			} else if (isBucketVariable(variable)) {
				// eslint-disable-next-line eqeqeq
				const bucket = state.buckets.find(bucket => bucket.bucketId == variable.bucketId);
				if (bucket == null) {
					return {variable, cells: [<>{variable.name}</>]};
				} else {
					return {
						variable, cells: [<>
							{variable.name}: {bucket.segments.length} {Lang.INDICATOR.CONVERGENCE.VARIABLE_BUCKET_SEGMENTS}
						</>]
					};
				}
			} else if (isFreeWalkVariable(variable)) {
				return {variable, cells: (variable.values || []).map(x => x.trim()).map(x => <>{x}</>)};
			} else {
				return null;
			}
		}).filter(x => x != null) as Array<{ variable: ConvergenceVariable, cells: Array<JSX.Element> }>;
	};
	const xAxisRows = computeAxisSeries(xVariables);
	const yAxisColumns = computeAxisSeries(yVariables);
	const xComputedCount: number = Math.max(1, xAxisRows.reduce((count, {cells}) => Math.max(count, cells.length), 0));
	const yComputedCount: number = Math.max(1, yAxisColumns.reduce((count, {cells}) => Math.max(count, cells.length), 0));

	return <ObjectiveEditGridContainer yCount={yColumnsCount} xCount={xRowsCount} xComputedCount={xComputedCount}
	                                   yComputedCount={yComputedCount}>
		<LeadCorner yCount={yColumnsCount} xCount={xRowsCount}>
			<FreezeButton onClick={onUnFreezeClicked}>{Lang.INDICATOR.CONVERGENCE.UNFREEZE_DEF}</FreezeButton>
		</LeadCorner>
		{xAxisRows.length === 0
			? <XAxisFrozenLegendCellContainer row={0} column={Math.max(yColumnsCount, 1) + 1} span={xComputedCount}
			                                  last={true}/>
			: xAxisRows.map((row, rowIndex) => {
				if (row.cells.length === 1) {
					return <XAxisFrozenLegendCellContainer row={rowIndex} column={Math.max(yColumnsCount, 1) + 1}
					                                       span={xComputedCount} last={true}
					                                       key={row.variable.uuid}>
						{row.cells[0]}
					</XAxisFrozenLegendCellContainer>;
				} else {
					return row.cells.map((cell, cellIndex) => {
						return <XAxisFrozenLegendCellContainer row={rowIndex}
						                                       column={Math.max(yColumnsCount, 1) + 1 + cellIndex}
						                                       last={cellIndex === (row.cells.length - 1)}
						                                       key={`${row.variable.uuid}-${generateUuid()}`}>
							{cell}
						</XAxisFrozenLegendCellContainer>;
					});
				}
			})}
		{yAxisColumns.length === 0
			? <YAxisFrozenLegendCellContainer row={Math.max(xRowsCount, 1) + 1} column={0} span={yComputedCount}
			                                  last={true}/>
			: yAxisColumns.map((column, columnIndex) => {
				if (column.cells.length === 1) {
					return <YAxisFrozenLegendCellContainer row={Math.max(xRowsCount, 1) + 1} column={columnIndex}
					                                       span={yComputedCount} last={true}
					                                       key={column.variable.uuid}>
						{column.cells[0]}
					</YAxisFrozenLegendCellContainer>;
				} else {
					return column.cells.map((cell, cellIndex) => {
						return <YAxisFrozenLegendCellContainer row={Math.max(xRowsCount, 1) + 1 + cellIndex}
						                                       column={columnIndex}
						                                       last={cellIndex === (column.cells.length - 1)}
						                                       key={`${column.variable.uuid}-${generateUuid()}`}>
							{cell}
						</YAxisFrozenLegendCellContainer>;
					});
				}
			})}
		{new Array(xComputedCount).fill(1).map((_, columnIndex, columns) => {
			return new Array(yComputedCount).fill(1).map((_, rowIndex, rows) => {
				return <TargetCell row={Math.max(xRowsCount, 1) + rowIndex + 1}
				                   column={Math.max(yColumnsCount, 1) + columnIndex + 1}
				                   lastRow={rowIndex === rows.length - 1}
				                   lastColumn={columnIndex === columns.length - 1}
				                   key={`${rowIndex}-${columnIndex}`}>
				</TargetCell>;
			});
		})}
	</ObjectiveEditGridContainer>;
};