/**
 * A house's crest, found from its slug.
 *
 * The naming convention is this repository's call — the server plan leaves it open and says only that the site
 * builds the filename from the slug. It mirrors the tier shields: `public/crests/{SLUG}.svg`, served at the root.
 *
 * ⚠ The four files currently in `public/crests/` are placeholders, drawn here for want of the real artwork. Replacing
 * them is a file swap, not a code change: keep the filenames.
 */
export default function Crest({slug, name, size = 96, className}) {
    return (
        <img
            className={className}
            width={size}
            height={size}
            src={`/crests/${slug}.svg`}
            alt={name ?? ''}
            loading={'lazy'} />
    );
}
