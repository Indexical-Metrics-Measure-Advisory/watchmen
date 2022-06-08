import {useEffect, useState} from 'react';
import {useObjectiveAnalysisEventBus} from '../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../objective-analysis-event-bus-types';

export const useNavigatorVisible = () => {
	const {on, off} = useObjectiveAnalysisEventBus();
	const [visible, setVisible] = useState(false);
	useEffect(() => {
		const onShowNavigator = () => setVisible(true);
		const onHideNavigator = () => setVisible(false);
		on(ObjectiveAnalysisEventTypes.SHOW_NAVIGATOR, onShowNavigator);
		on(ObjectiveAnalysisEventTypes.HIDE_NAVIGATOR, onHideNavigator);
		return () => {
			off(ObjectiveAnalysisEventTypes.SHOW_NAVIGATOR, onShowNavigator);
			off(ObjectiveAnalysisEventTypes.HIDE_NAVIGATOR, onHideNavigator);
		};
	}, [on, off]);

	return visible;
};