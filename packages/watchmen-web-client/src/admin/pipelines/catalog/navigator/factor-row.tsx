import {Factor} from '@/services/data/tuples/factor-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {ICON_CONSANGUINITY} from '@/widgets/basic/constants';
import {TooltipAlignment} from '@/widgets/basic/types';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {MouseEvent} from 'react';
import {useCatalogEventBus} from '../catalog-event-bus';
import {CatalogEventTypes} from '../catalog-event-bus-types';
import {FactorLineageButton, FactorName, FactorRowContainer, FactorTypeSmall} from './topic-widgets';

export const FactorRow = (props: { topic: Topic, factor: Factor }) => {
	const {topic, factor} = props;
	const {fire} = useCatalogEventBus();

	const onLineageClicked = (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		event.stopPropagation();
		fire(CatalogEventTypes.SHOW_FACTOR_LINEAGE, topic, factor);
	};

	return <FactorRowContainer>
		<FactorName>{factor.label || factor.name}</FactorName>
		<FactorTypeSmall factor={factor}/>
		<FactorLineageButton tooltip={{label: 'Field Lineage', alignment: TooltipAlignment.CENTER}}
		                     onClick={onLineageClicked}>
			<FontAwesomeIcon icon={ICON_CONSANGUINITY}/>
		</FactorLineageButton>
	</FactorRowContainer>;
};
