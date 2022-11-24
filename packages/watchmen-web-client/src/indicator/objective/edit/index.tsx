import {FixWidthPage} from '@/widgets/basic/page';
import {PageHeader} from '@/widgets/basic/page-header';
import {Lang} from '@/widgets/langs';
import React, {useEffect, useState} from 'react';
import {useObjectivesEventBus} from '../objectives-event-bus';
import {ObjectivesData, ObjectivesEventTypes} from '../objectives-event-bus-types';
import {createObjective} from '../utils';

export const ObjectiveEditor = () => {
	const {fire} = useObjectivesEventBus();
	const [data, setData] = useState<ObjectivesData | null>(null);
	useEffect(() => {
		fire(ObjectivesEventTypes.ASK_OBJECTIVE, (data?: ObjectivesData) => {
			if (data == null || data.objective == null) {
				setData({objective: createObjective()});
			} else {
				setData(data);
			}
		});
	}, [fire]);

	if (data == null) {
		return null;
	}

	return <FixWidthPage>
		<PageHeader title={Lang.INDICATOR.OBJECTIVE.TITLE}/>
	</FixWidthPage>;
};