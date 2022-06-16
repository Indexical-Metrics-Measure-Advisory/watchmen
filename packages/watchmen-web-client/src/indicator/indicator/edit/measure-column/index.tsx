import {EnumForIndicator} from '@/services/data/tuples/query-indicator-types';
import {SubjectDataSetColumn} from '@/services/data/tuples/subject-types';
import {ICON_FACTOR} from '@/widgets/basic/constants';
import {useTooltip} from '@/widgets/basic/tooltip';
import {TooltipAlignment} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useRef} from 'react';
import {MeasureColumnItem, MeasureColumnTooltip} from './widgets';

export const MeasureColumn = (props: { column: SubjectDataSetColumn, enum?: EnumForIndicator }) => {
	const {column, enum: enumeration} = props;
	const {alias} = column;

	const ref = useRef<HTMLSpanElement>(null);
	const tooltip = useTooltip<HTMLSpanElement>({
		use: true,
		alignment: TooltipAlignment.CENTER,
		tooltip: <MeasureColumnTooltip>
			<span>{Lang.INDICATOR.INDICATOR.FACTOR}</span>
			<span>{Lang.INDICATOR.INDICATOR.FACTOR_NAME}:</span>
			<span>{alias}</span>
			{enumeration != null
				? <>
					<span>{Lang.INDICATOR.INDICATOR.FACTOR_ENUM}:</span>
					<span>{enumeration.name}</span>
				</>
				: null}
		</MeasureColumnTooltip>,
		target: ref
	});

	return <MeasureColumnItem {...tooltip} ref={ref}>
		<FontAwesomeIcon icon={ICON_FACTOR}/>
		<span>{alias || 'Noname Factor'}</span>
	</MeasureColumnItem>;
};