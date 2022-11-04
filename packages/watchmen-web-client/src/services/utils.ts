import {Buffer} from 'buffer/';
import dayjs, {Dayjs} from 'dayjs';

export const noop = () => (void 0);
export const base64Encode = (str: string): string => {
	return Buffer.from(str, 'utf-8').toString('base64');
};

export const base64Decode = (str: string): string => {
	return Buffer.from(str, 'base64').toString('utf-8');
};

export const computeWeekOf = (date: string | Dayjs, unit: 'year' | 'month'): number => {
	// get first day of this unit
	// year: 01/01
	// month: month/01
	const firstDayOfUnit = dayjs(date).startOf(unit);
	// weekday is 0-6, convert to 1-7 here. now if the first day of unit is
	// 1. sunday: result is 1,
	// 2. monday: result is 2,
	// 3. tuesday: result is 3,
	// 4. wednesday: result is 4,
	// 5. thursday: result is 5,
	// 6. friday: result is 6,
	// 7. saturday: result is 7
	const firstDayWeekday = firstDayOfUnit.day() + 1;
	// compute days of first week. now if the first day of unit is
	// 1. sunday: 0 day in first week
	// 2. monday: 6 days in first week
	// 3. tuesday: 5 days in first week
	// 4. wednesday: 4 days in first week
	// 5. thursday: 3 days in first week
	// 6. friday: 2 days in first week
	// 7. saturday: 1 days in first week
	const firstWeekDays = (8 - firstDayWeekday) % 7;

	const thisDay = dayjs(date);
	// compute days between given date and first day of unit
	// eg. given date is 2021/01/02, then result is 1
	const daysDiff = thisDay.diff(firstDayOfUnit, 'day', false);
	if (daysDiff < firstWeekDays) {
		// this is first/zero week, always is not a whole week
		// 1. from first day of unit, there are firstWeekDays in first week
		// 2. because of first day of unit is not count in daysDiff,
		//    which means "daysDiff <= firstWeekDays - 1" equals given date is in first week
		// 3. also because if the first day of unit is sunday equals there is zero day in first week,
		//    any daysDiff could not fulfill the "daysDiff <= 0 - 1",
		//    so in this case, week starts from 1, and will not enter this logic branch.
		return 0;
	} else {
		// if not in first partial week, subtract firstWeekDays and simply divide 7 to get weeks.
		// eg 1.
		//   first day of unit is monday, 6 days in first week(#0)
		//   given date is 7th day in unit, daysDiff is 6 => (6 - 6 + 1) / 7 => week #1
		//   given date is 8th/9th/10th/11th/12th day in unit, daysDiff is 7/8/9/10/11 => (7/8/9/10/11 - 6 + 1) / 7 => week #1
		//   given date is 13th day in unit, daysDiff is 12 => (12 - 6 + 1) / 7 => week #1
		//   given date is 14th day in unit, daysDiff is 13 => (13 - 6 + 1) / 7 => week #2
		return Math.ceil((daysDiff - firstWeekDays + 1) / 7);
	}
};

const hierarchicalNameSplitting = /[_.]/;
const nonHierarchicalNameSplitting = /_/;
export const againstSnakeCaseName = (name: string, hierarchical: boolean = false) => {
	return /^\d.*$/.test(name)
		|| name.split(hierarchical ? hierarchicalNameSplitting : nonHierarchicalNameSplitting)
			.some(part => !/^[A-Za-z0-9]+$/.test(part));
};

export const isXaNumber = (x: any, negative: boolean = true): boolean => {
	if (x == null) {
		return false;
	}
	let testValue;
	if (x.toString && typeof x.toString === 'function') {
		testValue = x.toString();
	} else {
		testValue = `${x}`;
	}

	if (negative) {
		return /^(-?)[0-9]+(.[0-9]*)?$/.test(testValue);
	} else {
		return /^[0-9]+(.[0-9]*)?$/.test(testValue);
	}
};

export const formatToKGB = (x: number): string => {
	if (x >= 1_000_000_000) {
		return (x / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'b';
	}
	if (x >= 1_000_000) {
		return (x / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'm';
	}
	if (x >= 1_000) {
		return (x / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
	}
	return `${x}`;
};

const DATE_FORMAT_MAPPING: { [key in string]: string } = {
	'Y': '%Y',  // 4 digits year
	'y': '%y',  // 2 digits year
	'M': '%m',  // 2 digits month
	'D': '%d',  // 2 digits day of month
	'h': '%H',  // 2 digits hour, 00 - 23
	'H': '%I',  // 2 digits hour, 01 - 12
	'm': '%M',  // 2 digits minute
	's': '%S',  // 2 digits second
	'W': '%A',  // Monday - Sunday
	'w': '%a',  // Mon - Sun
	'B': '%B',  // January - December
	'b': '%b',  // Jan - Dec
	'p': '%p'  // AM/PM
};

export const translate_date_format = (format: string): string => {
	return Object.keys(DATE_FORMAT_MAPPING).reduce((format, key) => {
		return format.replaceAll(key, DATE_FORMAT_MAPPING[key]);
	}, format);
};

const isLeapYear = (year: number): boolean => {
	return year % 400 === 0 || (year % 100 !== 0 && year % 4 === 0);
};

// month: 0 - 11
const tryLeapYear = (date: Dayjs, year: number, month: number, dayOfMonth: number): Dayjs => {
	if (isLeapYear(year) && month + 1 === 2 && dayOfMonth > 28) {
		return date.year(year).month(2).date(28);
	} else if ([1, 3, 5, 7, 8, 10, 12].includes(month + 1) && dayOfMonth > 31) {
		return date.year(year).month(month).date(31);
	} else if ([4, 6, 9, 11].includes(month + 1) && dayOfMonth > 30) {
		return date.year(year).month(month).date(30);
	} else {
		return date.year(year).month(month).date(dayOfMonth);
	}
};

const moveYear = (date: Dayjs, moveType: string, value: number): Dayjs => {
	if (moveType === '') {
		return tryLeapYear(date, value, date.month(), date.date());
	} else if (moveType === '+') {
		return tryLeapYear(date, date.year() + value, date.month(), date.date());
	} else if (moveType === '-') {
		return tryLeapYear(date, date.year() - value, date.month(), date.date());
	} else {
		throw new Error(`Date movement command[${moveType}] is not supported.`);
	}
};

const moveMonth = (date: Dayjs, moveType: string, value: number): Dayjs => {
	if (moveType === '') {
		return tryLeapYear(date, date.year(), value, date.date());
	} else if (moveType === '+') {
		const month = Math.floor(value / 12);
		if (date.month() + 1 + month > 12) {
			return tryLeapYear(date, date.year() + value % 12 + 1, date.month() + month - 12, date.day());
		} else {
			return tryLeapYear(date, date.year() + value % 12, date.month() + month, date.day());
		}
	} else if (moveType === '-') {
		const month = Math.floor(value / 12);
		if (date.month() + 1 - month < 1) {
			return tryLeapYear(date, date.year() - value % 12 - 1, date.month() - month + 12, date.day());
		} else {
			return tryLeapYear(date, date.year() - value % 12, date.month() - month, date.day());
		}
	} else {
		throw new Error(`Date movement command[${moveType}] is not supported.`);
	}
};

const moveDayOfMonth = (date: Dayjs, moveType: string, value: number): Dayjs => {
	if (value === 99) {
		if ([1, 3, 5, 7, 8, 10, 12].includes(date.month() + 1)) {
			return date.date(31);
		} else if ([4, 6, 9, 11].includes(date.month() + 1)) {
			return date.date(30);
		} else {
			return tryLeapYear(date, date.year(), date.month(), 29);
		}
	} else if (moveType === '') {
		return tryLeapYear(date, date.year(), date.month(), value);
	} else if (moveType === '+') {
		return date.add(value, 'day');
	} else if (moveType === '-') {
		return date.subtract(value, 'day');
	} else {
		throw new Error(`Date movement command[${moveType}] is not supported.`);
	}
};

const moveHour = (time: Dayjs, moveType: string, value: number): Dayjs => {
	if (moveType === '') {
		return time.hour(value);
	} else if (moveType === '+') {
		return time.add(value, 'hour');
	} else if (moveType === '-') {
		return time.subtract(value, 'hour');
	} else {
		throw new Error(`Date movement command[${moveType}] is not supported.`);
	}
};

const moveMinute = (time: Dayjs, moveType: string, value: number): Dayjs => {
	if (moveType === '') {
		return time.minute(value);
	} else if (moveType === '+') {
		return time.add(value, 'minute');
	} else if (moveType === '-') {
		return time.subtract(value, 'minute');
	} else {
		throw new Error(`Date movement command[${moveType}] is not supported.`);
	}
};

const moveSecond = (time: Dayjs, moveType: string, value: number): Dayjs => {
	if (moveType === '') {
		return time.second(value);
	} else if (moveType === '+') {
		return time.add(value, 'second');
	} else if (moveType === '-') {
		return time.subtract(value, 'second');
	} else {
		throw new Error(`Date movement command[${moveType}] is not supported.`);
	}
};

const moveDateOrTime = (dateOrTime: Dayjs, movement: Array<string>): Dayjs => {
	if (!isXaNumber(movement[2])) {
		throw new Error(`Cannot cast given value[${movement[2]}] to numeric, value of date move must be a number.`);
	}
	const value = Number(movement[2]);

	if (movement[0] === 'Y') {
		return moveYear(dateOrTime, movement[1], value);
	} else if (movement[0] === 'M') {
		return moveMonth(dateOrTime, movement[1], value);
	} else if (movement[0] === 'D') {
		return moveDayOfMonth(dateOrTime, movement[1], value);
	} else if (movement[0] === 'h') {
		return moveHour(dateOrTime, movement[1], value);
	} else if (movement[0] === 'm') {
		return moveMinute(dateOrTime, movement[1], value);
	} else if (movement[0] === 's') {
		return moveSecond(dateOrTime, movement[1], value);
	} else {
		throw new Error(`Date movement command[${movement.join('')}] is not supported.`);
	}
};

export const moveDate = (date: Dayjs, movements: Array<Array<string>>): Dayjs => {
	return movements.reduce((date, movement) => {
		return moveDateOrTime(date, movement);
	}, date);
};
