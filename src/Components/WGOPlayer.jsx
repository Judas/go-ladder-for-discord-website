import React, { useEffect, useRef } from 'react';

export default function WGOPlayer({sgf, move = 0}) {
    const wgoref = useRef(null);

    const layout = [
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

    useEffect(() => {
        const elem = wgoref.current;
        new window.WGo.BasicPlayer(elem, {
            sgf: sgf,
            layout: layout,
            move: parseInt(move)
        });
    }, [sgf])

    return <div ref={wgoref} />
}
