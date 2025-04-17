import filter from 'lodash/filter';
import forEach from 'lodash/forEach';
import fromPairs from 'lodash/fromPairs';
import isArray from 'lodash/isArray';
import isBoolean from 'lodash/isBoolean';
import isNull from 'lodash/isNull';
import isNumber from 'lodash/isNumber';
import isPlainObject from 'lodash/isPlainObject';
import isString from 'lodash/isString';
import isUndefined from 'lodash/isUndefined';
import map from 'lodash/map';
import toPairs from 'lodash/toPairs';

namespace MapStore {
	export type Scope = 'public' | 'private';
	export type ScopedValue = { scope: Scope; value: any };
}

class MapStore {
	protected data = new Map<string, MapStore.ScopedValue>();
	private defaultScope: MapStore.Scope;

	constructor(init?: Record<string, any>, defaultScope: MapStore.Scope = 'private') {
		this.defaultScope = defaultScope;

		if (init) {
			forEach(init, (value, key) => {
				this.data.set(key, { scope: this.defaultScope, value });
			});
		}
	}

	delete(key: string): void {
		this.data.delete(key);
	}

	get<T>(key: string): T | null;
	get<T>(key: string, defaultValue: T): T;
	get<T>(key: string, defaultValue?: T): T | null {
		const v = this.data.get(key);
		if (isUndefined(v)) {
			return defaultValue ?? null;
		}

		return v.value;
	}

	private isSerializable(value: any): boolean {
		return isString(value) || isNumber(value) || isBoolean(value) || isNull(value) || isPlainObject(value) || isArray(value);
	}

	set(key: string, value: any, scope?: MapStore.Scope): void {
		if (!this.isSerializable(value)) {
			throw new Error('MapStore: value must be serializable');
		}

		this.data.set(key, { scope: scope || this.defaultScope, value });
	}

	size(scope?: MapStore.Scope): number {
		if (scope) {
			let size = 0;

			this.data.forEach(v => {
				if (v.scope === scope) {
					size++;
				}
			});

			return size;
		}

		return this.data.size;
	}

	toJson(scope = 'public') {
		const pairs = toPairs(this.data);
		const filteredPairs = filter(pairs, ([, v]) => {
			return scope === 'all' || v.scope === scope;
		});

		const mappedPairs = map(filteredPairs, ([k, v]) => {
			return [k, v.value];
		});

		return fromPairs(mappedPairs);
	}

	update<T = any>(key: string, fn: (value: T | null) => T, scope?: MapStore.Scope): void {
		const currentValue = this.data.get(key);
		let v: T | null = null;

		if (currentValue) {
			v = currentValue.value;
		}

		let newScope: MapStore.Scope;

		if (scope) {
			newScope = scope;
		} else if (currentValue) {
			newScope = currentValue.scope;
		} else {
			newScope = this.defaultScope;
		}

		this.set(key, fn(v), newScope);
	}
}

export default MapStore;
