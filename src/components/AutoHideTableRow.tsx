import { TableCell, TableRow, TableRowOwnProps } from "@mui/material";

export function AutoHideTableRow({ title, value, ...props }: { title: string, value?: any } & TableRowOwnProps) {
    return (
        <TableRow {...props} sx={value ? {} : { display: "none" }}>
            <TableCell>{title}</TableCell>
            <TableCell>{value}</TableCell>
        </TableRow>
    );
}
