import {FixWidthPage} from '@/widgets/basic/page';
import {PageHeader} from '@/widgets/basic/page-header';
import {Lang} from '@/widgets/langs';
import React, {useEffect, useState} from 'react';
import {useObjectivesEventBus} from '../objectives-event-bus';
import {ObjectiveData, ObjectivesEventTypes} from '../objectives-event-bus-types';
import {createObjective} from '../utils';
import {Description} from './description';
import {Factors} from './factors';
import {NameAndSave} from './name-and-save';
import {Targets} from './targets';
import {TimeFrame} from './time-frame';
import {EditObjective} from './types';
import {Variables} from './variables';
import {ObjectiveContainer} from './widgets';

export const ObjectiveEditor = () => {
	const {fire} = useObjectivesEventBus();
	const [data, setData] = useState<ObjectiveData | null>(null);
	useEffect(() => {
		fire(ObjectivesEventTypes.ASK_OBJECTIVE, (data?: ObjectiveData) => {
			if (data == null || data.objective == null) {
				setData({objective: createObjective()});
			} else {
				setData(data);
			}
		});
	}, [fire]);

	if (data == null || data.objective == null) {
		return null;
	}

	const editable = data as EditObjective;

	return <FixWidthPage>
		<PageHeader title={Lang.INDICATOR.OBJECTIVE.TITLE}/>
		<ObjectiveContainer>
			<Targets data={editable}/>
			<TimeFrame data={editable}/>
			<Variables data={editable}/>
			<Factors data={editable}/>
			<NameAndSave data={editable}/>
			<Description data={editable}/>
		</ObjectiveContainer>
	</FixWidthPage>;
};