import globals from 'globals';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default [
	{
		ignores: ['coverage', 'dist', '.wrangler', '**/*.d.ts']
	},
	...tseslint.configs.recommended,
	{
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.es2020
			}
		},
		plugins: {
			'react-hooks': reactHooksPlugin
		},
		rules: {
			...reactHooksPlugin.configs.recommended.rules,
			'@typescript-eslint/ban-ts-comment': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-namespace': 'off',
			'prefer-const': 'off'
		}
	}
];
