import {MonitorRules} from '@/services/data/data-quality/rule-types';
import {isRuleOnFactor, isRuleOnTopic} from '@/services/data/data-quality/rules';
import {Topic} from '@/services/data/tuples/topic-types';
import React from 'react';
import {SectionCard} from '../../widgets/kpi';
import {FactorGradeRules} from './factor-grade-rules';
import {TopicGradeRules} from './topic-grade-rules';

export const TopicRules = (props: { topic: Topic; rules: MonitorRules }) => {
	const {topic, rules} = props;

	const topicRulesCount = rules.filter(rule => isRuleOnTopic(rule)).length;
	const factorRulesCount = rules.filter(rule => isRuleOnFactor(rule)).length;

	return <>
		<SectionCard title="Topic Rules" badge={topicRulesCount}>
			<TopicGradeRules topic={topic} rules={rules}/>
		</SectionCard>
		<SectionCard title="Factor Rules" badge={factorRulesCount}>
			<FactorGradeRules topic={topic} rules={rules}/>
		</SectionCard>
	</>;
};
