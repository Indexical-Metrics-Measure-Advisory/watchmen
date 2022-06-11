import {ObjectiveAnalysisPerspective} from '@/services/data/tuples/objective-analysis-types';
import {RoundDwarfButton} from '@/widgets/basic/button';
import {ICON_OBJECTIVE_ANALYSIS_PERSPECTIVE} from '@/widgets/basic/constants';
import {ButtonInk} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {Inspection} from '../../inspection/inspection';
import {InspectionEventBusProvider} from '../../inspection/inspection-event-bus';
import {useDescription} from './use-description';
import {PerspectiveButtons, PerspectiveContainer, PerspectiveDescriptor, PerspectiveDescriptorWrapper} from './widgets';

export const PerspectiveOnInspection = (props: { data: ObjectiveAnalysisPerspective }) => {
	const {data} = props;

	const {onDescriptionChanged, onDescriptionBlurred} = useDescription(data);

	return <InspectionEventBusProvider>
		<PerspectiveContainer>
			<PerspectiveDescriptorWrapper>
				<FontAwesomeIcon icon={ICON_OBJECTIVE_ANALYSIS_PERSPECTIVE}/>
				<PerspectiveDescriptor value={data.description ?? ''}
				                       onChange={onDescriptionChanged} onBlur={onDescriptionBlurred}
				                       placeholder={Lang.PLAIN.OBJECTIVE_ANALYSIS_PERSPECTIVE_DESCRIPTION_PLACEHOLDER}/>
				<PerspectiveButtons>
					<RoundDwarfButton ink={ButtonInk.DANGER}>
						{Lang.ACTIONS.DELETE}
					</RoundDwarfButton>
				</PerspectiveButtons>
			</PerspectiveDescriptorWrapper>
			<Inspection/>
		</PerspectiveContainer>
	</InspectionEventBusProvider>;
};