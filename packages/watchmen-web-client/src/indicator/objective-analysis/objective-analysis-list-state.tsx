import {TuplePage} from '@/services/data/query/tuple-page';
import {ObjectiveAnalysis} from '@/services/data/tuples/objective-analysis-types';
import {Fragment, useEffect, useState} from 'react';
import {useObjectiveAnalysisListEventBus} from './objective-analysis-list-event-bus';
import {ObjectiveAnalysisListEventTypes} from './objective-analysis-list-event-bus-types';

interface ListData {
	page?: TuplePage<ObjectiveAnalysis>;
	searchText?: string;
	searched: boolean;
}

export const ObjectiveAnalysisListState = () => {
	const {on, off} = useObjectiveAnalysisListEventBus();
	const [data, setData] = useState<ListData>({searched: false});

	useEffect(() => {
		const onSearched = (page: TuplePage<ObjectiveAnalysis>, searchText: string) => {
			setData({page, searchText, searched: true});
		};
		on(ObjectiveAnalysisListEventTypes.SEARCHED, onSearched);
		return () => {
			off(ObjectiveAnalysisListEventTypes.SEARCHED, onSearched);
		};
	}, [on, off]);
	useEffect(() => {
		const onAskSearched = (onData: (page?: TuplePage<ObjectiveAnalysis>, searchText?: string) => void) => {
			onData(data.page, data.searchText);
		};
		on(ObjectiveAnalysisListEventTypes.ASK_SEARCHED, onAskSearched);
		return () => {
			off(ObjectiveAnalysisListEventTypes.ASK_SEARCHED, onAskSearched);
		};
	}, [on, off, data.page, data.searchText]);
	useEffect(() => {
		const onAnalysisSaved = (analysis: ObjectiveAnalysis) => {
			// eslint-disable-next-line
			const existing = data.page?.data?.find(existing => existing.analysisId == analysis.analysisId);
			if (existing != null) {
				existing.title = analysis.title;
				existing.description = analysis.description;
			}
		};
		const onAnalysisDeleted = (analysis: ObjectiveAnalysis) => {
			if (data.page != null && data.page.data != null) {
				setData(data => {
					return {
						page: {
							...(data.page!),
							data: (data.page?.data || []).filter(existing => existing.analysisId != analysis.analysisId)
						},
						searchText: data.searchText,
						searched: data.searched
					};
				});
			}
		};
		on(ObjectiveAnalysisListEventTypes.OBJECTIVE_ANALYSIS_SAVED, onAnalysisSaved);
		on(ObjectiveAnalysisListEventTypes.OBJECTIVE_ANALYSIS_DELETED, onAnalysisDeleted);
		return () => {
			off(ObjectiveAnalysisListEventTypes.OBJECTIVE_ANALYSIS_SAVED, onAnalysisSaved);
			off(ObjectiveAnalysisListEventTypes.OBJECTIVE_ANALYSIS_DELETED, onAnalysisDeleted);
		};
	}, [on, off, data.page?.data]);

	return <Fragment/>;
};