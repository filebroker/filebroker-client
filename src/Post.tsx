import React from "react";
import { useEffect, useState } from "react";
import { Link, Location, useLocation, useNavigate, useParams } from "react-router-dom";
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
        setPost(null);
        let fetch = async () => {
            let config = await app.getAuthorization(location, navigate, false);

            await http
                .get<PostDetailed>(`/get-post/${id}${search}`, config)
                .then(result => {
                    setPost(result.data);
                });
        };

        app.openModal("", <FontAwesomeIcon icon={solid("circle-notch")} spin></FontAwesomeIcon>, undefined, false);
        fetch().then(() => app.closeModal()).catch(e => {
            console.error(e);
            app.closeModal();
        });
    }, [id]);

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
                return <img className="image-post" src={dataUrl}></img>;
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
        downloadLink = dataUrl && <p><a className="standard-link-button-large" target={"_blank"} href={dataUrl}><FontAwesomeIcon icon={solid("download")}></FontAwesomeIcon></a></p>;
        component = getComponentForData(post);
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
                    <div id="navigate-buttons">{prevLink}{nextLink}</div>
                </div>
                {component}
                {postInformation}
                <div id="post-container-bottom-row">
                    {downloadLink}
                </div>
            </div>
        </div>
    );
}

export default Post;
