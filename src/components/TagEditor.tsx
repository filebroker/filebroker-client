import {
    Autocomplete,
    Button,
    Chip,
    FormGroup,
    FormLabelProps, ListItem, ListItemIcon, ListItemText,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    useTheme
} from "@mui/material";
import React, {useEffect, useRef, useState} from "react";
import {getIconForTagCategory, Tag, TagCategory, TagDetailed} from "../Model";
import http from "../http-common";
import App, {ModalContent} from "../App";
import {Link, useLocation, useNavigate} from "react-router-dom";
import {FontAwesomeSvgIcon} from "./FontAwesomeSvgIcon";
import {solid} from "@fortawesome/fontawesome-svg-core/import.macro";
import {ReadOnlyTextField, StyledAutocomplete} from "../index";
import {QueryAutocompleteTextField} from "./QueryInput";
import {enqueueSnackbar} from "notistack";

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
    tag_category: string | null;
    auto_match_condition_post: string | null;
    auto_match_condition_collection: string | null;

    constructor(
        tag_name: string,
        parent_pks: number[] | null,
        alias_pks: number[] | null,
        tag_category: string | null,
        auto_match_condition_post: string | null,
        auto_match_condition_collection: string | null
    ) {
        this.tag_name = tag_name;
        this.parent_pks = parent_pks;
        this.alias_pks = alias_pks;
        this.tag_category = tag_category;
        this.auto_match_condition_post = auto_match_condition_post;
        this.auto_match_condition_collection = auto_match_condition_collection;
    }
}

class UpsertTagResponse {
    inserted: boolean;
    tag_detailed: TagDetailed;

    constructor(inserted: boolean, tag_detailed: TagDetailed) {
        this.inserted = inserted;
        this.tag_detailed = tag_detailed;
    }
}

export function TagSelector({ setSelectedTags, setEnteredTags, limit = 100, values = [], readOnly = false, label, onTagClick, color, enableTagLink }: {
    setSelectedTags: (v: number[]) => void,
    setEnteredTags?: (v: string[]) => void,
    limit?: number,
    values?: (string | Tag)[],
    readOnly?: boolean,
    label?: string,
    onTagClick?: (tag: (string | Tag)) => void,
    color?: FormLabelProps["color"],
    enableTagLink?: boolean,
}) {
    const [suggestedTags, setSuggestedTags] = useState<Tag[]>([]);
    const [inputDisabled, setInputDisabled] = useState(false);
    const [value, setValue] = useState(values);
    const [textInputValue, setTextInputValue] = useState("");

    const theme = useTheme();

    let scheduledRequest: NodeJS.Timeout | null = null;

    function tagArrayEquals(a1: (string | Tag)[], a2: (string | Tag)[]) {
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
    function useTagArrayEffect(cb: () => MaybeCleanUpFn, deps: (string | Tag)[]) {
        const ref = useRef<(string | Tag)[]>(deps);

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
                getOptionLabel={(option) => typeof option === "string" ? option : option.tag_name}
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
                renderTags={(tagValue, getTagProps) => tagValue.map((option, index) => enableTagLink && readOnly && !(typeof option === "string") ? (
                    <Chip
                        {...getTagProps({index})}
                        color="secondary"
                        variant="outlined"
                        label={typeof option === "string" ? option : option.tag_name}
                        disabled={false}
                        onClick={onTagClick && readOnly ? () => onTagClick(option) : undefined}
                        icon={typeof option === "string" || !(option.tag_category) ? undefined : getIconForTagCategory(option.tag_category)}
                        component={Link}
                        to={`/tag/${option.pk}`}
                        clickable
                    />
                ) : (
                    <Chip
                        {...getTagProps({index})}
                        color="secondary"
                        variant="outlined"
                        label={typeof option === "string" ? option : option.tag_name}
                        disabled={false}
                        onClick={onTagClick && readOnly ? () => onTagClick(option) : undefined}
                        icon={typeof option === "string" || !(option.tag_category) ? undefined : getIconForTagCategory(option.tag_category)}
                    />
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
                                newSuggestions.push(findTagResponse.exact_match);
                            }

                            findTagResponse.suggestions.forEach(suggestion => newSuggestions.push(suggestion));

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
    const [tagCategoryInput, setTagCategoryInput] = useState<string>("");
    const [tagCategory, setTagCategory] = useState<TagCategory | null>(null);
    const [autoMatchConditionPost, setAutoMatchConditionPost] = useState("");
    const [autoMatchConditionCollection, setAutoMatchConditionCollection] = useState("");

    const [tagCategories, setTagCategories] = useState<TagCategory[]>([]);
    useEffect(() => {
        http.get<TagCategory[]>(`/get-tag-categories`).then(response => {
            setTagCategories(response.data);
        }).catch(e => console.error("Failed to load tag categories", e));
    }, []);

    return (
        <div id="TagEditor" style={{ minWidth: "400px", padding: "5px" }}>
            <form className="modal-form" onSubmit={async e => {
                e.preventDefault();

                const loadingModal = app.openLoadingModal();
                try {
                    let config = await app.getAuthorization(location, navigate);
                    let response = await http.post<UpsertTagResponse>(
                        "/upsert-tag",
                        new UpsertTagRequest(
                            tagName,
                            parentPks,
                            aliasPks,
                            tagCategory?.id ?? "",
                            app.getUser()?.is_admin ? autoMatchConditionPost : null,
                            app.getUser()?.is_admin ? autoMatchConditionCollection : null
                        ),
                        config
                    );
                    loadingModal.close();
                    modal.close(response.data);
                    enqueueSnackbar({
                        message: response.data.inserted ? "Tag created" : "Tag updated",
                        variant: "success"
                    });
                } catch (e: any) {
                    loadingModal.close();
                    let compilation_errors = e.response?.data?.compilation_errors;
                    if (compilation_errors) {
                        app.openModal("Error", <div>Failed to compile auto match condition: {compilation_errors[0]?.msg ?? "Unexpected Error"}</div>);
                    } else if (e.response?.status === 401) {
                        app.openModal("Error", <p>Your credentials have expired, try refreshing the page.</p>);
                    } else {
                        app.openModal("Error", <p>An error occurred saving the tag.</p>);
                    }
                    throw e;
                }
            }}>
                <FormGroup className="form-container">
                    <TextField inputProps={{ maxLength: 50 }} variant="outlined" value={tagName} onChange={e => setTagName(e.currentTarget.value)} label="Tag Name" required />
                    <TagSelector setSelectedTags={setParentPks} limit={25} label="Parents" enableTagLink />
                    <TagSelector setSelectedTags={setAliasPks} limit={25} label="Aliases" enableTagLink />
                    <StyledAutocomplete
                        id="tag-category-select"
                        label="Category"
                        options={tagCategories}
                        value={tagCategory}
                        onChange={(_event: any, newValue: TagCategory | null) => setTagCategory(newValue)}
                        inputValue={tagCategoryInput}
                        onInputChange={(_event: any, newInputValue: string) => setTagCategoryInput(newInputValue)}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        renderOption={(props, option) => (
                            <ListItem {...props}>
                                <ListItemIcon>
                                    {getIconForTagCategory(option.id)}
                                </ListItemIcon>
                                <ListItemText primary={option.label} />
                            </ListItem>
                        )}
                    />
                    {app.getUser()?.is_admin && <div className="material-row-flex">
                        <QueryAutocompleteTextField
                            queryString={autoMatchConditionPost}
                            setQueryString={v => setAutoMatchConditionPost(v)}
                            label="Auto Match Condition Post"
                            scope="tag_auto_match_post"
                        />
                    </div>}
                    {app.getUser()?.is_admin && <div className="material-row-flex">
                        <QueryAutocompleteTextField
                            queryString={autoMatchConditionCollection}
                            setQueryString={v => setAutoMatchConditionCollection(v)}
                            label="Auto Match Condition Collection"
                            scope="tag_auto_match_collection"
                        />
                    </div>}

                    <div className="modal-form-submit-btn"><Button color="secondary" type="submit" disabled={tagName.length === 0}>Create</Button></div>
                </FormGroup>
            </form>
        </div>
    );
}

export function TagCategoryList({app, modal}: { app: App, modal: ModalContent }) {
    const [tagCategories, setTagCategories] = useState<TagCategory[]>([]);

    const loadCategories = () => {
        const loadingModal = app.openLoadingModal();
        http.get<TagCategory[]>(`/get-tag-categories`).then(response => {
            loadingModal.close();
            setTagCategories(response.data);
        }).catch(e => {
            loadingModal.close();
            modal.close();
            app.openModal("Error", <p>An error occurred loading the tag categories.</p>);
        })
    };

    useEffect(() => {
        loadCategories();
    }, []);

    return (
        <div id="TagCategoryList" style={{minWidth: "400px", padding: "5px"}}>
            <TableContainer component={Paper}>
                <Table sx={{minWidth: 500}}>
                    <TableHead>
                        <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Label</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {tagCategories.map(tagCategory => (
                            <TableRow key={tagCategory.id}
                                      sx={{cursor: "pointer", '&:last-child td, &:last-child th': {border: 0}}} hover
                                      onClick={() => {
                                          app.openModal(
                                              "Edit Tag Category",
                                              categoryEditModal => <TagCategoryEditor app={app}
                                                                                      modal={categoryEditModal}
                                                                                      tagCategory={tagCategory}/>,
                                              (result) => {
                                                  if (result) {
                                                      loadCategories();
                                                  }
                                              }
                                          );
                                      }}>
                                <TableCell>{tagCategory.id}</TableCell>
                                <TableCell component="th" scope="row">{tagCategory.label}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <div className="button-row">
                <Button startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("add")}/>}
                        disabled={!app.isLoggedIn()} onClick={e => {
                    e.preventDefault();
                    app.openModal(
                        "Create Tag Category",
                        createCategoryModal => <TagCategoryCreator app={app}
                                                                   modal={createCategoryModal}></TagCategoryCreator>,
                        (result) => {
                            if (result) {
                                loadCategories();
                            }
                        });
                }}>Create</Button>
            </div>
        </div>
    );
}

export function TagCategoryCreator({ app, modal }: { app: App, modal: ModalContent }) {
    const location = useLocation();
    const navigate = useNavigate();

    const [id, setId] = useState("");
    const [label, setLabel] = useState("");
    const [autoMatchConditionPost, setAutoMatchConditionPost] = useState("");
    const [autoMatchConditionCollection, setAutoMatchConditionCollection] = useState("");

    return (
        <div id="TagCategoryCreator" style={{ minWidth: "400px", padding: "5px" }}>
            <form className="modal-form" onSubmit={async e => {
                e.preventDefault();

                const loadingModal = app.openLoadingModal();
                try {
                    let config = await app.getAuthorization(location, navigate);
                    let response = await http.post<UpsertTagResponse>("/create-tag-category", {
                        id: id,
                        label: label,
                        auto_match_condition_post: autoMatchConditionPost,
                        auto_match_condition_collection: autoMatchConditionCollection
                    }, config);
                    loadingModal.close();
                    modal.close(response.data);
                } catch (e: any) {
                    loadingModal.close();
                    let compilation_errors = e.response?.data?.compilation_errors;
                    if (compilation_errors) {
                        app.openModal("Error", <div>Failed to compile auto match condition: {compilation_errors[0]?.msg ?? "Unexpected Error"}</div>);
                    } else if (e.response?.status === 401) {
                        app.openModal("Error", <p>Your credentials have expired, try refreshing the page.</p>);
                    } else if (e.response?.status === 403) {
                        app.openModal("Error", <p>Only admin users have permission to create tag categories.</p>);
                    } else {
                        app.openModal("Error", <p>An error occurred saving the tag category.</p>);
                    }
                }
            }}>
                <FormGroup className="form-container">
                    <TextField inputProps={{ maxLength: 255 }} variant="outlined" value={id} onChange={e => setId(e.currentTarget.value)} label="ID" required />
                    <TextField inputProps={{ maxLength: 255 }} variant="outlined" value={label} onChange={e => setLabel(e.currentTarget.value)} label="Label" required />
                    <QueryAutocompleteTextField
                        queryString={autoMatchConditionPost}
                        setQueryString={v => setAutoMatchConditionPost(v)}
                        scope="tag_auto_match_post"
                        label="Auto Match Condition Post"
                    />
                    <QueryAutocompleteTextField
                        queryString={autoMatchConditionCollection}
                        setQueryString={v => setAutoMatchConditionCollection(v)}
                        scope="tag_auto_match_collection"
                        label="Auto Match Condition Collection"
                    />

                    <div className="modal-form-submit-btn"><Button color="secondary" type="submit" disabled={id.length === 0 || label.length === 0}>Create</Button></div>
                </FormGroup>
            </form>
        </div>
    );
}

export function TagCategoryEditor({app, modal, tagCategory}: {
    app: App,
    modal: ModalContent,
    tagCategory: TagCategory
}) {
    const location = useLocation();
    const navigate = useNavigate();

    const [label, setLabel] = useState(tagCategory.label);
    const [autoMatchConditionPost, setAutoMatchConditionPost] = useState(tagCategory.auto_match_condition_post || "");
    const [autoMatchConditionCollection, setAutoMatchConditionCollection] = useState(tagCategory.auto_match_condition_collection || "");

    return (
        <div id="TagCategoryCreator" style={{minWidth: "400px", padding: "5px"}}>
            <form className="modal-form" onSubmit={async e => {
                e.preventDefault();

                const loadingModal = app.openLoadingModal();
                try {
                    let config = await app.getAuthorization(location, navigate);
                    let response = await http.post<UpsertTagResponse>("/update-tag-category", {
                        id: tagCategory.id,
                        label: label,
                        auto_match_condition_post: autoMatchConditionPost,
                        auto_match_condition_collection: autoMatchConditionCollection
                    }, config);
                    loadingModal.close();
                    modal.close(response.data);
                } catch (e: any) {
                    loadingModal.close();
                    let compilation_errors = e.response?.data?.compilation_errors;
                    if (compilation_errors) {
                        app.openModal("Error", <div>Failed to compile auto match condition: {compilation_errors[0]?.msg ?? "Unexpected Error"}</div>);
                    } else if (e.response?.status === 401) {
                        app.openModal("Error", <p>Your credentials have expired, try refreshing the page.</p>);
                    } else if (e.response?.status === 403) {
                        app.openModal("Error", <p>Only admin users have permission to update tag categories.</p>);
                    } else {
                        app.openModal("Error", <p>An error occurred saving the tag category.</p>);
                    }
                }
            }}>
                <FormGroup className="form-container">
                    <ReadOnlyTextField variant="standard" value={tagCategory.id} label="ID"/>
                    <TextField inputProps={{maxLength: 255}} variant="outlined" value={label}
                               onChange={e => setLabel(e.currentTarget.value)} label="Label" required/>
                    <QueryAutocompleteTextField
                        queryString={autoMatchConditionPost || ""}
                        setQueryString={v => setAutoMatchConditionPost(v)}
                        scope="tag_auto_match_post"
                        label="Auto Match Condition Post"
                    />
                    <QueryAutocompleteTextField
                        queryString={autoMatchConditionCollection}
                        setQueryString={v => setAutoMatchConditionCollection(v)}
                        scope="tag_auto_match_collection"
                        label="Auto Match Condition Collection"
                    />

                    <div className="modal-form-submit-btn">
                        <Button color="secondary" type="submit" disabled={label.length === 0}>Update</Button>
                    </div>
                </FormGroup>
            </form>
        </div>
    );
}
