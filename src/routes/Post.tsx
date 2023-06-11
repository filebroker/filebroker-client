import React, { ReactElement } from "react";
import { useEffect, useState } from "react";
import { Link, Location, useLocation, useNavigate, useParams } from "react-router-dom";
import videojs from "video.js";
import App from "../App";
import http, { getApiUrl } from "../http-common";
import VideoJS from "../components/VideoJS";
import "./Post.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { solid } from "@fortawesome/fontawesome-svg-core/import.macro";
import { GrantedPostGroupAccess, PostDetailed, UserGroup } from "../Model";
import { FormControlLabel, Switch, TextField } from "@mui/material";
import { TagSelector } from "../components/TagEditor";
import { GroupSelector } from "../components/GroupEditor";
import urlJoin from "url-join";

class PostProps {
    app: App;

    constructor(app: App) {
        this.app = app;
    }
}

function Post({ app }: PostProps) {
    let { id } = useParams();
    const [post, setPost] = useState<PostDetailed | null>(null);
    const location = useLocation();
    const search = location.search;
    const navigate = useNavigate();

    const [isEditMode, setEditMode] = useState(false);
    const [tags, setTags] = useState<(string | { label: string, pk: number })[]>([]);
    const [enteredTags, setEnteredTags] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<number[]>([]);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [currentUserGroups, setCurrentUserGroups] = useState<UserGroup[]>([]);
    const [selectedUserGroups, setSelectedUserGroups] = useState<UserGroup[]>([]);
    const [selectedUserGroupsReadOnly, setSelectedUserGroupsReadOnly] = useState<number[]>([]);
    const [hlsEnabled, setHlsEnabled] = useState(true);
    const [mediaComponent, setMediaComponent] = useState<ReactElement | undefined | null>(null);

    function updatePost(postDetailed: PostDetailed) {
        setPost(postDetailed);
        setTags(postDetailed.tags.map(tag => {
            return { label: tag.tag_name, pk: tag.pk };
        }));
        setSelectedTags(postDetailed.tags.map(tag => tag.pk));
        setTitle(postDetailed.title || "");
        setDescription(postDetailed.description || "");
        setSelectedUserGroups(postDetailed.group_access.map(groupAccess => groupAccess.granted_group));
        setSelectedUserGroupsReadOnly(postDetailed.group_access.filter(groupAccess => !groupAccess.write).map(groupAccess => groupAccess.granted_group.pk));
    }

    useEffect(() => {
        setPost(null);
        let fetch = async () => {
            let config = await app.getAuthorization(location, navigate, false);

            http
                .get<PostDetailed>(`/get-post/${id}${search}`, config)
                .then(result => {
                    updatePost(result.data);
                });

            http
                .get<UserGroup[]>("/get-current-user-groups", config)
                .then(result => setCurrentUserGroups(result.data));
        };

        const modal = app.openModal("", <FontAwesomeIcon icon={solid("circle-notch")} spin></FontAwesomeIcon>, undefined, false);
        fetch().then(() => modal.close()).catch(e => {
            console.error(e);
            modal.close();
        });
    }, [id]);

    useEffect(() => {
        if (post) {
            setMediaComponent(getComponentForData(post));
        } else {
            setMediaComponent(null);
        }
    }, [post, hlsEnabled])

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
    let downloadLink;
    let prevLink;
    let nextLink;
    if (post) {
        let dataUrl = getApiUrl() + "get-object/" + post.s3_object?.object_key;
        downloadLink = dataUrl && <p><a className="standard-link-button-large" target={"_blank"} rel="noreferrer" href={dataUrl}><FontAwesomeIcon icon={solid("download")}></FontAwesomeIcon></a></p>;
        component = mediaComponent;
        postInformation = <div id="post-information">
            <FontAwesomeIcon icon={solid("clock")}></FontAwesomeIcon> {new Date(post.creation_timestamp).toLocaleString()}
        </div>;

        if (post.prev_post_pk) {
            let location: Partial<Location> = { pathname: "/post/" + post.prev_post_pk, search: search, key: post.prev_post_pk.toString() };
            prevLink = <Link className="standard-link-button-large" to={location}><FontAwesomeIcon icon={solid("angle-left")}></FontAwesomeIcon></Link>;
        }
        if (post.next_post_pk) {
            let location: Partial<Location> = { pathname: "/post/" + post.next_post_pk, search: search, key: post.next_post_pk.toString() };
            nextLink = <Link className="standard-link-button-large" to={location}><FontAwesomeIcon icon={solid("angle-right")}></FontAwesomeIcon></Link>;
        }
    } else {
        component = <FontAwesomeIcon icon={solid("circle-notch")} spin></FontAwesomeIcon>;
    }

    return (
        <div id="Post">
            <div id="post-container">
                <div id="post-container-top-row">
                    <Link className="standard-link-button-large" to={{
                        pathname: "/posts",
                        search: search
                    }}><FontAwesomeIcon icon={solid("angle-left")}></FontAwesomeIcon> Back</Link>
                    {post?.s3_object?.hls_master_playlist
                        ? <FormControlLabel className="inline-form-control-label" control={<Switch checked={hlsEnabled} onChange={(_e, checked) => {
                            setHlsEnabled(checked);
                        }} />} label="HLS" />
                        : <></>
                    }
                    <div id="navigate-buttons">{prevLink}{nextLink}</div>
                </div>
                {component}
                {postInformation}
                <div id="post-container-bottom-row">
                    {downloadLink}
                </div>
            </div>
            <div id="post-information-container">
                {isEditMode
                    ? <button className="standard-button" onClick={() => setEditMode(false)}><FontAwesomeIcon icon={solid("xmark")}></FontAwesomeIcon> Cancel</button>
                    : <button hidden={!post?.is_editable} className="standard-button" onClick={() => setEditMode(true)}><FontAwesomeIcon icon={solid("pen-to-square")}></FontAwesomeIcon> Edit</button>}
                {isEditMode ? <div className="material-row"><TextField label="Title" variant="outlined" value={title} fullWidth onChange={e => setTitle(e.target.value)} inputProps={{ maxLength: 300 }}></TextField></div> : <h2>{post && post.title}</h2>}
                {isEditMode ? <div className="material-row"><TextField label="Description" variant="outlined" value={description} fullWidth multiline onChange={e => setDescription(e.target.value)} inputProps={{ maxLength: 30000 }}></TextField></div> : <p className="multiline-text">{post && post.description}</p>}
                <div className="material-row"><TagSelector setSelectedTags={setSelectedTags} setEnteredTags={setEnteredTags} values={tags} readOnly={!isEditMode}></TagSelector></div>
                <div className="material-row">
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
                    <button hidden={!isEditMode} className="standard-button" onClick={async () => {
                        let groupAccess: GrantedPostGroupAccess[] = [];
                        selectedUserGroups.forEach(group => groupAccess.push(new GrantedPostGroupAccess(group.pk, !selectedUserGroupsReadOnly.includes(group.pk))));

                        const loadingModal = app.openModal("", <FontAwesomeIcon icon={solid("circle-notch")} spin></FontAwesomeIcon>, undefined, false);
                        try {
                            let config = await app.getAuthorization(location, navigate);
                            let result = await http.post<PostDetailed>(`/edit-post/${id}`, new EditPostRequest(
                                enteredTags,
                                selectedTags,
                                null,
                                null,
                                null,
                                null,
                                null,
                                title,
                                null,
                                null,
                                description,
                                groupAccess,
                                null,
                                null
                            ), config);

                            if (post) {
                                result.data.prev_post_pk = post.prev_post_pk;
                                result.data.next_post_pk = post.next_post_pk;
                            }
                            updatePost(result.data);
                        } catch (e) {
                            console.error("Error occured editing post " + e);
                            app.openModal("Error", <p>An error occurred editing your post, please try again.</p>);
                        }

                        loadingModal.close();
                        setEditMode(false);
                    }}>Save</button>
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
    group_access_overwrite: GrantedPostGroupAccess[] | null;
    added_group_access: GrantedPostGroupAccess[] | null;
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
        group_access_overwrite: GrantedPostGroupAccess[] | null,
        added_group_access: GrantedPostGroupAccess[] | null,
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
