import { Autocomplete, Chip, TextField } from "@mui/material";
import { useState } from "react";
import { Tag } from "./Model";
import http from "./http-common";
import App, { ModalContent } from "./App";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { solid } from "@fortawesome/fontawesome-svg-core/import.macro";
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

export function TagSelector({ setSelectedTags, setEnteredTags, limit = 100 }: { setSelectedTags: (v: number[]) => void, setEnteredTags?: (v: string[]) => void, limit?: number }) {
    const [suggestedTags, setSuggestedTags] = useState<{ label: string, pk: number }[]>([]);
    const [inputDisabled, setInputDisabled] = useState(false);

    let scheduledRequest: NodeJS.Timeout | null = null;

    return (
        <>
            <Autocomplete
                multiple
                freeSolo={setEnteredTags !== undefined}
                disabled={inputDisabled}
                options={suggestedTags}
                renderInput={params => {
                    const { InputProps, ...restParams } = params;
                    const { startAdornment, ...restInputProps } = InputProps;
                    return <TextField {...restParams} InputProps={{ ...restInputProps, startAdornment: (startAdornment && <div style={{ maxHeight: "200px", overflowY: "auto" }}>{startAdornment}</div>) }} label="Tags"></TextField>;
                }}
                filterOptions={x => x}
                renderTags={(tagValue, getTagProps) => tagValue.map((option, index) => (
                    <Chip {...getTagProps({ index })} color="secondary" variant="outlined" label={typeof option === "string" ? option : option.label} disabled={false}></Chip>
                ))}
                onInputChange={(_e, newVal) => {
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
                            const response = await http.get<FindTagResponse>(`/find-tag/${newVal}`);
                            const findTagResponse = response.data;
                            let newSuggestions = [];
                            if (findTagResponse.exact_match) {
                                newSuggestions.push({ label: findTagResponse.exact_match.tag_name, pk: findTagResponse.exact_match.pk });
                            }

                            findTagResponse.suggestions.forEach(suggestion => newSuggestions.push({ label: suggestion.tag_name, pk: suggestion.pk }));

                            setSuggestedTags(newSuggestions);
                        }, 100);
                    }
                }}
                onChange={(_e, newVal) => {
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
        <form className="modal-form" onSubmit={async e => {
            e.preventDefault();

            const loadingModal = app.openModal("", <FontAwesomeIcon icon={solid("circle-notch")} spin></FontAwesomeIcon>, undefined, false);
            try {
                let config = await app.getAuthorization(location, navigate);
                let response = await http.post<UpsertTagResponse>("/upsert-tag", new UpsertTagRequest(tagName, parentPks, aliasPks), config);
                loadingModal.close();
                modal.close(response.data);
            } catch (e) {
                loadingModal.close();
                throw e;
            }
        }}>
            <table className="fieldset-container">
                <tbody>
                    <tr className="form-row padded-row">
                        <td className="form-label"><label>Tag Name</label></td>
                        <td className="form-field"><TextField InputProps={{ className: "material-input" }} inputProps={{ maxLength: 50 }} variant="outlined" value={tagName} onChange={e => setTagName(e.currentTarget.value)} required></TextField></td>
                    </tr>
                    <tr className="form-row padded-row">
                        <td className="form-label"><label>Parents</label></td>
                        <td className="form-field"><div className="tag-selector-div"><TagSelector setSelectedTags={setParentPks} limit={25}></TagSelector></div></td>
                    </tr>
                    <tr className="form-row padded-row">
                        <td className="form-label"><label>Aliases</label></td>
                        <td className="form-field"><div className="tag-selector-div"><TagSelector setSelectedTags={setAliasPks} limit={25}></TagSelector></div></td>
                    </tr>
                </tbody>
            </table>

            <div className="modal-form-submit-btn"><button type="submit" className="standard-button-large" disabled={tagName.length === 0}>Create</button></div>
        </form>
    );
}