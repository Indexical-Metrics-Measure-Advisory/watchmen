import {FixWidthPage} from '@/widgets/basic/page';
import {PageHeader} from '@/widgets/basic/page-header';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {Description} from './description';
import {Factors} from './factors';
import {NameAndSave} from './name-and-save';
import {usePrepareObjective} from './state';
import {Targets} from './targets';
import {TimeFrame} from './time-frame';
import {UserGroup} from './user-group';
import {Variables} from './variables';
import {ObjectiveContainer} from './widgets';

export const ObjectiveEditor = () => {
	const {objective, initialized} = usePrepareObjective();
	if (!initialized || objective == null) {
		return null;
	}

	// render when all reference data ready
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
