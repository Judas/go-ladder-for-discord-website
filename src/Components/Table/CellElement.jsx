import React from "react";

export default function CellElement({children, colIndex, className}) {
    return <div role={'gridcell'} aria-colindex={colIndex} className={className}>{children}</div>;
}
