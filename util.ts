import _ from 'lodash';

const parseDate = (input: Date | { days?: number; hours?: number; minutes?: number }): Date => {
	const now = new Date();

	if (_.isDate(input)) {
		return input;
	}

	if (_.isPlainObject(input)) {
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

export default {
	parseDate
};
