import React from 'react';
import {StatsChart} from '../chart';
import {CardPanelTitle} from '../../widgets/kit';
import {OverviewCard, OverviewCardBody, OverviewCardHeader, OverviewCardNoData} from './widgets';

/** Rule share pie: enabled-rule count per quality dimension. */
export const RuleShareCard = (props: { data: Array<{ name: string; value: number }> }) => {
	const {data} = props;

	return <OverviewCard>
		<OverviewCardHeader>
			<CardPanelTitle>Rule Share</CardPanelTitle>
		</OverviewCardHeader>
		<OverviewCardBody>
			{data.length === 0
				? <OverviewCardNoData>No enabled rules.</OverviewCardNoData>
				: <StatsChart data={data} type="pie"/>}
		</OverviewCardBody>
	</OverviewCard>;
};
