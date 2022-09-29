import React from "react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import videojs from "video.js";
import App from "./App";
import http, { getApiUrl } from "./http-common";
import VideoJS from "./VideoJS";
import "./Post.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { solid } from "@fortawesome/fontawesome-svg-core/import.macro";
import { PostDetailed } from "./Model";

class PostProps {
    app: App;

    constructor(app: App) {
        this.app = app;
    }
}

function Post({app}: PostProps) {
    let { id } = useParams();
    const [post, setPost] = useState<PostDetailed | null>(null);
    const location = useLocation();
    const search = location.search;
    const navigate = useNavigate();

    useEffect(() => {
        let fetch = async () => {
            let config = await app.getAuthorization(location, navigate);

            http
                .get<PostDetailed>(`/get-post/${id}`, config)
                .then(result => {
                    setPost(result.data);
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
            let dataUrl = getApiUrl() + "get-object/" + post.s3_object.object_key;
            if (post.s3_object.mime_type.startsWith("image")) {
                return <img className="image-post" src={dataUrl}></img>
            } else if (post.s3_object.mime_type.startsWith("video")) {
                let videoType = post.s3_object.mime_type;
                const videoJsOptions = {
                    autoplay: true,
                    controls: true,
                    responsive: true,
                    fill: true,
                    preload: "auto",
                    sources: [{
                        src: dataUrl,
                        // attempt to play mvk as webm
                        type: videoType === "video/x-matroska" ? "video/webm" : post.s3_object.mime_type
                    }]
                };

                return <VideoJS options={videoJsOptions} onReady={handlePlayerReady}></VideoJS>;
            }
        }
    }

    let component;
    let postInformation;
    let downloadLink;
    if (post) {
        let dataUrl = getApiUrl() + "get-object/" + post.s3_object?.object_key;
        downloadLink = dataUrl && <a className="download-link" target={"_blank"} href={dataUrl}><FontAwesomeIcon icon={solid("download")}></FontAwesomeIcon></a>;
        component = getComponentForData(post);
        postInformation = <div id="post-information">
            <label>Creation timestamp:</label>
            <p>{new Date(post.creation_timestamp).toLocaleString()}</p>
        </div>;
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
                {component}<br></br>
                {downloadLink}
            </div>
        </div>
    );
}

export default Post;
