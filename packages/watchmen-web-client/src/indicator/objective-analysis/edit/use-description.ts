import {ObjectiveAnalysis, ObjectiveAnalysisPerspective} from '@/services/data/tuples/objective-analysis-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {ChangeEvent, FocusEvent} from 'react';
import {useObjectiveAnalysisEventBus} from './objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from './objective-analysis-event-bus-types';
import {countLines} from './utils';

export const useDescription = (analysis: ObjectiveAnalysis, data: ObjectiveAnalysis | ObjectiveAnalysisPerspective) => {
	const {fire} = useObjectiveAnalysisEventBus();
	const forceUpdate = useForceUpdate();

	const onDescriptionChanged = (event: ChangeEvent<HTMLTextAreaElement>) => {
		data.description = event.target.value;
		fire(ObjectiveAnalysisEventTypes.SAVE, analysis);
		forceUpdate();

		event.target.style.height = `calc(${countLines(event.target.value)} * var(--line-height) + 12px)`;
		// wait height changed
		setTimeout(() => {
			forceUpdate();
		}, 0);
	};
	const onDescriptionBlurred = (event: FocusEvent<HTMLTextAreaElement>) => {
		const lines = (data.description || '').split('\n').reverse();
		while (lines.length > 0 && lines[0].trim().length === 0) {
			lines.shift();
		}
		data.description = lines.reverse().join('\n');
		event.target.style.height = `calc(${countLines(data.description)} * var(--line-height) + 12px)`;
		forceUpdate();
	};

	return {onDescriptionChanged, onDescriptionBlurred};
};