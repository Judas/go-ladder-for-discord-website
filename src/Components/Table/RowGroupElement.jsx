import React from "react";

export default function RowGroupElement({children, className}) {
    return <div role={'rowgroup'} className={className}>{children}</div>;
}
