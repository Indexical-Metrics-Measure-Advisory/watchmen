import {listObjectiveAnalysis} from '@/services/data/tuples/objective-analysis';
import {ObjectiveAnalysis} from '@/services/data/tuples/objective-analysis-types';
import {Button} from '@/widgets/basic/button';
import {
	ICON_COLLAPSE_PANEL,
	ICON_LOADING,
	ICON_OBJECTIVE_ANALYSIS_ITEM,
	ICON_SEARCH,
	ICON_SHOW_NAVIGATOR
} from '@/widgets/basic/constants';
import {ButtonInk} from '@/widgets/basic/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {ChangeEvent, useEffect, useRef, useState} from 'react';
import {useObjectiveAnalysisEventBus} from '../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../objective-analysis-event-bus-types';
import {useNavigatorVisible} from './use-navigator-visible';
import {
	ControlButton,
	LoadingLabel,
	NavigatorContainer,
	NavigatorHeader,
	NavigatorHeaderLabel,
	NavigatorHeaderSearchInput,
	NoDataLabel,
	ObjectiveAnalysisItem
} from './widgets';

interface NavigatorState {
	loaded: boolean;
	data: Array<ObjectiveAnalysis>;
}

export const ObjectiveAnalysisNavigator = () => {
	const searchInputRef = useRef<HTMLInputElement>(null);
	const {fire: fireGlobal} = useEventBus();
	const {fire} = useObjectiveAnalysisEventBus();
	const [searching, setSearching] = useState(false);
	const [searchText, setSearchText] = useState('');
	const [state, setState] = useState<NavigatorState>({loaded: false, data: []});
	const visible = useNavigatorVisible();
	useEffect(() => {
		if (state.loaded) {
			return;
		}
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
			return await listObjectiveAnalysis();
		}, (data: Array<ObjectiveAnalysis>) => {
			setState({loaded: true, data});
		}, () => {
			setState({loaded: true, data: []});
		});
	}, [fireGlobal, state.loaded]);

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
		{!state.loaded
			? <LoadingLabel>
				<FontAwesomeIcon icon={ICON_LOADING} spin={true}/>
				<span>{Lang.PLAIN.LOADING}</span>
			</LoadingLabel>
			: (state.data.length === 0 ?
				<NoDataLabel>
					<span>{Lang.INDICATOR.OBJECTIVE_ANALYSIS.NO_DATA}</span>
				</NoDataLabel>
				: state.data.map(item => {
					return <ObjectiveAnalysisItem key={item.analysisId}>
						<FontAwesomeIcon icon={ICON_OBJECTIVE_ANALYSIS_ITEM}/>
						<span>{item.title}</span>
					</ObjectiveAnalysisItem>;
				}))}
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