import { useEffect, useState } from "react";
import http from "../http-common";
import { Button, CircularProgress, Pagination, Paper, TextField } from "@mui/material";
import App, { ModalContent } from "../App";
import { useLocation, useNavigate } from "react-router";

import "./PostEditHistoryDialogue.css";
import { PostCollectionDetailed, PostCollectionGroupAccessDetailed, PostDetailed, PostGroupAccessDetailed, Tag, UserGroup, UserPublic } from "../Model";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { solid } from "@fortawesome/fontawesome-svg-core/import.macro";
import { ReadOnlyTextField } from "..";
import { TagSelector } from "./TagEditor";
import VisibilitySelect from "./VisibilitySelect";
import { GroupSelector } from "./GroupEditor";
import { FontAwesomeSvgIcon } from "./FontAwesomeSvgIcon";
import { ActionModal } from "./ActionModal";
import { enqueueSnackbar } from "notistack";

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
    tags: Tag[],
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
    tags: Tag[],
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
    tags: Tag[],
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

interface HistoryObject {
    pk: number;
    edit_user: UserPublic;
    edit_timestamp: string;
    title: string | null | undefined;
    description: string | null | undefined;
    tags: Tag[];
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

function EditHistoryDialogue({ app, history_object, modal, get_history_endpoint, object_name, rewind_history_endpoint }: { app: App, history_object: HistoryObject, modal?: ModalContent | undefined, get_history_endpoint: string, object_name: string, rewind_history_endpoint: string }) {
    const location = useLocation();
    const navigate = useNavigate();

    const [snapshots, setSnapshots] = useState<CommonEditHistorySnapshot[]>([]);
    const [page, setPage] = useState<number>(0);
    const [pageCount, setPageCount] = useState<number | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        const search = new URLSearchParams();
        search.set("page", page.toString());
        search.set("limit", "10");
        setLoading(true);
        app.getAuthorization(location, navigate).then((config) => http.get<CommonEditHistoryResponse>(`${get_history_endpoint}/${history_object.pk}?${search}`, config))
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
                        <div><FontAwesomeIcon icon={solid("user")} /> {history_object.edit_user.display_name ?? history_object.edit_user.user_name}</div>
                        <div><FontAwesomeIcon icon={solid("clock")} /> {new Date(history_object.edit_timestamp).toLocaleString()}</div>
                    </div>
                </div>
                <Paper elevation={2} className="snapshot-values-container">
                    <ReadOnlyTextField label="Title" value={history_object.title ?? ""} variant="standard" />
                    <ReadOnlyTextField label="Description" value={history_object.description ?? ""} variant="standard" multiline maxRows={5} />
                    <TagSelector values={history_object.tags.map(tag => ({ label: tag.tag_name, pk: tag.pk }))} readOnly setSelectedTags={() => { }} />
                    <div className="material-row-flex">
                        <VisibilitySelect isPublic={history_object.is_public} isPublicEdit={history_object.public_edit} readOnly={true} setPublic={() => { }} setPublicEdit={() => { }} />
                        <GroupSelector
                            currentUserGroups={[]}
                            selectedUserGroups={history_object.group_access.map((groupAccess) => groupAccess.granted_group)}
                            selectedUserGroupsReadOnly={history_object.group_access.filter((groupAccess) => !groupAccess.write).map((groupAccess) => groupAccess.granted_group.pk)}
                            readOnly
                            setSelectedUserGroups={() => { }}
                            setSelectedUserGroupsReadOnly={() => { }}
                        />
                    </div>
                </Paper>
            </Paper>
            {loading || snapshots.length === 0
                ? <div className="full-loading-container">{loading ? <CircularProgress size={40} color='primary' /> : <h3>No history</h3>}</div>
                : <div className="edit-history-snapshots">
                    {snapshots.map(snapshot => (
                        <Paper key={snapshot.pk} elevation={1} className="snapshot-container">
                            <div className="snapshot-container-top-row">
                                <div className="snapshot-container-update-info">
                                    <div><FontAwesomeIcon icon={solid("user")} /> {snapshot.edit_user.display_name ?? snapshot.edit_user.user_name}</div>
                                    <div><FontAwesomeIcon icon={solid("clock")} /> {new Date(snapshot.edit_timestamp).toLocaleString()}</div>
                                </div>
                                <div className="snapshot-container-rewind-button-container">
                                    <Button startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("clock-rotate-left")} />} onClick={() => app.openModal(
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
                                                            const response = await http.post<PostDetailed>(`${rewind_history_endpoint}/${snapshot.pk}`, {}, config);

                                                            enqueueSnackbar("History rewound", { variant: "success" });

                                                            return response.data;
                                                        } catch (e) {
                                                            console.error("Failed to rewind history:", e);
                                                            enqueueSnackbar("Failed to rewind history", { variant: "error" });
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
                            <Paper elevation={2} className="snapshot-values-container">
                                <ReadOnlyTextField label="Title" value={snapshot.title ?? ""} variant="standard" color={snapshot.title_changed ? "info" : undefined} />
                                <ReadOnlyTextField label="Description" value={snapshot.description ?? ""} variant="standard" color={snapshot.description_changed ? "info" : undefined} multiline maxRows={5} />
                                <TagSelector values={snapshot.tags.map(tag => ({ label: tag.tag_name, pk: tag.pk }))} readOnly setSelectedTags={() => { }} color={snapshot.tags_changed ? "info" : undefined} />
                                <div className="material-row-flex">
                                    <VisibilitySelect isPublic={snapshot.is_public} isPublicEdit={snapshot.public_edit} readOnly={true} setPublic={() => { }} setPublicEdit={() => { }} color={snapshot.public_changed || snapshot.public_edit_changed ? "info" : undefined} />
                                    <GroupSelector
                                        currentUserGroups={[]}
                                        selectedUserGroups={snapshot.group_access.map((groupAccess) => groupAccess.granted_group)}
                                        selectedUserGroupsReadOnly={snapshot.group_access.filter((groupAccess) => !groupAccess.write).map((groupAccess) => groupAccess.granted_group.pk)}
                                        readOnly
                                        setSelectedUserGroups={() => { }}
                                        setSelectedUserGroupsReadOnly={() => { }}
                                        color={snapshot.group_access_changed ? "info" : undefined}
                                    />
                                </div>
                            </Paper>
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
