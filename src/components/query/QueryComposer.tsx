import React, { useState } from "react";
import {
    Box,
    Chip,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    InputBase,
    Tooltip,
    CircularProgress,
    ListSubheader,
    Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SortIcon from "@mui/icons-material/Sort";
import CheckIcon from "@mui/icons-material/Check";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

import { QueryDefinition, QuerySort, StoredQueryScope } from "../../QueryState";

type SimpleQueryDefinition = Extract<QueryDefinition, { mode: "simple" }>;

interface SortOption {
    value: string;
    label: string;
    sort: QuerySort | null;
}

interface SortOptionGroup {
    label: string;
    options: SortOption[];
}

const sortOption = (attribute: string, label: string, descending = false): SortOption => ({
    value: attribute,
    label,
    sort: { attribute, descending },
});

const DEFAULT_SORT_OPTION: SortOption = {
    value: "default",
    label: "Default",
    sort: null,
};

const COMMON_SORT_OPTIONS: SortOption[] = [sortOption("date", "Creation date", true), sortOption("title", "Title")];

const POST_SORT_GROUPS: SortOptionGroup[] = [
    {
        label: "Music",
        options: [
            sortOption("artist", "Artist / Album"),
            sortOption("album", "Album / Track"),
            sortOption("disc", "Disc / Track"),
            sortOption("track", "Track"),
        ],
    },
    {
        label: "Media",
        options: [
            sortOption("date_meta", "Media date", true),
            sortOption("duration", "Duration", true),
            sortOption("size", "File size", true),
        ],
    },
    {
        label: "Dimensions",
        options: [sortOption("width", "Width / Height", true), sortOption("height", "Height / Width", true)],
    },
];

const SORT_OPTIONS_BY_SCOPE: Record<StoredQueryScope, SortOptionGroup[]> = {
    post: [
        {
            label: "General",
            options: COMMON_SORT_OPTIONS,
        },
        ...POST_SORT_GROUPS,
    ],
    collection: [
        {
            label: "General",
            options: COMMON_SORT_OPTIONS,
        },
    ],
    collection_item: [
        {
            label: "General",
            options: [...COMMON_SORT_OPTIONS, sortOption("ordinal", "Collection order")],
        },
        ...POST_SORT_GROUPS,
    ],
    user_group: [
        {
            label: "General",
            options: [sortOption("date", "Creation date", true), sortOption("name", "Name")],
        },
    ],
};

interface QueryComposerProps {
    scope: StoredQueryScope;
    definition: QueryDefinition;
    onChange: (definition: QueryDefinition) => void;
    onSortChange: (sort: QuerySort | null) => void;
    onFocus: () => void;
    onCursorChange: (position: number) => void;
    onKeyDown: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>;
    inputRef: React.Ref<HTMLInputElement>;
    placeholder: string;
    autoFocus?: boolean;
    showSort?: boolean;
    isLoading?: boolean;
    popoverAnchorRef?: React.Ref<HTMLDivElement>;
}

export function QueryComposer({
    scope,
    definition,
    onChange,
    onSortChange,
    onFocus,
    onCursorChange,
    onKeyDown,
    inputRef,
    placeholder,
    autoFocus = false,
    showSort = true,
    isLoading = false,
    popoverAnchorRef,
}: QueryComposerProps) {
    const [sortAnchor, setSortAnchor] = useState<HTMLElement | null>(null);

    const simple = definition.mode === "simple" ? definition : null;

    const updateSimple = (changes: Partial<SimpleQueryDefinition>) => {
        if (!simple) {
            return;
        }

        onChange({
            ...simple,
            ...changes,
        });
    };

    const removeTag = (index: number) => {
        if (!simple) {
            return;
        }

        updateSimple({
            tags: simple.tags.filter((_, currentIndex) => currentIndex !== index),
        });
    };

    const updateCursor = (input: HTMLInputElement | HTMLTextAreaElement) => {
        const offset = input.selectionStart ?? input.value.length;

        onCursorChange(Array.from(input.value.slice(0, offset)).length);
    };

    const sortGroups = SORT_OPTIONS_BY_SCOPE[scope];
    const sortOptions = sortGroups.flatMap((group) => group.options);

    const selectedSortOption = simple?.sort
        ? sortOptions.find((option) => option.sort?.attribute === simple.sort?.attribute)
        : DEFAULT_SORT_OPTION;

    const sortValue = selectedSortOption?.value ?? "custom";
    const sortLabel = selectedSortOption?.label ?? simple?.sort?.attribute ?? "Custom";
    const sortDescription = simple?.sort
        ? `${sortLabel} (${simple.sort.descending ? "Descending" : "Ascending"})`
        : sortLabel;

    const selectSort = (option: SortOption, descending?: boolean) => {
        if (!option.sort) {
            onSortChange(null);
        } else {
            const currentSort = simple?.sort;

            onSortChange({
                attribute: option.sort.attribute,
                descending:
                    descending ??
                    (currentSort?.attribute === option.sort.attribute
                        ? !currentSort.descending
                        : option.sort.descending),
            });
        }

        setSortAnchor(null);
    };

    const renderSortOption = (option: SortOption) => {
        const isSelected = option.sort ? simple?.sort?.attribute === option.sort.attribute : !simple?.sort;

        const isAscending = isSelected && simple?.sort?.descending === false;
        const isDescending = isSelected && simple?.sort?.descending === true;

        const directionButtonSx = (active: boolean) => ({
            minWidth: 52,
            px: 0.75,
            py: 0.25,
            fontSize: "0.75rem",
            border: "1px solid",
            borderColor: active ? "divider" : "transparent",
            bgcolor: active ? "action.selected" : "transparent",
            "&:hover": {
                bgcolor: "action.hover",
            },
        });

        return (
            <MenuItem
                key={option.value}
                selected={isSelected}
                onClick={() => selectSort(option)}
                sx={{
                    minHeight: 36,
                    py: 0.5,
                    px: 1.5,
                    gap: 0.5,
                    "&.Mui-selected": {
                        bgcolor: "transparent",
                    },
                    "&.Mui-selected:hover": {
                        bgcolor: "action.hover",
                    },
                }}
            >
                <ListItemIcon sx={{ minWidth: 32 }}>{isSelected && <CheckIcon fontSize="small" />}</ListItemIcon>

                <ListItemText
                    primary={option.label}
                    sx={{
                        minWidth: 0,
                        "& .MuiTypography-root": {
                            fontSize: "0.875rem",
                        },
                    }}
                />

                {option.sort && (
                    <>
                        <Button
                            type="button"
                            size="small"
                            color="inherit"
                            variant="text"
                            aria-label={`Sort ${option.label} ascending`}
                            sx={directionButtonSx(isAscending)}
                            onClick={(e) => {
                                e.stopPropagation();
                                selectSort(option, false);
                            }}
                        >
                            <ArrowUpwardIcon sx={{ fontSize: 16, mr: 0.5 }} />
                            Asc
                        </Button>

                        <Button
                            type="button"
                            size="small"
                            color="inherit"
                            variant="text"
                            aria-label={`Sort ${option.label} descending`}
                            sx={directionButtonSx(isDescending)}
                            onClick={(e) => {
                                e.stopPropagation();
                                selectSort(option, true);
                            }}
                        >
                            <ArrowDownwardIcon sx={{ fontSize: 16, mr: 0.5 }} />
                            Desc
                        </Button>
                    </>
                )}
            </MenuItem>
        );
    };

    const inputValue = definition.mode === "simple" ? definition.text : definition.query;

    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                flex: 1,
                minWidth: 0,
                gap: 0.5,
            }}
        >
            <Box
                ref={popoverAnchorRef}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    flex: 1,
                    minWidth: 0,
                    minHeight: 40,
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    "&:focus-within": {
                        borderColor: "primary.main",
                    },
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        alignContent: "center",
                        flexWrap: "wrap",
                        flex: 1,
                        minWidth: 0,
                        gap: 0.5,
                        px: 1,
                        py: 0.5,
                    }}
                >
                    {simple?.tags.map((tag, index) => (
                        <Chip
                            key={`${tag}-${index}`}
                            label={tag}
                            onDelete={() => removeTag(index)}
                            color="secondary"
                            variant="outlined"
                            sx={{
                                maxWidth: "100%",
                                "& .MuiChip-label": {
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                },
                            }}
                        />
                    ))}

                    <InputBase
                        inputRef={inputRef}
                        autoFocus={autoFocus}
                        value={inputValue}
                        placeholder={placeholder}
                        fullWidth={false}
                        onFocus={onFocus}
                        disabled={isLoading}
                        onChange={(e) => {
                            const value = e.target.value;

                            if (simple) {
                                updateSimple({ text: value });
                            } else {
                                onChange({
                                    mode: "advanced",
                                    query: value,
                                });
                            }

                            updateCursor(e.target);
                        }}
                        onClick={(e) => {
                            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                                updateCursor(e.target);
                            }
                        }}
                        onKeyUp={(e) => updateCursor(e.currentTarget)}
                        onKeyDown={onKeyDown}
                        inputProps={{
                            maxLength: 1024,
                            "aria-label": "Search query",
                        }}
                        sx={{
                            flex: "1 1 130px",
                            minWidth: 90,
                            fontSize: "0.875rem",
                            "& input": {
                                width: "100%",
                                minWidth: 0,
                                p: 0.5,
                            },
                        }}
                    />
                </Box>

                <Tooltip title="Search">
                    <span>
                        <IconButton
                            type="submit"
                            size="small"
                            aria-label="Submit search"
                            disabled={isLoading}
                            sx={{
                                flexShrink: 0,
                                mr: 0.5,
                            }}
                        >
                            {isLoading ? (
                                <CircularProgress size={18} color="inherit" />
                            ) : (
                                <SearchIcon fontSize="small" />
                            )}
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>

            {simple && showSort && (
                <>
                    <Tooltip title={`Sort: ${sortDescription}`}>
                        <IconButton
                            size="small"
                            color={simple.sort ? "secondary" : "default"}
                            disabled={isLoading}
                            aria-label={`Sort: ${sortDescription}`}
                            aria-haspopup="menu"
                            onClick={(e) => setSortAnchor(e.currentTarget)}
                            sx={{ flexShrink: 0 }}
                        >
                            <SortIcon />
                        </IconButton>
                    </Tooltip>

                    <Menu
                        anchorEl={sortAnchor}
                        open={Boolean(sortAnchor)}
                        onClose={() => setSortAnchor(null)}
                        slotProps={{
                            paper: {
                                sx: {
                                    bgcolor: "background.paper",
                                    backgroundImage: "none",
                                    minWidth: 340,
                                    maxWidth: "calc(100vw - 32px)",
                                    maxHeight: "75vh",
                                },
                            },
                            list: {
                                dense: true,
                                sx: { py: 0.5 },
                            },
                        }}
                    >
                        {sortValue === "custom" && (
                            <MenuItem disabled selected>
                                <ListItemIcon>
                                    <CheckIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>{sortLabel}</ListItemText>
                            </MenuItem>
                        )}

                        {renderSortOption(DEFAULT_SORT_OPTION)}

                        {sortGroups.map((group) => (
                            <React.Fragment key={group.label}>
                                <ListSubheader
                                    disableSticky
                                    sx={{
                                        bgcolor: "transparent",
                                        color: "text.secondary",
                                        fontSize: "0.75rem",
                                        fontWeight: 600,
                                        lineHeight: "28px",
                                        mt: 0.5,
                                    }}
                                >
                                    {group.label}
                                </ListSubheader>

                                {group.options.map(renderSortOption)}
                            </React.Fragment>
                        ))}
                    </Menu>
                </>
            )}
        </Box>
    );
}
