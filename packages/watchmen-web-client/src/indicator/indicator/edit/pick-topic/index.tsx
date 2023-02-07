import {isIndicatorFactor} from '@/services/data/tuples/factor-calculator-utils';
import {Factor} from '@/services/data/tuples/factor-types';
import {
	fetchEnumsForTopic,
	fetchSubjectsForIndicatorSelection,
	fetchTopicsForIndicatorSelection
} from '@/services/data/tuples/indicator';
import {IndicatorBaseOn} from '@/services/data/tuples/indicator-types';
import {isIndicatorColumn} from '@/services/data/tuples/indicator-utils';
import {SubjectForIndicator, TopicForIndicator} from '@/services/data/tuples/query-indicator-types';
import {SubjectDataSetColumn} from '@/services/data/tuples/subject-types';
import {ButtonInk} from '@/widgets/basic/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {useEffect, useRef} from 'react';
import {SearchItem, SearchText} from '../../../search-text';
import {SearchTextEventBusProvider, useSearchTextEventBus} from '../../../search-text/search-text-event-bus';
import {SearchTextEventTypes} from '../../../search-text/search-text-event-bus-types';
import {Step, StepTitle, StepTitleButton, StepTitleButtonsRetractor} from '../../../step-widgets';
import {useIndicatorsEventBus} from '../../indicators-event-bus';
import {IndicatorsData, IndicatorsEventTypes} from '../../indicators-event-bus-types';
import {IndicatorDeclarationStep} from '../../types';
import {Construct, useConstructed} from '../use-constructed';
import {useStep} from '../use-step';
import {CandidateBaseOn, CandidateName} from './widgets';

interface TopicFactorCandidate extends SearchItem {
	topic: TopicForIndicator;
	factor?: Factor;
}

interface SubjectColumnCandidate extends SearchItem {
	subject: SubjectForIndicator;
	column?: SubjectDataSetColumn;
}

const TopicFactorCandidateItem = (props: { topic: TopicForIndicator; factor?: Factor }) => {
	const {topic, factor} = props;

	const name = factor == null ? topic.name : `${topic.name}.${factor.name}`;

	return <>
		<CandidateName>{name}</CandidateName>
		<CandidateBaseOn>
			{Lang.INDICATOR.INDICATOR.INDICATOR_ON_TOPIC}
		</CandidateBaseOn>
	</>;
};
const SubjectColumnCandidateItem = (props: { subject: SubjectForIndicator; column?: SubjectDataSetColumn }) => {
	const {subject, column} = props;

	const name = column == null ? subject.name : `${subject.name}.${column.alias}`;

	return <>
		<CandidateName>{name}</CandidateName>
		<CandidateBaseOn>
			{Lang.INDICATOR.INDICATOR.INDICATOR_ON_SUBJECT}
		</CandidateBaseOn>
	</>;
};

const ActivePart = (props: { data?: IndicatorsData; visible: boolean }) => {
	const {data, visible} = props;

	const {fire: fireGlobal} = useEventBus();
	const {fire} = useIndicatorsEventBus();
	const {fire: fireSearch} = useSearchTextEventBus();
	useEffect(() => {
		fireSearch(SearchTextEventTypes.FOCUS);
	}, [fireSearch]);

	const search = async (text: string): Promise<Array<TopicFactorCandidate | SubjectColumnCandidate>> => {
		return new Promise<Array<TopicFactorCandidate | SubjectColumnCandidate>>(resolve => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => {
					const topics = await fetchTopicsForIndicatorSelection(text);
					const subjects = await fetchSubjectsForIndicatorSelection(text);
					return {topics, subjects};
				},
				(candidates: { topics: Array<TopicForIndicator>, subjects: Array<SubjectForIndicator> }) => {
					const {topics, subjects} = candidates;
					resolve([
						...topics.map(candidate => {
							return [
								...(candidate.factors || []).filter(factor => {
									return isIndicatorFactor(factor.type);
								}).map(factor => {
									return {
										topic: candidate,
										factor,
										key: `factor-${candidate.topicId}-${factor.factorId}`,
										text: <TopicFactorCandidateItem topic={candidate} factor={factor}/>
									};
								}),
								{
									topic: candidate, key: `factor-${candidate.topicId}`,
									text: <TopicFactorCandidateItem topic={candidate}/>
								}
							];
						}).flat(),
						...subjects.map(candidate => {
							return [
								...(candidate.dataset.columns || []).filter(column => {
									return isIndicatorColumn(column, candidate);
								}).map(column => {
									return {
										subject: candidate,
										column,
										key: `column-${candidate.subjectId}-${column.columnId}`,
										text: <SubjectColumnCandidateItem subject={candidate} column={column}/>
									};
								}),
								{
									subject: candidate, key: `column-${candidate.subjectId}`,
									text: <SubjectColumnCandidateItem subject={candidate}/>
								}
							];
						}).flat()
					]);
				}, () => resolve([]));
		});
	};
	const isBaseOnTopic = (item: TopicFactorCandidate | SubjectColumnCandidate): item is TopicFactorCandidate => {
		return (item as any).topic != null;
	};
	const onSelectionChange = async (item: TopicFactorCandidate | SubjectColumnCandidate) => {
		const {indicator} = data!;
		if (isBaseOnTopic(item)) {
			indicator!.topicOrSubjectId = item.topic.topicId;
			indicator!.factorId = item.factor?.factorId;
			indicator!.baseOn = IndicatorBaseOn.TOPIC;
			data!.topic = item.topic;
			data!.enums = await fetchEnumsForTopic(item.topic.topicId);
		} else {
			indicator!.topicOrSubjectId = item.subject.subjectId;
			indicator!.factorId = item.column?.columnId;
			indicator!.baseOn = IndicatorBaseOn.SUBJECT;
			data!.subject = item.subject;
			// TODO ask enums for subject
		}

		fire(IndicatorsEventTypes.PICK_TOPIC_OR_SUBJECT, data!, (data: IndicatorsData) => {
			fire(IndicatorsEventTypes.SWITCH_STEP, IndicatorDeclarationStep.DEFINE_BUCKETS, data);
		});
	};

	return <StepTitle visible={visible}>
		<SearchText search={search} onSelectionChange={onSelectionChange}
		            buttonFirst={true} alwaysShowSearchInput={true}
		            openText={Lang.INDICATOR.INDICATOR.PICK_TOPIC_OR_SUBJECT}
		            placeholder={Lang.PLAIN.FIND_TOPIC_OR_FACTOR_OR_SUBJECT_PLACEHOLDER}/>
	</StepTitle>;
};

const DonePart = (props: { data?: IndicatorsData; visible: boolean }) => {
	const {data, visible} = props;

	const {indicator, topic, subject} = data ?? {};
	if (indicator?.baseOn === IndicatorBaseOn.TOPIC) {
		const topicName = topic?.name;
		// eslint-disable-next-line
		const factor: Factor | null = indicator?.factorId == null ? null : ((topic?.factors || []).find(factor => factor.factorId == indicator.factorId) ?? null);
		const factorName = factor?.name;

		return <StepTitle visible={visible}>
			<StepTitleButton ink={ButtonInk.SUCCESS} asLabel={true}>
				{Lang.INDICATOR.INDICATOR.DEFINE_ON_TOPIC} [ {topicName}{factorName ? `.${factorName}` : ''} ]
			</StepTitleButton>
			<StepTitleButtonsRetractor/>
		</StepTitle>;
	} else {
		const subjectName = subject?.name;
		// eslint-disable-next-line
		const column: SubjectDataSetColumn | null = indicator?.factorId == null ? null : ((subject?.dataset.columns || []).find(column => column.columnId == indicator.factorId) ?? null);
		const columnAlias = column?.alias;
		return <StepTitle visible={visible}>
			<StepTitleButton ink={ButtonInk.SUCCESS} asLabel={true}>
				{Lang.INDICATOR.INDICATOR.DEFINE_ON_SUBJECT} [ {subjectName}{columnAlias ? `.${columnAlias}` : ''} ]
			</StepTitleButton>
			<StepTitleButtonsRetractor/>
		</StepTitle>;
	}
};

export const PickTopic = () => {
	const ref = useRef<HTMLDivElement>(null);
	const {constructed, setConstructed, visible, setVisible} = useConstructed(ref);
	const {data, active, done} = useStep({
		step: IndicatorDeclarationStep.PICK_TOPIC_OR_SUBJECT,
		active: () => setConstructed(Construct.ACTIVE),
		done: () => setConstructed(Construct.DONE),
		dropped: () => setVisible(false)
	});

	if (constructed === Construct.WAIT) {
		return null;
	}

	return <Step index={IndicatorDeclarationStep.PICK_TOPIC_OR_SUBJECT} visible={visible} ref={ref}>
		<SearchTextEventBusProvider>
			<ActivePart data={data} visible={active}/>
		</SearchTextEventBusProvider>
		<DonePart data={data} visible={done}/>
	</Step>;
};