export default function RowElement({children, className}) {
    return <div role={'row'} className={`Row ${className}`}>{children}</div>;
}
