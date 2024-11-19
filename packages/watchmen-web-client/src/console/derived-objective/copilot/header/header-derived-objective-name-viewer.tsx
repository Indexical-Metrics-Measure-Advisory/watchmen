import {PageTitleViewer} from '@/widgets/basic/page-title-editor';
import React from 'react';
import {DerivedObjective} from "@/services/data/tuples/derived-objective-types";

export const HeaderDerivedObjectiveNameViewer = (props: {  derivedObjective: DerivedObjective}) => {
	const {derivedObjective} = props;

	return <PageTitleViewer title={derivedObjective.name}/>;
};
