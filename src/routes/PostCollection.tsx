import { useLocation, useNavigate, useParams } from "react-router-dom";
import App from "../App";
import { useEffect, useState } from "react";
import { DeletePostCollectionsResponse, GroupAccessDefinition, PostCollectionDetailed, UserGroup } from "../Model";
import http from "../http-common";
import { regular, solid } from "@fortawesome/fontawesome-svg-core/import.macro";
import "./PostCollection.css";
import { Button, IconButton, TextField } from "@mui/material";
import { TagCreator, TagSelector } from "../components/TagEditor";
import { GroupSelector } from "../components/GroupEditor";
import { PaginatedGridView } from "../components/PaginatedGridView";
import { PostCollectionItemQueryObject, performSearchQuery } from "../Search";
import { AddToCollectionDialogue } from "../components/AddToCollectionDialogue";
import { ActionModal } from "../components/ActionModal";
import { useSnackbar } from "notistack";
import { FileMetadataDisplay } from "../components/FileMetadataDisplay";
import { FontAwesomeSvgIcon } from "../components/FontAwesomeSvgIcon";
import VisibilitySelect from "../components/VisibilitySelect";
import AddIcon from '@mui/icons-material/Add';
import { PostCollectionEditHistoryDialogue } from "../components/PostEditHistoryDialogue";

export function PostCollection({ app }: { app: App }) {
    let { id } = useParams();
    const [postCollection, setPostCollection] = useState<PostCollectionDetailed | null>(null);
    const location = useLocation();
    const search = location.search;
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const [fullCount, setFullCount] = useState<number | null>(0);
    const [pageCount, setPageCount] = useState<number | null>(0);
    const [collectionPosts, setCollectionPosts] = useState<PostCollectionItemQueryObject[]>([]);

    const [isEditMode, setEditMode] = useState(false);
    const [tags, setTags] = useState<(string | { label: string, pk: number })[]>([]);
    const [enteredTags, setEnteredTags] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<number[]>([]);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [publicCollection, setPublicCollection] = useState(false);
    const [publicEdit, setPublicEdit] = useState(false);
    const [currentUserGroups, setCurrentUserGroups] = useState<UserGroup[]>([]);
    const [selectedUserGroups, setSelectedUserGroups] = useState<UserGroup[]>([]);
    const [selectedUserGroupsReadOnly, setSelectedUserGroupsReadOnly] = useState<number[]>([]);

    function updatePostCollection(postCollectionDetailed: PostCollectionDetailed) {
        setPostCollection(postCollectionDetailed);
        setTags(postCollectionDetailed.tags.map(tagUsage => {
            return { label: tagUsage.tag.tag_name, pk: tagUsage.tag.pk };
        }));
        setSelectedTags(postCollectionDetailed.tags.map(tagUsage => tagUsage.tag.pk));
        setTitle(postCollectionDetailed.title || "");
        setDescription(postCollectionDetailed.description || "");
        setPublicCollection(postCollectionDetailed.is_public);
        setPublicEdit(postCollectionDetailed.public_edit);
        setSelectedUserGroups(postCollectionDetailed.group_access.map(groupAccess => groupAccess.granted_group));
        setSelectedUserGroupsReadOnly(postCollectionDetailed.group_access.filter(groupAccess => !groupAccess.write).map(groupAccess => groupAccess.granted_group.pk));
    }

    useEffect(() => {
        setPostCollection(null);
        let fetch = async () => {
            try {
                let config = await app.getAuthorization(location, navigate, false);

                let postCollection = await http.get<PostCollectionDetailed>(`/get-collection/${id}`, config);
                updatePostCollection(postCollection.data);

                if (config) {
                    let currentUserGroups = await http.get<UserGroup[]>("/get-current-user-groups", config);
                    setCurrentUserGroups(currentUserGroups.data);
                }
            } catch (e: any) {
                if (e.response?.status === 403) {
                    app.openModal("Error", <p>This collection is unavailable.</p>);
                } else if (e.response?.status === 401) {
                    app.openModal("Error", <p>Your credentials have expired, try refreshing the page.</p>);
                }
                console.error(e);
            }
        };

        // clear tag and group selection state before resetting, this also forces the components to observe a change even if the persistent state is the same, making sure uncommited changes are reset
        setTags([]);
        setSelectedTags([]);
        setSelectedUserGroups([]);
        setSelectedUserGroupsReadOnly([]);
        const modal = app.openLoadingModal();
        fetch().then(() => modal.close()).catch(() => modal.close());
    }, [isEditMode, location, navigate, app]);

    const loadPosts = () => {
        if (postCollection) {
            const modal = app.openLoadingModal();
            performSearchQuery("/collection/" + postCollection.pk + search, app, location, navigate, modal).then(searchResult => {
                setFullCount(searchResult.full_count);
                setPageCount(searchResult.pages);
                setCollectionPosts(searchResult.collection_items ?? []);
                modal.close();
            }).catch(e => {
                modal.close();
                console.error(e);
            });
        }
    };

    useEffect(() => {
        loadPosts();

        return () => {
            setFullCount(0);
            setPageCount(0);
            setCollectionPosts([]);
        };
    }, [search, postCollection, location, navigate]);

    return (
        <div id="PostCollection">
            <div id="post-collection-head">
                <div id="post-collection-information-container">
                    <div id="post-collection-button-row">
                        {isEditMode
                            ? <div className="button-row"><Button startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("xmark")} />} onClick={() => setEditMode(false)}>Cancel</Button></div>
                            : postCollection && <div className="button-row">
                                <Button hidden={!postCollection?.is_editable || !app.isLoggedIn()} startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("pen-to-square")} />} onClick={() => setEditMode(true)}>Edit</Button>
                                <Button startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("clock-rotate-left")} />} hidden={!postCollection?.is_editable || !app.isLoggedIn()} onClick={() => app.openModal("History", modal => <PostCollectionEditHistoryDialogue app={app} collection={postCollection} modal={modal} />, (result) => {
                                    if (result) {
                                        updatePostCollection(result);
                                    }
                                })}>History</Button>
                                {postCollection?.is_deletable && <Button startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("trash")} />} onClick={() => app.openModal(
                                    "Delete collection",
                                    (modal) => <ActionModal
                                        modalContent={modal}
                                        text={postCollection.title ? `Delete collection '${postCollection.title}'` : `Delete 1 collection`}
                                        actions={[
                                            {
                                                name: "Ok",
                                                fn: async () => {
                                                    const loadingModal = app.openLoadingModal();
                                                    try {
                                                        const config = await app.getAuthorization(location, navigate);
                                                        const result = await http.post<DeletePostCollectionsResponse>("/delete-collections", {
                                                            post_collection_pks: [postCollection.pk],
                                                            inaccessible_post_mode: "skip"
                                                        }, config);

                                                        loadingModal.close();
                                                        navigate({
                                                            pathname: "/collections"
                                                        });

                                                        enqueueSnackbar({
                                                            message: `Deleted ${result.data.deleted_post_collections.length} collection${result.data.deleted_post_collections.length !== 1 ? 's' : ''}`,
                                                            variant: "success"
                                                        });
                                                        return result.data;
                                                    } catch (e) {
                                                        console.error(e);
                                                        loadingModal.close();
                                                        enqueueSnackbar({
                                                            message: "Failed to delete collection",
                                                            variant: "error"
                                                        });
                                                    }
                                                }
                                            }
                                        ]}
                                    />,
                                )}>Delete</Button>}
                            </div>}
                    </div>
                    {isEditMode ? <TextField label="Title" variant="outlined" value={title} fullWidth onChange={e => setTitle(e.target.value)} inputProps={{ maxLength: 300 }}></TextField> : <h2 hidden={!(postCollection && postCollection.title)}>{postCollection && postCollection.title}</h2>}
                    {isEditMode ? <TextField label="Description" variant="outlined" value={description} fullWidth multiline onChange={e => setDescription(e.target.value)} inputProps={{ maxLength: 30000 }}></TextField> : <p className="multiline-text" hidden={!(postCollection && postCollection.description)}>{postCollection && postCollection.description}</p>}
                    <div className="material-row-flex">
                        <TagSelector setSelectedTags={setSelectedTags} setEnteredTags={setEnteredTags} values={tags} readOnly={!isEditMode} onTagClick={(tag) => {
                            if (typeof tag === "object" && "pk" in tag) {
                                navigate("/tag/" + tag.pk);
                            }
                        }} />
                        {isEditMode && <IconButton size="medium" sx={{ alignSelf: "center" }} onClick={e => {
                            e.preventDefault();
                            app.openModal("Create Tag", createTagModal => <TagCreator app={app} modal={createTagModal}></TagCreator>);
                        }}><AddIcon /></IconButton>}
                    </div>
                    <div className="material-row-flex">
                        <VisibilitySelect isPublic={publicCollection} isPublicEdit={publicEdit} readOnly={!isEditMode} setPublic={setPublicCollection} setPublicEdit={setPublicEdit} />
                        <GroupSelector
                            currentUserGroups={currentUserGroups}
                            selectedUserGroups={selectedUserGroups}
                            setSelectedUserGroups={setSelectedUserGroups}
                            selectedUserGroupsReadOnly={selectedUserGroupsReadOnly}
                            setSelectedUserGroupsReadOnly={setSelectedUserGroupsReadOnly}
                            readOnly={!isEditMode}
                        />
                    </div>
                    <div className="button-row">
                        <Button color="secondary" startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={regular("floppy-disk")} />} hidden={!isEditMode} onClick={async () => {
                            let groupAccess: GroupAccessDefinition[] = [];
                            selectedUserGroups.forEach(group => groupAccess.push(new GroupAccessDefinition(group.pk, !selectedUserGroupsReadOnly.includes(group.pk))));

                            const loadingModal = app.openLoadingModal();
                            try {
                                const config = await app.getAuthorization(location, navigate);
                                const result = await http.post<PostCollectionDetailed>(`/edit-collection/${id}`, {
                                    tags_overwrite: enteredTags,
                                    tag_pks_overwrite: selectedTags,
                                    title: title,
                                    description: description,
                                    is_public: publicCollection,
                                    public_edit: publicEdit,
                                    group_access_overwrite: groupAccess
                                }, config);

                                enqueueSnackbar({
                                    message: "Edited collection",
                                    variant: "success"
                                });
                                updatePostCollection(result.data);
                            } catch (e) {
                                console.error("Error occurred editing collection " + e);
                                enqueueSnackbar({
                                    message: "An error occurred editing your collection, please try again",
                                    variant: "error"
                                });
                            }

                            loadingModal.close();
                            setEditMode(false);
                        }}>Save</Button>
                    </div>
                </div>
            </div>
            <PaginatedGridView
                itemsProperty={{
                    items: collectionPosts,
                    extraction_fn: (item: PostCollectionItemQueryObject) => {
                        return {
                            pk: item.pk,
                            create_user: item.post.create_user,
                            title: item.post.title,
                            thumbnail_url: item.post.thumbnail_url,
                            thumbnail_object_key: item.post.thumbnail_object_key,
                            source: item
                        }
                    }
                }}
                onItemClickPath={(post) => "/collection/" + postCollection?.pk + "/post/" + post.pk}
                pagePath={"/collection/" + postCollection?.pk}
                fullCount={fullCount}
                pageCount={pageCount}
                isDesktop={app.isDesktop()}
                gridItemActions={[
                    {
                        name: "Show metadata",
                        icon: solid("info-circle"),
                        allowExecuteForAll: false,
                        disallowMultiSelect: true,
                        enableForItem: (post) => post.source.post.s3_object,
                        fn: (items) => {
                            if (items && items.length > 0) {
                                const post = (items[0].source as unknown as PostCollectionItemQueryObject).post;
                                if (post.s3_object) {
                                    app.openModal("File metadata", <FileMetadataDisplay s3_object={post.s3_object} s3_object_metadata={post.s3_object_metadata} />);
                                }
                            }
                        }
                    },
                    {
                        name: "Add to collection",
                        icon: solid("square-plus"),
                        fn: (items, cb) => app.openModal(
                            "Add to collection",
                            (modal) => <AddToCollectionDialogue app={app} postPks={items.map((item) => item.source.post.pk)} modal={modal} />,
                            (result) => cb?.(result)
                        )
                    },
                    {
                        name: "Remove from collection",
                        icon: solid("trash"),
                        color: "red",
                        enableForItem: () => postCollection?.is_editable ?? false,
                        fn: (items, cb) => app.openModal(
                            "Remove from collection",
                            (modal) => <ActionModal
                                modalContent={modal}
                                text={items.length === 1 && items[0].title ? `Remove '${items[0].title}' from collection` : `Remove ${items.length} item${items.length === 1 ? '' : 's'} from collection`}
                                actions={[
                                    {
                                        name: "Ok",
                                        fn: async () => {
                                            const loadingModal = app.openLoadingModal();
                                            try {
                                                const config = await app.getAuthorization(location, navigate);
                                                const result = await http.post<PostCollectionDetailed>(`/edit-collection/${postCollection!.pk}`, {
                                                    removed_item_pks: items.map(item => item.pk)
                                                }, config);

                                                loadingModal.close();
                                                updatePostCollection(result.data);
                                                enqueueSnackbar({
                                                    message: items.length === 1 ? "Removed post from collection" : "Removed selected posts from collection",
                                                    variant: "success"
                                                });
                                                loadPosts();
                                                return result.data;
                                            } catch (e) {
                                                console.error(e);
                                                loadingModal.close();
                                                enqueueSnackbar({
                                                    message: "An error occurred editing your collection, please try again",
                                                    variant: "error"
                                                });
                                            }
                                        }
                                    }
                                ]}
                            />,
                            (result) => cb?.(result)
                        )
                    }
                ]}
            />
        </div>
    );
}

export interface EditPostCollectionRequest {
    tags_overwrite?: string[] | null;
    tag_pks_overwrite?: number[] | null;
    removed_tag_pks?: number[] | null;
    added_tag_pks?: number[] | null;
    added_tags?: string[] | null;
    title?: string | null;
    is_public?: boolean | null;
    public_edit?: boolean | null;
    description?: string | null;
    group_access_overwrite?: GroupAccessDefinition[] | null;
    added_group_access?: GroupAccessDefinition[] | null;
    removed_group_access?: number[] | null;
    poster_object_key?: string | null;
    post_pks_overwrite?: number[] | null;
    added_post_pks?: number[] | null;
    removed_item_pks?: number[] | null;
    duplicate_mode?: string | null;
}
