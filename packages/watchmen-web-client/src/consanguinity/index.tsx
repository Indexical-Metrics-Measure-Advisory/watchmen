import {SingleObjectiveConsanguinity} from './single-objective-consanguinity-diagram';

export const ConsanguinityDiagram = () => {
	return <>
		<SingleObjectiveConsanguinity/>
	</>;
};

export * from './consanguinity-event-bus-types';
export * from './consanguinity-event-bus';