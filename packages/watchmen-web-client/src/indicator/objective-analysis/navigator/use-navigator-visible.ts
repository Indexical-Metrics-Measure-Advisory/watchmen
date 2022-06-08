import {useEffect, useState} from 'react';
import {useObjectiveAnalysisEventBus} from '../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../objective-analysis-event-bus-types';

export const useNavigatorVisible = () => {
	const {on, off} = useObjectiveAnalysisEventBus();
	const [visible, setVisible] = useState(false);
	useEffect(() => {
		const onShowNavigator = () => {
			setVisible(true);
		};
		on(ObjectiveAnalysisEventTypes.SHOW_NAVIGATOR, onShowNavigator);
		return () => {
			off(ObjectiveAnalysisEventTypes.SHOW_NAVIGATOR, onShowNavigator);
		};
	}, [on, off]);

	return visible;
};