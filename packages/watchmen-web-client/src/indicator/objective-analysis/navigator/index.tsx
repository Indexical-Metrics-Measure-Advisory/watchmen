import {Button} from '@/widgets/basic/button';
import {ICON_COLLAPSE_PANEL, ICON_SEARCH, ICON_SHOW_NAVIGATOR} from '@/widgets/basic/constants';
import {ButtonInk} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {ChangeEvent, useRef, useState} from 'react';
import {useObjectiveAnalysisEventBus} from '../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../objective-analysis-event-bus-types';
import {useNavigatorVisible} from './use-navigator-visible';
import {
	ControlButton,
	NavigatorContainer,
	NavigatorHeader,
	NavigatorHeaderLabel,
	NavigatorHeaderSearchInput
} from './widgets';

export const ObjectiveAnalysisNavigator = () => {
	const searchInputRef = useRef<HTMLInputElement>(null);
	const {fire} = useObjectiveAnalysisEventBus();
	const [searching, setSearching] = useState(false);
	const [searchText, setSearchText] = useState('');
	const visible = useNavigatorVisible();

	const onToggleSearchClicked = () => {
		setSearching(!searching);
		if (!searching) {
			searchInputRef.current?.focus();
		}
	};
	const onCloseClicked = () => {
		fire(ObjectiveAnalysisEventTypes.HIDE_NAVIGATOR);
	};
	const onSearchTextChange = (event: ChangeEvent<HTMLInputElement>) => {
		setSearchText(event.target.value);
	};

	return <NavigatorContainer visible={visible}>
		<NavigatorHeader>
			<NavigatorHeaderLabel>{Lang.INDICATOR.OBJECTIVE_ANALYSIS.NAVIGATOR_TITLE}</NavigatorHeaderLabel>
			<Button onClick={onToggleSearchClicked} ink={searching ? ButtonInk.PRIMARY : (void 0)}>
				<FontAwesomeIcon icon={ICON_SEARCH}/>
			</Button>
			<Button onClick={onCloseClicked}>
				<FontAwesomeIcon icon={ICON_COLLAPSE_PANEL}/>
			</Button>
		</NavigatorHeader>
		<NavigatorHeaderSearchInput value={searchText} onChange={onSearchTextChange}
		                            placeholder={Lang.PLAIN.OBJECTIVE_ANALYSIS_SEARCH_PLACEHOLDER}
		                            visible={searching} ref={searchInputRef}/>
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