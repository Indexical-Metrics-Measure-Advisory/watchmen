import {ColumnFormat} from '../types';

export const formatValue = (value: string | boolean | number | null | undefined, options: {
	format: ColumnFormat, highlightNegative: boolean;
}): { value: string; highlightAsDanger: boolean } => {
	if (value == null) {
		return {value: '', highlightAsDanger: false};
	}

	const {format, highlightNegative} = options;

	// if (`${value}`.length === 10) {
	// 	value = Math.random() * 10000 * (Math.random() >= 0.5 ? -1 : 1);
	// }

	if (!isNaN(Number(value))) {
		// numeric value
		const num = Number(value);
		if (format != null && format !== ColumnFormat.NONE) {
			let fractionDigits = 0;
			switch (format) {
				case ColumnFormat.USE_GROUP:
					fractionDigits = 0;
					break;
				case ColumnFormat.USE_GROUP_1:
					fractionDigits = 1;
					break;
				case ColumnFormat.USE_GROUP_2:
					fractionDigits = 2;
					break;
				case ColumnFormat.USE_GROUP_3:
					fractionDigits = 3;
					break;
				case ColumnFormat.USE_GROUP_4:
					fractionDigits = 4;
					break;
				case ColumnFormat.USE_GROUP_5:
					fractionDigits = 5;
					break;
				case ColumnFormat.USE_GROUP_6:
					fractionDigits = 6;
					break;
			}
			return {
				value: new Intl.NumberFormat(undefined, {
					useGrouping: true,
					minimumFractionDigits: fractionDigits,
					maximumFractionDigits: fractionDigits
				}).format(num),
				highlightAsDanger: highlightNegative ? num < 0 : false
			};
		} else {
			// no formatter
			return {value: `${value}`, highlightAsDanger: highlightNegative ? num < 0 : false};
		}
	} else {
		return {value: `${value}`, highlightAsDanger: false};
	}
};