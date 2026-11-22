import React, { useEffect, useRef, useState } from "react";
import { Box, ClickAwayListener } from "@mui/material";

import App from "../App";
import http from "../http-common";
import { AccessFilter, compileQueryDefinition, QueryDefinition, QueryMode, StoredQueryScope } from "../QueryState";
import { QueryComposer } from "./QueryComposer";
import { QueryPopover, QuerySuggestion, useQuerySuggestions } from "./QueryPopover";
import { AccessFilterSelect } from "./AccessFilterSelect";

type SimpleQuery = Extract<QueryDefinition, { mode: "simple" }>;
type AdvancedQuery = Extract<QueryDefinition, { mode: "advanced" }>;

const emptyDefinition = (mode: QueryMode): QueryDefinition =>
    mode === "advanced" ? { mode: "advanced", query: "" } : { mode: "simple", text: "", tags: [], sort: null };

interface EmbeddedQueryInputProps {
    app: App;
    scope: StoredQueryScope;
    onSubmit: (query: string, accessFilter: AccessFilter) => void;
    placeholder?: string;
    isLoading?: boolean;
    showSort?: boolean;
    initialAccessFilter?: AccessFilter;
}

export function EmbeddedQueryInput({
    app,
    scope,
    onSubmit,
    placeholder = "Search",
    isLoading = false,
    showSort = true,
    initialAccessFilter,
}: EmbeddedQueryInputProps) {
    const advancedPreference = app.getUserPreferences()?.advanced_query_mode;

    const [definition, setDefinition] = useState<QueryDefinition>(() =>
        emptyDefinition(advancedPreference ? "advanced" : "simple")
    );

    const simpleDraft = useRef<SimpleQuery | null>(definition.mode === "simple" ? definition : null);
    const advancedDraft = useRef<AdvancedQuery | null>(definition.mode === "advanced" ? definition : null);

    const [accessFilter, setAccessFilter] = useState<AccessFilter>(
        () =>
            initialAccessFilter ??
            (app.isLoggedIn() ? (app.getUserPreferences()?.default_access_filter ?? "all") : "all")
    );

    const hasEdited = useRef(false);
    const preferenceInitialized = useRef(advancedPreference !== undefined);

    const inputRef = useRef<HTMLInputElement>(null);
    const anchorRef = useRef<HTMLDivElement>(null);

    const [popoverOpen, setPopoverOpen] = useState(false);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [highlightedSuggestion, setHighlightedSuggestion] = useState(-1);

    const suggestions = useQuerySuggestions(popoverOpen, definition, scope, cursorPosition);

    useEffect(() => {
        setHighlightedSuggestion(-1);
    }, [suggestions]);

    useEffect(() => {
        if (preferenceInitialized.current || advancedPreference === undefined) {
            return;
        }

        preferenceInitialized.current = true;

        if (!hasEdited.current) {
            const initial = emptyDefinition(advancedPreference ? "advanced" : "simple");

            setDefinition(initial);

            if (initial.mode === "simple") {
                simpleDraft.current = initial;
            } else {
                advancedDraft.current = initial;
            }
        }
    }, [advancedPreference]);

    const updateDefinition = (next: QueryDefinition) => {
        hasEdited.current = true;
        setDefinition(next);

        if (next.mode === "simple") {
            simpleDraft.current = next;
        } else {
            advancedDraft.current = next;
        }
    };

    const submit = (next: QueryDefinition = definition, selectedAccessFilter: AccessFilter = accessFilter) => {
        if (isLoading) {
            return;
        }

        let query: string;

        try {
            query = compileQueryDefinition(next);
        } catch (e) {
            app.openModal("Invalid query", <div>{e instanceof Error ? e.message : String(e)}</div>);
            return;
        }

        updateDefinition(next);
        setAccessFilter(selectedAccessFilter);
        setPopoverOpen(false);
        inputRef.current?.blur();

        onSubmit(query, selectedAccessFilter);

        if (app.isLoggedIn()) {
            void (async () => {
                try {
                    const config = await app.getAuthorizationWithLoginModal(false);

                    if (config) {
                        await http.post(
                            "/record-recent-query",
                            {
                                scope,
                                query_definition: next,
                            },
                            config
                        );
                    }
                } catch (e) {
                    console.error("Failed to record recent query:", e);
                }
            })();
        }
    };

    const changeMode = (mode: QueryMode) => {
        if (mode === definition.mode) {
            return;
        }

        let next: QueryDefinition;

        if (mode === "advanced") {
            try {
                const compiled = compileQueryDefinition(definition);
                next = advancedDraft.current ?? {
                    mode: "advanced",
                    query: compiled,
                };
            } catch (e) {
                app.openModal("Invalid query", <div>{e instanceof Error ? e.message : String(e)}</div>);
                return;
            }
        } else {
            next = simpleDraft.current ?? emptyDefinition("simple");
        }

        updateDefinition(next);

        requestAnimationFrame(() => {
            inputRef.current?.focus();
            setPopoverOpen(true);
        });
    };

    const selectSuggestion = (item: QuerySuggestion) => {
        if (item.type === "tag" && definition.mode === "simple") {
            if (
                definition.tags.length >= 10 ||
                definition.tags.some((tag) => tag.toLowerCase() === item.tag.tag_name.toLowerCase())
            ) {
                return;
            }

            updateDefinition({
                ...definition,
                tags: [...definition.tags, item.tag.tag_name],
                text: "",
            });
            setCursorPosition(0);
        } else if (item.type === "advanced" && definition.mode === "advanced") {
            const { start, end } = item.suggestion.target_location;
            const chars = Array.from(definition.query);

            const before = chars.slice(0, start).join("");
            const after = chars.slice(end + 1).join("");
            const replacement = item.suggestion.text;

            updateDefinition({
                mode: "advanced",
                query: before + replacement + after,
            });

            const caret = before.length + replacement.length;
            setCursorPosition(Array.from(before + replacement).length);

            requestAnimationFrame(() => {
                inputRef.current?.focus();
                inputRef.current?.setSelectionRange(caret, caret);
            });
        }

        setHighlightedSuggestion(-1);
        inputRef.current?.focus();
    };

    const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement> = (e) => {
        if (e.key === "Escape") {
            setPopoverOpen(false);
            e.stopPropagation();
            return;
        }

        if (!popoverOpen || suggestions.length === 0) {
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedSuggestion((current) => (current + 1) % suggestions.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedSuggestion((current) => (current <= 0 ? suggestions.length : current) - 1);
        } else if (e.key === "Enter" && highlightedSuggestion >= 0) {
            e.preventDefault();
            selectSuggestion(suggestions[highlightedSuggestion]);
        }
    };

    return (
        <form
            style={{ width: "100%" }}
            onSubmit={(e) => {
                e.preventDefault();
                submit();
            }}
        >
            <ClickAwayListener onClickAway={() => setPopoverOpen(false)}>
                <Box sx={{ width: "100%" }}>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            width: "100%",
                            minWidth: 0,
                            gap: 0.5,
                        }}
                    >
                        {app.isLoggedIn() && (
                            <AccessFilterSelect
                                value={accessFilter}
                                disabled={isLoading}
                                onChange={(value) => submit(definition, value)}
                            />
                        )}

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <QueryComposer
                                definition={definition}
                                onChange={updateDefinition}
                                onSortChange={(sort) => {
                                    if (definition.mode === "simple") {
                                        submit({ ...definition, sort });
                                    }
                                }}
                                onFocus={() => setPopoverOpen(true)}
                                onCursorChange={setCursorPosition}
                                onKeyDown={handleKeyDown}
                                inputRef={inputRef}
                                placeholder={placeholder}
                                showSort={showSort}
                                isLoading={isLoading}
                                popoverAnchorRef={anchorRef}
                            />
                        </Box>
                    </Box>

                    <QueryPopover
                        open={popoverOpen}
                        anchorEl={anchorRef.current}
                        app={app}
                        definition={definition}
                        scope={scope}
                        suggestions={suggestions}
                        highlightedSuggestion={highlightedSuggestion}
                        onSelectSuggestion={selectSuggestion}
                        onSelectStoredQuery={(storedDefinition) => submit(storedDefinition)}
                        onModeChange={changeMode}
                        onDismiss={() => {
                            setPopoverOpen(false);
                            inputRef.current?.blur();
                        }}
                        inModal
                    />
                </Box>
            </ClickAwayListener>
        </form>
    );
}
