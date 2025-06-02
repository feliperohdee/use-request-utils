import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// Global test configuration that applies to all projects
		coverage: { exclude: ['**/*.spec.*', 'dist', 'vitest.config.mts', 'vitest.workspace.mts'] },
		projects: [
			{
				test: {
					exclude: ['**/*.dom.spec.*', 'node_modules'],
					include: ['**/*.spec.*'],
					name: 'unit'
				}
			},
			{
				test: {
					environment: 'jsdom',
					include: ['**/*.dom.spec.*'],
					name: 'dom',
					setupFiles: ['./vitest.setup.dom.ts']
				}
			}
		]
	}
});
