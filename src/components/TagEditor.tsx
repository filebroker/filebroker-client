import { Autocomplete, Button, Chip, FormGroup, FormLabelProps, TextField, useTheme } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { Tag } from "../Model";
import http from "../http-common";
import App, { ModalContent } from "../App";
import { useLocation, useNavigate } from "react-router-dom";

class FindTagResponse {
    exact_match: Tag | null;
    suggestions: Tag[];

    constructor(
        exact_match: Tag | null,
        suggestions: Tag[]
    ) {
        this.exact_match = exact_match;
        this.suggestions = suggestions;
    }
}

class UpsertTagRequest {
    tag_name: string;
    parent_pks: number[] | null;
    alias_pks: number[] | null;

    constructor(
        tag_name: string,
        parent_pks: number[] | null,
        alias_pks: number[] | null
    ) {
        this.tag_name = tag_name;
        this.parent_pks = parent_pks;
        this.alias_pks = alias_pks;
    }
}

class UpsertTagResponse {
    inserted: boolean;
    tag_pk: number;

    constructor(inserted: boolean, tag_pk: number) {
        this.inserted = inserted;
        this.tag_pk = tag_pk;
    }
}

export function TagSelector({ setSelectedTags, setEnteredTags, limit = 100, values = [], readOnly = false, label, onTagClick, color }: {
    setSelectedTags: (v: number[]) => void,
    setEnteredTags?: (v: string[]) => void,
    limit?: number,
    values?: (string | { label: string, pk: number })[],
    readOnly?: boolean,
    label?: string,
    onTagClick?: (tag: (string | { label: string, pk: number })) => void,
    color?: FormLabelProps["color"]
}) {
    const [suggestedTags, setSuggestedTags] = useState<{ label: string, pk: number }[]>([]);
    const [inputDisabled, setInputDisabled] = useState(false);
    const [value, setValue] = useState(values);
    const [textInputValue, setTextInputValue] = useState("");

    const theme = useTheme();

    let scheduledRequest: NodeJS.Timeout | null = null;

    function tagArrayEquals(a1: (string | { label: string, pk: number })[], a2: (string | { label: string, pk: number })[]) {
        if (a1.length !== a2.length) return false;
        for (let i = 0; i < a1.length; i++) {
            let v1 = a1[i];
            let v2 = a2[i];
            if (typeof v1 === "string") {
                if (typeof v2 === "string") {
                    if (v1 !== v2) {
                        return false;
                    }
                } else {
                    return false;
                }
            } else {
                if (typeof v2 === "string") {
                    return false;
                } else {
                    if (v1.pk !== v2.pk) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    type MaybeCleanUpFn = void | (() => void);
    function useTagArrayEffect(cb: () => MaybeCleanUpFn, deps: (string | { label: string, pk: number })[]) {
        const ref = useRef<(string | { label: string, pk: number })[]>(deps);

        if (!tagArrayEquals(deps, ref.current)) {
            ref.current = deps;
        }

        useEffect(cb, [ref.current]);
    }

    useTagArrayEffect(() => {
        setValue(values);
    }, values);

    // clear text input when toggling edit mode
    useEffect(() => {
        setTextInputValue("");
    }, [readOnly]);

    return (
        <>
            <Autocomplete
                multiple
                freeSolo={setEnteredTags !== undefined}
                disabled={inputDisabled || readOnly}
                options={suggestedTags}
                value={value}
                inputValue={textInputValue}
                readOnly={readOnly}
                renderInput={params => {
                    const { InputProps, ...restParams } = params;
                    const { startAdornment, ...restInputProps } = InputProps;
                    return <TextField
                        {...restParams}
                        InputProps={{ ...restInputProps, startAdornment: (startAdornment && <div style={{ maxHeight: "100px", overflowY: "auto" }}>{startAdornment}</div>) }}
                        InputLabelProps={readOnly ? { shrink: true } : undefined}
                        label={label ?? "Tags"}
                        placeholder={(value && value.length > 0) || readOnly ? undefined : "Enter a tag and hit enter"}
                        sx={{
                            "& .MuiInputLabel-root.Mui-disabled": {
                                color: color ? theme.palette[color].main : "white",
                            },
                            "& .MuiInputBase-root.Mui-disabled": {
                                "& > fieldset": {
                                    borderColor: color ? theme.palette[color].main : "rgba(0, 0, 0, 0.23)",
                                    color: "white",
                                }
                            }
                        }}
                    />;
                }}
                filterOptions={x => x}
                renderTags={(tagValue, getTagProps) => tagValue.map((option, index) => (
                    <Chip {...getTagProps({ index })} color="secondary" variant="outlined" label={typeof option === "string" ? option : option.label} disabled={false} onClick={onTagClick && readOnly ? () => onTagClick(option) : undefined}></Chip>
                ))}
                onInputChange={(_e, newVal) => {
                    setTextInputValue(newVal);
                    if (scheduledRequest) {
                        clearTimeout(scheduledRequest);
                    }
                    if (!newVal) {
                        setSuggestedTags([]);
                    }
                    if (newVal && newVal.length === 0) {
                        setSuggestedTags([]);
                    } else if (newVal) {
                        scheduledRequest = setTimeout(async () => {
                            const response = await http.get<FindTagResponse>(`/find-tag/${encodeURIComponent(newVal)}`);
                            const findTagResponse = response.data;
                            let newSuggestions = [];
                            if (findTagResponse.exact_match) {
                                newSuggestions.push({ label: findTagResponse.exact_match.tag_name, pk: findTagResponse.exact_match.pk });
                            }

                            findTagResponse.suggestions.forEach(suggestion => newSuggestions.push({ label: suggestion.tag_name, pk: suggestion.pk }));

                            setSuggestedTags(newSuggestions);
                        }, 250);
                    }
                }}
                onChange={(_e, newVal) => {
                    setValue(newVal);
                    let selectedTags: number[] = [];
                    let enteredTags: string[] = [];

                    newVal.forEach(v => {
                        if (typeof v === "string") {
                            enteredTags.push(v);
                        } else {
                            selectedTags.push(v.pk);
                        }
                    });

                    setSelectedTags(selectedTags);
                    if (setEnteredTags) {
                        setEnteredTags(enteredTags);
                    }
                    if (newVal.length >= limit) {
                        setInputDisabled(true);
                    } else if (inputDisabled) {
                        setInputDisabled(false);
                    }
                }}
            />
        </>
    );
}

export function TagCreator({ app, modal }: { app: App, modal: ModalContent }) {
    const location = useLocation();
    const navigate = useNavigate();

    const [tagName, setTagName] = useState("");
    const [parentPks, setParentPks] = useState<number[]>([]);
    const [aliasPks, setAliasPks] = useState<number[]>([]);

    return (
        <div id="TagEditor" style={{ minWidth: "250px", padding: "5px" }}>
            <form className="modal-form" onSubmit={async e => {
                e.preventDefault();

                const loadingModal = app.openLoadingModal();
                try {
                    let config = await app.getAuthorization(location, navigate);
                    let response = await http.post<UpsertTagResponse>("/upsert-tag", new UpsertTagRequest(tagName, parentPks, aliasPks), config);
                    loadingModal.close();
                    modal.close(response.data);
                } catch (e: any) {
                    loadingModal.close();
                    if (e.response?.status === 401) {
                        app.openModal("Error", <p>Your credentials have expired, try refreshing the page.</p>);
                    } else {
                        app.openModal("Error", <p>An error occurred saving the tag.</p>);
                    }
                    throw e;
                }
            }}>
                <FormGroup className="form-container">
                    <TextField inputProps={{ maxLength: 50 }} variant="outlined" value={tagName} onChange={e => setTagName(e.currentTarget.value)} label="Tag Name" required />
                    <TagSelector setSelectedTags={setParentPks} limit={25} label="Parents" />
                    <TagSelector setSelectedTags={setAliasPks} limit={25} label="Aliases" />

                    <div className="modal-form-submit-btn"><Button color="secondary" type="submit" disabled={tagName.length === 0}>Create</Button></div>
                </FormGroup>
            </form>
        </div>
    );
}
