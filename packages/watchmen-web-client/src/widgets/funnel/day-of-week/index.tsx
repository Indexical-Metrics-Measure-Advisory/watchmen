import {ReportFunnel, ReportFunnelType} from '@/services/data/tuples/report-types';
import React, {ReactNode, useState} from 'react';
import {DropdownOption} from '../../basic/types';
import {DropdownEditor} from '../dropdown';
import {ReportFunnelDayOfWeek} from '../widgets';

export const DayOfWeekEditor = (props: { funnel: ReportFunnel; pairJoint: ReactNode }) => {
	const {funnel, pairJoint} = props;

	const [options] = useState<Array<DropdownOption>>(() => {
		return [1, 2, 3, 4, 5, 6, 7].map(weekday => ({
			value: `${weekday}`,
			label: ReportFunnelDayOfWeek[weekday - 1]
		}));
	});

	return <DropdownEditor funnel={funnel} acceptedType={ReportFunnelType.DAY_OF_WEEK} options={options}
	                       pairJoint={pairJoint}/>;
};
