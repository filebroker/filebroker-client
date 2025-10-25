import {
    FormLabelProps,
    IconButton, ListItemIcon, Menu, MenuItem,
    Paper,
    Table,
    TableBody,
    TableCell, TableCellProps,
    TableContainer,
    TableHead,
    TablePagination,
    TableRowProps, TableSortLabel
} from "@mui/material";
import TableRow from '@mui/material/TableRow';
import React, {useCallback, useEffect, useImperativeHandle, useRef, useState} from "react";
import {enqueueSnackbar} from "notistack";
import {solid} from "@fortawesome/fontawesome-svg-core/import.macro";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import MoreVertIcon from '@mui/icons-material/MoreVert';

type RowElement = React.ReactElement<TableRowProps, typeof TableRow>;
export type Direction = 'asc' | 'desc';

export interface PaginatedTableData<T> {
    data: T[];
    totalCount: number;
}

export type PaginatedTableColumn<T> = {
    id: string;
    name: string;
    renderCellValue: (data: T) => React.ReactNode;
    allowSorting?: boolean;
}

export type PaginatedTableRowAction<T> = {
    label: string;
    exec: (data: T) => void;
    disableForRow?: (data: T) => boolean;
    icon?: React.ReactNode;
    color?: FormLabelProps["color"],
}

export type PaginatedTableProps<T> = {
    columns: PaginatedTableColumn<T>[],
    loadDataFn: (page: number, rowsPerPage: number, orderBy: string | undefined, orderDirection: Direction | undefined) => Promise<PaginatedTableData<T>>,
    rowActions?: PaginatedTableRowAction<T>[],
    rowsPerPageOptions?: number[],
    dataRowPropsFn?: (data: T) => Partial<TableRowProps>,
};


export type PaginatedTableHandle = {
    reload: () => void;
    setPage: (page: number) => void;
    getRowsPerPage: () => number;
};

export const PaginatedTable = React.forwardRef(PaginatedTableInner) as <T>(
    p: PaginatedTableProps<T> & { ref?: React.Ref<PaginatedTableHandle> }
) => React.ReactElement;

function PaginatedTableInner<T>({
    columns,
    loadDataFn,
    rowActions,
    rowsPerPageOptions = [10, 25, 50],
    dataRowPropsFn
}: PaginatedTableProps<T>, ref: React.Ref<PaginatedTableHandle>) {
    const [data, setData] = useState<T[]>([]);
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions.length > 0 ? rowsPerPageOptions[0] : 10);
    const [isLoading, setIsLoading] = useState(false);
    const [direction, setDirection] = React.useState<Direction>('asc');
    const [orderBy, setOrderBy] = React.useState<string | undefined>(undefined);

    const loadDataRef = useRef(loadDataFn);
    useEffect(() => {
        loadDataRef.current = loadDataFn;
    }, [loadDataFn]);

    const [tableWidth, setTableWidth] = useState<number>(0);
    const tableContainerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleResize = () => {
            if (tableContainerRef.current) {
                setTableWidth(tableContainerRef.current.offsetWidth);
            }
        };

        handleResize();
        const resizeObserver = new ResizeObserver(handleResize);
        if (tableContainerRef.current) {
            resizeObserver.observe(tableContainerRef.current);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    const fetchPage = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await loadDataRef.current(page, rowsPerPage, orderBy, direction);
            setData(result.data);
            setTotalCount(result.totalCount);
        } catch (e) {
            console.error("Failed to load data", e);
            enqueueSnackbar({
                message: "Failed to load data",
                variant: "error"
            });
        } finally {
            setIsLoading(false);
        }
    }, [page, rowsPerPage, orderBy, direction]);

    useImperativeHandle(ref, () => ({
        reload: () => {
            void fetchPage();
        },
        setPage: (newPage: number) => {
            setPage(newPage);
        },
        getRowsPerPage: (): number => {
            return rowsPerPage;
        }
    }), [fetchPage]);

    useEffect(() => {
        void fetchPage();
    }, [fetchPage]);

    return (
        <Paper>
            <TableContainer ref={tableContainerRef}>
                <Table>
                    <TableHead>
                        <TableRow>
                            {columns.map((column) => (
                                <TableCell key={column.id.toString()} sortDirection={column.allowSorting && orderBy === column.id ? direction : false}>
                                    {column.allowSorting
                                        ? <TableSortLabel active={orderBy === column.id} direction={orderBy === column.id ? direction : 'asc'} onClick={() => {
                                            const currentlyOrderedByColumn = orderBy === column.id;
                                            // if already ordered by this column, toggle descending direction, if already descending clear ordering
                                            if (currentlyOrderedByColumn) {
                                                const currentlyOrderedAsc = direction === "asc";
                                                if (currentlyOrderedAsc) {
                                                    setDirection("desc");
                                                } else {
                                                    setDirection("asc");
                                                    setOrderBy(undefined);
                                                }
                                            } else {
                                                setDirection("asc");
                                                setOrderBy(column.id);
                                            }
                                            setPage(0);
                                        }}>
                                            {column.name}
                                            {orderBy === column.id ? (
                                                <span className="visually-hidden">
                                                    {direction === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                </span>
                                            ) : null}
                                        </TableSortLabel>
                                        : column.name
                                    }
                                </TableCell>
                            ))}
                            {rowActions && rowActions.length > 0 && (
                                <TableCell key={"_action_col_"}>
                                </TableCell>
                            )}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} align="center">
                                    <FontAwesomeIcon icon={solid("circle-notch")} spin size="6x" />
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((v, idx) => <TableRow key={idx} {...dataRowPropsFn?.(v)}>
                                {columns.map(col => <TableCell key={col.id.toString()}>{col.renderCellValue(v)}</TableCell>)}
                                {rowActions && rowActions.length > 0 && (
                                    <TableCell key={`_action_col_row_${idx}_`}>
                                        <RowActionsMenu rowData={v} rowActions={rowActions} />
                                    </TableCell>
                                )}
                            </TableRow>)
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                page={page}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={tableWidth >= 400 ? rowsPerPageOptions : []}
                onPageChange={(_e, newPage) => setPage(newPage)}
                onRowsPerPageChange={(event) => {
                    setRowsPerPage(parseInt(event.target.value, 10));
                    setPage(0);
                }}
                count={totalCount}
                component="div"
                sx={{
                    // Center items in the internal toolbar
                    '& .MuiTablePagination-toolbar': {
                        alignItems: 'center',
                        minHeight: 40, // adjust as needed (e.g., 36 for denser layout)
                        gap: 1,
                    },
                    // Remove stray margins that push items off-center
                    '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                        margin: 0,
                        lineHeight: 1.5, // keep consistent with your theme font size
                    },
                    // Ensure the select/input aligns to center
                    '& .MuiInputBase-root': {
                        alignItems: 'center',
                    },
                    // Keep action buttons aligned
                    '& .MuiTablePagination-actions': {
                        margin: 0,
                    },
                }}
            />
        </Paper>
    );
}

function getColumnCount(row: React.ReactElement<TableRowProps>): number {
    const children = React.Children.toArray(row.props.children);

    let sum = 0;
    for (const child of children) {
        if (!React.isValidElement(child)) continue;
        const span = (child.props as Partial<TableCellProps>).colSpan ?? 1;
        sum += typeof span === 'number' ? span : 1;
    }
    return sum;
}

function RowActionsMenu<T>({ rowData, rowActions }: { rowData: T, rowActions: PaginatedTableRowAction<T>[] }) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleActionClick = (action: PaginatedTableRowAction<T>) => {
        handleClose();
        action.exec(rowData);
    };

    return (
        <>
            <IconButton
                size="small"
                sx={{ width: "fit-content", height: "fit-content" }}
                onClick={handleClick}
            >
                <MoreVertIcon fontSize="small" />
            </IconButton>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                {rowActions.map((action, idx) => {
                    const disabled = action.disableForRow?.(rowData) ?? false;
                    return (
                        <MenuItem
                            key={idx}
                            disabled={disabled}
                            sx={action.color ? {
                                color: (theme) => theme.palette[action.color!].main,
                                '& .MuiListItemIcon-root': {
                                    color: (theme) => theme.palette[action.color!].main,
                                }
                            } : undefined}
                            onClick={() => handleActionClick(action)}
                        >
                            {action.icon && (
                                <ListItemIcon>
                                    {action.icon}
                                </ListItemIcon>
                            )}
                            {action.label}
                        </MenuItem>
                    );
                })}
            </Menu>
        </>
    );
}
