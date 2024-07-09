import {ConnectedSpace} from '@/services/data/tuples/connected-space-types';
import {PageHeaderHolder} from '@/widgets/basic/page-header';
import React from 'react';
import {CopilotHeaderButtons} from './copilot-header-buttons';
import {HeaderConnectedSpaceNameViewer} from './header-connected-space-name-viewer';

export const CopilotHeader = (props: { connectedSpace: ConnectedSpace }) => {
	const {connectedSpace} = props;

	return <PageHeaderHolder>
		<HeaderConnectedSpaceNameViewer connectedSpace={connectedSpace}/>
		<CopilotHeaderButtons connectedSpace={connectedSpace}/>
	</PageHeaderHolder>;
};
