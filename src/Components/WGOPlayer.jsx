import React, { useEffect, useRef } from 'react';

export default function WGOPlayer({sgf, move = 0}) {
    const wgoref = useRef(null);

    useEffect(() => {
        const elem = wgoref.current;
        new window.WGo.BasicPlayer(elem, {
            sgf: sgf,
            move: parseInt(move)
        });
    }, [sgf])

    return <div ref={wgoref} />
}
