import {PageHeaderHolder} from '@/widgets/basic/page-header';
import React from 'react';
import {CopilotHeaderButtons} from './copilot-header-buttons';
import {HeaderDerivedObjectiveNameViewer} from './header-derived-objective-name-viewer';
import {DerivedObjective} from "@/services/data/tuples/derived-objective-types";

export const CopilotHeader = (props: { derivedObjective: DerivedObjective }) => {
	const {derivedObjective} = props;

	return <PageHeaderHolder>
		<HeaderDerivedObjectiveNameViewer derivedObjective={derivedObjective}/>
		<CopilotHeaderButtons derivedObjective={derivedObjective}/>
	</PageHeaderHolder>;
};
