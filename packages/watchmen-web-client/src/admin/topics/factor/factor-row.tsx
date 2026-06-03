import {DataSourceType} from '@/services/data/tuples/data-source-types';
import {Factor} from '@/services/data/tuples/factor-types';
import {QueryEnumForHolder} from '@/services/data/tuples/query-enum-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {isKeyTypeSupported} from '@/services/data/tuples/topic-utils';
import {FactorButtons} from './factor-buttons';
import {FactorDefaultValueCell} from './factor-default-value-cell';
import {FactorDescriptionCell} from './factor-description-cell';
import {FactorEncryptCell} from './factor-encrypt-cell';
import {FactorEnumCell} from './factor-enum-cell';
import {FactorFlattenCell} from './factor-flatten-cell';
import {FactorIndexGroupCell} from './factor-index-group-cell';
import {FactorKeyIndexCell} from './factor-key-index-cell';
import {FactorKeyTypeCell} from './factor-key-type-cell';
import {FactorLabelCell} from './factor-label-cell';
import {FactorNameCell} from './factor-name-cell';
import {FactorPrecisionCell} from './factor-precision-cell';
import {FactorTypeCell} from './factor-type-cell';
import {FactorDescriptionLabel, FactorPropLabel, FactorRowContainer} from './widgets';

export const FactorRow = (props: {
	topic: Topic;
	factor: Factor;
	enums: Array<QueryEnumForHolder>;
	dataSourceType?: DataSourceType;
}) => {
	const {topic, factor, enums, dataSourceType} = props;
	const showKeyType = isKeyTypeSupported(dataSourceType);

	return <FactorRowContainer>
		{/*<FactorSerialCell topic={topic} factor={factor}/>*/}
		<FactorPropLabel><span>#{topic.factors.indexOf(factor) + 1}</span> Name</FactorPropLabel>
		<FactorNameCell topic={topic} factor={factor}/>
		<FactorPropLabel>Type</FactorPropLabel>
		<FactorTypeCell topic={topic} factor={factor}/>
		<FactorPropLabel>Label</FactorPropLabel>
		<FactorLabelCell factor={factor}/>
		<FactorPropLabel>Default Value</FactorPropLabel>
		<FactorDefaultValueCell factor={factor}/>
		<FactorEnumCell factor={factor} enums={enums}/>
		<FactorPropLabel>Index Group</FactorPropLabel>
		<FactorIndexGroupCell factor={factor}/>
		{showKeyType ? <>
			<FactorPropLabel>Key Type</FactorPropLabel>
			<FactorKeyTypeCell factor={factor}/>
			<FactorPropLabel>Key Order</FactorPropLabel>
			<FactorKeyIndexCell factor={factor}/>
		</> : null}
		<FactorEncryptCell topic={topic} factor={factor}/>
		<FactorFlattenCell topic={topic} factor={factor}/>
		<FactorPrecisionCell topic={topic} factor={factor}/>
		<FactorDescriptionLabel>Description</FactorDescriptionLabel>
		<FactorDescriptionCell factor={factor}/>
		<FactorButtons topic={topic} factor={factor}/>
	</FactorRowContainer>;
};
