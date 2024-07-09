import {ConnectedSpace} from '@/services/data/tuples/connected-space-types';
import {PageHeaderButtons} from '@/widgets/basic/page-header-buttons';
import React from 'react';
import {HeaderCatalogButton} from '../../header/header-catalog-button';

export const CopilotHeaderButtons = (props: { connectedSpace: ConnectedSpace }) => {
		const {connectedSpace} = props;

		return <PageHeaderButtons>
			<HeaderCatalogButton connectedSpace={connectedSpace}/>
			{/*<PageHeaderButtonSeparator/>*/}
		</PageHeaderButtons>;
	}
;