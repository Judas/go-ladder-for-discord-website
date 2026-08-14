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
            // Loose equality is all over the existing pages. Flagged, not fatal: fixing it belongs to the audit.
            eqeqeq: 'warn',
            // Every page opens its fetch effect with setStatus('pending'). It is the codebase's idiom, not a defect to
            // fix file by file: the useApi hook of iteration 3 removes it structurally. Warn until then.
            'react-hooks/set-state-in-effect': 'warn',
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
