import {Router} from '@/routes/types';
import {VerticalMarginOneUnit} from '@/widgets/basic/margin';
import {PageHeader} from '@/widgets/basic/page-header';
import React from 'react';
import {useHistory} from 'react-router-dom';
import {ToolboxCard, ToolboxCardDescription, ToolboxCards, ToolboxCardTitle, ToolboxPage} from './widgets';

export const ToolboxList = () => {
	const history = useHistory();

	const onClick = (path: string) => () => {
		history.push(path);
	};

	return <ToolboxPage>
		<PageHeader title="Toolbox"/>
		<VerticalMarginOneUnit/>
		<ToolboxCards>
			<ToolboxCard onClick={onClick(Router.ADMIN_TOOLBOX_TOPIC_SNAPSHOT)}>
				<ToolboxCardTitle>Topic Snapshot</ToolboxCardTitle>
				<ToolboxCardDescription>
					Likes a time machine for a piece or a segment of single topic.
				</ToolboxCardDescription>
			</ToolboxCard>
			<ToolboxCard onClick={onClick(Router.ADMIN_TOOLBOX_PIPELINE_TRIGGER)}>
				<ToolboxCardTitle>Pipeline Trigger</ToolboxCardTitle>
				<ToolboxCardDescription>
					Manually trigger specific pipelines on topic.
				</ToolboxCardDescription>
			</ToolboxCard>
		</ToolboxCards>
		<VerticalMarginOneUnit/>
	</ToolboxPage>;
};