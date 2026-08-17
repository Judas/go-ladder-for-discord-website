/**
 * A house's crest, found from its slug.
 *
 * The naming convention is this repository's call — the server plan leaves it open and says only that the site
 * builds the filename from the slug. It mirrors the tier shields: `public/crests/{SLUG}.svg`, served at the root.
 *
 * `small` picks `{SLUG}_SMALL.svg`, a simplified drawing meant to hold up at table-row size where the full crest
 * turns to mud — and which is an order of magnitude lighter, which matters when a standings table repeats it once
 * per row.
 */
export default function Crest({slug, name, size = 96, small = false, className}) {
    return (
        <img
            className={className}
            width={size}
            height={size}
            src={`/crests/${slug}${small ? '_SMALL' : ''}.svg`}
            alt={name ?? ''}
            loading={'lazy'} />
    );
}
