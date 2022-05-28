import {Router} from '@/routes/types';
import React from 'react';
import {Redirect, Route, Switch} from 'react-router-dom';
import {ToolboxList} from './list';
import {PipelineTrigger} from './pipeline-trigger';
import {TopicSnapshot} from './topic-snapshot';

const AdminToolboxIndex = () => {
	return <Switch>
		<Route path={Router.ADMIN_TOOLBOX_PIPELINE_TRIGGER}><PipelineTrigger/></Route>
		<Route path={Router.ADMIN_TOOLBOX_TOPIC_SNAPSHOT}><TopicSnapshot/></Route>
		<Route path={Router.ADMIN_TOOLBOX}><ToolboxList/></Route>
		<Route path="*">
			<Redirect to={Router.ADMIN_TOOLBOX}/>
		</Route>
	</Switch>;
};

export default AdminToolboxIndex;