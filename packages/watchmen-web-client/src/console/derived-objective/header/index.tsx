import {DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {PageHeaderHolder} from '@/widgets/basic/page-header';
import React from 'react';
import styled from 'styled-components';
import {HeaderButtons} from './header-buttons';
import {HeaderNameEditor} from './header-name-editor';

const HeaderContainer = styled(PageHeaderHolder)`
	@media print {
		> div[data-widget=page-header-buttons] {
			display : none;
		}
	}
`;
export const Header = (props: { derivedObjective: DerivedObjective }) => {
	const {derivedObjective} = props;

	return <HeaderContainer>
		<HeaderNameEditor derivedObjective={derivedObjective}/>
		<HeaderButtons derivedObjective={derivedObjective}/>
	</HeaderContainer>;
};