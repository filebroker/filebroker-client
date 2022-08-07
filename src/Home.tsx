import React, { ReactNode, useEffect, useState } from 'react';
import ProgressiveImage, { ProgressiveImageProps, ProgressiveImageState } from 'react-progressive-graceful-image';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import App from './App';    
import http, { getApiUrl } from "./http-common";

class SearchResult {
    full_count: number;
    pages: number;
    posts: PostQueryObject[];

    constructor(
        full_count: number,
        pages: number,
        posts: PostQueryObject[],
    ) {
        this.full_count = full_count;
        this.pages = pages;
        this.posts = posts;
    }
}

class PostQueryObject {
    pk: number;
    data_url: string;
    source_url: string | null;
    title: string | null;
    creation_timestamp: Date;
    fk_create_user: number;
    score: number;
    s3_object: string | null;
    thumbnail_url: string | null;
    thumbnail_object_key: string | null;

    constructor(
        pk: number,
        data_url: string,
        source_url: string | null,
        title: string | null,
        creation_timestamp: Date,
        fk_create_user: number,
        score: number,
        s3_object: string | null,
        thumbnail_url: string | null,
        thumbnail_object_key: string | null,
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
        this.thumbnail_object_key = thumbnail_object_key;
    }
}

class HomeProps {
    app: App;

    constructor(app: App) {
        this.app = app;
    }
}

function Home({app}: HomeProps) {
    const [fullCount, setFullCount] = useState(0);
    const [pageCount, setPageCount] = useState(0);
    const [posts, setPosts] = useState<PostQueryObject[]>([]);
    const { search } = useLocation();
    const navigate = useNavigate();

    let searchParams = new URLSearchParams(search);
    let queryParam: string = searchParams.get("query") ?? "";
    const [queryString, setQueryString] = useState(queryParam);

    let postDivs: ReactNode[] = [];
    posts.forEach(post => {
        let thumbnailUrl;

        if (post.thumbnail_url != null) {
            thumbnailUrl = post.thumbnail_url;
        } else if (post.thumbnail_object_key != null) {
            thumbnailUrl = getApiUrl() + "get-object/" + post.thumbnail_object_key;
        } else {
            thumbnailUrl = "/public/logo512.png";
        }

        // react-progressive-graceful-image is currently broken as it does not specify child property: https://github.com/sanishkr/react-progressive-graceful-image/issues/6
        // @ts-ignore
        let img = <ProgressiveImage src={thumbnailUrl} placeholder="/public/logo192.png">{(src: string) => (<img src={src} className="thumb-img" alt="an image" />)}</ProgressiveImage>;

        postDivs.push(
            <div key={post.pk} className="post_wrapper">
                <Link to={`/post/${post.pk}${search}`}>
                    {img}
                </Link>
            </div>
        );
    });

    useEffect(() => {
        let fetch = async () => {
            let config = await app.getAuthorization();

            http
                .get<SearchResult>(`/search${search}`, config)
                .then(result => {
                    let searchResult = result.data;
                    setFullCount(searchResult.full_count);
                    setPageCount(searchResult.pages);
                    setPosts(searchResult.posts);
                });
        };

        fetch().catch(console.error)
    }, []);

    let queryInput = <input id="query-input" type="text" value={queryString} onChange={e => setQueryString(e.currentTarget.value)}></input>;

    function handleSearchQuery() {
        navigate({pathname: "/", search: "?query=" + queryString});
        window.location.reload();
    }

    return (
        <div id="Home">
            <div id="side-bar">
                <label>Query</label>
                {queryInput}
                <button onClick={handleSearchQuery}>Search</button>
            </div>
            <div id="image_wall_container">
                {postDivs}
            </div>
        </div>
    );
}

export default Home;
