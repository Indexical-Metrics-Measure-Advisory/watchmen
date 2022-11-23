import {VerticalMarginOneUnit} from '@/widgets/basic/margin';
import {FixWidthPage} from '@/widgets/basic/page';
import {PageHeader} from '@/widgets/basic/page-header';
import {HELP_KEYS, useHelp} from '@/widgets/help';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {ConnectedSpacesSection} from './connected-spaces-section';
import {DashboardsSection} from './dashboards-section';
import {FindSection} from './find-section';
import {HomeBody} from './widgets';

const ConsoleHomeIndex = () => {
	useHelp(HELP_KEYS.CONSOLE_HOME);

	return <FixWidthPage>
		<PageHeader title={Lang.CONSOLE.HOME.TITLE}/>
		<VerticalMarginOneUnit/>
		<HomeBody>
			<DashboardsSection/>
			<ConnectedSpacesSection/>
			<FindSection/>
		</HomeBody>
		<VerticalMarginOneUnit/>
	</FixWidthPage>;
};

export default ConsoleHomeIndex;