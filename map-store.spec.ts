import { beforeEach, describe, expect, it } from 'vitest';

import MapStore from './map-store';

describe('/map-store', () => {
	let mapStore: MapStore;

	beforeEach(() => {
		mapStore = new MapStore({ a: 1, b: 2 }, 'private');
	});

	describe('constructor', () => {
		it('should initialize with default scope', () => {
			const store = new MapStore({ x: 10 });

			expect(store.get('x')).toEqual(10);
			expect(store.toJson('public')).toEqual({});
		});

		it('should initialize with specified scope', () => {
			const store = new MapStore({ x: 10 }, 'public');
			expect(store.get('x')).toEqual(10);
			expect(store.toJson('public')).toEqual({ x: 10 });
		});
	});

	describe('delete', () => {
		it('should delete a key', () => {
			mapStore.delete('a');
			expect(mapStore.get('a')).toBeNull();
		});

		it('should not affect other keys when deleting', () => {
			mapStore.delete('a');
			expect(mapStore.get('b')).toEqual(2);
		});
	});

	describe('get', () => {
		it('should return value for existing key', () => {
			expect(mapStore.get('a')).toEqual(1);
		});

		it('should return null for non-existing key', () => {
			expect(mapStore.get('nonexistent')).toBeNull();
		});

		it('should return default value for non-existing key', () => {
			expect(mapStore.get('nonexistent', 'default')).toEqual('default');
		});

		it('should return value regardless of scope', () => {
			mapStore.set('public', 'value', 'public');
			mapStore.set('private', 'value', 'private');
			expect(mapStore.get('public')).toEqual('value');
			expect(mapStore.get('private')).toEqual('value');
		});
	});

	describe('set', () => {
		it('should set value with default (private) scope', () => {
			mapStore.set('c', 3);
			expect(mapStore.get('c')).toEqual(3);
			expect(mapStore.toJson('public')).not.toHaveProperty('c');
		});

		it('should set value with specified scope', () => {
			mapStore.set('d', 4, 'public');
			expect(mapStore.get('d')).toEqual(4);
			expect(mapStore.toJson('public')).toHaveProperty('d', 4);
		});

		it('should override existing value and scope', () => {
			mapStore.set('a', 10, 'public');
			expect(mapStore.get('a')).toEqual(10);
			expect(mapStore.toJson('public')).toHaveProperty('a', 10);
		});

		it('should throw if value is not serializable', () => {
			try {
				mapStore.set('e', new Headers());

				throw new Error('Expected to throw');
			} catch (e) {
				expect(e.message).toEqual('MapStore: value must be serializable');
			}
		});
	});

	describe('size', () => {
		it('should return total size when no scope is specified', () => {
			expect(mapStore.size()).toEqual(2);
		});

		it('should return size of specified scope', () => {
			mapStore.set('c', 3, 'public');
			expect(mapStore.size('public')).toEqual(1);
		});
	});

	describe('toJson', () => {
		it('should return all values when all scope is specified', () => {
			mapStore.set('c', 3, 'public');
			expect(mapStore.toJson('all')).toEqual({ a: 1, b: 2, c: 3 });
		});

		it('should return only private values when no scope is specified', () => {
			mapStore.set('c', 3, 'public');
			expect(mapStore.toJson()).toEqual({ c: 3 });
		});

		it('should return only public values when public scope is specified', () => {
			mapStore.set('c', 3, 'public');
			expect(mapStore.toJson('public')).toEqual({ c: 3 });
		});

		it('should return only private values when private scope is specified', () => {
			mapStore.set('c', 3, 'public');
			expect(mapStore.toJson('private')).toEqual({ a: 1, b: 2 });
		});
	});

	describe('update', () => {
		it('should update existing value', () => {
			mapStore.update('a', v => {
				return (v as number) + 1;
			});
			expect(mapStore.get('a')).toEqual(2);
		});

		it('should create new value if key does not exist', () => {
			mapStore.update('c', v => {
				if (v === null) {
					return 3;
				} else {
					return v;
				}
			});
			expect(mapStore.get('c')).toEqual(3);
		});

		it('should maintain scope when updating', () => {
			mapStore.set('public', 1, 'public');
			mapStore.update('public', v => {
				return (v as number) + 1;
			});
			expect(mapStore.toJson('public')).toHaveProperty('public', 2);
		});

		it('should change scope when specified in update', () => {
			mapStore.update(
				'a',
				v => {
					return (v as number) + 1;
				},
				'public'
			);
			expect(mapStore.toJson('public')).toHaveProperty('a', 2);
		});
	});
});
