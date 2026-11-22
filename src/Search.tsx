import { Location, NavigateFunction } from "react-router-dom";
import App, { ModalContent } from "./App";
import http from "./http-common";
import { S3Object, S3ObjectMetadata, UserPublic } from "./Model";
import { JSX } from "react";
import { toBackendQueryParams } from "./QueryState";

export function extractQueryFromSearch(search: string): string {
    const searchParams = new URLSearchParams(search);
    return searchParams.get("query") ?? "";
}

export function extractConstrictionFromSearch(search: string): string {
    const searchParams = new URLSearchParams(search);
    return searchParams.get("constriction") ?? "";
}

export async function performSearchQuery(
    search: string,
    app: App,
    location: Location,
    navigate: NavigateFunction,
    loadingModal: ModalContent | undefined = undefined
): Promise<SearchResult> {
    const url = new URL(search, window.location.origin);

    // Existing callers pass either ?query=... or a scoped path
    // such as /collection?query=... or /collection/11?query=...
    const scopePath = search.startsWith("/") ? url.pathname : "";

    let backendParams: URLSearchParams;

    try {
        backendParams = toBackendQueryParams(url.searchParams);
    } catch (e: any) {
        loadingModal?.close();
        app.openModal("Invalid query", <div>{e instanceof Error ? e.message : String(e)}</div>);
        throw e;
    }

    // Use the actual FQL being sent to the backend when
    // displaying compilation errors.
    const queryParam = backendParams.get("query") ?? "";
    const constriction = backendParams.get("constriction") ?? "";

    let config;

    try {
        config = await app.getAuthorization(location, navigate, false);
    } catch (e: any) {
        loadingModal?.close();
        throw e;
    }

    try {
        const response = await http.get<SearchResult>(`/search${scopePath}?${backendParams.toString()}`, config);

        return response.data;
    } catch (e: any) {
        const responseData = e.response?.data;

        if (responseData) {
            const sourceQuery: string =
                typeof responseData.message === "string" && responseData.message.includes("constriction:")
                    ? constriction
                    : queryParam;

            const sourceChars = Array.from(sourceQuery);
            const compilationErrors: JSX.Element[] = [];

            if (Array.isArray(responseData.compilation_errors)) {
                responseData.compilation_errors.forEach(
                    (
                        compilationError: {
                            location: { start: number; end: number };
                            msg: string;
                        },
                        index: number
                    ) => {
                        const { start, end } = compilationError.location;

                        const startIdx = Math.max(0, start - 25);
                        const endIdx = Math.min(sourceChars.length, end + 26);

                        const queryPart = sourceChars.slice(startIdx, endIdx).join("");

                        const marker =
                            " ".repeat(Math.max(0, start - startIdx)) +
                            (end > start ? "^" + "-".repeat(Math.max(0, end - start - 1)) + "^" : "^");

                        compilationErrors.push(
                            <div key={index}>
                                Error {index + 1}:
                                <pre>
                                    <code>
                                        {queryPart}
                                        {"\n"}
                                        {marker}
                                        {"\n\n"}
                                        {compilationError.msg}
                                    </code>
                                </pre>
                            </div>
                        );
                    }
                );
            }

            loadingModal?.close();

            app.openModal(
                "Error",
                <div>
                    {responseData.message}
                    {compilationErrors}
                </div>
            );
        } else {
            loadingModal?.close();
            app.openModal("Error", <div>An unexpected error occurred.</div>);
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
    user_groups: UserGroupQueryObject[] | undefined;

    constructor(
        full_count: number,
        pages: number,
        posts: PostQueryObject[] | undefined,
        collections: PostCollectionQueryObject[] | undefined,
        collection_items: PostCollectionItemQueryObject[] | undefined,
        user_groups: UserGroupQueryObject[] | undefined
    ) {
        this.full_count = full_count;
        this.pages = pages;
        this.posts = posts;
        this.collections = collections;
        this.collection_items = collection_items;
        this.user_groups = user_groups;
    }
}

export class PostQueryObject {
    pk: number;
    data_url: string;
    source_url: string | null;
    title: string | null;
    creation_timestamp: string;
    create_user: UserPublic;
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
        create_user: UserPublic,
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
    create_user: UserPublic;
    poster_object: S3Object | null;
    thumbnail_object_key: string | null;
    is_public: boolean;
    public_edit: boolean;
    description: string | null;

    constructor(
        pk: number,
        title: string | null,
        creation_timestamp: string,
        create_user: UserPublic,
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
    added_by: UserPublic;
    creation_timestamp: string;
    pk: number;
    ordinal: number;

    constructor(
        post: PostQueryObject,
        post_collection: PostCollectionQueryObject,
        added_by: UserPublic,
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

export class UserGroupQueryObject {
    pk: number;
    name: string;
    is_public: boolean;
    owner: UserPublic;
    creation_timestamp: string;
    description: string | null | undefined;
    allow_member_invite: boolean;
    avatar_object_key: string | null | undefined;
    edit_timestamp: string;

    constructor(
        pk: number,
        name: string,
        is_public: boolean,
        owner: UserPublic,
        creation_timestamp: string,
        description: string | null | undefined,
        allow_member_invite: boolean,
        avatar_object_key: string | null | undefined,
        edit_timestamp: string
    ) {
        this.pk = pk;
        this.name = name;
        this.is_public = is_public;
        this.owner = owner;
        this.creation_timestamp = creation_timestamp;
        this.description = description;
        this.allow_member_invite = allow_member_invite;
        this.avatar_object_key = avatar_object_key;
        this.edit_timestamp = edit_timestamp;
    }
}
