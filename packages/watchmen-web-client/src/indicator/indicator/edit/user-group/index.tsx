import {Lang} from '@/widgets/langs';
import {useRef} from 'react';
import {SearchTextEventBusProvider} from '../../../search-text/search-text-event-bus';
import {EmphaticSinkingLabel, Step, StepBody, StepTitle} from '../../../step-widgets';
import {IndicatorDeclarationStep} from '../../types';
import {Construct, useConstructed} from '../use-constructed';
import {useStep} from '../use-step';
import {AssignedIndicatorUserGroups} from './assigned-indicator-user-groups';
import {IndicatorUserGroupPicker} from './indicator-user-group-picker';
import {IndicatorUserGroupPickerContainer} from './widgets';

export const UserGroupAssigner = () => {
	const ref = useRef<HTMLDivElement>(null);
	// const {fire: fireGlobal} = useEventBus();
	// const {fire} = useIndicatorsEventBus();
	const {constructed, setConstructed, visible, setVisible} = useConstructed(ref);
	const {data} = useStep({
		step: IndicatorDeclarationStep.USER_GROUPS,
		active: () => setConstructed(Construct.ACTIVE),
		done: () => setConstructed(Construct.DONE),
		dropped: () => setVisible(false)
	});

	if (constructed === Construct.WAIT || data?.indicator == null) {
		return null;
	}

	return <Step index={IndicatorDeclarationStep.USER_GROUPS} visible={visible} ref={ref}>
		<StepTitle visible={visible}>
			<EmphaticSinkingLabel>
				{Lang.INDICATOR.INDICATOR.USER_GROUP}
			</EmphaticSinkingLabel>
		</StepTitle>
		<StepBody visible={visible}>
			<IndicatorUserGroupPickerContainer>
				<SearchTextEventBusProvider>
					<AssignedIndicatorUserGroups indicator={data!.indicator!}/>
					<IndicatorUserGroupPicker indicator={data!.indicator!}/>
				</SearchTextEventBusProvider>
			</IndicatorUserGroupPickerContainer>
		</StepBody>
	</Step>;
};