import get from 'lodash/get';
import isArray from 'lodash/isArray';
import isBoolean from 'lodash/isBoolean';
import isFunction from 'lodash/isFunction';
import isNumber from 'lodash/isNumber';
import isObject from 'lodash/isObject';
import isUndefined from 'lodash/isUndefined';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HttpError from 'use-http-error';
import useDistinct from 'use-good-hooks/use-distinct';

type Effect<Client, MappedData> = ({ client, data }: { client: Client; data: MappedData }) => void | Promise<void>;
type FetchArgs<FetchFn> = FetchFn extends (client: any, ...args: infer FetchFnArgs) => any ? FetchFnArgs : never;
type Mapper<Client, Data, MappedData> = ({ client, data }: { client: Client; data: Data }) => MappedData | Promise<MappedData>;

type ShouldFetch = boolean | ((args: { initial: boolean; loaded: boolean; loadedTimes: number; loading: boolean }) => boolean);

type UseFetchResponse<MappedData, FetchFn extends (...args: any[]) => any> = UseFetchState<MappedData> & {
	abort: () => void;
	fetch: (...args: FetchArgs<FetchFn>) => Promise<MappedData | null>;
	reset: () => void;
	setData: (update: MappedData | ((data: MappedData) => MappedData)) => void;
	stopInterval: () => void;
	startInterval: (interval?: number) => void;
};

type UseFetchState<MappedData> = {
	data: MappedData | null;
	error: HttpError | null;
	fetchTimes: number;
	lastFetchDuration: number;
	loaded: boolean;
	loadedTimes: number;
	loading: boolean;
	resetted: boolean;
	runningInterval: number;
};

type UseFetchOptions<Client, Data, MappedData> = {
	effect?: Effect<Client, MappedData>;
	ignoreAbort?: boolean;
	mapper?: Mapper<Client, Data, MappedData>;
	shouldFetch?: ShouldFetch;
	triggerDeps?: any[];
	triggerDepsDebounce?: number;
	triggerInterval?: number;
};

const STABLE_ARRAY: any[] = [];

const validateOptions = <Client, Data, MappedData>(options: UseFetchOptions<Client, Data, MappedData>): void => {
	if (!isObject(options)) {
		throw new Error('Options must be a valid object');
	}

	if ('effect' in options && !isUndefined(options.effect)) {
		if (!isFunction(options.effect)) {
			throw new Error('The "effect" property must be a function');
		}
	}

	if ('mapper' in options && !isUndefined(options.mapper)) {
		if (!isFunction(options.mapper)) {
			throw new Error('The "mapper" property must be a function');
		}
	}

	if ('shouldFetch' in options && !isUndefined(options.shouldFetch)) {
		if (!isBoolean(options.shouldFetch) && !isFunction(options.shouldFetch)) {
			throw new Error('The "shouldFetch" property must be a boolean or a function');
		}
	}

	if ('triggerDeps' in options && !isUndefined(options.triggerDeps)) {
		if (!isArray(options.triggerDeps)) {
			throw new Error('The "triggerDeps" property must be an array');
		}
	}

	if ('triggerDepsDebounce' in options && !isUndefined(options.triggerDepsDebounce)) {
		if (!isNumber(options.triggerDepsDebounce)) {
			throw new Error('The "triggerDepsDebounce" property must be a number');
		}
	}

	if ('triggerInterval' in options && !isUndefined(options.triggerInterval)) {
		if (!isNumber(options.triggerInterval) || options.triggerInterval < 500) {
			throw new Error('The "triggerInterval" property must be a number greater than 500');
		}
	}
};

const effect = async <Client, MappedData>(client: Client, data: MappedData, effect?: Effect<Client, MappedData>): Promise<void> => {
	if (isFunction(effect)) {
		await effect({ client, data });
	}
};

const map = async <Client, Data, MappedData>(
	client: Client,
	data: Data,
	mapper?: Mapper<Client, Data, MappedData>
): Promise<MappedData> => {
	return isFunction(mapper) ? mapper({ client, data }) : (data as unknown as MappedData);
};

const getUniqueKey = (promise: Promise<any> | null): string => {
	return get(promise, 'unique-key', '');
};

const fetchHookFactory = <Client>(clientFactory: () => Client) => {
	const useFetchHook = <
		Data,
		MappedData = Data,
		FetchFn extends (client: Client, ...args: any[]) => Promise<Data> | null = (client: Client, ...args: any[]) => Promise<Data> | null
	>(
		fetchFn: FetchFn,
		options: UseFetchOptions<Client, Data, MappedData> = {}
	): UseFetchResponse<MappedData, FetchFn> => {
		try {
			validateOptions<Client, Data, MappedData>(options);
		} catch (err) {
			throw new Error('failed to start due to invalid options: ' + (err as Error).message);
		}

		const currentPromiseRef = useRef<Promise<Data> | null>(null);
		const fetchFnRef = useRef<FetchFn>(fetchFn);
		const initRef = useRef(false);
		const intervalRef = useRef<NodeJS.Timeout | null>(null);
		const startTimeRef = useRef<number>(0);

		const triggerDeps = useDistinct(options.triggerDeps ?? STABLE_ARRAY, {
			debounce: Math.max(50, options.triggerDepsDebounce ?? 0),
			deep: true
		});

		const [state, setState] = useState<UseFetchState<MappedData>>({
			data: null,
			error: null,
			fetchTimes: 0,
			lastFetchDuration: 0,
			loaded: false,
			loadedTimes: 0,
			loading: false,
			resetted: false,
			runningInterval: 0
		});

		const client = useRef<Client>(null!);
		if (client.current === null) {
			client.current = clientFactory();
		}

		const fetchRef = useRef(async (...args: any[]): Promise<MappedData | null> => {
			const shouldFetch = () => {
				if (isBoolean(options.shouldFetch)) {
					return options.shouldFetch;
				} else if (isFunction(options.shouldFetch)) {
					return options.shouldFetch({
						initial: !initRef.current,
						loaded: state.loaded,
						loadedTimes: state.loadedTimes,
						loading: state.loading
					});
				}

				return true;
			};

			if (!shouldFetch()) {
				return null;
			}

			startTimeRef.current = Date.now();

			setState(state => {
				return {
					...state,
					fetchTimes: state.fetchTimes + 1,
					loading: true,
					resetted: false
				};
			});

			try {
				const promise = fetchFnRef.current(client.current, ...args);

				if (!promise) {
					setState(state => {
						return {
							...state,
							loading: false
						};
					});

					return null;
				}

				const currentPromise = currentPromiseRef.current || null;
				const currentPromiseUniqueKey = getUniqueKey(currentPromise);
				const promiseUniqueKey = getUniqueKey(promise);

				if (!promiseUniqueKey || promiseUniqueKey !== currentPromiseUniqueKey) {
					if (
						!options.ignoreAbort &&
						currentPromiseRef.current &&
						'abort' in currentPromiseRef.current &&
						isFunction(currentPromiseRef.current.abort)
					) {
						currentPromiseRef.current.abort();
					}

					currentPromiseRef.current = promise;
				}

				const data = await map(client.current, await promise, options.mapper);
				const duration = Math.max(1, Date.now() - startTimeRef.current);

				await effect(client.current, data, options.effect);

				currentPromiseRef.current = null;
				setState(state => {
					return {
						...state,
						data,
						error: null,
						lastFetchDuration: duration,
						loaded: true,
						loadedTimes: state.loadedTimes + 1,
						loading: false
					};
				});

				return data;
			} catch (err) {
				const duration = Math.max(1, Date.now() - startTimeRef.current);

				if ((err instanceof DOMException && err.name === 'AbortError') || (err instanceof HttpError && err.status === 499)) {
					setState(state => {
						return {
							...state,
							lastFetchDuration: duration,
							loading: false
						};
					});
				} else {
					currentPromiseRef.current = null;
					setState(state => {
						return {
							...state,
							error: HttpError.wrap(err as Error),
							lastFetchDuration: duration,
							loading: false,
							resetted: false
						};
					});
				}

				return null;
			}
		});

		const abort = useCallback(() => {
			const currentPromise = currentPromiseRef.current || null;

			if (currentPromise && 'abort' in currentPromise && isFunction(currentPromise.abort)) {
				currentPromise.abort();
			}

			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		}, []);

		const reset = useCallback(() => {
			abort();
			setState({
				data: null,
				error: null,
				fetchTimes: 0,
				lastFetchDuration: 0,
				loaded: false,
				loadedTimes: 0,
				loading: false,
				resetted: true,
				runningInterval: 0
			});
		}, [abort]);

		const setData = useCallback((update: MappedData | ((data: MappedData) => MappedData)) => {
			setState(state => {
				return {
					...state,
					data: isFunction(update) ? update(state.data!) : update
				};
			});
		}, []);

		const stopInterval = useCallback(() => {
			if (intervalRef.current) {
				setState(state => {
					return {
						...state,
						runningInterval: 0
					};
				});

				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		}, []);

		const startInterval = useCallback(
			(interval?: number) => {
				interval = interval ?? options.triggerInterval ?? 0;

				if (interval >= 500) {
					setState(state => {
						return {
							...state,
							runningInterval: interval
						};
					});

					clearInterval(intervalRef.current!);
					intervalRef.current = setInterval(fetchRef.current, interval);
				}
			},
			[options.triggerInterval]
		);

		const declaredTriggerDeps = !isUndefined(options.triggerDeps);

		// update fetch fn ref
		useEffect(() => {
			fetchFnRef.current = fetchFn;
		}, [fetchFn]);

		// trigger based on triggerDeps
		useEffect(() => {
			// just trigger fetch after initial fetch
			if (!initRef.current) {
				return;
			}

			// prioritize triggerDeps if exists
			if (declaredTriggerDeps) {
				if (!triggerDeps.distinct) {
					return;
				}

				fetchRef.current();
			}
		}, [declaredTriggerDeps, triggerDeps]);

		// initial load
		useEffect(() => {
			if (initRef.current) {
				return;
			}

			if (state.loading || state.resetted) {
				return;
			}

			fetchRef.current();
			initRef.current = true;
		}, [state.loading, state.resetted]);

		// interval fetch
		useEffect(() => {
			const triggerInterval = options.triggerInterval ?? 0;

			stopInterval();

			if (triggerInterval >= 500) {
				startInterval(triggerInterval);
			}

			return stopInterval;
		}, [options.triggerInterval, startInterval, stopInterval]);

		// create a stable fetch function to avoid re-creating the fetch function on every render
		const stableFetch = useMemo(() => {
			return fetchRef.current;
		}, []);

		return {
			...state,
			abort,
			fetch: stableFetch,
			reset,
			setData,
			stopInterval,
			startInterval
		};
	};

	return useFetchHook;
};

export type { UseFetchResponse, UseFetchOptions };
export default fetchHookFactory;
