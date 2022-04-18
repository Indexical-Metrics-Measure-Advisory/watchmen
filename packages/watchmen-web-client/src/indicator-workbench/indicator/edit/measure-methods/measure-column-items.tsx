import {EnumId} from '@/services/data/tuples/enum-types';
import {MeasureMethod} from '@/services/data/tuples/indicator-types';
import {EnumForIndicator} from '@/services/data/tuples/query-indicator-types';
import {SubjectDataSetColumn} from '@/services/data/tuples/subject-types';
import {ICON_INDICATOR_MEASURE_METHOD} from '@/widgets/basic/constants';
import {MeasureMethodLabel} from '@/widgets/basic/measure-method-label';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {Fragment} from 'react';
import {MeasureMethodSort} from '../../../utils/sort';
import {MeasureColumn} from '../measure-column';
import {AvailableMeasureColumn} from './types';
import {MeasureFactors, MeasureItemsBlock, MeasureItemsTitle, MeasureMethodItem} from './widgets';

export const MeasureColumnItems = (props: {
	label: string;
	measureColumns: Array<AvailableMeasureColumn>;
	enums: Array<EnumForIndicator>
}) => {
	const {label, measureColumns, enums} = props;

	if (measureColumns.length === 0) {
		return null;
	}

	const isLegal = (amf: AvailableMeasureColumn): amf is Required<AvailableMeasureColumn> => amf.column != null;
	const mfs: Array<Required<AvailableMeasureColumn>> = measureColumns.filter(isLegal);
	if (mfs.length === 0) {
		return null;
	}

	const methodGroups = mfs.reduce((map, measureColumn) => {
		const {method, column, enumId} = measureColumn;
		let group = map[method];
		if (group == null) {
			group = [];
			map[method] = group;
		}
		group.push({column, enumId});
		return map;
	}, {} as Record<MeasureMethod, Array<{ column: SubjectDataSetColumn, enumId?: EnumId }>>);

	return <>
		<MeasureItemsTitle>{label}</MeasureItemsTitle>
		<MeasureItemsBlock>
			{Object.keys(methodGroups).sort((m1, m2) => {
				return MeasureMethodSort[m1 as MeasureMethod] - MeasureMethodSort[m2 as MeasureMethod];
			}).map(method => {
				const columns = methodGroups[method as MeasureMethod];
				return <Fragment key={method}>
					<MeasureMethodItem>
						<FontAwesomeIcon icon={ICON_INDICATOR_MEASURE_METHOD}/>
						<MeasureMethodLabel measureMethod={method as MeasureMethod}/>
					</MeasureMethodItem>
					<MeasureFactors>
						{columns.map(({column, enumId}) => {
							// eslint-disable-next-line
							const enumeration = enums.find(enumeration => enumeration.enumId == enumId);
							return <MeasureColumn column={column} enum={enumeration}
							                      key={column.columnId}/>;
						})}
					</MeasureFactors>
				</Fragment>;
			})}
		</MeasureItemsBlock>
	</>;
};