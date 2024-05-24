import { Location, NavigateFunction } from "react-router-dom";
import App, { ModalContent, User } from "./App";
import http from "./http-common";
import { S3Object, S3ObjectMetadata } from "./Model";

export async function performSearchQuery(search: string, app: App, location: Location, navigate: NavigateFunction, loadingModal: ModalContent | undefined = undefined): Promise<SearchResult> {
    let searchParams = new URLSearchParams(search);
    let queryParam: string = searchParams.get("query") ?? "";

    let config;
    try {
        config = await app.getAuthorization(location, navigate, false);
    } catch (e: any) {
        loadingModal?.close();
        throw e;
    }

    try {
        let result = await http.get<SearchResult>(`/search${search}`, config);
        let searchResult = result.data;
        return searchResult;
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

            loadingModal?.close();
            app.openModal("Error", <div>{responseData.message}<br></br>{compilationErrors}</div>);
        } else {
            loadingModal?.close();
            app.openModal("Error", <div>An unexpected Error occurred</div>);
        }

        throw e;
    }
}

export class SearchResult {
    full_count: number | null;
    pages: number | null;
    posts: PostQueryObject[] | undefined;
    collections: PostCollectionQueryObject[] | undefined;
    collection_items: PostCollectionItemQueryObject[] | undefined;

    constructor(
        full_count: number,
        pages: number,
        posts: PostQueryObject[] | undefined,
        collections: PostCollectionQueryObject[] | undefined,
        collection_items: PostCollectionItemQueryObject[] | undefined
    ) {
        this.full_count = full_count;
        this.pages = pages;
        this.posts = posts;
        this.collections = collections;
        this.collection_items = collection_items;
    }
}

export class PostQueryObject {
    pk: number;
    data_url: string;
    source_url: string | null;
    title: string | null;
    creation_timestamp: string;
    create_user: User;
    score: number;
    s3_object: S3Object;
    s3_object_metadata: S3ObjectMetadata;
    thumbnail_url: string | null;
    thumbnail_object_key: string | null;
    is_public: boolean;
    public_edit: boolean;
    description: string | null;

    constructor(
        pk: number,
        data_url: string,
        source_url: string | null,
        title: string | null,
        creation_timestamp: string,
        create_user: User,
        score: number,
        s3_object: S3Object,
        s3_object_metadata: S3ObjectMetadata,
        thumbnail_url: string | null,
        thumbnail_object_key: string | null,
        is_public: boolean,
        public_edit: boolean,
        description: string | null
    ) {
        this.pk = pk;
        this.data_url = data_url;
        this.source_url = source_url;
        this.title = title;
        this.creation_timestamp = creation_timestamp;
        this.create_user = create_user;
        this.score = score;
        this.s3_object = s3_object;
        this.s3_object_metadata = s3_object_metadata;
        this.thumbnail_url = thumbnail_url;
        this.thumbnail_object_key = thumbnail_object_key;
        this.is_public = is_public;
        this.public_edit = public_edit;
        this.description = description;
    }
}

export class PostCollectionQueryObject {
    pk: number;
    title: string | null;
    creation_timestamp: string;
    create_user: User;
    poster_object: S3Object | null;
    thumbnail_object_key: string | null;
    is_public: boolean;
    public_edit: boolean;
    description: string | null;

    constructor(
        pk: number,
        title: string | null,
        creation_timestamp: string,
        create_user: User,
        poster_object: S3Object | null,
        thumbnail_object_key: string | null,
        is_public: boolean,
        public_edit: boolean,
        description: string | null
    ) {
        this.pk = pk;
        this.title = title;
        this.creation_timestamp = creation_timestamp;
        this.create_user = create_user;
        this.poster_object = poster_object;
        this.thumbnail_object_key = thumbnail_object_key;
        this.is_public = is_public;
        this.public_edit = public_edit;
        this.description = description;
    }
}

export class PostCollectionItemQueryObject {
    post: PostQueryObject;
    post_collection: PostCollectionQueryObject;
    added_by: User;
    creation_timestamp: string;
    pk: number;
    ordinal: number;

    constructor(
        post: PostQueryObject,
        post_collection: PostCollectionQueryObject,
        added_by: User,
        creation_timestamp: string,
        pk: number,
        ordinal: number
    ) {
        this.post = post;
        this.post_collection = post_collection;
        this.added_by = added_by;
        this.creation_timestamp = creation_timestamp;
        this.pk = pk;
        this.ordinal = ordinal;
    }
}
