import globals from 'globals';
import pluginJs from '@eslint/js';

export default [
	{ files: ['**/*.js'], languageOptions: { sourceType: 'commonjs' } },
	{
		languageOptions: {
			globals: {
				...globals.node,
				...globals.jest,
			},
		},
	},
	{
		rules: {
			'no-console': 'off',
			'no-unused-vars': 'warn',
			'no-await-in-loop': 'warn',
			'no-empty': ['error', { allowEmptyCatch: true }],
			'no-prototype-builtins': 'off',
			'no-useless-escape': 'off',
		},
	},
	pluginJs.configs.recommended,
];
