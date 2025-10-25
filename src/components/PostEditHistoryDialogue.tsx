import React, {useEffect, useState} from "react";
import http from "../http-common";
import {Button, Checkbox, CircularProgress, FormControlLabel, Pagination, Paper} from "@mui/material";
import App, {ModalContent} from "../App";
import {useLocation, useNavigate} from "react-router";

import "./PostEditHistoryDialogue.css";
import {
    PostCollectionDetailed,
    PostCollectionGroupAccessDetailed,
    PostDetailed,
    PostGroupAccessDetailed,
    sortTags,
    sortTagUsages,
    Tag,
    TagCategory,
    TagDetailed,
    TagUsage,
    UserGroup, UserGroupDetailed,
    UserPublic
} from "../Model";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {solid} from "@fortawesome/fontawesome-svg-core/import.macro";
import {ReadOnlyTextField, StyledAutocomplete} from "..";
import {TagSelector} from "./TagEditor";
import VisibilitySelect from "./VisibilitySelect";
import {GroupSelector} from "./GroupEditor";
import {FontAwesomeSvgIcon} from "./FontAwesomeSvgIcon";
import {ActionModal} from "./ActionModal";
import {enqueueSnackbar} from "notistack";

export interface PostEditHistoryResponse {
    edit_timestamp: string;
    edit_user: UserPublic;
    total_snapshot_count: number;
    snapshots: PostEditHistorySnapshot[];
}

export interface PostCollectionEditHistoryResponse {
    edit_timestamp: string;
    edit_user: UserPublic;
    total_snapshot_count: number;
    snapshots: PostCollectionEditHistorySnapshot[];
}

interface CommonEditHistoryResponse {
    edit_timestamp: string;
    edit_user: UserPublic;
    total_snapshot_count: number;
    snapshots: CommonEditHistorySnapshot[];
}

interface CommonEditHistorySnapshot {
    pk: number;
    edit_user: UserPublic;
    edit_timestamp: string;
    source_url: string | undefined | null;
    source_url_changed: boolean;
    title: string | undefined | null;
    title_changed: boolean;
    is_public: boolean;
    public_changed: boolean;
    public_edit: boolean;
    public_edit_changed: boolean;
    description: string | undefined | null;
    description_changed: boolean;
    tags_changed: boolean;
    group_access_changed: boolean;
    tags: TagUsage[],
    group_access: GroupAccess[],
}

export interface PostEditHistorySnapshot {
    pk: number;
    fk_post: number;
    edit_user: UserPublic;
    edit_timestamp: string;
    data_url: string | undefined | null;
    data_url_changed: boolean;
    source_url: string | undefined | null;
    source_url_changed: boolean;
    title: string | undefined | null;
    title_changed: boolean;
    is_public: boolean;
    public_changed: boolean;
    public_edit: boolean;
    public_edit_changed: boolean;
    description: string | undefined | null;
    description_changed: boolean;
    tags_changed: boolean;
    group_access_changed: boolean;
    tags: TagUsage[],
    group_access: PostGroupAccessDetailed[],
}

export interface PostEditHistoryTag {
    fk_post_edit_history: number;
    fk_tag: number;
}

export interface PostEditHistoryGroupAccess {
    fk_post_edit_history: number;
    fk_granted_group: number;
    write: boolean;
    fk_granted_by: number;
    creation_timestamp: string;
}

export interface PostCollectionEditHistoryResponse {
    edit_timestamp: string;
    fk_edit_user: number;
    total_snapshot_count: number;
    snapshots: PostCollectionEditHistorySnapshot[];
}

export interface PostCollectionEditHistorySnapshot {
    pk: number;
    fk_post_collection: number;
    edit_user: UserPublic;
    edit_timestamp: string;
    title: String,
    title_changed: boolean;
    is_public: boolean;
    public_changed: boolean;
    public_edit: boolean;
    public_edit_changed: boolean;
    description: string | undefined | null;
    description_changed: boolean;
    poster_object_key: string | undefined | null;
    poster_object_key_changed: boolean;
    tags_changed: boolean;
    group_access_changed: boolean;
    tags: TagUsage[],
    group_access: PostCollectionGroupAccessDetailed[],
}

export interface PostCollectionEditHistoryTag {
    fk_post_collection_edit_history: number;
    fk_tag: number;
}

export interface PostCollectionEditHistoryGroupAccess {
    fk_post_collection_edit_history: number;
    fk_granted_group: number;
    write: boolean;
    fk_granted_by: number;
    creation_timestamp: string;
}

export function PostEditHistoryDialogue({ app, post, modal }: { app: App, post: PostDetailed, modal?: ModalContent | undefined }) {
    return <EditHistoryDialogue
        app={app}
        history_object={post}
        modal={modal}
        get_history_endpoint="get-post-edit-history"
        object_name="post"
        rewind_history_endpoint="rewind-post-history-snapshot"
    />
}

export function PostCollectionEditHistoryDialogue({ app, collection, modal }: { app: App, collection: PostCollectionDetailed, modal?: ModalContent | undefined }) {
    return <EditHistoryDialogue
        app={app}
        history_object={collection}
        modal={modal}
        get_history_endpoint="get-post-collection-edit-history"
        object_name="collection"
        rewind_history_endpoint="rewind-post-collection-history-snapshot"
    />
}

interface TagEditHistorySnapshot {
    pk: number;
    fk_tag: number;
    edit_user: UserPublic;
    edit_timestamp: string;
    tag_category: TagCategory | null | undefined;
    tag_category_changed: boolean;
    parents_changed: boolean;
    aliases_changed: boolean;
    parents: Tag[];
    aliases: Tag[];
}

export function TagEditHistoryDialogue({app, tag, modal}: {
    app: App,
    tag: TagDetailed,
    modal?: ModalContent | undefined
}) {
    return (
        <InternalEditHistoryDialogue<TagDetailed, TagEditHistorySnapshot>
            app={app}
            history_object={tag}
            modal={modal}
            get_history_endpoint="get-tag-edit-history"
            object_name="tag"
            rewind_history_endpoint="rewind-tag-history-snapshot"
            render_object_values={tagDetailed => <Paper elevation={2} className="snapshot-values-container">
                <TagSelector readOnly values={tagDetailed.parents.sort(sortTags)} setSelectedTags={() => {}} limit={25} label="Parents" enableTagLink/>
                <TagSelector readOnly values={tagDetailed.aliases.sort(sortTags)} setSelectedTags={() => {}} limit={25} label="Aliases" enableTagLink/>
                <StyledAutocomplete
                    id="tag-category-select"
                    label="Category"
                    options={[tagDetailed.tag_category]}
                    value={tagDetailed.tag_category}
                    onChange={() => {}}
                    onInputChange={() => {}}
                    readOnly
                    isOptionEqualToValue={(option, value) => option?.id === value?.id}
                />
            </Paper>}
            render_snapshot_values={snapshot => <Paper elevation={2} className="snapshot-values-container">
                <TagSelector
                    readOnly
                    values={snapshot.parents.sort(sortTags)}
                    setSelectedTags={() => {}}
                    limit={25}
                    label="Parents"
                    color={snapshot.parents_changed ? "info" : undefined}
                    enableTagLink
                />
                <TagSelector
                    readOnly
                    values={snapshot.aliases.sort(sortTags)}
                    setSelectedTags={() => {}}
                    limit={25}
                    label="Aliases"
                    color={snapshot.aliases_changed ? "info" : undefined}
                    enableTagLink
                />
                <StyledAutocomplete
                    id="tag-category-select"
                    label="Category"
                    options={[snapshot.tag_category]}
                    value={snapshot.tag_category}
                    onChange={() => {}}
                    onInputChange={() => {}}
                    readOnly
                    color={snapshot.tag_category_changed ? "info" : undefined}
                    isOptionEqualToValue={(option, value) => option?.id === value?.id}
                />
            </Paper>}
        />
    );
}

interface UserGroupEditHistorySnapshot {
    pk: number;
    fk_user_group: number;
    edit_user: UserPublic;
    edit_timestamp: string;
    name: string;
    name_changed: boolean;
    is_public: boolean;
    public_changed: boolean;
    description: string | null | undefined;
    description_changed: boolean;
    allow_member_invite: boolean;
    allow_member_invite_changed: boolean;
    tags_changed: boolean;
    tags: TagUsage[];
}

export function UserGroupEditHistoryDialogue({app, user_group, modal}: {
    app: App,
    user_group: UserGroupDetailed,
    modal?: ModalContent | undefined
}) {
    return (
        <InternalEditHistoryDialogue<UserGroupDetailed, UserGroupEditHistorySnapshot>
            app={app}
            history_object={user_group}
            modal={modal}
            get_history_endpoint="get-user-group-edit-history"
            object_name="user group"
            rewind_history_endpoint="rewind-user-group-history-snapshot"
            render_object_values={user_group => <Paper elevation={2} className="snapshot-values-container">
                <ReadOnlyTextField label="Name" value={user_group.name} variant="standard"/>
                <ReadOnlyTextField label="Description" value={user_group.description ?? ""} variant="standard"
                                   multiline maxRows={5}/>
                <TagSelector
                    values={user_group.tags?.sort(sortTagUsages).map(tagUsage => tagUsage.tag)}
                    readOnly setSelectedTags={() => {}} enableTagLink/>
                <FormControlLabel
                    control={<Checkbox checked={user_group.is_public} disabled readOnly sx={{'&.Mui-disabled': {color: 'text.primary'}}} />}
                    label="Public"
                    sx={{ opacity: 1, '& .MuiFormControlLabel-label.Mui-disabled': {color: 'text.primary'} }}
                />
                <FormControlLabel
                    control={<Checkbox checked={user_group.allow_member_invite} disabled readOnly sx={{'&.Mui-disabled': {color: 'text.primary'}}} />}
                    label="Allow Member Invite"
                    sx={{ opacity: 1, '& .MuiFormControlLabel-label.Mui-disabled': {color: 'text.primary'} }}
                />
            </Paper>}
            render_snapshot_values={snapshot => <Paper elevation={2} className="snapshot-values-container">
                <ReadOnlyTextField label="Title" value={snapshot.name ?? ""} variant="standard"
                                   color={snapshot.name_changed ? "info" : undefined}/>
                <ReadOnlyTextField label="Description" value={snapshot.description ?? ""} variant="standard"
                                   color={snapshot.description_changed ? "info" : undefined} multiline maxRows={5}/>
                <TagSelector
                    values={snapshot.tags.sort(sortTagUsages).map(tagUsage => tagUsage.tag)}
                    readOnly setSelectedTags={() => {
                }} color={snapshot.tags_changed ? "info" : undefined} enableTagLink/>
                <FormControlLabel
                    control={<Checkbox checked={snapshot.is_public} disabled readOnly sx={(theme) => ({'&.Mui-disabled': {color: snapshot.public_changed ? theme.palette.info.main : theme.palette.text.primary}})} />}
                    label="Public"
                    sx={(theme) => ({ opacity: 1, '& .MuiFormControlLabel-label.Mui-disabled': {color: snapshot.public_changed ? theme.palette.info.main : theme.palette.text.primary} })}
                />
                <FormControlLabel
                    control={<Checkbox checked={snapshot.allow_member_invite} disabled readOnly sx={(theme) => ({'&.Mui-disabled': {color: snapshot.allow_member_invite_changed ? theme.palette.info.main : theme.palette.text.primary}})} />}
                    label="Allow Member Invite"
                    sx={(theme) => ({ opacity: 1, '& .MuiFormControlLabel-label.Mui-disabled': {color: snapshot.allow_member_invite_changed ? theme.palette.info.main : theme.palette.text.primary} })}
                />
            </Paper>}
        />
    );
}

interface HistoryObject {
    pk: number;
    edit_user: UserPublic;
    edit_timestamp: string;
    title: string | null | undefined;
    description: string | null | undefined;
    tags: TagUsage[];
    is_public: boolean;
    public_edit: boolean;
    group_access: GroupAccess[];
}

interface GroupAccess {
    write: boolean;
    fk_granted_by: number;
    creation_timestamp: string;
    granted_group: UserGroup;
}

function EditHistoryDialogue({app, history_object, modal, get_history_endpoint, object_name, rewind_history_endpoint}: {
    app: App,
    history_object: HistoryObject,
    modal?: ModalContent | undefined,
    get_history_endpoint: string,
    object_name: string,
    rewind_history_endpoint: string
}) {
    return (
        <InternalEditHistoryDialogue<HistoryObject, CommonEditHistorySnapshot>
            app={app}
            history_object={history_object}
            modal={modal}
            get_history_endpoint={get_history_endpoint}
            object_name={object_name}
            rewind_history_endpoint={rewind_history_endpoint}
            render_object_values={history_object => <Paper elevation={2} className="snapshot-values-container">
                <ReadOnlyTextField label="Title" value={history_object.title ?? ""} variant="standard"/>
                <ReadOnlyTextField label="Description" value={history_object.description ?? ""} variant="standard"
                                   multiline maxRows={5}/>
                <TagSelector
                    values={history_object.tags.sort(sortTagUsages).map(tagUsage => tagUsage.tag)}
                    readOnly setSelectedTags={() => {}} enableTagLink/>
                <div className="material-row-flex">
                    <VisibilitySelect isPublic={history_object.is_public} isPublicEdit={history_object.public_edit}
                                      readOnly={true} setPublic={() => {}} setPublicEdit={() => {}}/>
                    <GroupSelector
                        currentUserGroups={[]}
                        selectedUserGroups={history_object.group_access.map((groupAccess) => groupAccess.granted_group)}
                        selectedUserGroupsReadOnly={history_object.group_access.filter((groupAccess) => !groupAccess.write).map((groupAccess) => groupAccess.granted_group.pk)}
                        readOnly
                        setSelectedUserGroups={() => {
                        }}
                        setSelectedUserGroupsReadOnly={() => {
                        }}
                    />
                </div>
            </Paper>}
            render_snapshot_values={snapshot => <Paper elevation={2} className="snapshot-values-container">
                <ReadOnlyTextField label="Title" value={snapshot.title ?? ""} variant="standard"
                                   color={snapshot.title_changed ? "info" : undefined}/>
                <ReadOnlyTextField label="Description" value={snapshot.description ?? ""} variant="standard"
                                   color={snapshot.description_changed ? "info" : undefined} multiline maxRows={5}/>
                <TagSelector
                    values={snapshot.tags.sort(sortTagUsages).map(tagUsage => tagUsage.tag)}
                    readOnly setSelectedTags={() => {
                }} color={snapshot.tags_changed ? "info" : undefined} enableTagLink/>
                <div className="material-row-flex">
                    <VisibilitySelect isPublic={snapshot.is_public} isPublicEdit={snapshot.public_edit} readOnly={true}
                                      setPublic={() => {
                                      }} setPublicEdit={() => {
                    }} color={snapshot.public_changed || snapshot.public_edit_changed ? "info" : undefined}/>
                    <GroupSelector
                        currentUserGroups={[]}
                        selectedUserGroups={snapshot.group_access.map((groupAccess) => groupAccess.granted_group)}
                        selectedUserGroupsReadOnly={snapshot.group_access.filter((groupAccess) => !groupAccess.write).map((groupAccess) => groupAccess.granted_group.pk)}
                        readOnly
                        setSelectedUserGroups={() => {
                        }}
                        setSelectedUserGroupsReadOnly={() => {
                        }}
                        color={snapshot.group_access_changed ? "info" : undefined}
                    />
                </div>
            </Paper>}
        />
    );
}

interface InternalEditHistoryResponse<S extends {
    pk: number;
    edit_user: UserPublic;
    edit_timestamp: string;
}> {
    total_snapshot_count: number;
    snapshots: S[];
}

function InternalEditHistoryDialogue<O extends {
    pk: number;
    edit_user: UserPublic;
    edit_timestamp: string;
}, S extends {
    pk: number;
    edit_user: UserPublic;
    edit_timestamp: string;
}>({
       app,
       history_object,
       modal,
       get_history_endpoint,
       object_name,
       rewind_history_endpoint,
       render_object_values,
       render_snapshot_values
   }: {
    app: App,
    history_object: O,
    modal?: ModalContent | undefined,
    get_history_endpoint: string,
    object_name: string,
    rewind_history_endpoint: string,
    render_object_values: (history_object: O) => React.ReactNode,
    render_snapshot_values: (snapshot: S) => React.ReactNode,
}) {
    const location = useLocation();
    const navigate = useNavigate();

    const [snapshots, setSnapshots] = useState<S[]>([]);
    const [page, setPage] = useState<number>(0);
    const [pageCount, setPageCount] = useState<number | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        const search = new URLSearchParams();
        search.set("page", page.toString());
        search.set("limit", "10");
        setLoading(true);
        app.getAuthorization(location, navigate).then((config) => http.get<InternalEditHistoryResponse<S>>(`${get_history_endpoint}/${history_object.pk}?${search}`, config))
            .then(response => {
                setSnapshots(response.data.snapshots);
                setPageCount(Math.ceil(response.data.total_snapshot_count / 10));
            })
            .catch(e => {
                console.error("Failed to get edit history:", e);
                modal?.close();
                app.openModal("Error", <p>Failed to load edit history</p>);
            })
            .finally(() => setLoading(false));
    }, [history_object.pk, page]);

    return (
        <div id="EditHistoryDialogue">
            <Paper elevation={1} className="snapshot-container">
                <div className="snapshot-container-top-row">
                    <div className="snapshot-container-update-info">
                        <div><FontAwesomeIcon
                            icon={solid("user")}/> {history_object.edit_user.display_name ?? history_object.edit_user.user_name}
                        </div>
                        <div><FontAwesomeIcon
                            icon={solid("clock")}/> {new Date(history_object.edit_timestamp).toLocaleString()}</div>
                    </div>
                </div>
                {render_object_values(history_object)}
            </Paper>
            {loading || snapshots.length === 0
                ? <div className="full-loading-container">{loading ? <CircularProgress size={40} color='primary'/> :
                    <h3>No history</h3>}</div>
                : <div className="edit-history-snapshots">
                    {snapshots.map(snapshot => (
                        <Paper key={snapshot.pk} elevation={1} className="snapshot-container">
                            <div className="snapshot-container-top-row">
                                <div className="snapshot-container-update-info">
                                    <div><FontAwesomeIcon
                                        icon={solid("user")}/> {snapshot.edit_user.display_name ?? snapshot.edit_user.user_name}
                                    </div>
                                    <div><FontAwesomeIcon
                                        icon={solid("clock")}/> {new Date(snapshot.edit_timestamp).toLocaleString()}
                                    </div>
                                </div>
                                <div className="snapshot-container-rewind-button-container">
                                    <Button startIcon={<FontAwesomeSvgIcon fontSize="inherit"
                                                                           icon={solid("clock-rotate-left")}/>}
                                            onClick={() => app.openModal(
                                                `Rewind ${object_name}`,
                                                (modalContent) => <ActionModal
                                                    modalContent={modalContent}
                                                    text={`Rewind ${object_name} to this snapshot?`}
                                                    actions={[
                                                        {
                                                            name: "Ok",
                                                            fn: async () => {
                                                                const loadingModal = app.openLoadingModal();
                                                                try {
                                                                    const config = await app.getAuthorization(location, navigate);
                                                                    const response = await http.post(`${rewind_history_endpoint}/${snapshot.pk}`, {}, config);

                                                                    enqueueSnackbar("History rewound", {variant: "success"});

                                                                    return response.data;
                                                                } catch (e) {
                                                                    console.error("Failed to rewind history:", e);
                                                                    enqueueSnackbar("Failed to rewind history", {variant: "error"});
                                                                } finally {
                                                                    loadingModal.close();
                                                                }
                                                            },
                                                        }
                                                    ]}
                                                />,
                                                (ret) => {
                                                    if (ret) {
                                                        modal?.close(ret);
                                                    }
                                                }
                                            )}>Rewind</Button>
                                </div>
                            </div>
                            {render_snapshot_values(snapshot)}
                        </Paper>
                    ))}
                </div>
            }
            <div className="edit-history-pagination">
                <Pagination
                    page={page + 1}
                    count={pageCount ?? 999}
                    showFirstButton
                    showLastButton={pageCount !== null}
                    siblingCount={pageCount !== null ? 1 : 0}
                    boundaryCount={pageCount !== null ? 1 : 0}
                    color='primary'
                    onChange={(_e, page) => setPage(page - 1)}
                />
            </div>
        </div>
    );
}
