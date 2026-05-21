import {Factor} from '@/services/data/tuples/factor-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {ChangeEvent, useEffect} from 'react';
import {useTopicEventBus} from '../topic-event-bus';
import {TopicEventTypes} from '../topic-event-bus-types';
import {FactorKeyIndexCellContainer, FactorPropInput} from './widgets';

export const FactorKeyIndexCell = (props: { factor: Factor }) => {
	const {factor} = props;

	const {fire, on, off} = useTopicEventBus();
	const forceUpdate = useForceUpdate();

	useEffect(() => {
		const onKeyTypeChanged = (changed: Factor) => {
			if (changed !== factor) {
				return;
			}
			forceUpdate();
		};
		on(TopicEventTypes.FACTOR_KEY_TYPE_CHANGED, onKeyTypeChanged);
		return () => {
			off(TopicEventTypes.FACTOR_KEY_TYPE_CHANGED, onKeyTypeChanged);
		};
	}, [factor, forceUpdate, on, off]);

	const onKeyIndexChange = (event: ChangeEvent<HTMLInputElement>) => {
		const text = event.target.value.trim();
		if (text.length === 0) {
			delete factor.keyIndex;
		} else {
			const keyIndex = Number(text);
			if (!Number.isInteger(keyIndex) || keyIndex <= 0 || keyIndex === factor.keyIndex) {
				return;
			}
			factor.keyIndex = keyIndex;
		}

		forceUpdate();
		fire(TopicEventTypes.FACTOR_KEY_INDEX_CHANGED, factor);
	};

	return <FactorKeyIndexCellContainer>
		<FactorPropInput value={factor.keyIndex == null ? '' : `${factor.keyIndex}`}
		                 onChange={onKeyIndexChange}/>
	</FactorKeyIndexCellContainer>;
};
