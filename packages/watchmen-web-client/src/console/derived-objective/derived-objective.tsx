import {DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import React from 'react';
import {Header} from './header';

export const DerivedObjectivePage = (props: { derivedObjective: DerivedObjective }) => {
	const {derivedObjective} = props;

	return <>
		<Header derivedObjective={derivedObjective}/>
	</>;
};