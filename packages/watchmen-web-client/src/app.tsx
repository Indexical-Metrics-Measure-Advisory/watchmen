import {Alert} from '@/widgets/alert';
import {NotImplement} from '@/widgets/alert/not-implement';
import {WaitRemoteData} from '@/widgets/alert/wait-remote-data';
import {Tooltip} from '@/widgets/basic/tooltip';
import {Dialog} from '@/widgets/dialog';
import {YesNoDialog} from '@/widgets/dialog/yes-no-dialog';
import {EventBusProvider} from '@/widgets/events/event-bus';
import {HelpButton} from '@/widgets/help';
import {Languages} from '@/widgets/langs';
import {ThemeWrapper} from '@/widgets/theme/theme-wrapper';
import dayjs from 'dayjs';
import ArraySupport from 'dayjs/plugin/arraySupport';
import CustomParseFormat from 'dayjs/plugin/customParseFormat';
import Duration from 'dayjs/plugin/duration';
import IsToday from 'dayjs/plugin/isToday';
import ObjectSupport from 'dayjs/plugin/objectSupport';
import QuarterOfYear from 'dayjs/plugin/quarterOfYear';
import RelativeTime from 'dayjs/plugin/relativeTime';
import WeekOfYear from 'dayjs/plugin/weekOfYear';
import React from 'react';
import {AppRoutes} from './routes';

// datetime functions
dayjs.extend(WeekOfYear);
dayjs.extend(QuarterOfYear);
dayjs.extend(Duration);
dayjs.extend(IsToday);
dayjs.extend(RelativeTime);
dayjs.extend(ArraySupport);
dayjs.extend(ObjectSupport);
dayjs.extend(CustomParseFormat);

const app = () => {
	return <EventBusProvider>
		<ThemeWrapper/>
		<Languages/>
		<AppRoutes/>
		<Alert/>
		<NotImplement/>
		<WaitRemoteData/>
		<Dialog/>
		<YesNoDialog/>
		<Tooltip/>
		<HelpButton/>
	</EventBusProvider>;
};
export default app;
