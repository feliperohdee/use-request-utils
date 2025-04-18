import { defineConfig } from 'vite';

const viteConfig = defineConfig(() => {
	return {
		plugins: [],
		test: {
			coverage: {
				exclude: ['**/*.spec.*', 'dist', 'vitest.config.mts', 'vitest.config.dom.mts', 'vitest.workspace.mts']
			},
			environment: 'jsdom',
			include: ['**/*.dom.spec.*'],
			setupFiles: ['./vitest.setup.dom.ts']
		}
	};
});

export default viteConfig;
