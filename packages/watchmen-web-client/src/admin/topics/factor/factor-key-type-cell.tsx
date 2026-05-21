import {Factor, FactorKeyType} from '@/services/data/tuples/factor-types';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useTopicEventBus} from '../topic-event-bus';
import {TopicEventTypes} from '../topic-event-bus-types';
import {FactorKeyTypeCellContainer, FactorPropDropdown} from './widgets';

export const FactorKeyTypeCell = (props: { factor: Factor }) => {
	const {factor} = props;

	const {fire} = useTopicEventBus();
	const forceUpdate = useForceUpdate();

	const onKeyTypeChange = (option: DropdownOption) => {
		const value = option.value as (FactorKeyType | '');
		const nextKeyType = value === '' ? undefined : value;
		if (nextKeyType === factor.keyType) {
			return;
		}
		factor.keyType = nextKeyType;
		if (nextKeyType == null) {
			delete factor.keyType;
			delete factor.keyIndex;
		} else if (factor.keyIndex == null || factor.keyIndex <= 0) {
			factor.keyIndex = 1;
		}

		forceUpdate();
		fire(TopicEventTypes.FACTOR_KEY_TYPE_CHANGED, factor);
	};

	const options: Array<DropdownOption> = [
		{value: '', label: 'No Key'},
		{value: 'partition', label: 'Partition Key'},
		{value: 'sort', label: 'Sort Key'}
	];

	return <FactorKeyTypeCellContainer>
		<FactorPropDropdown value={factor.keyType || ''} options={options} onChange={onKeyTypeChange}/>
	</FactorKeyTypeCellContainer>;
};
