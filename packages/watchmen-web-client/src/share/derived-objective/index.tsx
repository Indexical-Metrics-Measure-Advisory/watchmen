import NoDataImage from '@/assets/dashboard-no-data.svg';
import {ConsoleEventBusProvider} from '@/console/console-event-bus';
import {Body} from '@/console/derived-objective/body';
import {ObjectiveBucketsHolder} from '@/console/derived-objective/objective-buckets-holder';
import {ObjectiveEventBusProvider} from '@/console/derived-objective/objective-event-bus';
import {ObjectiveIndicatorsHolder} from '@/console/derived-objective/objective-indicators-holder';
import {ObjectiveStateHandler} from '@/console/derived-objective/objective-state-holder';
import {ObjectiveValuesHandler} from '@/console/derived-objective/objective-values-holder';
import {fetchSharedDerivedObjective} from '@/services/data/share/derived-objective';
import {DerivedObjective, DerivedObjectiveId} from '@/services/data/tuples/derived-objective-types';
import {Token} from '@/services/data/types';
import {Lang} from '@/widgets/langs';
import React, {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import {ShareNothing} from '../share-nothing';
import {SimulateConsole} from './simulate-console';
import {NoData, ShareDerivedObjectiveContainer, SharedHeader} from './widgets';

interface ShareDerivedObjectiveState {
	initialized: boolean;
	derivedObjectiveId?: DerivedObjectiveId;
	derivedObjective?: DerivedObjective;
}

const ShareDerivedObjective = (props: { derivedObjective: DerivedObjective }) => {
	const {derivedObjective} = props;

	return <ObjectiveEventBusProvider>
		<ShareDerivedObjectiveContainer>
			<ObjectiveStateHandler derivedObjective={derivedObjective}/>
			<ObjectiveBucketsHolder/>
			<ObjectiveIndicatorsHolder/>
			<ObjectiveValuesHandler derivedObjective={derivedObjective}/>
			<SharedHeader>
				{derivedObjective.name || 'Noname Objective'}
			</SharedHeader>
			<Body derivedObjective={derivedObjective} share={true}/>
		</ShareDerivedObjectiveContainer>
	</ObjectiveEventBusProvider>;
};

const ShareDerivedObjectiveIndex = () => {
	const {objectiveId, token} = useParams<{ objectiveId: DerivedObjectiveId, token: Token }>();
	// console.log(objectiveId, token);
	const [state, setState] = useState<ShareDerivedObjectiveState>({initialized: false});
	useEffect(() => {
		(async () => {
			try {
				const {derivedObjective} = await fetchSharedDerivedObjective(objectiveId!, token!);
				setState({initialized: true, derivedObjectiveId: objectiveId, derivedObjective});
			} catch (e: any) {
				console.error(e);
				setState({initialized: true, derivedObjectiveId: objectiveId});
			}
		})();
	}, [objectiveId, token]);

	// eslint-disable-next-line
	if (!state.initialized || (state.initialized && state.derivedObjectiveId != objectiveId)) {
		return <ShareNothing label={Lang.CONSOLE.LOADING}/>;
	}

	if (state.initialized && state.derivedObjective == null) {
		return <ShareNothing label={Lang.CONSOLE.ERROR.DERIVED_OBJECTIVE_NOT_FOUND} spin={false}>
			<NoData background={NoDataImage}/>
		</ShareNothing>;
	}

	return <ConsoleEventBusProvider>
		<SimulateConsole derivedObjectives={[state.derivedObjective!]}/>
		<ShareDerivedObjective derivedObjective={state.derivedObjective!}/>
	</ConsoleEventBusProvider>;
};

export default ShareDerivedObjectiveIndex;