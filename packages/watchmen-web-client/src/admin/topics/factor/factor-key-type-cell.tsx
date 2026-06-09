import {DataSourceType} from '@/services/data/tuples/data-source-types';
import {Factor, FactorKeyType} from '@/services/data/tuples/factor-types';
import {isTdsql, isTdsqlShardkeySupported} from '@/services/data/tuples/topic-utils';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useTopicEventBus} from '../topic-event-bus';
import {TopicEventTypes} from '../topic-event-bus-types';
import {FactorKeyTypeCellContainer, FactorPropDropdown} from './widgets';

export const FactorKeyTypeCell = (props: { factor: Factor; dataSourceType?: DataSourceType }) => {
	const {factor, dataSourceType} = props;

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
		{value: 'partition', label: isTdsql(dataSourceType) ? 'Sharding Key' : 'Partition Key'},
		{value: 'sort', label: 'Sort Key'}
	];

	// TDSQL 限制：shardkey 字段类型必须是 INT/BIGINT/CHAR/VARCHAR，否则禁用 Partition 选项
	const tdsqlDisablePartition = isTdsql(dataSourceType) && factor.type != null && !isTdsqlShardkeySupported(factor.type);
	const partitionOption = options.find(o => o.value === 'partition');
	if (partitionOption) {
		(partitionOption as any).disabled = tdsqlDisablePartition;
	}
	const filteredOptions = tdsqlDisablePartition
		? options.map(o => o.value === 'partition' ? {...o, label: 'Sharding Key (type unsupported)'} : o)
		: options;

	return <FactorKeyTypeCellContainer>
		<FactorPropDropdown value={factor.keyType || ''} options={filteredOptions} onChange={onKeyTypeChange}/>
	</FactorKeyTypeCellContainer>;
};
