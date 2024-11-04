import React, { ReactElement, useRef } from "react";
import { useEffect, useState } from "react";
import { Link, Location, useLocation, useNavigate, useParams } from "react-router-dom";
import videojs from "video.js";
import App from "../App";
import http, { getApiUrl } from "../http-common";
import VideoJS from "../components/VideoJS";
import "./Post.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { regular, solid } from "@fortawesome/fontawesome-svg-core/import.macro";
import { DeletePostsResponse, GroupAccessDefinition, PostDetailed, UserGroup } from "../Model";
import { Button, ButtonGroup, FormControlLabel, IconButton, Switch, TextField } from "@mui/material";
import { TagCreator, TagSelector } from "../components/TagEditor";
import { GroupSelector } from "../components/GroupEditor";
import urlJoin from "url-join";
import { MusicPlayer } from "../components/MusicPlayer";
import { AddToCollectionDialogue } from "../components/AddToCollectionDialogue";
import { useSnackbar } from "notistack";
import { ActionModal } from "../components/ActionModal";
import { FileMetadataDisplay } from "../components/FileMetadataDisplay";
import { FontAwesomeSvgIcon } from "../components/FontAwesomeSvgIcon";
import VisibilitySelect from "../components/VisibilitySelect";
import AddIcon from '@mui/icons-material/Add';

class PostProps {
    app: App;

    constructor(app: App) {
        this.app = app;
    }
}

function Post({ app }: PostProps) {
    let { collection_id, id } = useParams();
    const [post, setPost] = useState<PostDetailed | null>(null);
    const location = useLocation();
    const search = location.search;
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const isInitialMount = useRef(true);

    const [isEditMode, setEditMode] = useState(false);
    const [tags, setTags] = useState<(string | { label: string, pk: number })[]>([]);
    const [enteredTags, setEnteredTags] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<number[]>([]);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [publicPost, setPublicPost] = useState(false);
    const [publicPostEdit, setPublicPostEdit] = useState(false);
    const [currentUserGroups, setCurrentUserGroups] = useState<UserGroup[]>([]);
    const [selectedUserGroups, setSelectedUserGroups] = useState<UserGroup[]>([]);
    const [selectedUserGroupsReadOnly, setSelectedUserGroupsReadOnly] = useState<number[]>([]);
    const [hlsEnabled, setHlsEnabled] = useState(true);
    const [mediaComponent, setMediaComponent] = useState<ReactElement | undefined | null>(null);

    const [mediaWidth, setMediaWidth] = useState<number | undefined>(undefined);
    const [useLargeControls, setUseLargeControls] = useState(false);
    const resizeObservers = useRef<ResizeObserver[]>([]);
    useEffect(() => {
        return () => {
            resizeObservers.current.forEach(observer => observer.disconnect());
        };
    }, []);
    const mediaComponentElementCallback = (el: HTMLDivElement | null) => {
        if (el === null) {
            return;
        }

        let currEl: HTMLElement | null = el;
        let minWidth;
        while (currEl && (!minWidth || minWidth === "auto" || minWidth === "inherit")) {
            minWidth = window.getComputedStyle(currEl).minWidth;
            currEl = currEl.parentElement;
        }
        let minWidthPixels = 0;
        if (minWidth && minWidth.endsWith("px")) {
            minWidthPixels = parseInt(minWidth.replace("px", "").trim());
        }

        const width = Math.max(el.offsetWidth, minWidthPixels);
        setMediaWidth(width);
        setUseLargeControls(width >= 600);

        const resizeObserver = new ResizeObserver(() => {
            const width = Math.max(el.offsetWidth, minWidthPixels);
            setMediaWidth(width);
            setUseLargeControls(width >= 600);
        });
        resizeObserver.observe(el);
        resizeObservers.current.push(resizeObserver);
    };

    function updatePost(postDetailed: PostDetailed | null) {
        setPost(postDetailed);
        setTags(postDetailed?.tags?.map(tag => {
            return { label: tag.tag_name, pk: tag.pk };
        }) ?? []);
        setSelectedTags(postDetailed?.tags?.map(tag => tag.pk) ?? []);
        setTitle(postDetailed?.title || "");
        setDescription(postDetailed?.description || "");
        setPublicPost(postDetailed?.is_public || false);
        setPublicPostEdit(postDetailed?.public_edit || false);
        setSelectedUserGroups(postDetailed?.group_access?.map(groupAccess => groupAccess.granted_group) ?? []);
        setSelectedUserGroupsReadOnly(postDetailed?.group_access?.filter(groupAccess => !groupAccess.write)?.map(groupAccess => groupAccess.granted_group.pk) ?? []);
    }

    useEffect(() => {
        updatePost(null);
        let fetch = async () => {
            try {
                let config = await app.getAuthorization(location, navigate, false);

                let basePath = collection_id ? "/get-post/" + collection_id : "/get-post";
                let post = await http.get<PostDetailed>(`${basePath}/${id}${search}`, config);
                updatePost(post.data);

                if (config) {
                    let currentUserGroups = await http.get<UserGroup[]>("/get-current-user-groups", config);
                    setCurrentUserGroups(currentUserGroups.data);
                }
            } catch (e: any) {
                if (e.response?.status === 403) {
                    app.openModal("Error", <p>This post is unavailable.</p>);
                } else if (e.response?.status === 401) {
                    app.openModal("Error", <p>Your credentials have expired, try refreshing the page.</p>);
                }
                console.error(e);
            }
        };

        const modal = app.openLoadingModal();
        fetch().then(() => modal.close()).catch(() => modal.close());
    }, [id]);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        const fetch = async () => {
            try {
                let config = await app.getAuthorization(location, navigate, false);
                let searchParams = new URLSearchParams(search);
                searchParams.set("exclude_window", "true");
                let basePath = collection_id ? "/get-post/" + collection_id : "/get-post";
                let result = await http.get<PostDetailed>(`${basePath}/${id}?${searchParams}`, config);
                if (post) {
                    result.data.prev_post = post.prev_post;
                    result.data.next_post = post.next_post;
                }
                updatePost(result.data);
            } catch (e: any) {
                if (e.response?.status === 403) {
                    app.openModal("Error", <p>This post is unavailable.</p>);
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
    }, [isEditMode]);

    useEffect(() => {
        if (post) {
            setMediaComponent(
                <div id="post-container-media-container">
                    <div ref={mediaComponentElementCallback} style={{ height: "max-content", width: "max-content", display: "inline-block" }}>
                        {getComponentForData(post)}
                    </div>
                </div>
            );
        } else {
            setMediaComponent(null);
        }
    }, [post?.s3_object?.object_key, hlsEnabled])

    const playerRef = React.useRef(null);
    const handlePlayerReady = (player: any) => {
        playerRef.current = player;

        // You can handle player events here, for example:
        player.on('waiting', () => {
            videojs.log('player is waiting');
        });

        player.on('dispose', () => {
            videojs.log('player will dispose');
        });
    };

    function getComponentForData(post: PostDetailed): ReactElement | undefined {
        if (post.s3_object != null) {
            let dataUrl = getApiUrl() + "get-object/" + post.s3_object.object_key;
            if (post.s3_object.mime_type.startsWith("image")) {
                return <img className="image-post" src={dataUrl} alt={`Image of post ${post.pk}`}></img>;
            } else if (post.s3_object.mime_type.startsWith("audio")) {
                return <MusicPlayer src={dataUrl} />
            } else if (post.s3_object.mime_type.startsWith("video")) {
                let videoType = post.s3_object.mime_type;
                let sources = [{
                    src: dataUrl,
                    // attempt to play mvk as webm
                    type: videoType === "video/x-matroska" ? "video/webm" : post.s3_object.mime_type
                }];

                if (hlsEnabled && post.s3_object.hls_master_playlist) {
                    sources.splice(0, 0, {
                        src: urlJoin(getApiUrl(), "get-object", post.s3_object.hls_master_playlist),
                        type: "application/vnd.apple.mpegurl"
                    });
                }

                const videoJsOptions = {
                    autoplay: true,
                    controls: true,
                    responsive: true,
                    fill: true,
                    preload: "auto",
                    sources: sources,
                    html5: {
                        vhs: {
                            overrideNative: !videojs.browser.IS_SAFARI
                        },
                        nativeAudioTracks: false,
                        nativeVideoTracks: false
                    }
                };

                return <div className="video-container"><VideoJS options={videoJsOptions} onReady={handlePlayerReady}></VideoJS></div>;
            }
        }
    }

    let component;
    let postInformation;
    let prevLink;
    let nextLink;
    let postContainerButtonGroup;
    if (post) {
        let dataUrl = getApiUrl() + "get-object/" + post.s3_object?.object_key;
        postContainerButtonGroup = <ButtonGroup size={useLargeControls ? "large" : "medium"} orientation={mediaWidth && mediaWidth < 350 ? "vertical" : "horizontal"}>
            <Button href={dataUrl} target="_blank" rel="noreferrer"><FontAwesomeSvgIcon fontSize="inherit" icon={solid("download")} /></Button>
            <Button onClick={() => app.openModal("Add to collection", (addToCollectionModal) => <AddToCollectionDialogue app={app} postPks={[post.pk]} modal={addToCollectionModal} />)}><FontAwesomeSvgIcon fontSize="inherit" icon={solid("plus")} /></Button>
            {post.is_deletable && <Button onClick={() => app.openModal(
                "Delete post",
                (modal) => <ActionModal
                    modalContent={modal}
                    text={post.title ? `Delete post '${post.title}'` : `Delete 1 post`}
                    actions={[
                        {
                            name: "Ok",
                            fn: async () => {
                                const loadingModal = app.openLoadingModal();
                                try {
                                    const config = await app.getAuthorization(location, navigate);
                                    const result = await http.post<DeletePostsResponse>("/delete-posts", {
                                        post_pks: [post.pk],
                                        inaccessible_post_mode: "skip",
                                        delete_unreferenced_objects: true
                                    }, config);

                                    loadingModal.close();
                                    navigate({
                                        pathname: collection_id ? "/collection/" + collection_id : "/posts",
                                        search: search
                                    });

                                    enqueueSnackbar({
                                        message: `Deleted ${result.data.deleted_posts.length} post${result.data.deleted_posts.length !== 1 ? 's' : ''}`,
                                        variant: "success"
                                    });
                                    return result.data;
                                } catch (e) {
                                    console.error(e);
                                    loadingModal.close();
                                    enqueueSnackbar({
                                        message: "Failed to delete post",
                                        variant: "error"
                                    });
                                }
                            }
                        }
                    ]}
                />,
            )}><FontAwesomeSvgIcon fontSize="inherit" icon={solid("trash")} /></Button>}
            {post?.s3_object && <Button onClick={() => app.openModal("File metadata", <FileMetadataDisplay s3_object={post.s3_object!} s3_object_metadata={post.s3_object_metadata} />)}><FontAwesomeSvgIcon fontSize="inherit" icon={solid("info-circle")} /></Button>}
        </ButtonGroup>;
        component = mediaComponent;
        postInformation = <>
            <div><FontAwesomeIcon icon={solid("user")}></FontAwesomeIcon> {post.create_user.display_name || post.create_user.user_name}</div>
            <div><FontAwesomeIcon icon={solid("clock")}></FontAwesomeIcon> {new Date(post.creation_timestamp).toLocaleString()}</div>
        </>;

        let basePostPath = collection_id ? "/collection/" + collection_id + "/post/" : "/post/"
        if (post.prev_post) {
            let searchParams = new URLSearchParams(search);
            searchParams.set("page", post.prev_post.page.toString());
            let location: Partial<Location> = { pathname: basePostPath + post.prev_post.pk, search: searchParams.toString(), key: post.prev_post.pk.toString() };
            prevLink = <Button component={Link} to={location} size="large" sx={{ minWidth: "0" }}><FontAwesomeSvgIcon fontSize="inherit" icon={solid("angle-left")} /></Button>;
        }
        if (post.next_post) {
            let searchParams = new URLSearchParams(search);
            searchParams.set("page", post.next_post.page.toString());
            let location: Partial<Location> = { pathname: basePostPath + post.next_post.pk, search: searchParams.toString(), key: post.next_post.pk.toString() };
            nextLink = <Button component={Link} to={location} size="large" sx={{ minWidth: "0" }}><FontAwesomeSvgIcon fontSize="inherit" icon={solid("angle-right")} /></Button>;
        }
    } else {
        component = <FontAwesomeIcon icon={solid("circle-notch")} spin></FontAwesomeIcon>;
    }

    return (
        <div id="Post">
            <div id="post-container">
                <div id="post-container-top-row">
                    <Button size="large" component={Link} startIcon={<FontAwesomeSvgIcon icon={solid("angle-left")} />} sx={{ marginRight: "5px" }} to={{
                        pathname: collection_id ? "/collection/" + collection_id : "/posts",
                        search: search
                    }}>Back</Button>
                    {post?.s3_object?.hls_master_playlist
                        ? <FormControlLabel className="inline-form-control-label" control={<Switch checked={hlsEnabled} onChange={(_e, checked) => {
                            setHlsEnabled(checked);
                        }} />} label="HLS" />
                        : <></>
                    }
                    <div id="navigate-buttons">{prevLink}{nextLink}</div>
                </div>
                {component}
                <div id="post-container-bottom-row">
                    <div className="post-container-information" style={{
                        flexDirection: useLargeControls ? "row" : "column",
                        maxWidth: useLargeControls ? "none" : "150px",
                        gap: useLargeControls ? "10px" : "0",
                        fontSize: useLargeControls ? "16px" : "12px"
                    }}>{postInformation}</div>
                    <div className="post-container-button-group">{postContainerButtonGroup}</div>
                </div>
            </div>
            <div id="post-information-container">
                {isEditMode
                    ? <Button startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("xmark")} />} onClick={() => setEditMode(false)}>Cancel</Button>
                    : <Button startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("pen-to-square")} />} hidden={!post?.is_editable || !app.isLoggedIn()} onClick={() => setEditMode(true)}>Edit</Button>}
                {isEditMode ? <div className="material-row"><TextField label="Title" variant="outlined" value={title} fullWidth onChange={e => setTitle(e.target.value)} inputProps={{ maxLength: 300 }}></TextField></div> : <h2>{post && post.title}</h2>}
                {isEditMode ? <div className="material-row"><TextField label="Description" variant="outlined" value={description} fullWidth multiline onChange={e => setDescription(e.target.value)} inputProps={{ maxLength: 30000 }}></TextField></div> : <p className="multiline-text">{post && post.description}</p>}
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
                    <VisibilitySelect isPublic={publicPost} isPublicEdit={publicPostEdit} readOnly={!isEditMode} setPublic={setPublicPost} setPublicEdit={setPublicPostEdit} />
                    <GroupSelector
                        currentUserGroups={currentUserGroups}
                        selectedUserGroups={selectedUserGroups}
                        setSelectedUserGroups={setSelectedUserGroups}
                        selectedUserGroupsReadOnly={selectedUserGroupsReadOnly}
                        setSelectedUserGroupsReadOnly={setSelectedUserGroupsReadOnly}
                        readOnly={!isEditMode}
                    />
                </div>
                <div className="material-row">
                    <Button color="secondary" startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={regular("floppy-disk")} />} hidden={!isEditMode} onClick={async () => {
                        let groupAccess: GroupAccessDefinition[] = [];
                        selectedUserGroups.forEach(group => groupAccess.push(new GroupAccessDefinition(group.pk, !selectedUserGroupsReadOnly.includes(group.pk))));

                        const loadingModal = app.openLoadingModal();
                        try {
                            let config = await app.getAuthorization(location, navigate);
                            let result = await http.post<PostDetailed>(`/edit-post/${post!.pk}`, new EditPostRequest(
                                enteredTags,
                                selectedTags,
                                null,
                                null,
                                null,
                                null,
                                null,
                                title,
                                publicPost,
                                publicPostEdit,
                                description,
                                groupAccess,
                                null,
                                null
                            ), config);

                            if (post) {
                                result.data.prev_post = post.prev_post;
                                result.data.next_post = post.next_post;
                            }

                            enqueueSnackbar({
                                message: "Post edited",
                                variant: "success"
                            });
                            updatePost(result.data);
                        } catch (e) {
                            console.error("Error occurred editing post " + e);
                            enqueueSnackbar({
                                message: "An error occurred editing your post, please try again",
                                variant: "error"
                            });
                        }

                        loadingModal.close();
                        setEditMode(false);
                    }}>Save</Button>
                </div>
            </div>
        </div>
    );
}

export default Post;

export class EditPostRequest {
    tags_overwrite: string[] | null;
    tag_pks_overwrite: number[] | null;
    removed_tag_pks: number[] | null;
    added_tag_pks: number[] | null;
    added_tags: string[] | null;
    data_url: string | null;
    source_url: string | null;
    title: string | null;
    is_public: boolean | null;
    public_edit: boolean | null;
    description: string | null;
    group_access_overwrite: GroupAccessDefinition[] | null;
    added_group_access: GroupAccessDefinition[] | null;
    removed_group_access: number[] | null;

    constructor(
        tags_overwrite: string[] | null,
        tag_pks_overwrite: number[] | null,
        removed_tag_pks: number[] | null,
        added_tag_pks: number[] | null,
        added_tags: string[] | null,
        data_url: string | null,
        source_url: string | null,
        title: string | null,
        is_public: boolean | null,
        public_edit: boolean | null,
        description: string | null,
        group_access_overwrite: GroupAccessDefinition[] | null,
        added_group_access: GroupAccessDefinition[] | null,
        removed_group_access: number[] | null
    ) {
        this.tags_overwrite = tags_overwrite;
        this.tag_pks_overwrite = tag_pks_overwrite;
        this.removed_tag_pks = removed_tag_pks;
        this.added_tag_pks = added_tag_pks;
        this.added_tags = added_tags;
        this.data_url = data_url;
        this.source_url = source_url;
        this.title = title;
        this.is_public = is_public;
        this.public_edit = public_edit;
        this.description = description;
        this.group_access_overwrite = group_access_overwrite;
        this.added_group_access = added_group_access;
        this.removed_group_access = removed_group_access;
    }
}
