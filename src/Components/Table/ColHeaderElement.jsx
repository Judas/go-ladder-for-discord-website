import React from "react";

export default function ColHeaderElement({children, className}) {
    return <div role={'columnheader'} className={className}>{children}</div>;
}
