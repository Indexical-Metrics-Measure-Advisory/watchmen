import {DataSource, DataSourceType} from '@/services/data/tuples/data-source-types';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {TuplePropertyDropdown} from '@/widgets/tuple-workbench/tuple-editor';
import React from 'react';
import {useDataSourceEventBus} from '../data-source-event-bus';
import {DataSourceEventTypes} from '../data-source-event-bus-types';

export const DataSourceTypeInput = (props: { dataSource: DataSource }) => {
	const {dataSource} = props;

	const {fire} = useDataSourceEventBus();
	const forceUpdate = useForceUpdate();

	const onTypeChange = (option: DropdownOption) => {
		dataSource.dataSourceType = option.value as DataSourceType;
		fire(DataSourceEventTypes.DATASOURCE_TYPE_CHANGED, dataSource);
		forceUpdate();
	};

	const options: Array<DropdownOption> = [
		{value: DataSourceType.MYSQL, label: 'MySQL/MariaDB'},
		{value: DataSourceType.ORACLE, label: 'Oracle'},
		// {value: DataSourceType.MONGODB, label: 'MongoDB'},
		{value: DataSourceType.MSSQL, label: 'MSSQL'},
		{value: DataSourceType.POSTGRESQL, label: 'PostgreSQL'},
		{value: DataSourceType.AWS_S3, label: 'AWS S3'},
		{value: DataSourceType.ALI_OSS, label: 'Ali OSS'},
		{value: DataSourceType.AZURE_BLOB_STORAGE, label: 'Azure Blob Storage'},
		{value: DataSourceType.SNOWFLAKE, label: 'Snowflake'},
		{value: DataSourceType.REDSHIFT, label: 'Redshift'},
	
	];

	return <TuplePropertyDropdown value={dataSource.dataSourceType} options={options} onChange={onTypeChange}/>;
};