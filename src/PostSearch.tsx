import { solid } from '@fortawesome/fontawesome-svg-core/import.macro';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ReactNode, useEffect, useState } from 'react';
import ProgressiveImage from 'react-progressive-graceful-image';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import urlJoin from 'url-join';
import App from './App';
import http, { getApiUrl, getPublicUrl } from "./http-common";
import "./PostSearch.css";

class SearchResult {
    full_count: number | null;
    pages: number | null;
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
    creation_timestamp: string;
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
        creation_timestamp: string,
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

class PostSearchProps {
    app: App;

    constructor(app: App) {
        this.app = app;
    }
}

function PostSearch({ app }: PostSearchProps) {
    const [fullCount, setFullCount] = useState<number | null>(0);
    const [pageCount, setPageCount] = useState<number | null>(0);
    const [posts, setPosts] = useState<PostQueryObject[]>([]);
    const location = useLocation();
    const search = location.search;
    const navigate = useNavigate();

    let searchParams = new URLSearchParams(search);
    let queryParam: string = searchParams.get("query") ?? "";
    let pageParam: number = +(searchParams.get("page") ?? 0);

    let postDivs: ReactNode[] = [];
    posts.forEach(post => {
        let thumbnailUrl;

        if (post.thumbnail_url != null) {
            thumbnailUrl = post.thumbnail_url;
        } else if (post.thumbnail_object_key != null) {
            thumbnailUrl = urlJoin(getApiUrl(), "get-object", post.thumbnail_object_key);
        } else {
            thumbnailUrl = urlJoin(getPublicUrl(), "logo512.png");
        }

        // react-progressive-graceful-image is currently broken as it does not specify child property: https://github.com/sanishkr/react-progressive-graceful-image/issues/6
        // @ts-ignore
        let img = <ProgressiveImage src={thumbnailUrl} placeholder={urlJoin(getPublicUrl(), "logo192.png")}>{(src: string) => (<img src={src} className="thumb-img" alt="an image" />)}</ProgressiveImage>;

        postDivs.push(
            <div key={post.pk} className="post_wrapper">
                <Link to={{
                    pathname: "/post/" + post.pk,
                    search: search
                }}>
                    {img}
                </Link>
            </div>
        );
    });

    useEffect(() => {
        const modal = app.openModal("", <FontAwesomeIcon icon={solid("circle-notch")} spin></FontAwesomeIcon>, undefined, false);

        let fetch = async () => {
            let config;
            try {
                config = await app.getAuthorization(location, navigate, false);
            } catch(e: any) {
                modal.close();
                throw e;
            }

            try {
                let result = await http.get<SearchResult>(`/search${search}`, config);
                let searchResult = result.data;
                setFullCount(searchResult.full_count);
                setPageCount(searchResult.pages);
                setPosts(searchResult.posts);
            } catch (e: any) {
                let responseData = e.response?.data;
                if (responseData) {
                    let compilationErrors: JSX.Element[] = [];
                    let i = 0;

                    if (responseData.compilation_errors) {
                        responseData.compilation_errors.forEach((compilationError: { location: any; msg: string; }) => {
                            let location = compilationError.location;
                            let start: number = location.start;
                            let end: number = location.end;
                            let startIdx = Math.max(0, start - 25);
                            let endIdx = Math.min(queryParam.length, end + 25);
                            let queryPart = queryParam.substring(startIdx, endIdx);
                            let key = i++;
                            let marker;
                            if (end > start) {
                                marker = " ".repeat(start - startIdx) + "^" + "-".repeat(Math.max(0, end - start - 1)) + "^";
                            } else {
                                marker = " ".repeat(start - startIdx) + "^";
                            }
                            compilationErrors.push(
                                <div key={key}>
                                    Error {key}:
                                    <pre><code>
                                        {queryPart}<br></br>
                                        {marker}<br></br>
                                        <br></br>
                                        {compilationError.msg}
                                    </code></pre>
                                </div>
                            );
                        });
                    }

                    modal.close();
                    app.openModal("Error", <div>{responseData.message}<br></br>{compilationErrors}</div>);
                } else {
                    modal.close();
                    app.openModal("Error", <div>An unexpected Error occurred</div>);
                }

                throw e;
            }
        };

        fetch().then(() => modal.close()).catch(e => {
            modal.close();
            console.error(e);
        });

        return () => {
            setFullCount(0);
            setPageCount(0);
            setPosts([]);
        };
    }, [search]);

    function handlePageSwitch(pageNumber: number) {
        let searchParams = new URLSearchParams();
        searchParams.set("query", queryParam);
        searchParams.set("page", pageNumber.toString());
        navigate({ pathname: "/posts", search: searchParams.toString() });
    }

    let pageButtons: ReactNode[] = [];
    let firstPage = pageParam < 1;
    pageButtons.push(<button key="first" className="page-button" onClick={() => handlePageSwitch(0)} disabled={firstPage}>{"<<"}</button>);
    pageButtons.push(<button key="prev" className="page-button" onClick={() => handlePageSwitch(pageParam - 1)} disabled={firstPage}>{"<"}</button>);
    // show 10 page buttons maximum
    let lastPageToShow = pageCount ? Math.min(pageCount - 1, pageParam + 9) : pageParam;
    for (let i = Math.max(0, lastPageToShow - 9); i <= lastPageToShow; i++) {
        let className = "page-button";
        if (i == pageParam) {
            className += " page-button-selected";
        }
        pageButtons.push(<button key={i} className={className} onClick={() => handlePageSwitch(i)}>{i + 1}</button>);
    }
    if (pageCount) {
        let lastPage = pageParam >= pageCount - 1;
        pageButtons.push(<button key="next" className="page-button" onClick={() => handlePageSwitch(pageParam + 1)} disabled={lastPage}>{">"}</button>);
        pageButtons.push(<button key="last" className="page-button" onClick={() => handlePageSwitch(pageCount - 1)} disabled={lastPage}>{">>"}</button>);
    } else {
        pageButtons.push(<button key="next" className="page-button" onClick={() => handlePageSwitch(pageParam + 1)}>{">"}</button>);
    }

    return (
        <div id="PostSearch">
            <div id="image-wall">
                <div id="image-wall-container">
                    {postDivs}
                </div>
                <div id="page-button-container">
                    {pageButtons}
                </div>
                <div id="page-full-count"><h3>{fullCount ?? ">100000"} results</h3></div>
            </div>
        </div>
    );
}

export default PostSearch;
