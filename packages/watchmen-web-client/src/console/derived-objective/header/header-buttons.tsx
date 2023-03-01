import {DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {PageHeaderButtons, PageHeaderButtonSeparator} from '@/widgets/basic/page-header-buttons';
import React from 'react';
import {HeaderCreateButton} from './header-create-button';
import {HeaderDeleteButton} from './header-delete-button';
import {HeaderFavoriteButton} from './header-favorite-button';
import {HeaderRefreshButton} from './header-refresh-button';
import {HeaderSwitchButton} from './header-switch-button';
import {HeaderVariablesButton} from './header-variables-button';

export const HeaderButtons = (props: { derivedObjective: DerivedObjective }) => {
		const {derivedObjective} = props;

		return <PageHeaderButtons>
			<HeaderFavoriteButton derivedObjective={derivedObjective}/>
			<PageHeaderButtonSeparator/>
			<HeaderVariablesButton/>
			<HeaderRefreshButton/>
			<PageHeaderButtonSeparator/>
			<HeaderCreateButton/>
			<HeaderSwitchButton derivedObjective={derivedObjective}/>
			<PageHeaderButtonSeparator/>
			<HeaderDeleteButton derivedObjective={derivedObjective}/>
		</PageHeaderButtons>;
	}
;