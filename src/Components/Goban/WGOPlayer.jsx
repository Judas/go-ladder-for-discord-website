import React, { useEffect, useRef } from 'react';

export default function WGOPlayer({sgfUrl, move = 0}) {
    const wgoref = useRef(null);

    useEffect(() => {
        const elem = wgoref.current;
        new window.WGo.BasicPlayer(elem, {
            sgfFile: sgfUrl,
            move: parseInt(move)
        });
    }, [sgfUrl])

    return <div ref={wgoref} />
}
