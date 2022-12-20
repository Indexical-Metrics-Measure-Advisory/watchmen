import {Objective} from '@/services/data/tuples/objective-types';
import {FixWidthPage} from '@/widgets/basic/page';
import {PageHeader} from '@/widgets/basic/page-header';
import {Lang} from '@/widgets/langs';
import React, {useEffect, useState} from 'react';
import {useObjectivesEventBus} from '../objectives-event-bus';
import {ObjectivesEventTypes} from '../objectives-event-bus-types';
import {createObjective} from '../utils';
import {Description} from './description';
import {Factors} from './factors';
import {NameAndSave} from './name-and-save';
import {Targets} from './targets';
import {TimeFrame} from './time-frame';
import {UserGroup} from './user-group';
import {Variables} from './variables';
import {ObjectiveContainer} from './widgets';

export const ObjectiveEditor = () => {
	const {fire} = useObjectivesEventBus();
	const [objective, setObjective] = useState<Objective | null>(null);
	useEffect(() => {
		fire(ObjectivesEventTypes.ASK_OBJECTIVE, (objective?: Objective) => {
			if (objective == null) {
				setObjective(createObjective());
			} else {
				setObjective(objective);
			}
		});
	}, [fire]);

	if (objective == null) {
		return null;
	}

	return <FixWidthPage>
		<PageHeader title={Lang.INDICATOR.OBJECTIVE.TITLE}/>
		<ObjectiveContainer>
			<Targets objective={objective}/>
			<TimeFrame objective={objective}/>
			<Variables objective={objective}/>
			<Factors objective={objective}/>
			<NameAndSave objective={objective}/>
			<Description objective={objective}/>
			<UserGroup objective={objective}/>
		</ObjectiveContainer>
	</FixWidthPage>;
};
