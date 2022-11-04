import ObjectiveAnalysisBackground from '@/assets/objective-analysis-background.svg';
import {toObjectiveAnalysisEdit} from '@/routes/utils';
import {TuplePage} from '@/services/data/query/tuple-page';
import {findObjectiveAnalysisPage, saveObjectiveAnalysis} from '@/services/data/tuples/objective-analysis';
import {ObjectiveAnalysis} from '@/services/data/tuples/objective-analysis-types';
import {TUPLE_SEARCH_PAGE_SIZE} from '@/widgets/basic/constants';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {TupleWorkbench} from '@/widgets/tuple-workbench';
import {TupleEventBusProvider, useTupleEventBus} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleEventTypes} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import React, {useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {useObjectiveAnalysisListEventBus} from '../objective-analysis-list-event-bus';
import {ObjectiveAnalysisListEventTypes} from '../objective-analysis-list-event-bus-types';
import {createAnalysis} from '../utils';
import {renderCard} from './card';
import {renderEditor} from './editor';

const getKeyOfBucket = (analysis: ObjectiveAnalysis) => analysis.analysisId;

const RealObjectiveAnalysisList = () => {
	const navigate = useNavigate();
	const {fire: fireGlobal} = useEventBus();
	const {on, off, fire} = useTupleEventBus();
	const {fire: fireAnalysis} = useObjectiveAnalysisListEventBus();
	useEffect(() => {
		const onDoCreateAnalysis = async () => {
			const analysis = createAnalysis();
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
				return await saveObjectiveAnalysis(analysis);
			}, () => {
				navigate(toObjectiveAnalysisEdit(analysis.analysisId), {replace: true});
			});
		};
		const onDoEditAnalysis = async (analysis: ObjectiveAnalysis) => {
			navigate(toObjectiveAnalysisEdit(analysis.analysisId), {replace: true});
		};
		const onDoSearchAnalysis = async (searchText: string, pageNumber: number) => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await findObjectiveAnalysisPage({
					search: searchText,
					pageNumber,
					pageSize: TUPLE_SEARCH_PAGE_SIZE
				}),
				(page: TuplePage<ObjectiveAnalysis>) => {
					fire(TupleEventTypes.TUPLE_SEARCHED, page, searchText);
					fireAnalysis(ObjectiveAnalysisListEventTypes.SEARCHED, page, searchText);
				});
		};
		on(TupleEventTypes.DO_CREATE_TUPLE, onDoCreateAnalysis);
		on(TupleEventTypes.DO_EDIT_TUPLE, onDoEditAnalysis);
		on(TupleEventTypes.DO_SEARCH_TUPLE, onDoSearchAnalysis);
		return () => {
			off(TupleEventTypes.DO_CREATE_TUPLE, onDoCreateAnalysis);
			off(TupleEventTypes.DO_EDIT_TUPLE, onDoEditAnalysis);
			off(TupleEventTypes.DO_SEARCH_TUPLE, onDoSearchAnalysis);
		};
	}, [on, off, fire, fireAnalysis, fireGlobal, navigate]);
	useEffect(() => {
		fireAnalysis(ObjectiveAnalysisListEventTypes.ASK_SEARCHED, (page?: TuplePage<ObjectiveAnalysis>, searchText?: string) => {
			if (page) {
				fire(TupleEventTypes.TUPLE_SEARCHED, page, searchText ?? '');
			}
		});
	}, [fire, fireAnalysis]);

	return <TupleWorkbench title={Lang.INDICATOR.OBJECTIVE_ANALYSIS.TITLE}
	                       createButtonLabel={Lang.INDICATOR.OBJECTIVE_ANALYSIS.CREATE_OBJECTIVE_ANALYSIS}
	                       canCreate={true}
	                       searchPlaceholder={Lang.PLAIN.FIND_OBJECTIVE_ANALYSIS_PLACEHOLDER}
	                       tupleLabel={Lang.INDICATOR.OBJECTIVE_ANALYSIS.LABEL}
	                       newTupleLabelPrefix={Lang.INDICATOR.OBJECTIVE_ANALYSIS.NEW_OBJECTIVE_ANALYSIS_PREFIX}
	                       existingTupleLabelPrefix={Lang.INDICATOR.OBJECTIVE_ANALYSIS.EXISTING_OBJECTIVE_ANALYSIS_PREFIX}
	                       tupleImage={ObjectiveAnalysisBackground} tupleImagePosition="left 120px"
	                       renderEditor={renderEditor}
	                       confirmEditButtonLabel={Lang.ACTIONS.CONFIRM}
	                       closeEditButtonLabel={Lang.ACTIONS.CLOSE}
	                       renderCard={renderCard} getKeyOfTuple={getKeyOfBucket}/>;
};

const ObjectiveAnalysisList = () => {
	return <TupleEventBusProvider>
		<RealObjectiveAnalysisList/>
	</TupleEventBusProvider>;
};

export default ObjectiveAnalysisList;