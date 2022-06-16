import {tryToTransformColumnToMeasures} from '@/services/data/tuples/indicator-utils';
import {Inspection} from '@/services/data/tuples/inspection-types';
import {SubjectForIndicator} from '@/services/data/tuples/query-indicator-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {tryToGetTopTimeMeasure} from '../../utils/measure';
import {FilterBuilders} from './filter-builder';
import {TimePeriodFilterDropdown} from './widgets';

export const FilterOnSubject = (props: { inspection: Inspection; subject: SubjectForIndicator; valueChanged: () => void }) => {
	const {inspection, subject, valueChanged} = props;

	const forceUpdate = useForceUpdate();

	const column = inspection.timeRangeFactorId == null
		? null
		// eslint-disable-next-line
		: (subject.dataset.columns || []).find(column => column.columnId == inspection.timeRangeFactorId);

	if (column == null) {
		return null;
	}

	const measures = tryToTransformColumnToMeasures(column, subject);
	const topMeasure = tryToGetTopTimeMeasure(measures);
	if (topMeasure == null) {
		return null;
	}

	const onValueChanged = () => {
		valueChanged();
		forceUpdate();
	};
	const {options, selection, onValueChange} = FilterBuilders[topMeasure](inspection, onValueChanged);

	return <TimePeriodFilterDropdown value={''} options={options} display={selection} onChange={onValueChange}/>;
};