import React from 'react';
import styled from 'styled-components';
import {Topic, TopicId} from '@/services/data/tuples/topic-types';
import {MonitorRuleSeverity} from '@/services/data/data-quality/rule-types';
import {CardPanelAside, CardPanelTitle, Pill} from '../../widgets/kit';
import {NEUTRAL_COLOR, SEVERITY_COLORS} from '../../widgets/palette';
import {RuleDefs} from '../../rule-defs';
import {getTopicName} from '../../utils';
import {AlertItem} from './quality-dimensions';
import {OverviewCard, OverviewCardBody, OverviewCardHeader, OverviewCardNoData, SeverityBadge} from './widgets';

const SEVERITY_ORDER = [MonitorRuleSeverity.FATAL, MonitorRuleSeverity.WARN, MonitorRuleSeverity.TRACE];

const AlertsList = styled.div.attrs({'data-widget': 'quality-overview-alerts-list'})`
	display     : flex;
	flex        : 1;
	flex-direction : column;
	position    : relative;
	overflow-y  : auto;
	max-height  : 260px;
`;

const AlertRow = styled.div.attrs({'data-widget': 'quality-overview-alert-row'})`
	display         : flex;
	align-items     : flex-start;
	justify-content : space-between;
	column-gap      : calc(var(--margin) / 2);
	padding         : calc(var(--margin) / 3) calc(var(--margin) / 4);
	border-radius   : calc(var(--border-radius) * 1.5);
	&:hover {
		background-color : var(--hover-color);
	}
`;

const AlertMain = styled.div`
	display        : flex;
	flex-direction : column;
	min-width      : 0;
`;

const AlertTitle = styled.div`
	display    : flex;
	align-items: center;
	column-gap : calc(var(--margin) / 3);
	min-width  : 0;
`;

const AlertRuleName = styled.span`
	font-size   : 0.9em;
	font-weight : var(--font-demi-bold);
	white-space : nowrap;
	overflow    : hidden;
	text-overflow : ellipsis;
`;

const AlertContext = styled.span`
	font-size  : 0.78em;
	color      : var(--font-color);
	opacity    : 0.6;
	white-space: nowrap;
	overflow   : hidden;
	text-overflow : ellipsis;
	margin-top : 2px;
`;

/** Alert panel: severity-count pills plus the top hit logs ranked fatal-first. */
export const AlertsCard = (props: { alerts: Array<AlertItem>; topicMap: Record<TopicId, Topic> }) => {
	const {alerts, topicMap} = props;

	const counts = new Map<string, number>();
	for (const alert of alerts) {
		counts.set(alert.severity, (counts.get(alert.severity) ?? 0) + 1);
	}

	return <OverviewCard>
		<OverviewCardHeader>
			<CardPanelTitle>Alerts</CardPanelTitle>
			<CardPanelAside>
				{SEVERITY_ORDER.map(severity => counts.get(severity)
					? <Pill key={severity} tone={SEVERITY_COLORS[severity] || NEUTRAL_COLOR}>
						{counts.get(severity)} {severity}
					</Pill>
					: null)}
			</CardPanelAside>
		</OverviewCardHeader>
		<OverviewCardBody>
			{alerts.length === 0
				? <OverviewCardNoData>No alerts in range.</OverviewCardNoData>
				: <AlertsList>
					{alerts.slice(0, 20).map((alert, index) => {
						const topic = alert.topicId ? topicMap[alert.topicId] : (void 0);
						const topicName = topic ? getTopicName(topic) : (alert.topicId || '');
						const factorName = alert.factorId
							? ((topic?.factors || []).find(factor => factor.factorId === alert.factorId)?.name || 'Noname Factor')
							: (void 0);
						const ruleName = RuleDefs[alert.ruleCode]?.name || alert.ruleCode;
						return <AlertRow key={`${alert.ruleCode}-${alert.topicId}-${alert.factorId}-${index}`}>
							<AlertMain>
								<AlertTitle>
									<SeverityBadge severity={alert.severity}>{alert.severity}</SeverityBadge>
									<AlertRuleName>{ruleName}</AlertRuleName>
								</AlertTitle>
								<AlertContext>
									{[topicName, factorName, alert.lastOccurredTime].filter(x => !!x).join(' · ')}
								</AlertContext>
							</AlertMain>
							<Pill>{new Intl.NumberFormat(undefined, {useGrouping: true}).format(alert.count)}</Pill>
						</AlertRow>;
					})}
				</AlertsList>}
		</OverviewCardBody>
	</OverviewCard>;
};
