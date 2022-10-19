import {ObjectiveAnalysisPerspective} from '@/services/data/tuples/objective-analysis-types';
import {Lang} from '@/widgets/langs';
import {useEffect, useState} from 'react';
import {useObjectiveAnalysisEventBus} from '../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../objective-analysis-event-bus-types';
import {NoInspection} from './widgets';

export const NoInspectionPicked = (props: { perspective: ObjectiveAnalysisPerspective }) => {
	const {perspective} = props;

	const {on, off} = useObjectiveAnalysisEventBus();
	const [visible, setVisible] = useState(true);
	useEffect(() => {
		const onSwitchToEdit = () => setVisible(true);
		const onSwitchToView = () => setVisible(false);
		on(ObjectiveAnalysisEventTypes.SWITCH_TO_EDIT, onSwitchToEdit);
		on(ObjectiveAnalysisEventTypes.SWITCH_TO_VIEW, onSwitchToView);
		return () => {
			off(ObjectiveAnalysisEventTypes.SWITCH_TO_EDIT, onSwitchToEdit);
			off(ObjectiveAnalysisEventTypes.SWITCH_TO_VIEW, onSwitchToView);
		};
	}, [on, off]);

	const inspectionId = perspective.relationId;
	if (visible || (inspectionId != null && inspectionId.trim().length !== 0)) {
		return null;
	}

	return <NoInspection>
		{Lang.INDICATOR.OBJECTIVE_ANALYSIS.NO_INSPECTION}
	</NoInspection>;
};