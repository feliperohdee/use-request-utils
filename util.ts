import isDate from 'lodash/isDate';
import isPlainObject from 'lodash/isPlainObject';
import map from 'lodash/map';
import trim from 'lodash/trim';

const parseDate = (input: Date | { days?: number; hours?: number; minutes?: number }): Date => {
	const now = new Date();

	if (isDate(input)) {
		return input;
	}

	if (isPlainObject(input)) {
		let ms = 0;

		if (input.days) {
			ms += input.days * 24 * 60 * 60 * 1000;
		}

		if (input.hours) {
			ms += input.hours * 60 * 60 * 1000;
		}

		if (input.minutes) {
			ms += input.minutes * 60 * 1000;
		}

		return new Date(now.getTime() + ms);
	}

	return now;
};

const pathJoin = (...args: string[]) => {
	return map(args, token => {
		return trim(token, '/');
	})
		.filter(Boolean)
		.join('/');
};

export default {
	parseDate,
	pathJoin
};
