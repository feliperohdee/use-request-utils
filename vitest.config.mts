import { defineConfig } from 'vite';

const viteConfig = defineConfig(() => {
	return {
		plugins: [],
		test: {
			coverage: {
				exclude: ['**/*.spec.*', 'dist', 'vitest.config.mts', 'vitest.config.dom.mts', 'vitest.workspace.mts']
			},
			include: ['**/*.spec.*'],
			exclude: ['**/*.dom.spec.*']
		}
	};
});

export default viteConfig;
