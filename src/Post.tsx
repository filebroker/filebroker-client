import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import App from "./App";
import http, { getApiUrl } from "./http-common";

class PostDetailed {
    pk: number;
    data_url: string | null;
    source_url: string | null;
    title: string | null;
    creation_timestamp: Date;
    fk_create_user: number;
    score: number;
    s3_object: S3Object | null;
    thumbnail_url: string | null;

    constructor(
        pk: number,
        data_url: string | null,
        source_url: string | null,
        title: string | null,
        creation_timestamp: Date,
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
    creation_timestamp: Date;

    constructor(
        object_key: string,
        sha256_hash: string | null,
        size_bytes: number,
        mime_type: string,
        fk_broker: number,
        fk_uploader: number,
        thumbnail_object_key: string | null,
        creation_timestamp: Date,
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
    const [post, setPost] = useState<PostDetailed>();

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

    let component;
    if (post) {
        component = getComponentForData(post);
    }

    if (!component) {
        component = <h2>No player found</h2>;
    }

    return (
        <div id="Post">
            {component}
        </div>
    );
}

function getComponentForData(post: PostDetailed) {
    if (post.s3_object != null) {
        if (post.s3_object.mime_type.startsWith("image")) {
            return <img className="image-post" src={getApiUrl() + "get-object/" + post.s3_object.object_key}></img>
        } else if (post.s3_object.mime_type.startsWith("video")) {
            return <video className="video-post" controls src={getApiUrl() + "get-object/" + post.s3_object.object_key}></video>
        }
    }
}

export default Post;
