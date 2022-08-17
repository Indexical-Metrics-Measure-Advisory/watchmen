export const NUMBER_FORMAT_FRACTION_DIGITS_0 = new Intl.NumberFormat(undefined, {
	useGrouping: false,
	maximumFractionDigits: 0
}).format;
export const NUMBER_FORMAT_FRACTION_DIGITS_1 = new Intl.NumberFormat(undefined, {
	useGrouping: false,
	maximumFractionDigits: 1
}).format;
export const NUMBER_FORMAT_FRACTION_DIGITS_2 = new Intl.NumberFormat(undefined, {
	useGrouping: false,
	maximumFractionDigits: 2
}).format;
export const NUMBER_FORMAT_FRACTION_DIGITS_3 = new Intl.NumberFormat(undefined, {
	useGrouping: false,
	maximumFractionDigits: 3
}).format;
export const NUMBER_FORMAT_FRACTION_DIGITS_4 = new Intl.NumberFormat(undefined, {
	useGrouping: false,
	maximumFractionDigits: 4
}).format;
export const PREDEFINED_NUMBER_FORMATS = [
	NUMBER_FORMAT_FRACTION_DIGITS_0,
	NUMBER_FORMAT_FRACTION_DIGITS_1,
	NUMBER_FORMAT_FRACTION_DIGITS_2,
	NUMBER_FORMAT_FRACTION_DIGITS_3,
	NUMBER_FORMAT_FRACTION_DIGITS_4
];
export const createNumberFormat = (fractionDigits: number, useGrouping: boolean = false) => {
	if (fractionDigits < 5 && !useGrouping) {
		return PREDEFINED_NUMBER_FORMATS[fractionDigits];
	} else {
		return new Intl.NumberFormat(undefined, {useGrouping, maximumFractionDigits: fractionDigits}).format;
	}
};
export const PREDEFINED_GROUPING_FORMATS = new Intl.NumberFormat(undefined, {useGrouping: true}).format;
