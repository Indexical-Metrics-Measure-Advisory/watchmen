import {ObjectiveAnalysisPerspective} from '@/services/data/tuples/objective-analysis-types';
import {RoundDwarfButton} from '@/widgets/basic/button';
import {ICON_OBJECTIVE_ANALYSIS_PERSPECTIVE} from '@/widgets/basic/constants';
import {ButtonInk} from '@/widgets/basic/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {Inspection} from '../../inspection/inspection';
import {InspectionEventBusProvider} from '../../inspection/inspection-event-bus';
import {InspectionStateHolder} from '../../inspection/state';
import {useObjectiveAnalysisEventBus} from '../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../objective-analysis-event-bus-types';
import {useDescription} from './use-description';
import {PerspectiveButtons, PerspectiveContainer, PerspectiveDescriptor, PerspectiveDescriptorWrapper} from './widgets';

export const PerspectiveOnInspection = (props: { data: ObjectiveAnalysisPerspective }) => {
	const {data} = props;

	const {fire: fireGlobal} = useEventBus();
	const {fire} = useObjectiveAnalysisEventBus();
	const {onDescriptionChanged, onDescriptionBlurred} = useDescription(data);

	const onDeleteClicked = () => {
		fireGlobal(EventTypes.SHOW_YES_NO_DIALOG,
			Lang.INDICATOR.OBJECTIVE_ANALYSIS.PERSPECTIVE_DELETE_DIALOG_LABEL,
			() => {
				fire(ObjectiveAnalysisEventTypes.DELETE_PERSPECTIVE, data);
				fireGlobal(EventTypes.HIDE_DIALOG);
			},
			() => fireGlobal(EventTypes.HIDE_DIALOG));
	};

	return <InspectionEventBusProvider>
		<InspectionStateHolder/>
		<PerspectiveContainer>
			<PerspectiveDescriptorWrapper>
				<FontAwesomeIcon icon={ICON_OBJECTIVE_ANALYSIS_PERSPECTIVE}/>
				<PerspectiveDescriptor value={data.description ?? ''}
				                       onChange={onDescriptionChanged} onBlur={onDescriptionBlurred}
				                       placeholder={Lang.PLAIN.OBJECTIVE_ANALYSIS_PERSPECTIVE_DESCRIPTION_PLACEHOLDER}/>
				<PerspectiveButtons>
					<RoundDwarfButton ink={ButtonInk.DANGER} onClick={onDeleteClicked}>
						{Lang.ACTIONS.DELETE}
					</RoundDwarfButton>
				</PerspectiveButtons>
			</PerspectiveDescriptorWrapper>
			<Inspection/>
		</PerspectiveContainer>
	</InspectionEventBusProvider>;
};