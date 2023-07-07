import {SubjectColumnArithmetic, SubjectDataSetColumn} from '@/services/data/tuples/subject-types';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {useColumnEventBus} from './column-event-bus';
import {ColumnEventTypes} from './column-event-bus-types';
import {ArithmeticEdit, ArithmeticEditInput, ArithmeticLabel} from './widgets';

export const ArithmeticEditor = (props: { column: SubjectDataSetColumn }) => {
	const {column} = props;

	const {fire: fireColumn} = useColumnEventBus();
	const forceUpdate = useForceUpdate();

	const onArithmeticChange = (option: DropdownOption) => {
		const value = option.value as SubjectColumnArithmetic;
		if (value === column.arithmetic) {
			return;
		}

		column.arithmetic = value;
		forceUpdate();
		fireColumn(ColumnEventTypes.ARITHMETIC_CHANGED, column);
	};

	const arithmetics = [
		{value: SubjectColumnArithmetic.NONE, label: Lang.CONSOLE.CONNECTED_SPACE.SUBJECT_COLUMN_ARITHMETIC_NONE},
		{value: SubjectColumnArithmetic.COUNT, label: Lang.CONSOLE.CONNECTED_SPACE.SUBJECT_COLUMN_ARITHMETIC_COUNT},
		{
			value: SubjectColumnArithmetic.DISTINCT_COUNT,
			label: Lang.CONSOLE.CONNECTED_SPACE.SUBJECT_COLUMN_ARITHMETIC_DISTINCT_COUNT
		},
		{value: SubjectColumnArithmetic.SUMMARY, label: Lang.CONSOLE.CONNECTED_SPACE.SUBJECT_COLUMN_ARITHMETIC_SUMMARY},
		{value: SubjectColumnArithmetic.AVERAGE, label: Lang.CONSOLE.CONNECTED_SPACE.SUBJECT_COLUMN_ARITHMETIC_AVERAGE},
		{value: SubjectColumnArithmetic.MAXIMUM, label: Lang.CONSOLE.CONNECTED_SPACE.SUBJECT_COLUMN_ARITHMETIC_MAX},
		{value: SubjectColumnArithmetic.MINIMUM, label: Lang.CONSOLE.CONNECTED_SPACE.SUBJECT_COLUMN_ARITHMETIC_MIN}
	];

	return <ArithmeticEdit>
		<ArithmeticLabel>
			{Lang.CONSOLE.CONNECTED_SPACE.SUBJECT_COLUMN_ARITHMETIC}
		</ArithmeticLabel>
		<ArithmeticEditInput options={arithmetics} value={column.arithmetic || SubjectColumnArithmetic.NONE}
		                     onChange={onArithmeticChange}/>
	</ArithmeticEdit>;
};