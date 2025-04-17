import { defineWorkspace } from 'vitest/config';

const workspace = defineWorkspace([
	{
		extends: './vitest.config.mts'
	},
	{
		extends: './vitest.config.dom.mts'
	}
]);

export default workspace;
