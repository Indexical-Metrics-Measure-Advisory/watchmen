import {IndicatorCriteria} from '@/services/data/tuples/indicator-criteria-types';
import {Indicator} from '@/services/data/tuples/indicator-types';
import {Inspection} from '@/services/data/tuples/inspection-types';
import {DropdownOption} from '@/widgets/basic/types';
import {CriteriaArithmeticEditor} from './criteria-arithmetic-editor';
import {CriteriaFactorEditor} from './criteria-factor-editor';
import {CriteriaOperators} from './criteria-operators';
import {CriteriaValueEditor} from './criteria-value-editor';
import {IndicatorCriteriaDefData} from './types';
import {CriteriaRow, InspectionCriteriaIndex} from './widgets';

export const CriteriaEditor = (props: {
	inspection: Inspection;
	criteria: IndicatorCriteria;
	indicator: Indicator;
	factorCandidates: Array<DropdownOption>;
	defData: IndicatorCriteriaDefData;
}) => {
	const {inspection, criteria, indicator, factorCandidates, defData} = props;

	const index = (inspection.criteria || []).indexOf(criteria) + 1;

	return <CriteriaRow>
		<InspectionCriteriaIndex>{index === 0 ? (inspection.criteria || []).length + 1 : index}</InspectionCriteriaIndex>
		<CriteriaFactorEditor inspection={inspection} criteria={criteria} defData={defData}
		                      factorCandidates={factorCandidates} indicator={indicator}/>
		<CriteriaArithmeticEditor inspection={inspection} criteria={criteria} defData={defData} indicator={indicator}/>
		<CriteriaValueEditor inspection={inspection} criteria={criteria} defData={defData}/>
		<CriteriaOperators inspection={inspection} criteria={criteria}/>
	</CriteriaRow>;
};