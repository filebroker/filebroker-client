import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import App, { ModalContent } from "../App";
import { TagCreator, TagSelector } from "./TagEditor";
import { solid } from "@fortawesome/fontawesome-svg-core/import.macro";
import { useEffect, useState } from "react";
import { GroupAccessDefinition, PostCollectionDetailed, UserGroup } from "../Model";
import { Checkbox, TextField } from "@mui/material";
import { GroupSelector } from "./GroupEditor";
import EditIcon from '@mui/icons-material/Edit';
import { Link, useLocation, useNavigate } from "react-router-dom";
import http from "../http-common";
import "./CreateCollectionDialogue.css";

export function CreateCollectionDialogue({ postPks, modal, app, postQuery }: { postPks: number[], modal: ModalContent, app: App, postQuery?: string }) {
    const location = useLocation();
    const navigate = useNavigate()

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [publicCollection, setPublicCollection] = useState(false);
    const [publicEdit, setPublicEdit] = useState(false);

    const [enteredTags, setEnteredTags] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<number[]>([]);

    const [currentUserGroups, setCurrentUserGroups] = useState<UserGroup[]>([]);
    const [selectedUserGroups, setSelectedUserGroups] = useState<UserGroup[]>([]);
    const [selectedUserGroupsReadOnly, setSelectedUserGroupsReadOnly] = useState<number[]>([]);

    useEffect(() => {
        let fetch = async () => {
            let config = await app.getAuthorization(location, navigate);

            http
                .get<UserGroup[]>("/get-current-user-groups", config)
                .then(result => setCurrentUserGroups(result.data))
        };

        fetch().catch(console.error);
    }, []);

    return (
        <div id="CreateCollectionDialogue">
            <fieldset>
                <legend>Collection</legend>
                <table className="fieldset-container">
                    <tbody>
                        <tr className="form-row">
                            <td className="form-row-full-td"><TextField label="Title" variant="outlined" value={title} fullWidth onChange={e => setTitle(e.target.value)} inputProps={{ maxLength: 300 }} required></TextField></td>
                        </tr>
                        <tr className="form-row">
                            <td className="form-row-full-td"><TextField label="Description" variant="outlined" value={description} fullWidth multiline onChange={e => setDescription(e.target.value)} maxRows={5} inputProps={{ maxLength: 30000 }}></TextField></td>
                        </tr>
                    </tbody>
                </table>
            </fieldset>
            <div id="tag-editor-div">
                <TagSelector setEnteredTags={setEnteredTags} setSelectedTags={setSelectedTags}></TagSelector>
                <button className="standard-button" onClick={e => {
                    e.preventDefault();
                    app.openModal("Create Tag", createTagModal => <TagCreator app={app} modal={createTagModal}></TagCreator>);
                }}><FontAwesomeIcon icon={solid("plus")}></FontAwesomeIcon></button>
            </div>
            <fieldset>
                <legend>Share</legend>
                <table className="fieldset-container">
                    <tbody>
                        <tr className="form-row">
                            <td className="form-label"><label>Public</label></td>
                            <td className="form-field"><Checkbox checked={publicCollection} onChange={e => setPublicCollection(e.target.checked)}></Checkbox></td>
                        </tr>
                        {publicCollection && <tr className="form-row">
                            <td className="form-label"><label>Public Can Edit</label></td>
                            <td className="form-field"><Checkbox checked={publicEdit} onChange={e => setPublicEdit(e.target.checked)}></Checkbox></td>
                        </tr>}
                        <tr className="form-row">
                            <td className="form-row-full-td" colSpan={2}>
                                <GroupSelector
                                    currentUserGroups={currentUserGroups}
                                    selectedUserGroups={selectedUserGroups}
                                    setSelectedUserGroups={setSelectedUserGroups}
                                    selectedUserGroupsReadOnly={selectedUserGroupsReadOnly}
                                    setSelectedUserGroupsReadOnly={setSelectedUserGroupsReadOnly}
                                />
                                <span className="footnote">Groups with the <EditIcon fontSize="small"></EditIcon> icon can edit the post, click the selected group to toggle edit permissions.</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </fieldset>
            <div className="modal-form-submit-btn">
                <button className="standard-button-large" disabled={!(title && title.length > 0)} onClick={async e => {
                    const loadingModal = app.openModal("", <FontAwesomeIcon icon={solid("circle-notch")} spin></FontAwesomeIcon>, undefined, false);
                    try {
                        const config = await app.getAuthorization(location, navigate);

                        const groupAccess: GroupAccessDefinition[] = [];
                        selectedUserGroups.forEach(group => groupAccess.push(new GroupAccessDefinition(group.pk, !selectedUserGroupsReadOnly.includes(group.pk))));

                        const response = await http.post<PostCollectionDetailed>("create-collection", new CreatePostCollectionRequest(
                            title,
                            enteredTags,
                            selectedTags,
                            null,
                            publicCollection,
                            publicEdit,
                            groupAccess,
                            description,
                            postPks,
                            postQuery ?? null
                        ), config);

                        loadingModal.close();
                        modal.close(response.data);
                        app.openModal("Success", successModal => <p><Link className="standard-link" to={`collection/${response.data.pk + location.search}`} onClick={() => successModal.close()}>Collection</Link> created successfully</p>);
                    } catch (e: any) {
                        loadingModal.close();
                        console.error("Failed to create collection: ");
                        console.error(e);
                        if (e?.response?.data?.error_code === 400010) {
                            app.openModal("Error", <p>The provided query is invalid</p>);
                        } else {
                            app.openModal("Error", <p>An unexpected error occurred</p>);
                        }
                    }
                }}>Create Collection</button>
            </div>
        </div>
    );
}

export class CreatePostCollectionRequest {
    title: string;
    entered_tags: string[] | null;
    selected_tags: number[] | null;
    poster_object_key: string | null;
    is_public: boolean | null;
    public_edit: boolean | null;
    group_access: GroupAccessDefinition[] | null;
    description: string | null;
    post_pks: number[] | null;
    post_query: string | null;

    constructor(
        title: string,
        entered_tags: string[] | null,
        selected_tags: number[] | null,
        poster_object_key: string | null,
        is_public: boolean | null,
        public_edit: boolean | null,
        group_access: GroupAccessDefinition[] | null,
        description: string | null,
        post_pks: number[] | null,
        post_query: string | null
    ) {
        this.title = title;
        this.entered_tags = entered_tags;
        this.selected_tags = selected_tags;
        this.poster_object_key = poster_object_key;
        this.is_public = is_public;
        this.public_edit = public_edit;
        this.group_access = group_access;
        this.description = description;
        this.post_pks = post_pks;
        this.post_query = post_query;
    }
}
