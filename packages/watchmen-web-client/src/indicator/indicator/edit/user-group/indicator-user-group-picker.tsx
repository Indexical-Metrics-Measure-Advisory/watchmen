import {Indicator} from '@/services/data/tuples/indicator-types';
import {QueryUserGroupForHolder} from '@/services/data/tuples/query-user-group-types';
import {listUserGroupsForHolder} from '@/services/data/tuples/user-group';
import {UserGroupId} from '@/services/data/tuples/user-group-types';
import {isFakedUuid} from '@/services/data/tuples/utils';
import {noop} from '@/services/utils';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {SearchItem, SearchText} from '../../../search-text';
import {useIndicatorsEventBus} from '../../indicators-event-bus';
import {IndicatorsEventTypes} from '../../indicators-event-bus-types';

interface UserGroupCandidate extends SearchItem {
	userGroupId: UserGroupId;
	userGroup: QueryUserGroupForHolder;
}

export const IndicatorUserGroupPicker = (props: { indicator: Indicator }) => {
	const {indicator} = props;

	const {fire: fireGlobal} = useEventBus();
	const {fire: fireIndicator} = useIndicatorsEventBus();
	// const {fire: fireSearch} = useSearchTextEventBus();

	const search = async (text: string): Promise<Array<UserGroupCandidate>> => {
		return new Promise<Array<UserGroupCandidate>>(resolve => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await listUserGroupsForHolder(text),
				(candidates: Array<QueryUserGroupForHolder>) => {
					const assigned = indicator.userGroupIds || [];
					resolve(candidates.filter(candidate => {
						// eslint-disable-next-line
						return assigned.every(userGroupId => userGroupId != candidate.userGroupId);
					}).map(candidate => {
						return {
							userGroupId: candidate.userGroupId,
							key: candidate.userGroupId,
							text: candidate.name,
							userGroup: candidate
						};
					}));
				}, () => resolve([]));
		});
	};
	const onSelectionChange = async (item: UserGroupCandidate) => {
		if (indicator.userGroupIds == null) {
			indicator.userGroupIds = [];
		}
		// eslint-disable-next-line
		if (indicator.userGroupIds.every(userGroupId => userGroupId != item.userGroupId)) {
			indicator.userGroupIds.push(item.userGroupId);
		}

		fireIndicator(IndicatorsEventTypes.USER_GROUP_ASSIGNED, indicator, item.userGroup);
		if (!isFakedUuid(indicator)) {
			fireIndicator(IndicatorsEventTypes.SAVE_INDICATOR, indicator, noop);
		}
		// fireSearch(SearchTextEventTypes.HIDE_SEARCH);
	};

	return <SearchText search={search} onSelectionChange={onSelectionChange}
	                   openText={Lang.INDICATOR.INDICATOR.ASSIGN_USER_GROUP}
	                   closeText={Lang.INDICATOR.INDICATOR.DISCARD_ASSIGN_USER_GROUP}
	                   placeholder={Lang.PLAIN.FIND_INDICATOR_USER_GROUPS_PLACEHOLDER}/>;
};