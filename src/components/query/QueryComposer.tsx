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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SortIcon from "@mui/icons-material/Sort";
import CheckIcon from "@mui/icons-material/Check";

import { QueryDefinition, QuerySort } from "../../QueryState";

type SimpleQueryDefinition = Extract<QueryDefinition, { mode: "simple" }>;

interface SortOption {
    value: string;
    label: string;
    sort: QuerySort | null;
}

const SORT_OPTIONS: SortOption[] = [
    {
        value: "default",
        label: "Default",
        sort: null,
    },
    {
        value: "date_desc",
        label: "Newest",
        sort: {
            attribute: "date",
            descending: true,
        },
    },
    {
        value: "date_asc",
        label: "Oldest",
        sort: {
            attribute: "date",
            descending: false,
        },
    },
    {
        value: "title_asc",
        label: "Title A–Z",
        sort: {
            attribute: "title",
            descending: false,
        },
    },
    {
        value: "title_desc",
        label: "Title Z–A",
        sort: {
            attribute: "title",
            descending: true,
        },
    },
];

interface QueryComposerProps {
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

    const sortValue = simple?.sort
        ? (SORT_OPTIONS.find(
              (option) =>
                  option.sort?.attribute === simple.sort?.attribute &&
                  option.sort?.descending === simple.sort?.descending
          )?.value ?? "custom")
        : "default";

    const sortLabel =
        SORT_OPTIONS.find((option) => option.value === sortValue)?.label ?? simple?.sort?.attribute ?? "Custom";

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
                    <Tooltip title={`Sort: ${sortLabel}`}>
                        <IconButton
                            size="small"
                            disabled={isLoading}
                            aria-label={`Sort: ${sortLabel}`}
                            aria-haspopup="menu"
                            onClick={(e) => setSortAnchor(e.currentTarget)}
                            sx={{ flexShrink: 0 }}
                        >
                            <SortIcon />
                        </IconButton>
                    </Tooltip>

                    <Menu anchorEl={sortAnchor} open={Boolean(sortAnchor)} onClose={() => setSortAnchor(null)}>
                        {sortValue === "custom" && (
                            <MenuItem disabled selected>
                                <ListItemIcon>
                                    <CheckIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>{sortLabel}</ListItemText>
                            </MenuItem>
                        )}

                        {SORT_OPTIONS.map((option) => (
                            <MenuItem
                                key={option.value}
                                selected={sortValue === option.value}
                                onClick={() => {
                                    onSortChange(option.sort);
                                    setSortAnchor(null);
                                }}
                            >
                                <ListItemIcon>
                                    {sortValue === option.value && <CheckIcon fontSize="small" />}
                                </ListItemIcon>
                                <ListItemText>{option.label}</ListItemText>
                            </MenuItem>
                        ))}
                    </Menu>
                </>
            )}
        </Box>
    );
}
