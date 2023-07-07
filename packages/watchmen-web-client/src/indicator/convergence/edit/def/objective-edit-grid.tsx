import {Bucket} from '@/services/data/tuples/bucket-types';
import {
	Convergence,
	ConvergenceTarget,
	ConvergenceTargetVariableMapping,
	ConvergenceTimeFrameVariable,
	ConvergenceTimeFrameVariableKind,
	ConvergenceVariable,
	ConvergenceVariableAxis
} from '@/services/data/tuples/convergence-types';
import {isBucketVariable, isFreeWalkVariable, isTimeFrameVariable} from '@/services/data/tuples/convergence-utils';
import {Objective, ObjectiveId, ObjectiveTarget} from '@/services/data/tuples/objective-types';
import {QueryObjective} from '@/services/data/tuples/query-objective-types';
import {generateUuid} from '@/services/data/tuples/utils';
import {isBlank, isNotBlank, noop} from '@/services/utils';
import {ICON_COPY_TO_LEFT} from '@/widgets/basic/constants';
import {Dropdown} from '@/widgets/basic/dropdown';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {Fragment, useEffect, useState} from 'react';
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

interface CandidateState {
	initialized: boolean;
	objectiveCandidates: Array<QueryObjective>;
}

interface BucketState {
	data: Array<Bucket>;
}

interface ObjectiveState {
	data: Array<Objective>;
}

const NOT_SELECTED = '-';

export const ObjectiveEditGrid = (props: { convergence: Convergence, unfreeze: () => void }) => {
	const {convergence, unfreeze} = props;

	const {fire} = useConvergencesEventBus();
	const [candidates, setCandidates] = useState<CandidateState>({initialized: false, objectiveCandidates: []});
	const [buckets, setBuckets] = useState<BucketState>({data: []});
	const [objectives, setObjectives] = useState<ObjectiveState>({data: []});
	useEffect(() => {
		if (candidates.initialized) {
			return;
		}
		fire(ConvergencesEventTypes.ASK_ALL_OBJECTIVES, (objectives: Array<QueryObjective>) => {
			setCandidates({initialized: true, objectiveCandidates: objectives});
		});
	}, [fire, candidates]);
	useEffect(() => {
		const bucketIds = (convergence.variables || [])
			.filter(isBucketVariable)
			.map(variable => variable.bucketId)
			.filter(isNotBlank)
			// eslint-disable-next-line eqeqeq
			.filter(bucketId => buckets.data.every(bucket => bucket.bucketId != bucketId));
		if (bucketIds.length !== 0) {
			fire(ConvergencesEventTypes.ASK_BUCKETS, bucketIds, (buckets: Array<Bucket>) => {
				setBuckets(state => {
					return {data: [...state.data, ...buckets]};
				});
			});
		}
	}, [fire, convergence.variables, buckets]);
	useEffect(() => {
		const objectiveIds = Object.keys((convergence.targets || [])
			.filter(target => isNotBlank(target.objectiveId) && isNotBlank(target.targetId))
			.reduce((map, target) => {
				map[`${target.objectiveId}`] = true;
				return map;
			}, {} as Record<ObjectiveId, true>))
			// eslint-disable-next-line eqeqeq
			.filter(objectiveId => objectives.data.every(objective => objective.objectiveId != objectiveId));
		if (objectiveIds.length !== 0) {
			fire(ConvergencesEventTypes.ASK_OBJECTIVES, objectiveIds, (objectives: Array<Objective>) => {
				setObjectives(state => {
					return {data: [...state.data, ...objectives]};
				});
			});
		}
	}, [fire, convergence.targets, objectives.data]);
	const forceUpdate = useForceUpdate();

	const onTargetChanged = (rowIndex: number, columnIndex: number, target?: ConvergenceTarget) => (option: DropdownOption) => {
		const selected = option as unknown as DropdownOption & { objective: Objective, target: ObjectiveTarget };
		if (target == null) {
			if (option.value === NOT_SELECTED) {
				// still nothing
			} else {
				target = {
					uuid: generateUuid(),
					objectiveId: selected.objective.objectiveId,
					targetId: selected.target.uuid,
					mapping: (selected.objective.variables || []).map(variable => {
						return {uuid: generateUuid(), objectiveVariableName: variable.name};
					}),
					row: rowIndex, col: columnIndex
				};
				if (convergence.targets == null) {
					convergence.targets = [];
				}
				convergence.targets.push(target);
				fire(ConvergencesEventTypes.SAVE_CONVERGENCE, convergence, noop);
				forceUpdate();
			}
		} else {
			if (option.value === NOT_SELECTED) {
				// removed
				convergence.targets = (convergence.targets || []).filter(t => t !== target);
				fire(ConvergencesEventTypes.SAVE_CONVERGENCE, convergence, noop);
				forceUpdate();
			} else {
				target.objectiveId = selected.objective.objectiveId;
				target.targetId = selected.target.uuid;
				target.mapping = (selected.objective.variables || []).map(variable => {
					return {uuid: generateUuid(), objectiveVariableName: variable.name};
				});
				fire(ConvergencesEventTypes.SAVE_CONVERGENCE, convergence, noop);
				forceUpdate();
			}
		}
	};
	const onMapVariableChanged = (map: ConvergenceTargetVariableMapping) => (option: DropdownOption) => {
		map.variableId = option.value as string;
		fire(ConvergencesEventTypes.SAVE_CONVERGENCE, convergence, noop);
		forceUpdate();
	};

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
				const bucket = buckets.data.find(bucket => bucket.bucketId == variable.bucketId);
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

	const objectiveTargetOptions = [
		{value: NOT_SELECTED, label: Lang.INDICATOR.CONVERGENCE.PLEASE_SELECT_TARGET},
		...candidates.objectiveCandidates.map(objective => {
			return (objective.targets || []).map(target => {
				return {
					value: `${objective.objectiveId} - ${target.uuid}`,
					label: `${objective.name || ''} - ${target.name || ''}`,
					objective, target
				};
			});
		}).flat()
	];
	const mapVariableOptions: Array<DropdownOption> = (convergence.variables || [])
		.filter(variable => !isFreeWalkVariable(variable))
		.map(variable => {
			return {value: variable.uuid, label: variable.name ?? ''};
		});

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
				// eslint-disable-next-line eqeqeq
				const target = (convergence.targets || []).find(target => target.row == rowIndex && target.col == columnIndex);
				const id = (target == null || isBlank(target.objectiveId) || isBlank(target.targetId))
					? NOT_SELECTED
					: `${target?.objectiveId} - ${target?.targetId}`;
				return <TargetCell row={Math.max(xRowsCount, 1) + rowIndex + 1}
				                   column={Math.max(yColumnsCount, 1) + columnIndex + 1}
				                   lastRow={rowIndex === rows.length - 1}
				                   lastColumn={columnIndex === columns.length - 1}
				                   key={`${rowIndex}-${columnIndex}`}>
					<Dropdown options={objectiveTargetOptions} value={id}
					          onChange={onTargetChanged(rowIndex, columnIndex, target)}/>
					{(target?.mapping || []).map((map, index) => {
						return <Fragment key={map.uuid}>
							<span>#{index + 1} {map.objectiveVariableName}</span>
							<span><FontAwesomeIcon icon={ICON_COPY_TO_LEFT}/></span>
							<Dropdown value={map.variableId} options={mapVariableOptions}
							          onChange={onMapVariableChanged(map)}/>
						</Fragment>;
					})}
				</TargetCell>;
			});
		})}
	</ObjectiveEditGridContainer>;
};