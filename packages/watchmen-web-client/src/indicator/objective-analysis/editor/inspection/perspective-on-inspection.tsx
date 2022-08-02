import {Inspection as InspectionType} from '@/services/data/tuples/inspection-types';
import {ObjectiveAnalysis, ObjectiveAnalysisPerspective} from '@/services/data/tuples/objective-analysis-types';
import {RoundDwarfButton} from '@/widgets/basic/button';
import {ICON_OBJECTIVE_ANALYSIS_PERSPECTIVE} from '@/widgets/basic/constants';
import {ButtonInk} from '@/widgets/basic/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {Fragment, useEffect} from 'react';
import {Inspection} from '../../../inspection/inspection';
import {InspectionEventBusProvider, useInspectionEventBus} from '../../../inspection/inspection-event-bus';
import {InspectionEventTypes, InspectionRenderMode} from '../../../inspection/inspection-event-bus-types';
import {useObjectiveAnalysisEventBus} from '../../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../../objective-analysis-event-bus-types';
import {useDescription} from '../use-description';
import {
	PerspectiveButtons,
	PerspectiveContainer,
	PerspectiveDescriptor,
	PerspectiveDescriptorWrapper
} from '../widgets';
import {InspectionInitializer} from './inspection-initializer';
import {NoInspectionPicked} from './no-inspection-picked';
import {RenderModeAssistant} from './render-mode-assistant';
import {RenderModeSwitcher} from './render-mode-switcher';
import {InspectionStateHolder} from './state';

const InspectionData = (props: { analysis: ObjectiveAnalysis, perspective: ObjectiveAnalysisPerspective }) => {
	const {analysis, perspective} = props;

	const {fire} = useObjectiveAnalysisEventBus();
	const {on, off} = useInspectionEventBus();
	useEffect(() => {
		const onInspectionSaved = (inspection: InspectionType) => {
			perspective.relationId = inspection.inspectionId;
			fire(ObjectiveAnalysisEventTypes.SAVE, analysis);
		};
		const onInspectionPicked = (inspection: InspectionType) => {
			perspective.relationId = inspection.inspectionId;
			fire(ObjectiveAnalysisEventTypes.SAVE, analysis);
		};
		const onInspectionCleared = () => {
			delete perspective.relationId;
			fire(ObjectiveAnalysisEventTypes.SAVE, analysis);
		};
		on(InspectionEventTypes.INSPECTION_PICKED, onInspectionPicked);
		on(InspectionEventTypes.INSPECTION_SAVED, onInspectionSaved);
		on(InspectionEventTypes.INSPECTION_CLEARED, onInspectionCleared);
		return () => {
			off(InspectionEventTypes.INSPECTION_PICKED, onInspectionPicked);
			off(InspectionEventTypes.INSPECTION_SAVED, onInspectionSaved);
			off(InspectionEventTypes.INSPECTION_CLEARED, onInspectionCleared);
		};
	}, [on, off, fire, analysis, perspective]);

	return <Fragment/>;
};

export const PerspectiveOnInspection = (props: {
	analysis: ObjectiveAnalysis;
	perspective: ObjectiveAnalysisPerspective;
	startOnView: boolean;
}) => {
	const {analysis, perspective, startOnView} = props;

	const {fire: fireGlobal} = useEventBus();
	const {fire} = useObjectiveAnalysisEventBus();
	const {onDescriptionChanged, onDescriptionBlurred} = useDescription(analysis, perspective);

	const onDeleteClicked = () => {
		fireGlobal(EventTypes.SHOW_YES_NO_DIALOG,
			Lang.INDICATOR.OBJECTIVE_ANALYSIS.PERSPECTIVE_DELETE_DIALOG_LABEL,
			() => {
				fire(ObjectiveAnalysisEventTypes.DELETE_PERSPECTIVE, analysis, perspective);
				fireGlobal(EventTypes.HIDE_DIALOG);
			},
			() => fireGlobal(EventTypes.HIDE_DIALOG));
	};

	return <InspectionEventBusProvider>
		<InspectionStateHolder/>
		<InspectionData analysis={analysis} perspective={perspective}/>
		<PerspectiveContainer>
			<PerspectiveDescriptorWrapper>
				<FontAwesomeIcon icon={ICON_OBJECTIVE_ANALYSIS_PERSPECTIVE}/>
				<PerspectiveDescriptor value={perspective.description ?? ''}
				                       onChange={onDescriptionChanged} onBlur={onDescriptionBlurred}
				                       placeholder={Lang.PLAIN.OBJECTIVE_ANALYSIS_PERSPECTIVE_DESCRIPTION_PLACEHOLDER}/>
				<PerspectiveButtons>
					<RoundDwarfButton ink={ButtonInk.DANGER} onClick={onDeleteClicked}>
						{Lang.ACTIONS.DELETE}
					</RoundDwarfButton>
				</PerspectiveButtons>
			</PerspectiveDescriptorWrapper>
			<NoInspectionPicked perspective={perspective}/>
			<RenderModeAssistant startOnView={startOnView}/>
			<Inspection reusable={false}
			            startOnRenderMode={startOnView ? InspectionRenderMode.VIEW : InspectionRenderMode.EDIT}/>
			<RenderModeSwitcher/>
			<InspectionInitializer analysis={analysis} perspective={perspective}/>
		</PerspectiveContainer>
	</InspectionEventBusProvider>;
};