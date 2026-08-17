import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// fileURLToPath, not `new URL(...).pathname`: under Vite the module URL is not a plain file:// path.
const DIRECTORY = dirname(fileURLToPath(import.meta.url));

/**
 * The rule this enforces: **no real member data in this repository.**
 *
 * fg_dev, where every fixture here is captured from, is a snapshot of production and is not anonymised — it holds
 * the Discord ids, names and avatars of real community members. Seeding is done with synthetic players
 * (`9000000000000xxx`) so that a capture carries none of it.
 *
 * It was remembered for four iterations and then forgotten once, which is exactly why it is a test now rather than a
 * paragraph. If a capture ever brings real ids back, this fails before the commit does damage.
 */
const SYNTHETIC_PREFIX = '9000000000000';

/** Discord snowflakes are 17 to 19 digits. */
const SNOWFLAKE = /\b\d{17,19}\b/g;

describe('fixtures', () => {
    const files = readdirSync(DIRECTORY).filter(name => name.endsWith('.json'));

    it('there are fixtures to check', () => {
        expect(files.length).toBeGreaterThan(0);
    });

    it.each(files)('%s carries no real Discord id', file => {
        const content = readFileSync(join(DIRECTORY, file), 'utf8');
        const real = [...new Set(content.match(SNOWFLAKE) ?? [])].filter(id => !id.startsWith(SYNTHETIC_PREFIX));

        expect(real, `synthetic ids start with ${SYNTHETIC_PREFIX}; seed fg_dev with synthetic players`).toEqual([]);
    });

    /**
     * An avatar URL embeds the id it belongs to, so a real one is a real id by another route — which is how the
     * first slip got past a check that only looked at `discordId`.
     */
    it.each(files)('%s carries no real Discord avatar', file => {
        const content = readFileSync(join(DIRECTORY, file), 'utf8');
        const avatars = content.match(/cdn\.discordapp\.com\/avatars\/\d+/g) ?? [];
        const real = avatars.filter(url => !url.includes(`/avatars/${SYNTHETIC_PREFIX}`));

        expect(real, 'use the /embed/avatars/N.png placeholders instead').toEqual([]);
    });
});
