import {DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {PageHeaderHolder} from '@/widgets/basic/page-header';
import React from 'react';
import {HeaderButtons} from './header-buttons';
import {HeaderNameEditor} from './header-name-editor';

export const Header = (props: { derivedObjective: DerivedObjective }) => {
	const {derivedObjective} = props;

	return <PageHeaderHolder>
		<HeaderNameEditor derivedObjective={derivedObjective}/>
		<HeaderButtons derivedObjective={derivedObjective}/>
	</PageHeaderHolder>;
};