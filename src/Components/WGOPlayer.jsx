import { useEffect, useRef } from 'react';

/**
 * The two layouts WGo picks between, narrow first.
 *
 * Built inside the effect rather than in the component body, which is what the array used to be: a fresh array on
 * every render is a fresh dependency on every render, so listing it would have rebuilt the whole board each time —
 * and leaving it out was a lie the linter was right to flag. It also reads `window.WGo`, which only exists once the
 * vendored scripts in index.html have run, so it cannot be a module-level constant either.
 */
function layouts() {
    return [
        {
            // Mobile layout
            conditions: {
                maxWidth: 980,
            },
            layout: {
                top: ["InfoBox"],
                bottom: ["Control", "CommentBox"]
            },
            className: "wgo-xsmall",
        },
        {
            // Desktop layout
            layout: window.WGo.BasicPlayer.layouts["right_top"],
            className: "wgo-twocols wgo-large",
        }
    ];
}

export default function WGOPlayer({sgf, move = 0}) {
    const wgoref = useRef(null);

    useEffect(() => {
        const elem = wgoref.current;
        new window.WGo.BasicPlayer(elem, {
            sgf: sgf,
            layout: layouts(),
            move: parseInt(move)
        });

        // WGo appends its own DOM to the container and has no teardown of its own, so a re-run has to clear it —
        // otherwise a second board is built beside the first instead of replacing it.
        return () => { elem.innerHTML = ''; };
    }, [sgf, move])

    return <div ref={wgoref} />
}
