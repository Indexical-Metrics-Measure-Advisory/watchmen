import {BucketId} from '@/services/data/tuples/bucket-types';
import {Convergence, ConvergenceBucketVariable} from '@/services/data/tuples/convergence-types';
import {QueryBucket} from '@/services/data/tuples/query-bucket-types';
import {noop} from '@/services/utils';
import {Dropdown} from '@/widgets/basic/dropdown';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {useEffect, useState} from 'react';
import {useConvergencesEventBus} from '../../convergences-event-bus';
import {ConvergencesEventTypes} from '../../convergences-event-bus-types';
import {XAxisLegendCell} from './xaxis-legend-cell';
import {YAxisLegendCell} from './yaxis-legend-cell';

interface State {
	buckets: Array<QueryBucket>;
	initialized: boolean;
}

const BucketVariable = (props: { convergence: Convergence; variable: ConvergenceBucketVariable }) => {
	const {convergence, variable} = props;

	const {fire} = useConvergencesEventBus();
	const [state, setState] = useState<State>({initialized: false, buckets: []});
	useEffect(() => {
		if (!state.initialized) {
			fire(ConvergencesEventTypes.ASK_ALL_BUCKETS, (buckets: Array<QueryBucket>) => {
				setState({initialized: true, buckets});
			});
		}
	}, [fire, state.initialized]);
	const forceUpdate = useForceUpdate();

	const onBucketChanged = (option: DropdownOption) => {
		variable.bucketId = option.value as BucketId;
		fire(ConvergencesEventTypes.SAVE_CONVERGENCE, convergence, noop);
		forceUpdate();
	};

	const bucketOptions = state.buckets.map(bucket => {
		return {value: bucket.bucketId, label: bucket.name};
	});

	return <>
		<span>{Lang.INDICATOR.CONVERGENCE.VARIABLE_BUCKET}</span>
		<Dropdown options={bucketOptions} value={variable.bucketId} onChange={onBucketChanged}/>
	</>;
};

export const XAxisBucketVariable = (props: { convergence: Convergence; variable: ConvergenceBucketVariable }) => {
	const {convergence, variable} = props;

	return <XAxisLegendCell convergence={convergence} variable={variable} columns={1}>
		<BucketVariable convergence={convergence} variable={variable}/>
	</XAxisLegendCell>;
};

export const YAxisBucketVariable = (props: { convergence: Convergence; variable: ConvergenceBucketVariable }) => {
	const {convergence, variable} = props;

	return <YAxisLegendCell convergence={convergence} variable={variable}>
		<BucketVariable convergence={convergence} variable={variable}/>
	</YAxisLegendCell>;
};