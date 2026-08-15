import './Avatar.css';

/**
 * A Discord avatar.
 *
 * ⚠ `src` arrives **nullable** from the API — `discordAvatar` is nullable on ApiPlayer, ApiHouseMember,
 * ApiLeagueMember and every participant shape. The `src = ''` default only fires on `undefined`, so a null used to
 * reach `src.includes(...)` and take the whole page down: there is no error boundary anywhere in this app.
 *
 * With no source there is nothing to show, so nothing is rendered but the space the image would have taken. An
 * `<img src="">` would ask the browser to fetch the current page and draw it as a broken image.
 */
export default function Avatar({size = 36, src, alt = '', className, hidden = undefined}) {
    const source = src ?? '';

    if (source === '') {
        return <span className={`Avatar__Empty ${className ?? ''}`}
                     style={{width: size + 'px', height: size + 'px'}}
                     aria-hidden={true} />;
    }

    if (source.includes('embed') || source.includes('.gif')) {
        return <img className={className} width={size} height={size} src={source} alt={alt} loading={'lazy'} aria-hidden={hidden}/>;
    }

    return (
        <picture style={{width: size + 'px', height: size + 'px'}}>
            <source srcSet={source.replace('.gif', `.webp?size=${size}`)} type="image/webp"/>
            <img className={className}
                 width={size}
                 height={size}
                 src={source}
                 alt={alt}
                 loading={'lazy'}
                 aria-hidden={hidden}/>
        </picture>
    );
}
