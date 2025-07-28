import {Combobox} from "@filebroker/react-widgets/lib/cjs";
import React, {useEffect, useState} from "react";
import {AnalyzeQueryRequest, AnalyzeQueryResponse, QueryAutocompleteSuggestion} from "../Model";
import http from "../http-common";
import {replaceStringRange} from "../Util";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {solid} from "@fortawesome/fontawesome-svg-core/import.macro";
import "./QueryInput.css";
import {Autocomplete, IconButton, InputAdornment} from "@mui/material";
import {StyledTextField} from "../index";
import {useLocation, useNavigate} from "react-router-dom";
import {AutocompleteRenderInputParams} from "@mui/material/Autocomplete/Autocomplete";
import SearchIcon from '@mui/icons-material/Search';

let scheduledAnalyzeQueryRequest: NodeJS.Timeout | null = null;

export function GlobalQueryInput({ hideOnHome }: { hideOnHome?: boolean }) {
    const location = useLocation();
    const search = location.search;
    const navigate = useNavigate();
    const pathName = location.pathname;

    let searchParams = new URLSearchParams(search);
    let queryParam: string = searchParams.get("query") ?? "";
    const [queryString, setQueryString] = useState(queryParam);

    useEffect(() => {
        setQueryString(queryParam);
    }, [location]);

    if (hideOnHome && pathName === "/") {
        return null;
    }

    let searchSite = "/posts";
    if (pathName === "/collections") {
        searchSite = pathName;
    } else if (pathName.startsWith("/collection/")) {
        searchSite = pathName.split("/").filter((part) => part.length > 0).slice(0, 2).join("/");
    }

    let scope = "post";
    let placeholder = "Search Post";
    if (pathName.startsWith("/collection/")) {
        scope = "collection_item";
        const collectionId = pathName.split("/")[2];
        scope += `_${collectionId}`;
        placeholder = "Search Within Collection";
    } else if (pathName.startsWith("/collections")) {
        scope = "collection";
        placeholder = "Search Collection";
    }

    return (
        <form style={{ width: "100%" }} onSubmit={e => {
            e.preventDefault();
            let searchParams = new URLSearchParams();
            searchParams.set("query", queryString);
            navigate({ pathname: searchSite, search: searchParams.toString() });
            document.getElementById("App")?.focus();

            // hack: input field on PostSearch page remains focused after submitting query, since the input field cannot be accessed directly (ref prop gets overridden)
            // retrieve it via id and blur
            if (hideOnHome) {
                document.querySelectorAll("[id^=rw_][id$=_input]").forEach(el => {
                    if (el instanceof HTMLElement) {
                        el.blur();
                    }
                });
            }
        }}>
            <QueryAutocomplete
                queryString={queryString}
                setQueryString={setQueryString}
                scope={scope}
                renderInput={(params) => {
                    const { InputProps, inputProps, ...restParams } = params;
                    const { startAdornment, ...restInputProps } = InputProps;
                    return <StyledTextField
                        {...restParams}
                        fullWidth
                        size="small"
                        placeholder={placeholder}
                        inputProps={{ ...inputProps, maxLength: 1000 }}
                        InputProps={{
                            ...restInputProps,
                            startAdornment: (startAdornment && <div style={{ maxHeight: "100px", overflowY: "auto" }}>{startAdornment}</div>),
                            endAdornment: <InputAdornment position="end" sx={{ marginRight: "-30px" }}>
                                <IconButton type="submit" size="small"><SearchIcon/></IconButton>
                            </InputAdornment>
                        }}
                    />;
                }}
            />
        </form>
    );
}

export function QueryAutocompleteTextField({ label, queryString, setQueryString, scope, disabled = false, placeholder = undefined }: {
    label: string,
    queryString: string,
    setQueryString: (queryString: string) => void,
    scope: string,
    disabled?: boolean,
    placeholder?: string,
}) {
    return (
        <QueryAutocomplete
            queryString={queryString}
            setQueryString={setQueryString}
            scope={scope}
            disabled={disabled}
            renderInput={(params) => {
                const { InputProps, inputProps, ...restParams } = params;
                const { startAdornment, ...restInputProps } = InputProps;
                return <StyledTextField
                    {...restParams}
                    label={label}
                    placeholder={placeholder}
                    inputProps={{ ...inputProps, maxLength: 1000 }}
                    InputProps={{ ...restInputProps, startAdornment: (startAdornment && <div style={{ maxHeight: "100px", overflowY: "auto" }}>{startAdornment}</div>) }}
                />;
            }}
        />
    );
}

export function QueryAutocomplete({ queryString, setQueryString, scope, disabled = false, renderInput }: {
    queryString: string,
    setQueryString: (queryString: string) => void,
    scope: string,
    disabled?: boolean,
    renderInput: (params: AutocompleteRenderInputParams) => React.ReactNode,
}) {
    const [queryAutocompleteSuggestions, setQueryAutocompleteSuggestions] = useState<QueryAutocompleteSuggestion[]>([]);

    const handleQueryChange = (cursorPos: number, query: string) => {
        setQueryAutocompleteSuggestions([]);
        if (scheduledAnalyzeQueryRequest) {
            clearTimeout(scheduledAnalyzeQueryRequest);
        }
        scheduledAnalyzeQueryRequest = setTimeout(async () => {
            const response = await http.post<AnalyzeQueryResponse>("analyze-query", new AnalyzeQueryRequest(cursorPos, query, scope));
            setQueryAutocompleteSuggestions(response.data.suggestions);
        }, 250);
    }

    return (
        <Autocomplete
            freeSolo
            disabled={disabled}
            renderInput={renderInput}
            fullWidth
            options={queryAutocompleteSuggestions}
            filterOptions={x => x}
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

export function QueryAutocompleteSuggestionCombobox({ queryString, setQueryString, scope, autoFocus = false, disabled = false, placeholder = undefined }: {
    queryString: string,
    setQueryString: (queryString: string) => void,
    scope: string,
    autoFocus?: boolean,
    disabled?: boolean,
    placeholder?: string,
}) {
    const [queryAutocompleteSuggestions, setQueryAutocompleteSuggestions] = useState<QueryAutocompleteSuggestion[]>([]);

    const handleQueryChange = (cursorPos: number, query: string) => {
        setQueryAutocompleteSuggestions([]);
        if (scheduledAnalyzeQueryRequest) {
            clearTimeout(scheduledAnalyzeQueryRequest);
        }
        scheduledAnalyzeQueryRequest = setTimeout(async () => {
            const response = await http.post<AnalyzeQueryResponse>("analyze-query", new AnalyzeQueryRequest(cursorPos, query, scope));
            setQueryAutocompleteSuggestions(response.data.suggestions);
        }, 250);
    }

    return (
        <Combobox hideCaret hideEmptyPopup data={queryAutocompleteSuggestions} textField="display" value={queryString} onChange={(value, event) => {
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
        }} placeholder={placeholder ?? "Search"} filter={() => true} autoFocus={autoFocus} inputProps={{ autoFocus: autoFocus }} disabled={disabled} onKeyDown={(e) => {
            let { key } = e;
            if (key === "Escape") {
                // prevent propagating escape key in case it would close surrounding modal
                e.stopPropagation();
            }
        }}></Combobox>
    );
}

export function QueryAutocompleteSuggestionSearchBox({ queryString, setQueryString, scope, autoFocus = false, onSubmit, isLoading = false }: {
    queryString: string,
    setQueryString: (queryString: string) => void,
    scope: string,
    autoFocus?: boolean,
    onSubmit: () => void,
    isLoading?: boolean
}) {
    return (
        <form id="QueryAutocompleteSuggestionSearchBox" onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
        }}>
            <QueryAutocompleteSuggestionCombobox queryString={queryString} setQueryString={setQueryString} scope={scope} autoFocus={autoFocus} disabled={isLoading} />
            <button className="search-button" type="submit" disabled={isLoading}>{isLoading ? <FontAwesomeIcon icon={solid("circle-notch")} spin /> : <FontAwesomeIcon icon={solid("magnifying-glass")}></FontAwesomeIcon>}</button>
        </form>
    );
}
