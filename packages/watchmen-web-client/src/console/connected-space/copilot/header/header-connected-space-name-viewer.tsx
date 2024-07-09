import {ConnectedSpace} from '@/services/data/tuples/connected-space-types';
import {PageTitleViewer} from '@/widgets/basic/page-title-editor';
import React from 'react';

export const HeaderConnectedSpaceNameViewer = (props: { connectedSpace: ConnectedSpace }) => {
	const {connectedSpace} = props;

	return <PageTitleViewer title={connectedSpace.name}/>;
};
