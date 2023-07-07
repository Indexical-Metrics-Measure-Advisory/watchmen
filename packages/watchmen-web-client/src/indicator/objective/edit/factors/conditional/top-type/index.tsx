import {ConditionalObjectiveParameter, ObjectiveFactorOnIndicator} from '@/services/data/tuples/objective-types';
import React from 'react';
import {ConditionalTopType} from './for-conditional';
import {FactorTopType} from './for-factor';

export const TopType = (props: {
	factor: ObjectiveFactorOnIndicator;
	conditional?: ConditionalObjectiveParameter;
}) => {
	const {factor, conditional} = props;

	if (conditional == null) {
		return <FactorTopType factor={factor}/>;
	} else {
		return <ConditionalTopType conditional={conditional}/>;
	}
};