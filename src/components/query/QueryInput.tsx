import { Combobox } from "@filebroker/react-widgets/lib/cjs";
import React, { useEffect, useRef, useState } from "react";
import { AnalyzeQueryRequest, AnalyzeQueryResponse, QueryAutocompleteSuggestion } from "../../Model";
import http from "../../http-common";
import { replaceStringRange } from "../../Util";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons";
import "./QueryInput.css";
import { Autocomplete, Box, ClickAwayListener, IconButton, InputAdornment } from "@mui/material";
import { StyledTextField } from "../../index";
import { useLocation, useNavigate } from "react-router-dom";
import { AutocompleteRenderInputParams } from "@mui/material/Autocomplete";
import SearchIcon from "@mui/icons-material/Search";
import {
    AccessFilter,
    compileQueryDefinition,
    parseQueryDefinition,
    QueryDefinition,
    QueryMode,
    serializeQueryDefinition,
    StoredQueryScope,
} from "../../QueryState";
import App from "../../App";
import { QueryComposer } from "./QueryComposer";
import { QueryPopover, QuerySuggestion, useQuerySuggestions } from "./QueryPopover";
import { AccessFilterSelect } from "./AccessFilterSelect";

let scheduledAnalyzeQueryRequest: NodeJS.Timeout | null = null;

export function GlobalQueryInput({
    app,
    hideOnHome,
    autoFocus,
}: {
    app: App;
    hideOnHome?: boolean;
    autoFocus?: boolean;
}) {
    const location = useLocation();
    const navigate = useNavigate();
    const pathName = location.pathname;

    // -------------------------------------------------------------
    // Query state and user preferences
    // -------------------------------------------------------------

    const advancedQueryPreference = app.getUserPreferences()?.advanced_query_mode;

    const preferredMode: QueryMode = advancedQueryPreference ? "advanced" : "simple";

    const [definition, setDefinition] = useState<QueryDefinition>(() =>
        parseQueryDefinition(location.search, preferredMode)
    );

    type SimpleQuery = Extract<QueryDefinition, { mode: "simple" }>;
    type AdvancedQuery = Extract<QueryDefinition, { mode: "advanced" }>;

    const simpleDraft = useRef<SimpleQuery | null>(definition.mode === "simple" ? definition : null);
    const advancedDraft = useRef<AdvancedQuery | null>(definition.mode === "advanced" ? definition : null);

    const preferenceInitialized = useRef(advancedQueryPreference !== undefined);

    const hasEdited = useRef(false);

    // URL changes are authoritative. This includes browser Back/Forward navigation and opening shared search links.
    useEffect(() => {
        const parsed = parseQueryDefinition(location.search, preferredMode);

        setDefinition(parsed);

        simpleDraft.current = parsed.mode === "simple" ? parsed : null;

        advancedDraft.current = parsed.mode === "advanced" ? parsed : null;

        hasEdited.current = false;
    }, [location.pathname, location.search]);

    // Apply the user's stored preference once it becomes available.
    // Explicit query representations in the URL take precedence.
    useEffect(() => {
        if (preferenceInitialized.current || advancedQueryPreference === undefined) {
            return;
        }

        preferenceInitialized.current = true;

        if (hasEdited.current) {
            return;
        }

        const params = new URLSearchParams(location.search);

        if (
            params.has("mode") ||
            params.has("query") ||
            params.has("tag") ||
            params.has("text") ||
            params.has("sort")
        ) {
            return;
        }

        const parsed = parseQueryDefinition(location.search, advancedQueryPreference ? "advanced" : "simple");

        setDefinition(parsed);

        simpleDraft.current = parsed.mode === "simple" ? parsed : null;

        advancedDraft.current = parsed.mode === "advanced" ? parsed : null;
    }, [advancedQueryPreference, location.search]);

    const updateDefinition = (next: QueryDefinition) => {
        hasEdited.current = true;
        setDefinition(next);

        if (next.mode === "simple") {
            simpleDraft.current = next;
        } else {
            advancedDraft.current = next;
        }
    };

    // -------------------------------------------------------------
    // Search scope and destination
    // -------------------------------------------------------------

    let searchSite = "/posts";
    let scope = "post";
    let storedScope: StoredQueryScope = "post";
    let placeholder = "Search Posts";

    const collectionMatch = pathName.match(/^\/collection\/(\d+)(?:\/|$)/);

    if (collectionMatch) {
        const collectionPk = collectionMatch[1];

        searchSite = `/collection/${collectionPk}`;
        scope = `collection_item_${collectionPk}`;
        storedScope = "collection_item";
        placeholder = "Search Within Collection";
    } else if (pathName === "/collections") {
        searchSite = "/collections";
        scope = "collection";
        storedScope = "collection";
        placeholder = "Search Collections";
    }

    const params = new URLSearchParams(location.search);
    const accessParam = params.get("access_filter");

    const hasSearchContext = ["query", "mode", "tag", "text", "sort", "constriction", "page"].some((key) =>
        params.has(key)
    );

    const preferredAccessFilter: AccessFilter = app.isLoggedIn()
        ? (app.getUserPreferences()?.default_access_filter ?? "all")
        : "all";

    const accessFilter: AccessFilter =
        accessParam === "all" || accessParam === "shared" || accessParam === "own"
            ? accessParam
            : hasSearchContext
              ? "all"
              : preferredAccessFilter;

    // -------------------------------------------------------------
    // Popover and suggestion state
    // -------------------------------------------------------------

    const inputRef = useRef<HTMLInputElement>(null);
    const popoverAnchorRef = useRef<HTMLDivElement>(null);

    const [popoverOpen, setPopoverOpen] = useState(false);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [highlightedSuggestion, setHighlightedSuggestion] = useState(-1);

    const suggestions = useQuerySuggestions(popoverOpen, definition, scope, cursorPosition);

    useEffect(() => {
        setHighlightedSuggestion(-1);
    }, [suggestions]);

    // -------------------------------------------------------------
    // Mode switching
    // -------------------------------------------------------------

    const changeMode = (mode: QueryMode) => {
        if (mode === definition.mode) {
            return;
        }

        let next: QueryDefinition;

        if (mode === "advanced") {
            let compiledQuery: string;

            try {
                compiledQuery = compileQueryDefinition(definition);
            } catch (e) {
                app.openModal("Invalid query", <div>{e instanceof Error ? e.message : String(e)}</div>);
                return;
            }

            // Restore the previous advanced draft when available.
            // Otherwise initialize it from the graphical query.
            next = advancedDraft.current ?? {
                mode: "advanced",
                query: compiledQuery,
            };
        } else {
            // Arbitrary FQL cannot be reliably converted back
            // into graphical selections.
            next = simpleDraft.current ?? {
                mode: "simple",
                text: "",
                tags: [],
                sort: null,
            };
        }

        updateDefinition(next);

        if (app.isLoggedIn()) {
            app.updateUserPreferences({
                advanced_query_mode: mode === "advanced",
            });
        }

        // Keep the popover open and focus the new editor.
        requestAnimationFrame(() => {
            inputRef.current?.focus();
            setPopoverOpen(true);
        });
    };

    // -------------------------------------------------------------
    // Selecting autocomplete suggestions
    // -------------------------------------------------------------

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
            const { suggestion } = item;
            const { start, end } = suggestion.target_location;

            // The FQL lexer uses character offsets.
            const chars = Array.from(definition.query);

            const before = chars.slice(0, start).join("");
            const after = chars.slice(end + 1).join("");
            const query = before + suggestion.text + after;

            updateDefinition({
                mode: "advanced",
                query,
            });

            const caretPosition = before.length + suggestion.text.length;

            setCursorPosition(Array.from(before + suggestion.text).length);

            requestAnimationFrame(() => {
                inputRef.current?.focus();
                inputRef.current?.setSelectionRange(caretPosition, caretPosition);
            });
        }

        setHighlightedSuggestion(-1);
        inputRef.current?.focus();
    };

    // -------------------------------------------------------------
    // Keyboard navigation
    // -------------------------------------------------------------

    const handleInputKeyDown: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement> = (e) => {
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

    // -------------------------------------------------------------
    // Submitting searches
    // -------------------------------------------------------------

    const submitQuery = (newAccessFilter?: AccessFilter, queryToSubmit: QueryDefinition = definition) => {
        try {
            compileQueryDefinition(queryToSubmit);
        } catch (e) {
            app.openModal("Invalid query", <div>{e instanceof Error ? e.message : String(e)}</div>);
            return;
        }

        const searchParams = serializeQueryDefinition(queryToSubmit, new URLSearchParams(location.search));

        const selectedAccessFilter = newAccessFilter ?? accessFilter;

        if (app.isLoggedIn() && selectedAccessFilter !== "all") {
            searchParams.set("access_filter", selectedAccessFilter);
        } else {
            searchParams.delete("access_filter");
        }

        setPopoverOpen(false);

        navigate({
            pathname: searchSite,
            search: searchParams.toString(),
        });

        inputRef.current?.blur();
        document.getElementById("App")?.focus();

        // Record deliberate searches, rather than recording every
        // backend request or pagination event.
        if (app.isLoggedIn()) {
            void (async () => {
                try {
                    const config = await app.getAuthorization(location, navigate, false);

                    if (config) {
                        await http.post(
                            "/record-recent-query",
                            {
                                scope: storedScope,
                                query_definition: queryToSubmit,
                            },
                            config
                        );
                    }
                } catch (e) {
                    console.error("Failed to record recent query:", e);
                }
            })();

            if (newAccessFilter !== undefined) {
                app.updateUserPreferences({
                    default_access_filter: newAccessFilter,
                });
            }
        }
    };

    // -------------------------------------------------------------
    // Rendering
    // -------------------------------------------------------------

    if (hideOnHome && pathName === "/") {
        return null;
    }

    return (
        <form
            style={{ width: "100%" }}
            onSubmit={(e) => {
                e.preventDefault();
                submitQuery();
            }}
        >
            <ClickAwayListener onClickAway={() => setPopoverOpen(false)}>
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
                        <AccessFilterSelect value={accessFilter} onChange={(value) => submitQuery(value)} />
                    )}

                    <Box
                        sx={{
                            flex: 1,
                            minWidth: 0,
                        }}
                    >
                        <QueryComposer
                            definition={definition}
                            onChange={updateDefinition}
                            onSortChange={(sort) => {
                                if (definition.mode === "simple") {
                                    submitQuery(undefined, {
                                        ...definition,
                                        sort,
                                    });
                                }
                            }}
                            onFocus={() => setPopoverOpen(true)}
                            onCursorChange={setCursorPosition}
                            onKeyDown={handleInputKeyDown}
                            inputRef={inputRef}
                            placeholder={placeholder}
                            autoFocus={autoFocus}
                            popoverAnchorRef={popoverAnchorRef}
                        />
                    </Box>

                    <QueryPopover
                        open={popoverOpen}
                        anchorEl={popoverAnchorRef.current}
                        app={app}
                        definition={definition}
                        scope={storedScope}
                        suggestions={suggestions}
                        highlightedSuggestion={highlightedSuggestion}
                        onSelectSuggestion={selectSuggestion}
                        onSelectStoredQuery={(storedDefinition) => {
                            updateDefinition(storedDefinition);
                            submitQuery(undefined, storedDefinition);
                        }}
                        onModeChange={changeMode}
                        onDismiss={() => {
                            setPopoverOpen(false);
                            inputRef.current?.blur();
                        }}
                    />
                </Box>
            </ClickAwayListener>
        </form>
    );
}

export function QueryAutocompleteTextField({
    label,
    queryString,
    setQueryString,
    scope,
    disabled = false,
    placeholder = undefined,
}: {
    label: string;
    queryString: string;
    setQueryString: (queryString: string) => void;
    scope: string;
    disabled?: boolean;
    placeholder?: string;
}) {
    return (
        <QueryAutocomplete
            queryString={queryString}
            setQueryString={setQueryString}
            scope={scope}
            disabled={disabled}
            renderInput={(params) => {
                const startAdornment = params.slotProps?.input?.startAdornment;

                return (
                    <StyledTextField
                        {...params}
                        label={label}
                        placeholder={placeholder}
                        slotProps={{
                            ...params.slotProps,
                            htmlInput: {
                                ...params.slotProps?.htmlInput,
                                maxLength: 1000,
                            },
                            input: {
                                ...params.slotProps?.input,
                                startAdornment: startAdornment ? (
                                    <div
                                        style={{
                                            maxHeight: "100px",
                                            overflowY: "auto",
                                        }}
                                    >
                                        {startAdornment}
                                    </div>
                                ) : undefined,
                            },
                        }}
                    />
                );
            }}
        />
    );
}

export function QueryAutocomplete({
    queryString,
    setQueryString,
    scope,
    disabled = false,
    autoFocus,
    renderInput,
}: {
    queryString: string;
    setQueryString: (queryString: string) => void;
    scope: string;
    disabled?: boolean;
    autoFocus?: boolean;
    renderInput: (params: AutocompleteRenderInputParams) => React.ReactNode;
}) {
    const [queryAutocompleteSuggestions, setQueryAutocompleteSuggestions] = useState<QueryAutocompleteSuggestion[]>([]);

    const handleQueryChange = (cursorPos: number, query: string) => {
        setQueryAutocompleteSuggestions([]);
        if (scheduledAnalyzeQueryRequest) {
            clearTimeout(scheduledAnalyzeQueryRequest);
        }
        scheduledAnalyzeQueryRequest = setTimeout(async () => {
            const response = await http.post<AnalyzeQueryResponse>(
                "analyze-query",
                new AnalyzeQueryRequest(cursorPos, query, scope)
            );
            setQueryAutocompleteSuggestions(response.data.suggestions);
        }, 250);
    };

    return (
        <Autocomplete
            freeSolo
            autoFocus={autoFocus}
            disabled={disabled}
            renderInput={renderInput}
            fullWidth
            options={queryAutocompleteSuggestions}
            filterOptions={(x) => x}
            getOptionLabel={(option) => {
                if (typeof option === "string") {
                    return option;
                } else {
                    return option.display;
                }
            }}
            inputValue={queryString || ""}
            onInputChange={(e, v) => {
                setQueryString(v);
                let inputElement = e.currentTarget as HTMLInputElement;
                handleQueryChange(inputElement.selectionStart || v.length, v);
            }}
            value={queryString || ""}
            onChange={(_e, val) => {
                if (typeof val === "string") {
                    return;
                } else if (val) {
                    let prevVal = queryString;
                    let targetLocation = val.target_location;
                    let newVal = replaceStringRange(prevVal, targetLocation.start, targetLocation.end + 1, val.text);
                    setQueryString(newVal);
                    setQueryAutocompleteSuggestions([]);
                }
            }}
        />
    );
}

export function QueryAutocompleteSuggestionCombobox({
    queryString,
    setQueryString,
    scope,
    autoFocus = false,
    disabled = false,
    placeholder = undefined,
}: {
    queryString: string;
    setQueryString: (queryString: string) => void;
    scope: string;
    autoFocus?: boolean;
    disabled?: boolean;
    placeholder?: string;
}) {
    const [queryAutocompleteSuggestions, setQueryAutocompleteSuggestions] = useState<QueryAutocompleteSuggestion[]>([]);

    const handleQueryChange = (cursorPos: number, query: string) => {
        setQueryAutocompleteSuggestions([]);
        if (scheduledAnalyzeQueryRequest) {
            clearTimeout(scheduledAnalyzeQueryRequest);
        }
        scheduledAnalyzeQueryRequest = setTimeout(async () => {
            const response = await http.post<AnalyzeQueryResponse>(
                "analyze-query",
                new AnalyzeQueryRequest(cursorPos, query, scope)
            );
            setQueryAutocompleteSuggestions(response.data.suggestions);
        }, 250);
    };

    return (
        <Combobox
            hideCaret
            hideEmptyPopup
            data={queryAutocompleteSuggestions}
            textField="display"
            value={queryString}
            onChange={(value, event) => {
                if (typeof value === "string") {
                    setQueryString(value);
                    let inputElement = event.originalEvent!!.currentTarget as HTMLInputElement;
                    handleQueryChange(inputElement.selectionStart || value.length, value);
                } else {
                    let prevVal = event.lastValue as string;
                    let targetLocation = value.target_location;
                    let newVal = replaceStringRange(prevVal, targetLocation.start, targetLocation.end + 1, value.text);
                    setQueryString(newVal);
                    setQueryAutocompleteSuggestions([]);
                }
            }}
            placeholder={placeholder ?? "Search"}
            filter={() => true}
            autoFocus={autoFocus}
            inputProps={{ autoFocus: autoFocus }}
            disabled={disabled}
            onKeyDown={(e) => {
                let { key } = e;
                if (key === "Escape") {
                    // prevent propagating escape key in case it would close surrounding modal
                    e.stopPropagation();
                }
            }}
        ></Combobox>
    );
}

export function QueryAutocompleteSearchBox({
    queryString,
    setQueryString,
    scope,
    autoFocus = false,
    onSubmit,
    isLoading = false,
    placeholder = "Search",
}: {
    queryString: string;
    setQueryString: (queryString: string) => void;
    scope: string;
    autoFocus?: boolean;
    onSubmit: () => void;
    isLoading?: boolean;
    placeholder?: string;
}) {
    return (
        <form
            id="QueryAutocompleteSuggestionSearchBox"
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
            }}
        >
            <QueryAutocomplete
                autoFocus={autoFocus}
                queryString={queryString}
                setQueryString={setQueryString}
                scope={scope}
                disabled={isLoading}
                renderInput={(params) => {
                    const startAdornment = params.slotProps?.input?.startAdornment;

                    return (
                        <StyledTextField
                            {...params}
                            fullWidth
                            size="small"
                            placeholder={placeholder}
                            slotProps={{
                                ...params.slotProps,
                                htmlInput: {
                                    ...params.slotProps?.htmlInput,
                                    maxLength: 1000,
                                },
                                input: {
                                    ...params.slotProps?.input,
                                    startAdornment: startAdornment ? (
                                        <div
                                            style={{
                                                maxHeight: "100px",
                                                overflowY: "auto",
                                            }}
                                        >
                                            {startAdornment}
                                        </div>
                                    ) : undefined,
                                    endAdornment: (
                                        <InputAdornment
                                            position="end"
                                            sx={{
                                                marginRight: isLoading ? "" : "-30px",
                                            }}
                                        >
                                            <IconButton type="submit" size="small" disabled={isLoading}>
                                                {isLoading ? (
                                                    <FontAwesomeIcon icon={faCircleNotch} spin />
                                                ) : (
                                                    <SearchIcon />
                                                )}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                },
                            }}
                        />
                    );
                }}
            />
        </form>
    );
}
