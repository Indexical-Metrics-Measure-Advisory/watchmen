import {Factor} from '@/services/data/tuples/factor-types';
import {MeasureMethod} from '@/services/data/tuples/indicator-types';
import {EnumForIndicator} from '@/services/data/tuples/query-indicator-types';
import {ICON_INDICATOR_MEASURE_METHOD} from '@/widgets/basic/constants';
import {MeasureMethodLabel} from '@/widgets/basic/measure-method-label';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {Fragment} from 'react';
import {MeasureMethodSort} from '../../../utils/sort';
import {MeasureFactor} from '../measure-factor';
import {AvailableMeasureFactor} from './types';
import {MeasureFactors, MeasureItemsBlock, MeasureItemsTitle, MeasureMethodItem} from './widgets';

export const MeasureFactorItems = (props: {
	label: string;
	measureFactors: Array<AvailableMeasureFactor>;
	enums: Array<EnumForIndicator>
}) => {
	const {label, measureFactors, enums} = props;

	if (measureFactors.length === 0) {
		return null;
	}

	const isLegalFactor = (amf: AvailableMeasureFactor): amf is Required<AvailableMeasureFactor> => amf.factor != null;
	const mfs: Array<Required<AvailableMeasureFactor>> = measureFactors.filter(isLegalFactor);
	if (mfs.length === 0) {
		return null;
	}

	const methodGroups = mfs.reduce((map, measureFactor) => {
		const {method, factor} = measureFactor;
		let group = map[method];
		if (group == null) {
			group = [];
			map[method] = group;
		}
		group.push(factor);
		return map;
	}, {} as Record<MeasureMethod, Array<Factor>>);

	return <>
		<MeasureItemsTitle>{label}</MeasureItemsTitle>
		<MeasureItemsBlock>
			{Object.keys(methodGroups).sort((m1, m2) => {
				return MeasureMethodSort[m1 as MeasureMethod] - MeasureMethodSort[m2 as MeasureMethod];
			}).map(method => {
				const factors = methodGroups[method as MeasureMethod];
				return <Fragment key={method}>
					<MeasureMethodItem>
						<FontAwesomeIcon icon={ICON_INDICATOR_MEASURE_METHOD}/>
						<MeasureMethodLabel measureMethod={method as MeasureMethod}/>
					</MeasureMethodItem>
					<MeasureFactors>
						{factors.map(factor => {
							// eslint-disable-next-line
							const enumeration = enums.find(enumeration => enumeration.enumId == factor.enumId);
							return <MeasureFactor factor={factor} enum={enumeration}
							                      key={factor.factorId}/>;
						})}
					</MeasureFactors>
				</Fragment>;
			})}
		</MeasureItemsBlock>
	</>;
};