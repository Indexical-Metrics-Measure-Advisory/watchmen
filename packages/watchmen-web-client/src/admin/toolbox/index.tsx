import {Router} from '@/routes/types';
import {asAdminToolboxRoute, asFallbackNavigate} from '@/routes/utils';
import React from 'react';
import {Routes} from 'react-router-dom';
import {ToolboxList} from './list';
import {PipelineTrigger} from './pipeline-trigger';
import {TopicSnapshot} from './topic-snapshot';

const AdminToolboxIndex = () => {
	return <Routes>
		{asAdminToolboxRoute(Router.ADMIN_TOOLBOX_PIPELINE_TRIGGER, <PipelineTrigger/>)}
		{asAdminToolboxRoute(Router.ADMIN_TOOLBOX_TOPIC_SNAPSHOT, <TopicSnapshot/>)}
		{asAdminToolboxRoute(Router.ADMIN_TOOLBOX, <ToolboxList/>)}
		{asFallbackNavigate(Router.ADMIN_TOOLBOX)}
	</Routes>;
};

export default AdminToolboxIndex;