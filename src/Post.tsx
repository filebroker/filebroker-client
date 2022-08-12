import React from "react";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import videojs from "video.js";
import App from "./App";
import http, { getApiUrl } from "./http-common";
import VideoJS from "./VideoJS";
import "./Post.css";

class PostDetailed {
    pk: number;
    data_url: string | null;
    source_url: string | null;
    title: string | null;
    creation_timestamp: string;
    fk_create_user: number;
    score: number;
    s3_object: S3Object | null;
    thumbnail_url: string | null;

    constructor(
        pk: number,
        data_url: string | null,
        source_url: string | null,
        title: string | null,
        creation_timestamp: string,
        fk_create_user: number,
        score: number,
        s3_object: S3Object | null,
        thumbnail_url: string | null
    ) {
        this.pk = pk;
        this.data_url = data_url;
        this.source_url = source_url;
        this.title = title;
        this.creation_timestamp = creation_timestamp;
        this.fk_create_user = fk_create_user;
        this.score = score;
        this.s3_object = s3_object;
        this.thumbnail_url = thumbnail_url;
    }
}

class S3Object {
    object_key: string;
    sha256_hash: string | null;
    size_bytes: number;
    mime_type: string;
    fk_broker: number;
    fk_uploader: number;
    thumbnail_object_key: string | null;
    creation_timestamp: string;

    constructor(
        object_key: string,
        sha256_hash: string | null,
        size_bytes: number,
        mime_type: string,
        fk_broker: number,
        fk_uploader: number,
        thumbnail_object_key: string | null,
        creation_timestamp: string,
    ) {
        this.object_key = object_key;
        this.sha256_hash = sha256_hash;
        this.size_bytes = size_bytes;
        this.mime_type = mime_type;
        this.fk_broker = fk_broker;
        this.fk_uploader = fk_uploader;
        this.thumbnail_object_key = thumbnail_object_key;
        this.creation_timestamp = creation_timestamp;
    }
}

class PostProps {
    app: App;

    constructor(app: App) {
        this.app = app;
    }
}

function Post({app}: PostProps) {
    let { id } = useParams();
    const [post, setPost] = useState<PostDetailed | null>(null);
    const { search } = useLocation();

    useEffect(() => {
        let fetch = async () => {
            let config = await app.getAuthorization();

            http
                .get<PostDetailed[]>(`/get-post/${id}`, config)
                .then(result => {
                    if (result.data.length > 0) {
                        setPost(result.data[0]);
                    }
                });
        };

        fetch().catch(console.error)
    }, []);

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

    function getComponentForData(post: PostDetailed) {
        if (post.s3_object != null) {
            if (post.s3_object.mime_type.startsWith("image")) {
                return <img className="image-post" src={getApiUrl() + "get-object/" + post.s3_object.object_key}></img>
            } else if (post.s3_object.mime_type.startsWith("video")) {
                const videoJsOptions = {
                    autoplay: true,
                    controls: true,
                    responsive: true,
                    fill: true,
                    preload: "auto",
                    sources: [{
                      src: getApiUrl() + "get-object/" + post.s3_object.object_key,
                      type: post.s3_object.mime_type
                    }]
                };
    
                return <VideoJS options={videoJsOptions} onReady={handlePlayerReady}></VideoJS>;
            }
        }
    }

    let component;
    let postInformation;
    if (post) {
        component = getComponentForData(post);
        postInformation = <div id="post-information">
            <label>Creation timestamp:</label>
            <p>{new Date(post.creation_timestamp).toLocaleString()}</p>
        </div>;
    }

    if (!component) {
        component = <h2>No player found</h2>;
    }

    return (
        <div id="Post">
            <div id="side-bar">
                <div className="back-overview">
                    <Link to={{
                        pathname: "/posts",
                        search: search
                    }}>Back to overview</Link>
                </div>
                {postInformation}
            </div>
            <div id="post-container">
                {component}
            </div>
        </div>
    );
}

export default Post;
