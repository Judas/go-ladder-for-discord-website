import React from "react";

export default function TableElement({children, className}) {
    return <div role={'table'} className={`Table ${className}`}>{children}</div>;
}
