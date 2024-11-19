import {PageHeaderButtons} from '@/widgets/basic/page-header-buttons';
import React from 'react';
import {DerivedObjective} from "@/services/data/tuples/derived-objective-types";
import {HeaderBackButton} from "@/console/derived-objective/header/header-back-button";



export const CopilotHeaderButtons = (props: { derivedObjective:DerivedObjective }) => {
		const {derivedObjective} = props;

		return <PageHeaderButtons>
			<HeaderBackButton derivedObjective={derivedObjective}/>
			{/*<PageHeaderButtonSeparator/>*/}
		</PageHeaderButtons>;
	}
;