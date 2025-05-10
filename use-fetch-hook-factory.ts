import get from 'lodash/get';
import isArray from 'lodash/isArray';
import isBoolean from 'lodash/isBoolean';
import isFunction from 'lodash/isFunction';
import isNumber from 'lodash/isNumber';
import isObject from 'lodash/isObject';
import isUndefined from 'lodash/isUndefined';

import { useCallback, useEffect, useRef, useState } from 'react';
import HttpError from 'use-http-error';
import useDistinct from 'use-good-hooks/use-distinct';

type ShouldFetch =
	| boolean
	| ((args: { initial: boolean; loaded: boolean; loadedTimes: number; loading: boolean; worker: boolean }) => boolean);

type UseFetchResponse<Mapped> = UseFetchState<Mapped> & {
	abort: () => void;
	fetch: (...args: any[]) => Promise<Mapped | null>;
	reset: () => void;
	setData: (update: Mapped | ((data: Mapped) => Mapped)) => void;
	stopInterval: () => void;
	startInterval: (interval?: number) => void;
};

type UseFetchState<Mapped> = {
	data: Mapped | null;
	error: HttpError | null;
	fetchTimes: number;
	lastFetchDuration: number;
	loaded: boolean;
	loadedTimes: number;
	loading: boolean;
	resetted: boolean;
	runningInterval: number;
};

type UseFetchOptions<T, Mapped> = {
	deps?: any[];
	depsDebounce?: number;
	ignoreAbort?: boolean;
	mapper?: (data: T) => Mapped | null;
	shouldFetch?: ShouldFetch;
	triggerDeps?: any[];
	triggerDepsDebounce?: number;
	triggerInterval?: number;
};

const validateOptions = <T, Mapped>(options: UseFetchOptions<T, Mapped>): void => {
	if (!isObject(options)) {
		throw new Error('Options must be a valid object');
	}

	if ('deps' in options && !isUndefined(options.deps)) {
		if (!isArray(options.deps)) {
			throw new Error('The "deps" property must be an array');
		}
	}

	if ('depsDebounce' in options && !isUndefined(options.depsDebounce)) {
		if (!isNumber(options.depsDebounce)) {
			throw new Error('The "depsDebounce" property must be a number');
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

const map = async <T, Mapped>(data: T, mapper?: (data: T) => Mapped): Promise<Mapped> => {
	return isFunction(mapper) ? mapper(data) : (data as unknown as Mapped);
};

const getUniqueKey = (promise: Promise<any> | null): string => {
	return get(promise, 'unique-key', '');
};

const fetchHookFactory = <ClientType>(clientFactory: () => ClientType) => {
	const useFetchHook = <T, Mapped = T>(
		fn: (client: ClientType, ...args: any[]) => Promise<T> | null,
		options: UseFetchOptions<T, Mapped> = {}
	): UseFetchResponse<Mapped> => {
		try {
			validateOptions<T, Mapped>(options);
		} catch (err) {
			throw new Error('failed to start due to invalid options: ' + (err as Error).message);
		}

		const currentPromiseRef = useRef<Promise<T> | null>(null);
		const fnRef = useRef(fn);
		const initRef = useRef(false);
		const intervalRef = useRef<NodeJS.Timeout | null>(null);
		const mapperRef = useRef(options.mapper);
		const shouldFetchRef = useRef<() => boolean>(() => false);
		const startTimeRef = useRef<number>(0);

		const deps = useDistinct(options.deps || [], {
			debounce: Math.max(50, options.depsDebounce ?? 0),
			deep: true
		});

		const triggerDeps = useDistinct(options.triggerDeps || [], {
			debounce: Math.max(50, options.triggerDepsDebounce ?? 0),
			deep: true
		});

		const [state, setState] = useState<UseFetchState<Mapped>>({
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

		const client = useRef<ClientType | null>(null);
		if (client.current === null) {
			client.current = clientFactory();
		}

		const fetch = useCallback(
			async (...args: any[]): Promise<Mapped | null> => {
				if (!shouldFetchRef.current()) {
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
					const mapper = mapperRef.current;
					const promise = fnRef.current(client.current!, ...args);

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

					const data = await map(await promise, mapper);
					const duration = Math.max(1, Date.now() - startTimeRef.current);

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
			},
			[options.ignoreAbort]
		);

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

		const setData = useCallback((update: Mapped | ((data: Mapped) => Mapped)) => {
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
					intervalRef.current = setInterval(fetch, interval);
				}
			},
			[fetch, options.triggerInterval]
		);

		// update should fetch ref
		useEffect(() => {
			const shouldFetch = options.shouldFetch;

			shouldFetchRef.current = () => {
				if (isBoolean(shouldFetch)) {
					return shouldFetch;
				} else if (isFunction(shouldFetch)) {
					return shouldFetch({
						initial: !initRef.current,
						loaded: state.loaded,
						loadedTimes: state.loadedTimes,
						loading: state.loading,
						worker: false
					});
				}

				return true;
			};
		}, [deps.value, options.shouldFetch, state.loaded, state.loadedTimes, state.loading, triggerDeps.value]);

		// update fn if deps changed
		useEffect(() => {
			if (!deps.distinct) {
				return;
			}

			fnRef.current = fn;
		}, [fn, deps.distinct]);

		// update mapper if deps changed
		useEffect(() => {
			if (!deps.distinct || !options.mapper) {
				return;
			}

			mapperRef.current = options.mapper;
		}, [options.mapper, deps.distinct]);

		const declaredDeps = !isUndefined(options.deps);
		const declaredTriggerDeps = !isUndefined(options.triggerDeps);

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

				fetch();
			} else if (declaredDeps) {
				if (!deps.distinct) {
					return;
				}

				fetch();
			}
		}, [deps, fetch, declaredDeps, declaredTriggerDeps, triggerDeps]);

		// initial load
		useEffect(() => {
			if (initRef.current) {
				return;
			}

			if (state.loading || state.resetted) {
				return;
			}

			fetch();
			initRef.current = true;
		}, [fetch, state]);

		// interval fetch
		useEffect(() => {
			const triggerInterval = options.triggerInterval ?? 0;

			stopInterval();

			if (triggerInterval >= 500) {
				startInterval(triggerInterval);
			}

			return stopInterval;
		}, [options.triggerInterval, startInterval, stopInterval]);

		return {
			...state,
			abort,
			fetch,
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
