import {DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import React from 'react';
import {Body} from './body';
import {Header} from './header';
import {ObjectiveEventBusProvider} from './objective-event-bus';
import {ObjectiveValuesHandler} from './objective-values-holder';

export const DerivedObjectivePage = (props: { derivedObjective: DerivedObjective }) => {
	const {derivedObjective} = props;

	return <ObjectiveEventBusProvider>
		<ObjectiveValuesHandler derivedObjective={derivedObjective}/>
		<Header derivedObjective={derivedObjective}/>
		<Body derivedObjective={derivedObjective}/>
	</ObjectiveEventBusProvider>;
};