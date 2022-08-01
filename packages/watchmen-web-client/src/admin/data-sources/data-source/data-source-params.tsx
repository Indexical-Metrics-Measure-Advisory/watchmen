import {DataSource, DataSourceParam} from '@/services/data/tuples/data-source-types';
import {Button} from '@/widgets/basic/button';
import {ICON_DELETE} from '@/widgets/basic/constants';
import {ButtonInk} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {TuplePropertyInput, TuplePropertyLabel} from '@/widgets/tuple-workbench/tuple-editor';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {ChangeEvent, Fragment} from 'react';
import styled from 'styled-components';
import {useDataSourceEventBus} from '../data-source-event-bus';
import {DataSourceEventTypes} from '../data-source-event-bus-types';

const ExtraParams = styled.div`
	display               : grid;
	grid-template-columns : 60% 32px calc(40% - 32px - 48px) 48px;
	grid-auto-rows        : minmax(var(--grid-tall-row-height), auto);
	grid-row-gap          : calc(var(--margin) / 4);
	align-content         : center;
	> span {
		align-self   : center;
		justify-self : center;
		font-weight  : var(--font-bold);
	}
	> button {
		align-self   : center;
		justify-self : end;
		height       : var(--height);
		width        : var(--height);
	}
`;
export const DataSourceParams = (props: { dataSource: DataSource }) => {
	const {dataSource} = props;

	const {fire} = useDataSourceEventBus();
	const forceUpdate = useForceUpdate();

	const onParamNameChange = (param: DataSourceParam, prop: 'name' | 'value') => (event: ChangeEvent<HTMLInputElement>) => {
		if (param[prop] !== event.target.value) {
			param[prop] = event.target.value;
			fire(DataSourceEventTypes.DATASOURCE_PARAM_CHANGED, dataSource);
			forceUpdate();
		}
		if (!(dataSource.params || []).includes(param)) {
			dataSource.params = [...(dataSource.params || []), param];
		}
	};
	const onParamDelete = (param: DataSourceParam) => () =>  {
		dataSource.params = (dataSource.params || []).filter(p => p !== param);
		fire(DataSourceEventTypes.DATASOURCE_PARAM_CHANGED, dataSource);
		forceUpdate();
	};

	const params = [...(dataSource.params || []), {name: '', value: ''}].filter(x => x);

	return <>
		<TuplePropertyLabel>Extra Parameters:</TuplePropertyLabel>
		<ExtraParams>
			{params.map((param, index) => {
				return <Fragment key={index}>
					<TuplePropertyInput value={param.name || ''} onChange={onParamNameChange(param, 'name')}
					                    placeholder={'Parameter name'}/>
					<span>=</span>
					<TuplePropertyInput value={param.value || ''} onChange={onParamNameChange(param, 'value')}
					                    placeholder={'Parameter value'}/>
					<Button ink={ButtonInk.DANGER} onClick={onParamDelete(param)}>
						<FontAwesomeIcon icon={ICON_DELETE}/>
					</Button>
				</Fragment>;
			})}
		</ExtraParams>
	</>;
};