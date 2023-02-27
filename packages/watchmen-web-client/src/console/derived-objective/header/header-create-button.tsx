import {ICON_OBJECTIVE} from '@/widgets/basic/constants';
import {PageHeaderButton} from '@/widgets/basic/page-header-buttons';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {useDerivedObjective} from '../../widgets/use-derived-objective';

export const HeaderCreateButton = () => {
	const onDerivedObjectiveClicked = useDerivedObjective();

	return <PageHeaderButton tooltip={Lang.CONSOLE.DERIVED_OBJECTIVE.ADD_DERIVED_OBJECTIVE}
	                         onClick={onDerivedObjectiveClicked}>
		<FontAwesomeIcon icon={ICON_OBJECTIVE}/>
	</PageHeaderButton>;
};