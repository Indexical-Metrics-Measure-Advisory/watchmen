import {listObjectiveAnalysis, saveObjectiveAnalysis} from '@/services/data/tuples/objective-analysis';
import {ObjectiveAnalysis} from '@/services/data/tuples/objective-analysis-types';
import {generateUuid} from '@/services/data/tuples/utils';
import {getCurrentTime} from '@/services/data/utils';
import {ICON_ADD, ICON_COLLAPSE_PANEL, ICON_LOADING, ICON_SEARCH, ICON_SHOW_NAVIGATOR} from '@/widgets/basic/constants';
import {TooltipButton} from '@/widgets/basic/tooltip-button';
import {ButtonInk, TooltipAlignment, TooltipPosition} from '@/widgets/basic/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {useThrottler} from '@/widgets/throttler';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {ChangeEvent, useEffect, useRef, useState} from 'react';
import {useObjectiveAnalysisEventBus} from '../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../objective-analysis-event-bus-types';
import {useNavigatorVisible} from '../use-navigator-visible';
import {Item} from './item';
import {
	ControlButton,
	ItemCountLabel,
	LoadingLabel,
	NavigatorContainer,
	NavigatorHeader,
	NavigatorHeaderLabel,
	NavigatorHeaderSearchInput,
	NavigatorSearchHeader,
	NoDataLabel,
	ObjectiveAnalysisItemList
} from './widgets';

interface NavigatorState {
	loaded: boolean;
	data: Array<ObjectiveAnalysis>;
	filtered: Array<ObjectiveAnalysis>;
}

const sort = (data: Array<ObjectiveAnalysis>): Array<ObjectiveAnalysis> => {
	return data.sort((o1, o2) => {
		return (o1.title || '').toLowerCase().localeCompare((o2.title || '').toLowerCase());
	});
};

const filter = (data: Array<ObjectiveAnalysis>, searchText: string): Array<ObjectiveAnalysis> => {
	if (searchText.trim().length === 0) {
		return data;
	} else {
		return data.filter(item => (item.title || '').toLowerCase().includes(searchText.trim().toLowerCase()));
	}
};

export const ObjectiveAnalysisNavigator = () => {
	const searchInputRef = useRef<HTMLInputElement>(null);
	const {fire: fireGlobal} = useEventBus();
	const {on, off, fire} = useObjectiveAnalysisEventBus();
	const [searching, setSearching] = useState(false);
	const [searchText, setSearchText] = useState('');
	const [state, setState] = useState<NavigatorState>({loaded: false, data: [], filtered: []});
	const searchHandle = useThrottler();
	const visible = useNavigatorVisible();
	useEffect(() => {
		if (state.loaded) {
			return;
		}
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
			return await listObjectiveAnalysis();
		}, (data: Array<ObjectiveAnalysis>) => {
			const sorted = sort(data);
			setState({loaded: true, data: sorted, filtered: sorted});
		}, () => {
			setState({loaded: true, data: [], filtered: []});
		});
	}, [fireGlobal, state.loaded]);
	useEffect(() => {
		const onCreated = (analysis: ObjectiveAnalysis) => {
			setState(state => {
				const sorted = sort([...state.data, analysis]);
				return {loaded: true, data: sorted, filtered: filter(sorted, searchText)};
			});
		};
		const onRenamed = () => {
			setState(state => {
				const sorted = sort(state.data);
				return {loaded: true, data: sorted, filtered: filter(sorted, searchText)};
			});
		};
		const onDeleted = (analysis: ObjectiveAnalysis) => {
			setState(state => {
				const sorted = sort(state.data.filter(item => item !== analysis));
				return {loaded: true, data: sorted, filtered: filter(sorted, searchText)};
			});
		};
		on(ObjectiveAnalysisEventTypes.RENAMED, onRenamed);
		on(ObjectiveAnalysisEventTypes.CREATED, onCreated);
		on(ObjectiveAnalysisEventTypes.DELETED, onDeleted);
		return () => {
			off(ObjectiveAnalysisEventTypes.CREATED, onCreated);
			off(ObjectiveAnalysisEventTypes.RENAMED, onRenamed);
			off(ObjectiveAnalysisEventTypes.DELETED, onDeleted);
		};
	}, [on, off, searchText]);

	const onToggleSearchClicked = () => {
		setSearching(!searching);
		if (!searching) {
			searchInputRef.current?.focus();
		}
	};
	// noinspection DuplicatedCode
	const onAddClicked = () => {
		const analysis: ObjectiveAnalysis = {
			analysisId: generateUuid(),
			title: 'Noname Analysis',
			perspectives: [],
			version: 1,
			createdAt: getCurrentTime(),
			lastModifiedAt: getCurrentTime()
		};
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
			return await saveObjectiveAnalysis(analysis);
		}, () => {
			fire(ObjectiveAnalysisEventTypes.CREATED, analysis);
			fire(ObjectiveAnalysisEventTypes.START_EDIT, analysis);
		});
	};
	const onCloseClicked = () => {
		fire(ObjectiveAnalysisEventTypes.HIDE_NAVIGATOR);
	};
	const onSearchTextChange = (event: ChangeEvent<HTMLInputElement>) => {
		const {value} = event.target;
		setSearchText(value);
		searchHandle.replace(() => {
			setState(state => {
				if (value.trim().length === 0) {
					return {loaded: state.loaded, data: state.data, filtered: state.data};
				} else {
					return {
						loaded: state.loaded,
						data: state.data,
						filtered: state.data.filter(item => (item.title || '').toLowerCase().includes(value.trim().toLowerCase()))
					};
				}
			});
		}, 300);
	};

	return <NavigatorContainer visible={visible}>
		<NavigatorHeader>
			<NavigatorHeaderLabel>{Lang.INDICATOR.OBJECTIVE_ANALYSIS.NAVIGATOR_TITLE}</NavigatorHeaderLabel>
			{state.loaded
				? <TooltipButton tooltip={{
					position: TooltipPosition.TOP,
					alignment: TooltipAlignment.CENTER,
					label: Lang.INDICATOR.OBJECTIVE_ANALYSIS.NAVIGATOR_SEARCH_TOGGLE
				}} onClick={onToggleSearchClicked} ink={searching ? ButtonInk.PRIMARY : (void 0)}>
					<FontAwesomeIcon icon={ICON_SEARCH}/>
				</TooltipButton>
				: null}
			<TooltipButton tooltip={{
				position: TooltipPosition.TOP,
				alignment: TooltipAlignment.CENTER,
				label: Lang.INDICATOR.OBJECTIVE_ANALYSIS.NAVIGATOR_CREATE_OBJECTIVE_ANALYSIS
			}} onClick={onAddClicked}>
				<FontAwesomeIcon icon={ICON_ADD}/>
			</TooltipButton>
			<TooltipButton tooltip={{
				position: TooltipPosition.TOP,
				alignment: TooltipAlignment.CENTER,
				label: Lang.INDICATOR.OBJECTIVE_ANALYSIS.MINIMIZE_NAVIGATOR
			}} onClick={onCloseClicked}>
				<FontAwesomeIcon icon={ICON_COLLAPSE_PANEL}/>
			</TooltipButton>
		</NavigatorHeader>
		<NavigatorSearchHeader>
			<NavigatorHeaderSearchInput value={searchText} onChange={onSearchTextChange}
			                            placeholder={Lang.PLAIN.OBJECTIVE_ANALYSIS_SEARCH_PLACEHOLDER}
			                            visible={searching} ref={searchInputRef}/>
			<ItemCountLabel>
				{state.filtered.length} / {state.data.length}
			</ItemCountLabel>
		</NavigatorSearchHeader>
		{!state.loaded
			? <LoadingLabel>
				<FontAwesomeIcon icon={ICON_LOADING} spin={true}/>
				<span>{Lang.PLAIN.LOADING}</span>
			</LoadingLabel>
			: (state.data.length === 0 ?
				<NoDataLabel>
					<span>{Lang.INDICATOR.OBJECTIVE_ANALYSIS.NO_DATA}</span>
				</NoDataLabel>
				: <ObjectiveAnalysisItemList searching={searching}>
					{state.filtered.map(item => {
						return <Item analysis={item} key={item.analysisId}/>;
					})}
				</ObjectiveAnalysisItemList>)}
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