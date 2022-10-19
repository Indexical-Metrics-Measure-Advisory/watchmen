import {fetchEnum} from '@/services/data/tuples/enum';
import {Enum, EnumId} from '@/services/data/tuples/enum-types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Fragment, useEffect, useState} from 'react';
import {useObjectiveAnalysisEventBus} from '../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../objective-analysis-event-bus-types';

type AskingRequest = (enumeration: Enum) => void;
type AskingRequestQueue = Array<AskingRequest>;

export const EnumsData = () => {
	const {fire: fireGlobal} = useEventBus();
	const {on, off} = useObjectiveAnalysisEventBus();
	const [loadingQueue] = useState<Record<EnumId, AskingRequestQueue>>({});
	const [enums] = useState<Record<EnumId, Enum>>({});
	useEffect(() => {
		const onAskEnum = async (enumId: EnumId, onData: (enumeration?: Enum) => void) => {
			const existing = enums[enumId];
			if (existing != null) {
				onData(existing);
				return;
			}

			const queue = loadingQueue[enumId];
			if (queue != null && queue.length !== 0) {
				// loading now
				queue.push(onData);
			} else {
				loadingQueue[enumId] = [onData];

				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
					async () => await fetchEnum(enumId),
					(enumeration: Enum) => {
						enums[enumId] = enumeration;
						loadingQueue[enumId].forEach(onData => onData(enumeration));
						delete loadingQueue[enumId];
					});
			}
		};
		on(ObjectiveAnalysisEventTypes.ASK_ENUM, onAskEnum);
		return () => {
			off(ObjectiveAnalysisEventTypes.ASK_ENUM, onAskEnum);
		};
	}, [fireGlobal, on, off, enums, loadingQueue]);
	return <Fragment/>;
};