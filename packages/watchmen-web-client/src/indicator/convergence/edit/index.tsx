import {FixWidthPage} from '@/widgets/basic/page';
import {PageHeader} from '@/widgets/basic/page-header';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {Def} from './def';
import {Description} from './description';
import {NameAndSave} from './name-and-save';
import {usePrepareConvergence} from './state';
import {UserGroup} from './user-group';
import {ConvergenceContainer} from './widgets';

export const ConvergenceEditor = () => {
	const {convergence, initialized} = usePrepareConvergence();
	if (!initialized || convergence == null) {
		return null;
	}

	// render when all reference data ready
	return <FixWidthPage>
		{/*<ObjectiveValuesHandler objective={objective}/>*/}
		<PageHeader title={Lang.INDICATOR.CONVERGENCE.TITLE}/>
		<ConvergenceContainer>
			<Def convergence={convergence}/>
			<NameAndSave convergence={convergence}/>
			<UserGroup convergence={convergence}/>
			<Description convergence={convergence}/>
		</ConvergenceContainer>
	</FixWidthPage>;
};
