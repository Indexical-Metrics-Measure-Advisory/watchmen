import {ICON_SHOW_NAVIGATOR} from '@/widgets/basic/constants';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useObjectiveAnalysisEventBus} from '../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../objective-analysis-event-bus-types';
import {useNavigatorVisible} from './use-navigator-visible';
import {ControlButton, NavigatorContainer} from './widgets';

export const ObjectiveAnalysisNavigator = () => {
	const visible = useNavigatorVisible();

	return <NavigatorContainer visible={visible}>

	</NavigatorContainer>;
};

export const ObjectiveAnalysisNavigatorControlButton = () => {
	const {fire} = useObjectiveAnalysisEventBus();
	const visible = useNavigatorVisible();

	const onShowNavigatorClicked = () => {
		fire(ObjectiveAnalysisEventTypes.SHOW_NAVIGATOR);
	};

	return <ControlButton visible={visible} onClick={onShowNavigatorClicked}>
		<FontAwesomeIcon icon={ICON_SHOW_NAVIGATOR}/>
	</ControlButton>;
};