import {MeasureMethod} from '@/services/data/tuples/indicator-types';
import {
	detectMeasures,
	findTopicAndFactor,
	isCategoryMeasure,
	isGeoMeasure,
	isIndividualMeasure,
	isOrganizationMeasure,
	isTimePeriodMeasure
} from '@/services/data/tuples/indicator-utils';
import {Lang} from '@/widgets/langs';
import {useRef} from 'react';
import {EmphaticSinkingLabel, Step, StepBody, StepTitle} from '../../../step-widgets';
import {IndicatorsData} from '../../indicators-event-bus-types';
import {IndicatorDeclarationStep} from '../../types';
import {Construct, useConstructed} from '../use-constructed';
import {useStep} from '../use-step';
import {MeasureItems} from './measure-items';
import {AvailableMeasureColumn, AvailableMeasureFactor} from './types';
import {MeasureItemsContainer} from './widgets';

type MeasureFilter = (func: (measure: MeasureMethod) => boolean) => Array<AvailableMeasureFactor> | Array<AvailableMeasureColumn>;

const prepareMeasures = (data?: IndicatorsData): MeasureFilter => {
	if (data == null) {
		// noinspection JSUnusedLocalSymbols
		return (func: (measure: MeasureMethod) => boolean) => [];
	} else if (data.topic != null) {
		const measures = detectMeasures(data.topic);
		return (func: (measure: MeasureMethod) => boolean): Array<AvailableMeasureFactor> => {
			const {factors = []} = data?.topic || {};
			return measures.filter(({method}) => func(method))
				.map(({factorOrColumnId, method}) => {
					// eslint-disable-next-line
					const factor = factors.find(factor => factor.factorId == factorOrColumnId);
					return {factorOrColumnId, factorName: factor?.name, factor, method};
				});
		};
	} else if (data.subject != null) {
		const measures = detectMeasures(data.subject);
		return (func: (measure: MeasureMethod) => boolean): Array<AvailableMeasureColumn> => {
			const {columns = []} = data.subject?.dataset || {};
			return measures.filter(({method}) => func(method))
				.map(({factorOrColumnId, method}) => {
					// eslint-disable-next-line
					const column = columns.find(column => column.columnId == factorOrColumnId);
					const {factor} = findTopicAndFactor(column!, data.subject!);
					return {factorOrColumnId, columnAlias: column?.alias, column, method, enumId: factor?.enumId};
				});
		};
	} else {
		// noinspection JSUnusedLocalSymbols
		return (func: (measure: MeasureMethod) => boolean) => [];
	}
};

export const MeasureMethods = () => {
	const ref = useRef<HTMLDivElement>(null);
	const {constructed, setConstructed, visible, setVisible} = useConstructed(ref);
	const {data} = useStep({
		step: IndicatorDeclarationStep.MEASURE_METHODS,
		active: () => setConstructed(Construct.ACTIVE),
		done: () => setConstructed(Construct.DONE),
		dropped: () => setVisible(false)
	});

	if (constructed === Construct.WAIT) {
		return null;
	}

	const filterMeasures = prepareMeasures(data);

	const geoMeasures = {
		key: 'geo',
		label: Lang.INDICATOR.INDICATOR.GEO,
		measures: filterMeasures(isGeoMeasure)
	};
	const timePeriodMeasures = {
		key: 'time-period',
		label: Lang.INDICATOR.INDICATOR.TIME_PERIOD,
		measures: filterMeasures(isTimePeriodMeasure)
	};
	const individualMeasures = {
		key: 'individual',
		label: Lang.INDICATOR.INDICATOR.INDIVIDUAL,
		measures: filterMeasures(isIndividualMeasure)
	};
	const organizationMeasures = {
		key: 'organization',
		label: Lang.INDICATOR.INDICATOR.ORGANIZATION,
		measures: filterMeasures(isOrganizationMeasure)
	};
	const categoryMeasures = {
		key: 'category',
		label: Lang.INDICATOR.INDICATOR.CATEGORY,
		measures: filterMeasures(isCategoryMeasure)
	};

	return <Step index={IndicatorDeclarationStep.MEASURE_METHODS} visible={visible} ref={ref}>
		<StepTitle visible={visible}>
			<EmphaticSinkingLabel>{Lang.INDICATOR.INDICATOR.MEASURE_METHODS_TITLE}</EmphaticSinkingLabel>
		</StepTitle>
		<StepBody visible={visible}>
			<MeasureItemsContainer>
				<MeasureItems
					measures={[geoMeasures, timePeriodMeasures, individualMeasures, organizationMeasures, categoryMeasures]}
					enums={data?.enums}/>
			</MeasureItemsContainer>
		</StepBody>
	</Step>;
};