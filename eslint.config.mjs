import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

/**
 * Replaces the `react-app` config react-scripts used to run during every build. Same safety net, minus the Flow and
 * TypeScript plugins this project has no use for.
 */
export default [
    { ignores: ['build/**', 'public/wgo/**'] },

    // The app: browser globals, JSX, hooks rules.
    {
        files: ['src/**/*.{js,jsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            globals: globals.browser,
            parserOptions: {
                ecmaFeatures: { jsx: true },
                sourceType: 'module',
            },
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            ...js.configs.recommended.rules,
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
            // `x == null` stays allowed — it is the idiomatic way to catch null and undefined together, and the one
            // place where == says something === cannot. Everywhere else it is an error now: the loose comparisons
            // this codebase started with are gone, and the rule holds the line rather than counting them.
            eqeqeq: ['error', 'always', { null: 'ignore' }],
            // A warning while every page opened its fetch effect with setStatus('pending'). useApi removed that
            // idiom and DiscordAuth was the last holdout, so this can be an error now.
            'react-hooks/set-state-in-effect': 'error',
        },
    },

    // The two Express servers are CommonJS and run on Node.
    {
        files: ['server.js', 'server-proxy-only.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            globals: globals.node,
            sourceType: 'commonjs',
        },
        rules: js.configs.recommended.rules,
    },
];
