import {listObjectiveAnalysis} from '@/services/data/tuples/objective-analysis';
import {ObjectiveAnalysis} from '@/services/data/tuples/objective-analysis-types';
import {Button} from '@/widgets/basic/button';
import {ICON_COLLAPSE_PANEL, ICON_LOADING, ICON_SEARCH, ICON_SHOW_NAVIGATOR} from '@/widgets/basic/constants';
import {ButtonInk} from '@/widgets/basic/types';
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
		const onCreated = (objectiveAnalysis: ObjectiveAnalysis) => {
			setState(state => {
				const sorted = sort([...state.data, objectiveAnalysis]);
				return {
					loaded: true,
					data: sorted,
					filtered: (() => {
						if (searchText.trim().length === 0) {
							return sorted;
						} else {
							return sorted.filter(item => (item.title || '').toLowerCase().includes(searchText.trim().toLowerCase()));
						}
					})()
				};
			});
		};
		on(ObjectiveAnalysisEventTypes.CREATED, onCreated);
		return () => {
			off(ObjectiveAnalysisEventTypes.CREATED, onCreated);
		};
	}, [on, off, searchText]);
	useEffect(() => {
		const onRenamed = () => {
			setState(state => {
				const sorted = sort(state.data);
				return {
					loaded: true,
					data: sorted,
					filtered: (() => {
						if (searchText.trim().length === 0) {
							return sorted;
						} else {
							return sorted.filter(item => (item.title || '').toLowerCase().includes(searchText.trim().toLowerCase()));
						}
					})()
				};
			});
		};
		on(ObjectiveAnalysisEventTypes.RENAMED, onRenamed);
		return () => {
			off(ObjectiveAnalysisEventTypes.RENAMED, onRenamed);
		};
	}, [on, off, searchText]);

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
				? <Button onClick={onToggleSearchClicked} ink={searching ? ButtonInk.PRIMARY : (void 0)}>
					<FontAwesomeIcon icon={ICON_SEARCH}/>
				</Button>
				: null}
			<Button onClick={onCloseClicked}>
				<FontAwesomeIcon icon={ICON_COLLAPSE_PANEL}/>
			</Button>
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