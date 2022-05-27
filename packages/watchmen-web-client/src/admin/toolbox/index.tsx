import {VerticalMarginOneUnit} from '@/widgets/basic/margin';
import {PageHeader} from '@/widgets/basic/page-header';
import React from 'react';
import {ToolboxCard, ToolboxCardDescription, ToolboxCards, ToolboxCardTitle, ToolboxPage} from './widgets';

const AdminToolboxIndex = () => {
	return <ToolboxPage>
		<PageHeader title="Toolbox"/>
		<VerticalMarginOneUnit/>
		<ToolboxCards>
			<ToolboxCard>
				<ToolboxCardTitle>Topic Snapshot</ToolboxCardTitle>
				<ToolboxCardDescription>
					Likes a time machine for a piece or a segment of single topic.
				</ToolboxCardDescription>
			</ToolboxCard>
			<ToolboxCard>
				<ToolboxCardTitle>Pipeline Trigger</ToolboxCardTitle>
				<ToolboxCardDescription>
					Manually trigger specific pipelines on topic.
				</ToolboxCardDescription>
			</ToolboxCard>
		</ToolboxCards>
		<VerticalMarginOneUnit/>
	</ToolboxPage>;
};

export default AdminToolboxIndex;