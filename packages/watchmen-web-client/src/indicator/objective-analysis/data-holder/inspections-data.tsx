import {fetchInspection, listInspections, saveInspection} from '@/services/data/tuples/inspection';
import {Inspection, InspectionId} from '@/services/data/tuples/inspection-types';
import {QueryInspection} from '@/services/data/tuples/query-inspection-types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import React, {Fragment, useEffect, useState} from 'react';
import {useObjectiveAnalysisEventBus} from '../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../objective-analysis-event-bus-types';

interface LoadedInspections {
	loaded: boolean;
	data: Array<QueryInspection>;
	loader?: Promise<Array<QueryInspection>>;
}

type AskingRequest = (inspection: Inspection) => void;
type AskingRequestQueue = Array<AskingRequest>;

export const InspectionsData = () => {
	const {fire: fireGlobal} = useEventBus();
	const {on, off, fire} = useObjectiveAnalysisEventBus();
	const [state, setState] = useState<LoadedInspections>({loaded: false, data: []});
	const [loadingQueue] = useState<Record<InspectionId, AskingRequestQueue>>({});
	const [inspections] = useState<Record<InspectionId, Inspection>>({});
	// inspection related
	useEffect(() => {
		const onAskInspections = (onData: (inspections: Array<QueryInspection>) => void) => {
			if (state.loaded) {
				onData(state.data);
			} else if (state.loader) {
				state.loader.then(inspections => onData(inspections));
			} else {
				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
					async () => await listInspections(),
					(inspections: Array<QueryInspection>) => {
						const sorted = inspections.sort((i1, i2) => {
							return (i1.name || '').localeCompare(i2.name || '', void 0, {
								sensitivity: 'base',
								caseFirst: 'upper'
							});
						});
						setState({loaded: true, data: sorted});
						onData(sorted);
					});
			}
		};
		on(ObjectiveAnalysisEventTypes.ASK_INSPECTIONS, onAskInspections);
		return () => {
			off(ObjectiveAnalysisEventTypes.ASK_INSPECTIONS, onAskInspections);
		};
	}, [on, off, fireGlobal, state]);
	useEffect(() => {
		const onAskInspection = (inspectionId: InspectionId, onData: (inspection: Inspection) => void) => {
			const existing = inspections[inspectionId];
			if (existing != null) {
				onData(existing);
				return;
			}

			const queue = loadingQueue[inspectionId];
			if (queue != null && queue.length !== 0) {
				// loading now
				queue.push(onData);
			} else {
				loadingQueue[inspectionId] = [onData];

				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
					async () => await fetchInspection(inspectionId),
					(inspection: Inspection) => {
						inspections[inspectionId] = inspection;
						loadingQueue[inspectionId].forEach(onData => onData(inspection));
						delete loadingQueue[inspectionId];
					});
			}
		};
		on(ObjectiveAnalysisEventTypes.ASK_INSPECTION, onAskInspection);
		return () => {
			off(ObjectiveAnalysisEventTypes.ASK_INSPECTION, onAskInspection);
		};
	}, [on, off, fireGlobal, inspections, loadingQueue]);
	useEffect(() => {
		const onSaveInspection = (inspection: Inspection, onSaved: (inspection: Inspection, saved: boolean) => void) => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await saveInspection(inspection),
				() => {
					// eslint-disable-next-line
					const index = state.data.findIndex(existing => existing.inspectionId == inspection.inspectionId);
					if (index !== -1) {
						state.data.splice(index, 1, inspection);
					} else {
						state.data.push(inspection);
					}
					inspections[inspection.inspectionId] = inspection;
					onSaved(inspection, true);
				},
				() => onSaved(inspection, false));
		};
		on(ObjectiveAnalysisEventTypes.SAVE_INSPECTION, onSaveInspection);
		return () => {
			off(ObjectiveAnalysisEventTypes.SAVE_INSPECTION, onSaveInspection);
		};
	}, [on, off, fire, fireGlobal, state, inspections]);

	return <Fragment/>;
};