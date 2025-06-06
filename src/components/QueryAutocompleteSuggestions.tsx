import {Combobox} from "@filebroker/react-widgets/lib/cjs";
import {useState} from "react";
import {AnalyzeQueryRequest, AnalyzeQueryResponse, QueryAutocompleteSuggestion} from "../Model";
import http from "../http-common";
import {replaceStringRange} from "../Util";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {solid} from "@fortawesome/fontawesome-svg-core/import.macro";
import "./QueryAutocompleteSuggestions.css";
import {Autocomplete} from "@mui/material";
import {StyledTextField} from "../index";

let scheduledAnalyzeQueryRequest: NodeJS.Timeout | null = null;

export function QueryAutocompleteTextField({ label, queryString, setQueryString, scope, disabled = false, placeholder = undefined }: {
    label: string,
    queryString: string,
    setQueryString: (queryString: string) => void,
    scope: string,
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
        <Autocomplete
            freeSolo
            disabled={disabled}
            renderInput={(params) => {
                const { InputProps, inputProps, ...restParams } = params;
                const { startAdornment, ...restInputProps } = InputProps;
                return <StyledTextField
                    {...restParams}
                    label={label}
                    inputProps={{ ...inputProps, maxLength: 1000 }}
                    InputProps={{ ...restInputProps, startAdornment: (startAdornment && <div style={{ maxHeight: "100px", overflowY: "auto" }}>{startAdornment}</div>) }}
                />;
            }}
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
