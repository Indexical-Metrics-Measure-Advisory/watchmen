import {Fragment} from 'react';
import {useAllIndicators} from './hooks/use-all-indicators';

export const ObjectiveIndicatorsHolder = () => {
	useAllIndicators();

	return <Fragment/>;
};
