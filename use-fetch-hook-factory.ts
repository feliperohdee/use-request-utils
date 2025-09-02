import get from 'lodash/get';
import isArray from 'lodash/isArray';
import isBoolean from 'lodash/isBoolean';
import isFunction from 'lodash/isFunction';
import isNil from 'lodash/isNil';
import isNumber from 'lodash/isNumber';
import isObject from 'lodash/isObject';
import isUndefined from 'lodash/isUndefined';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HttpError from 'use-http-error';
import useDistinct from 'use-good-hooks/use-distinct';

const isPromise = <T>(value: any): value is Promise<T> => {
	return value && typeof value.then === 'function';
};

type EffectFn<Client, MappedData> = ({
	client,
	data,
	error,
	prevData
}: {
	client: Client;
	data: MappedData | null;
	error: HttpError | null;
	prevData: MappedData | null;
}) => void | Promise<void>;

type FetchArgs<FetchFn> = FetchFn extends (client: any, ...args: infer FetchFnArgs) => any ? FetchFnArgs : never;
type MapperFn<Client, Data, MappedData> = ({
	client,
	data,
	prevData
}: {
	client: Client;
	data: Data;
	prevData: Data | null;
}) => MappedData | null | Promise<MappedData | null>;

type ShouldFetch = boolean | ((args: { initial: boolean; loaded: boolean; loadedTimes: number; loading: boolean }) => boolean);
type UseFetchResponse<MappedData, FetchFn extends (...args: any[]) => any> = UseFetchState<MappedData> & {
	abort: () => void;
	fetch: (...args: FetchArgs<FetchFn>) => Promise<MappedData | null>;
	reset: () => void;
	setData: (update: MappedData | null | ((data: MappedData) => MappedData | null)) => void;
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
	effect?: EffectFn<Client, MappedData>;
	ignoreAbort?: boolean;
	mapper?: MapperFn<Client, Data, MappedData>;
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

const effect = async <Client, MappedData>({
	client,
	data,
	effect,
	error,
	prevData
}: {
	client: Client;
	data: MappedData | null;
	effect?: EffectFn<Client, MappedData> | null;
	error: HttpError | null;
	prevData: MappedData | null;
}): Promise<void> => {
	if (isFunction(effect)) {
		await effect({ client, data, error, prevData });
	}
};

const map = async <Client, Data, MappedData>({
	client,
	data,
	mapper,
	prevData
}: {
	client: Client;
	data: Data;
	mapper?: MapperFn<Client, Data, MappedData> | null;
	prevData: Data | null;
}): Promise<MappedData | null> => {
	return isFunction(mapper) ? mapper({ client, data, prevData }) : (data as unknown as MappedData | null);
};

const getUniqueKey = (promise: Promise<any> | null): string => {
	return get(promise, 'unique-key', '');
};

const fetchHookFactory = <Client>(clientFactory: () => Client) => {
	const useFetchHook = <
		Data,
		MappedData = Data,
		FetchFn extends (client: Client, ...args: any[]) => Data | Promise<Data> | null = (
			client: Client,
			...args: any[]
		) => Data | Promise<Data> | null
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
		const effectRef = useRef<EffectFn<Client, MappedData> | null>(options.effect ?? null);
		const fetchFnRef = useRef<FetchFn>(fetchFn);
		const initRef = useRef(false);
		const intervalRef = useRef<NodeJS.Timeout | null>(null);
		const mapperRef = useRef<MapperFn<Client, Data, MappedData> | null>(options.mapper ?? null);
		const prevDataRef = useRef<Data | null>(null);
		const prevMappedDataRef = useRef<MappedData | null>(null);
		const shouldFetchRef = useRef<ShouldFetch>(options.shouldFetch ?? true);
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
				if (isBoolean(shouldFetchRef.current)) {
					return shouldFetchRef.current;
				} else if (isFunction(shouldFetchRef.current)) {
					return shouldFetchRef.current({
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
				const promise = (() => {
					const r = fetchFnRef.current(client.current, ...args);

					if (isPromise(r)) {
						return r;
					}

					return Promise.resolve(r as Data);
				})();

				if (isNil(promise)) {
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

				const data = await promise;

				if (isUndefined(data)) {
					return null;
				}

				const mappedData = await map({
					client: client.current,
					data,
					mapper: mapperRef.current,
					prevData: prevDataRef.current
				});

				const duration = Math.max(1, Date.now() - startTimeRef.current);

				await effect({
					client: client.current,
					data: mappedData,
					effect: effectRef.current,
					error: null,
					prevData: prevMappedDataRef.current
				});

				currentPromiseRef.current = null;
				setState(state => {
					return {
						...state,
						data: mappedData,
						error: null,
						lastFetchDuration: duration,
						loaded: true,
						loadedTimes: state.loadedTimes + 1,
						loading: false
					};
				});

				prevDataRef.current = data;
				prevMappedDataRef.current = mappedData;

				return mappedData;
			} catch (err) {
				const duration = Math.max(1, Date.now() - startTimeRef.current);
				const httpError = HttpError.wrap(err as Error);

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

					await effect({
						client: client.current,
						data: null,
						effect: effectRef.current,
						error: httpError,
						prevData: prevMappedDataRef.current
					});

					setState(state => {
						return {
							...state,
							error: httpError,
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

		const setData = useCallback((update: MappedData | null | ((data: MappedData) => MappedData | null)) => {
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

		// update effect ref
		useEffect(() => {
			if (!isUndefined(options.effect)) {
				effectRef.current = options.effect;
			}
		}, [options.effect]);

		// update mapper ref
		useEffect(() => {
			if (!isUndefined(options.mapper)) {
				mapperRef.current = options.mapper;
			}
		}, [options.mapper]);

		// update shouldFetch ref
		useEffect(() => {
			if (!isUndefined(options.shouldFetch)) {
				shouldFetchRef.current = options.shouldFetch;
			}
		}, [options.shouldFetch]);

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
