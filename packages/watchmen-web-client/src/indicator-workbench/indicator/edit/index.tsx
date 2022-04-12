import {FixWidthPage} from '@/widgets/basic/page';
import {PageHeader} from '@/widgets/basic/page-header';
import {Lang} from '@/widgets/langs';
import React, {useEffect} from 'react';
import {useIndicatorsEventBus} from '../indicators-event-bus';
import {IndicatorsEventTypes} from '../indicators-event-bus-types';
import {IndicatorDeclarationStep} from '../types';
import {Categories} from './categories';
import {CreateOrFind} from './create-or-find';
import {DefineBuckets} from './define-buckets';
import {Description} from './description';
import {LastStep} from './last-step';
import {MeasureMethods} from './measure-methods';
import {PickTopic} from './pick-topic';
import {Relevant} from './relevant';
import {SaveIndicator} from './save-indicator';
import {IndicatorsContainer} from './widgets';

export const IndicatorEditor = () => {
	const {fire} = useIndicatorsEventBus();
	useEffect(() => {
		fire(IndicatorsEventTypes.SWITCH_STEP, IndicatorDeclarationStep.CREATE_OR_FIND);
	}, [fire]);

	return <FixWidthPage maxWidth="80%">
		<PageHeader title={Lang.INDICATOR_WORKBENCH.INDICATOR.TITLE}/>
		<IndicatorsContainer>
			<CreateOrFind/>
			<PickTopic/>
			<MeasureMethods/>
			<DefineBuckets/>
			<SaveIndicator/>
			<Relevant/>
			<Categories/>
			<Description/>
			<LastStep/>
		</IndicatorsContainer>
	</FixWidthPage>;
};