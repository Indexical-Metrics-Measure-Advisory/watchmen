import {Router} from '@/routes/types';
import {ICON_HOME} from '@/widgets/basic/constants';
import {FullWidthPage} from '@/widgets/basic/page';
import {HELP_KEYS, useHelp} from '@/widgets/help';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCalendarDays} from '@fortawesome/free-solid-svg-icons';
import React from 'react';
import {useNavigate} from 'react-router-dom';
import {
	AmbientBody,
	HeroHeader,
	HeroSubtitle,
	HeroTitle,
	HeroToolbar,
	QuickLink,
	WindowPill
} from '../widgets/kit';
import {StatisticsPageBody} from './body';
import {DailyPanel} from './daily';
import {FreeWalkPanel} from './free-walk';
import {QualityOverview} from './overview';
import {StatisticsEventBusProvider} from './statistics-event-bus';
import {WeeklyPanel} from './weekly';

const DataQualityStatisticsIndex = () => {
	useHelp(HELP_KEYS.DQC_STATISTICS);
	const navigate = useNavigate();

	return <FullWidthPage>
		<AmbientBody>
			<HeroHeader>
				<div>
					<HeroTitle>Run Statistics</HeroTitle>
					<HeroSubtitle>Rule-hit statistics over daily, weekly and custom windows.</HeroSubtitle>
				</div>
				<HeroToolbar>
					<WindowPill>
						<FontAwesomeIcon icon={faCalendarDays}/>
						Last 30 days
					</WindowPill>
					<QuickLink onClick={() => navigate(Router.DQC_HOME)}>
						<FontAwesomeIcon icon={ICON_HOME}/>
						Home
					</QuickLink>
				</HeroToolbar>
			</HeroHeader>
			<QualityOverview/>
			<StatisticsEventBusProvider>
				<StatisticsPageBody>
					<DailyPanel/>
					<WeeklyPanel/>
					<FreeWalkPanel/>
				</StatisticsPageBody>
			</StatisticsEventBusProvider>
		</AmbientBody>
	</FullWidthPage>;
};

export default DataQualityStatisticsIndex;
