import crypto from './crypto';

const timingSafeEqual = async (
	a: string | object | boolean,
	b: string | object | boolean,
	hashFunction?: (a: any) => Promise<string | null>
): Promise<boolean> => {
	if (!hashFunction) {
		hashFunction = crypto.sha256;
	}

	const [sa, sb] = await Promise.all([hashFunction(a), hashFunction(b)]);

	if (!sa || !sb) {
		return false;
	}

	return sa === sb && a === b;
};

export default {
	timingSafeEqual
};
