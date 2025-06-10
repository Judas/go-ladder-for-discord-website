import React from "react";

export default function Avatar({size = 36, src = '', alt = '', className, hidden = undefined}) {
    if ((src.includes('embed') || src.includes('.gif'))) {
        return <img className={className} width={size} height={size} src={src} alt={alt} loading={'lazy'} aria-hidden={hidden}/>;
    }

    return (
        <picture style={{width: size + 'px', height: size + 'px'}}>
            <source srcSet={String(src).replace('.gif', `.webp?size=${size}`)} type="image/webp"/>
            <img className={className}
                 width={size}
                 height={size}
                 src={src}
                 alt={alt}
                 loading={'lazy'}
                 aria-hidden={hidden}/>
        </picture>
    );
}
