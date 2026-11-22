import { useEffect, useState } from "react";
import {
    Box,
    Button,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Paper,
    Popper,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from "@mui/material";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import BookmarkAddOutlinedIcon from "@mui/icons-material/BookmarkAddOutlined";
import HistoryIcon from "@mui/icons-material/History";
import CodeIcon from "@mui/icons-material/Code";
import TuneIcon from "@mui/icons-material/Tune";

import App from "../App";
import http from "../http-common";
import { AnalyzeQueryRequest, AnalyzeQueryResponse, QueryAutocompleteSuggestion, Tag } from "../Model";
import { QueryDefinition, QueryMode, StoredQueryScope } from "../QueryState";
import { SaveQueryModal } from "./SaveQueryModal";

interface FindTagResponse {
    exact_match: Tag | null;
    suggestions: Tag[];
}

export type QuerySuggestion =
    | { type: "tag"; tag: Tag }
    | {
          type: "advanced";
          suggestion: QueryAutocompleteSuggestion;
      };

interface StoredQuery {
    pk: number;
    name: string | null;
    scope: StoredQueryScope;
    query_definition: QueryDefinition;
    is_saved: boolean;
    creation_timestamp: string;
    last_used_timestamp: string;
}

interface StoredQueriesResponse {
    saved_queries: StoredQuery[];
    recent_queries: StoredQuery[];
}

export function useQuerySuggestions(
    open: boolean,
    definition: QueryDefinition,
    scope: string,
    cursorPosition: number
): QuerySuggestion[] {
    const [suggestions, setSuggestions] = useState<QuerySuggestion[]>([]);

    useEffect(() => {
        setSuggestions([]);

        if (!open) {
            return;
        }

        const value = definition.mode === "simple" ? definition.text.trim() : definition.query;

        if (!value) {
            return;
        }

        const controller = new AbortController();

        const timeout = setTimeout(async () => {
            try {
                if (definition.mode === "simple") {
                    const response = await http.get<FindTagResponse>(`/find-tag/${encodeURIComponent(value)}`, {
                        signal: controller.signal,
                    });

                    const tags = [
                        ...(response.data.exact_match ? [response.data.exact_match] : []),
                        ...response.data.suggestions,
                    ];

                    const seen = new Set<number>();

                    const filtered = tags
                        .filter((tag) => {
                            if (seen.has(tag.pk)) {
                                return false;
                            }

                            seen.add(tag.pk);

                            return !definition.tags.some(
                                (selected) => selected.toLowerCase() === tag.tag_name.toLowerCase()
                            );
                        })
                        .slice(0, 8);

                    if (!controller.signal.aborted) {
                        setSuggestions(
                            filtered.map((tag) => ({
                                type: "tag",
                                tag,
                            }))
                        );
                    }
                } else {
                    const response = await http.post<AnalyzeQueryResponse>(
                        "/analyze-query",
                        new AnalyzeQueryRequest(cursorPosition, definition.query, scope),
                        {
                            signal: controller.signal,
                        }
                    );

                    if (!controller.signal.aborted) {
                        setSuggestions(
                            response.data.suggestions.map((suggestion) => ({
                                type: "advanced",
                                suggestion,
                            }))
                        );
                    }
                }
            } catch (e) {
                if (!controller.signal.aborted) {
                    console.error("Failed to load query suggestions:", e);
                }
            }
        }, 250);

        return () => {
            clearTimeout(timeout);
            controller.abort();
        };
    }, [open, definition, scope, cursorPosition]);

    return suggestions;
}

function describeQuery(definition: QueryDefinition): string {
    if (definition.mode === "advanced") {
        return definition.query || "Empty query";
    }

    return [definition.tags.join(", "), definition.text].filter(Boolean).join(" · ") || "All results";
}

interface QueryPopoverProps {
    open: boolean;
    anchorEl: HTMLElement | null;
    app: App;
    definition: QueryDefinition;
    scope: StoredQueryScope;
    suggestions: QuerySuggestion[];
    highlightedSuggestion: number;
    onSelectSuggestion: (suggestion: QuerySuggestion) => void;
    onSelectStoredQuery: (definition: QueryDefinition) => void;
    onModeChange: (mode: QueryMode) => void;
    onDismiss: () => void;
    inModal?: boolean;
}

export function QueryPopover({
    open,
    anchorEl,
    app,
    definition,
    scope,
    suggestions,
    highlightedSuggestion,
    onSelectSuggestion,
    onSelectStoredQuery,
    onModeChange,
    onDismiss,
    inModal = false,
}: QueryPopoverProps) {
    const userPk = app.getUser()?.pk;

    const [storedQueries, setStoredQueries] = useState<StoredQueriesResponse>({
        saved_queries: [],
        recent_queries: [],
    });

    const [refreshCounter, setRefreshCounter] = useState(0);

    useEffect(() => {
        let active = true;

        if (!open || userPk == null) {
            setStoredQueries({
                saved_queries: [],
                recent_queries: [],
            });
            return;
        }

        const load = async () => {
            try {
                const config = await app.getAuthorizationWithLoginModal(false);

                if (!config) {
                    return;
                }

                const response = await http.get<StoredQueriesResponse>("/get-stored-queries", {
                    ...config,
                    params: { scope },
                });

                if (active) {
                    setStoredQueries(response.data);
                }
            } catch (e) {
                if (active) {
                    console.error("Failed to load stored queries:", e);
                }
            }
        };

        void load();

        return () => {
            active = false;
        };
    }, [open, app, userPk, scope, refreshCounter]);

    const openSaveModal = (queryDefinition: QueryDefinition, suggestedName = "") => {
        onDismiss();

        app.openModal("Save query", (modal) => (
            <SaveQueryModal
                app={app}
                modal={modal}
                scope={scope}
                definition={queryDefinition}
                initialName={suggestedName}
                onSaved={() => setRefreshCounter((current) => current + 1)}
            />
        ));
    };

    const renderStoredQueries = (queries: StoredQuery[], emptyMessage: string, recent: boolean) => {
        if (!queries.length) {
            return (
                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                    {emptyMessage}
                </Typography>
            );
        }

        return (
            <List
                dense
                disablePadding
                sx={{
                    maxHeight: 220,
                    overflowY: "auto",
                    overflowX: "hidden",
                }}
            >
                {queries.map((query) => (
                    <ListItem
                        key={query.pk}
                        disablePadding
                        secondaryAction={
                            recent ? (
                                <Tooltip title="Save query">
                                    <IconButton
                                        size="small"
                                        edge="end"
                                        aria-label="Save recent query"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={(e) => {
                                            e.stopPropagation();

                                            openSaveModal(
                                                query.query_definition,
                                                describeQuery(query.query_definition).slice(0, 255)
                                            );
                                        }}
                                    >
                                        <BookmarkAddOutlinedIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            ) : undefined
                        }
                    >
                        <ListItemButton
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => onSelectStoredQuery(query.query_definition)}
                        >
                            <ListItemText
                                primary={query.name ?? describeQuery(query.query_definition)}
                                secondary={query.name ? describeQuery(query.query_definition) : undefined}
                                slotProps={{
                                    primary: {
                                        noWrap: true,
                                    },
                                    secondary: {
                                        noWrap: true,
                                    },
                                }}
                            />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
        );
    };

    const hasSuggestions = suggestions.length > 0;

    return (
        <Popper
            open={open}
            anchorEl={anchorEl}
            placement="bottom-start"
            popperOptions={{
                strategy: "fixed",
            }}
            sx={{
                // Above the navbar, below menus and app modals.
                zIndex: (theme) => theme.zIndex.appBar + 1,
                width: anchorEl?.getBoundingClientRect().width ?? "auto",
                maxWidth: "calc(100vw - 24px)",
            }}
            modifiers={[
                {
                    name: "offset",
                    options: { offset: [0, 8] },
                },
                {
                    name: "preventOverflow",
                    options: { padding: 12 },
                },
            ]}
            container={inModal ? () => anchorEl?.closest(".MuiModal-root") as HTMLElement | null : undefined}
        >
            <Paper
                elevation={0}
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                    maxHeight: "min(75vh, 650px)",
                    overflow: "hidden",
                    borderRadius: 2,

                    // Match App.openModal's Paper styling.
                    bgcolor: "background.paper",
                    backgroundImage: "none",
                    boxShadow: 16,
                }}
            >
                {hasSuggestions && (
                    <Box
                        sx={{
                            px: 1.5,
                            pt: 1.25,
                            pb: 1,
                            minHeight: 0,
                            flexShrink: 0,
                        }}
                    >
                        <Typography variant="overline" color="text.secondary" sx={{ px: 0.5 }}>
                            {definition.mode === "simple" ? "Suggested tags" : "FQL suggestions"}
                        </Typography>

                        <List
                            dense
                            disablePadding
                            sx={{
                                maxHeight: 175,
                                overflowY: "auto",
                            }}
                        >
                            {suggestions.map((item, index) => (
                                <ListItemButton
                                    key={index}
                                    selected={highlightedSuggestion === index}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => onSelectSuggestion(item)}
                                    sx={{
                                        borderRadius: 1,
                                        py: 0.5,
                                    }}
                                >
                                    <ListItemText
                                        primary={item.type === "tag" ? item.tag.tag_name : item.suggestion.display}
                                    />
                                </ListItemButton>
                            ))}
                        </List>
                    </Box>
                )}

                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
                        columnGap: 2,
                        rowGap: 1.5,
                        px: 1.5,
                        py: 1.5,
                        minHeight: 0,
                        overflowY: "auto",
                        borderTop: hasSuggestions ? 1 : 0,
                        borderColor: "divider",
                    }}
                >
                    <Box sx={{ minWidth: 0 }}>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                mb: 0.5,
                            }}
                        >
                            <BookmarkBorderIcon fontSize="small" color="action" />
                            <Typography variant="overline">Saved queries</Typography>
                        </Box>

                        {renderStoredQueries(
                            storedQueries.saved_queries,
                            userPk == null ? "Log in to see saved queries" : "No saved queries",
                            false
                        )}
                    </Box>

                    <Box sx={{ minWidth: 0 }}>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                mb: 0.5,
                            }}
                        >
                            <HistoryIcon fontSize="small" color="action" />
                            <Typography variant="overline">Recent queries</Typography>
                        </Box>

                        {renderStoredQueries(
                            storedQueries.recent_queries,
                            userPk == null ? "Log in to see recent queries" : "No recent queries",
                            true
                        )}
                    </Box>
                </Box>

                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 1,
                        px: 1.5,
                        py: 1,
                        flexShrink: 0,
                        borderTop: 1,
                        borderColor: "divider",
                    }}
                >
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={definition.mode}
                        onChange={(_event, mode: QueryMode | null) => {
                            if (mode) {
                                onModeChange(mode);
                            }
                        }}
                    >
                        <ToggleButton value="simple">
                            <TuneIcon fontSize="small" sx={{ mr: 0.5 }} />
                            Simple
                        </ToggleButton>

                        <ToggleButton value="advanced">
                            <CodeIcon fontSize="small" sx={{ mr: 0.5 }} />
                            Advanced
                        </ToggleButton>
                    </ToggleButtonGroup>

                    <Button
                        size="small"
                        type="button"
                        disabled={userPk == null}
                        startIcon={<BookmarkBorderIcon />}
                        onClick={() => openSaveModal(definition)}
                    >
                        Save query
                    </Button>
                </Box>
            </Paper>
        </Popper>
    );
}
