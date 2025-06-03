import { User } from "./App";
import {ReactElement} from "react";
import {Album, Face, Palette, Save, TheaterComedy} from "@mui/icons-material";

export class UserPublic {
    pk: number;
    user_name: string;
    avatar_url: string;
    creation_timestamp: string;
    display_name: string | null;

    constructor(
        pk: number,
        user_name: string,
        avatar_url: string,
        creation_timestamp: string,
        display_name: string | null
    ) {
        this.pk = pk;
        this.user_name = user_name;
        this.avatar_url = avatar_url;
        this.creation_timestamp = creation_timestamp;
        this.display_name = display_name;
    }
}


export class Post {
    pk: number;
    data_url: string | null;
    source_url: string | null;
    title: string | null;
    creation_timestamp: string;
    fk_create_user: number;
    score: number;
    s3_object: string | null;
    thumbnail_url: string | null;
    is_public: boolean;
    public_edit: boolean;
    description: string | null;

    constructor(
        pk: number,
        data_url: string | null,
        source_url: string | null,
        title: string | null,
        creation_timestamp: string,
        fk_create_user: number,
        score: number,
        s3_object: string | null,
        thumbnail_url: string | null,
        is_public: boolean,
        public_edit: boolean,
        description: string | null
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
        this.is_public = is_public;
        this.public_edit = public_edit;
        this.description = description;
    }
}

export class PostDetailed {
    pk: number;
    data_url: string | null;
    source_url: string | null;
    title: string | null;
    creation_timestamp: string;
    edit_timestamp: string;
    create_user: UserPublic;
    edit_user: UserPublic;
    score: number;
    s3_object: S3Object;
    s3_object_metadata: S3ObjectMetadata;
    thumbnail_url: string | null;
    prev_post: PostWindowObject | null;
    next_post: PostWindowObject | null;
    is_public: boolean;
    public_edit: boolean;
    description: string | null;
    is_editable: boolean;
    is_deletable: boolean;
    tags: TagUsage[];
    group_access: PostGroupAccessDetailed[];

    constructor(
        pk: number,
        data_url: string | null,
        source_url: string | null,
        title: string | null,
        creation_timestamp: string,
        edit_timestamp: string,
        create_user: UserPublic,
        edit_user: UserPublic,
        score: number,
        s3_object: S3Object,
        s3_object_metadata: S3ObjectMetadata,
        thumbnail_url: string | null,
        prev_post: PostWindowObject | null,
        next_post: PostWindowObject | null,
        is_public: boolean,
        public_edit: boolean,
        description: string | null,
        is_editable: boolean,
        is_deletable: boolean,
        tags: TagUsage[],
        group_access: PostGroupAccessDetailed[]
    ) {
        this.pk = pk;
        this.data_url = data_url;
        this.source_url = source_url;
        this.title = title;
        this.creation_timestamp = creation_timestamp;
        this.edit_timestamp = edit_timestamp;
        this.create_user = create_user;
        this.edit_user = edit_user;
        this.score = score;
        this.s3_object = s3_object;
        this.s3_object_metadata = s3_object_metadata;
        this.thumbnail_url = thumbnail_url;
        this.prev_post = prev_post;
        this.next_post = next_post;
        this.is_public = is_public;
        this.public_edit = public_edit;
        this.description = description;
        this.is_editable = is_editable;
        this.is_deletable = is_deletable;
        this.tags = tags;
        this.group_access = group_access;
    }
}

export class PostWindowObject {
    pk: number;
    page: number;

    constructor(pk: number, page: number) {
        this.pk = pk;
        this.page = page;
    }
}

export class PostCollection {
    pk: number;
    title: string;
    fk_create_user: number;
    creation_timestamp: string;
    is_public: boolean;
    public_edit: boolean;
    poster_object_key: string | null;
    description: string | null;

    constructor(
        pk: number,
        title: string,
        fk_create_user: number,
        creation_timestamp: string,
        is_public: boolean,
        public_edit: boolean,
        poster_object_key: string | null,
        description: string | null,
    ) {
        this.pk = pk;
        this.title = title;
        this.fk_create_user = fk_create_user;
        this.creation_timestamp = creation_timestamp;
        this.is_public = is_public;
        this.public_edit = public_edit;
        this.poster_object_key = poster_object_key;
        this.description = description;
    }
}

export class PostCollectionDetailed {
    pk: number;
    title: string;
    create_user: UserPublic;
    edit_user: UserPublic;
    creation_timestamp: string;
    edit_timestamp: string;
    is_public: boolean;
    public_edit: boolean;
    poster_object: S3Object | null;
    poster_object_key: string | null;
    description: string | null;
    is_editable: boolean;
    is_deletable: boolean;
    tags: TagUsage[];
    group_access: PostCollectionGroupAccessDetailed[];

    constructor(
        pk: number,
        title: string,
        create_user: User,
        edit_user: User,
        creation_timestamp: string,
        edit_timestamp: string,
        is_public: boolean,
        public_edit: boolean,
        poster_object: S3Object | null,
        poster_object_key: string | null,
        description: string | null,
        is_editable: boolean,
        is_deletable: boolean,
        tags: TagUsage[],
        group_access: PostCollectionGroupAccessDetailed[]
    ) {
        this.pk = pk;
        this.title = title;
        this.create_user = create_user;
        this.edit_user = edit_user;
        this.creation_timestamp = creation_timestamp;
        this.edit_timestamp = edit_timestamp;
        this.is_public = is_public;
        this.public_edit = public_edit;
        this.poster_object = poster_object;
        this.poster_object_key = poster_object_key;
        this.description = description;
        this.is_editable = is_editable;
        this.is_deletable = is_deletable;
        this.tags = tags;
        this.group_access = group_access;
    }
}

export class S3Object {
    object_key: string;
    sha256_hash: string | null;
    size_bytes: number;
    mime_type: string;
    fk_broker: number;
    fk_uploader: number;
    thumbnail_object_key: string | null;
    creation_timestamp: string;
    filename: string | null;
    hls_master_playlist: string | null;
    hls_disabled: boolean;
    hls_locked_at: string | null;
    thumbnail_locked_at: string | null;
    hls_fail_count: number | null;
    thumbnail_fail_count: number | null;
    thumbnail_disabled: boolean;
    metadata_locked_at: string | null;
    metadata_fail_count: number | null;

    constructor(
        object_key: string,
        sha256_hash: string | null,
        size_bytes: number,
        mime_type: string,
        fk_broker: number,
        fk_uploader: number,
        thumbnail_object_key: string | null,
        creation_timestamp: string,
        filename: string | null,
        hls_master_playlist: string | null,
        hls_disabled: boolean,
        hls_locked_at: string | null,
        thumbnail_locked_at: string | null,
        hls_fail_count: number | null,
        thumbnail_fail_count: number | null,
        thumbnail_disabled: boolean,
        metadata_locked_at: string | null,
        metadata_fail_count: number | null,
    ) {
        this.object_key = object_key;
        this.sha256_hash = sha256_hash;
        this.size_bytes = size_bytes;
        this.mime_type = mime_type;
        this.fk_broker = fk_broker;
        this.fk_uploader = fk_uploader;
        this.thumbnail_object_key = thumbnail_object_key;
        this.creation_timestamp = creation_timestamp;
        this.filename = filename;
        this.hls_master_playlist = hls_master_playlist;
        this.hls_disabled = hls_disabled;
        this.hls_locked_at = hls_locked_at;
        this.thumbnail_locked_at = thumbnail_locked_at;
        this.hls_fail_count = hls_fail_count;
        this.thumbnail_fail_count = thumbnail_fail_count;
        this.thumbnail_disabled = thumbnail_disabled;
        this.metadata_locked_at = metadata_locked_at;
        this.metadata_fail_count = metadata_fail_count;
    }
}

export class Broker {
    pk: number;
    name: string;
    bucket: string;
    endpoint: string;
    access_key: string;
    secret_key: string;
    is_aws_region: boolean;
    remove_duplicate_files: boolean;
    fk_owner: number;
    creation_timestamp: string;
    hls_enabled: boolean;

    constructor(
        pk: number,
        name: string,
        bucket: string,
        endpoint: string,
        access_key: string,
        secret_key: string,
        is_aws_region: boolean,
        remove_duplicate_files: boolean,
        fk_owner: number,
        creation_timestamp: string,
        hls_enabled: boolean,
    ) {
        this.pk = pk;
        this.name = name;
        this.bucket = bucket;
        this.endpoint = endpoint;
        this.access_key = access_key;
        this.secret_key = secret_key;
        this.is_aws_region = is_aws_region;
        this.remove_duplicate_files = remove_duplicate_files;
        this.fk_owner = fk_owner;
        this.creation_timestamp = creation_timestamp;
        this.hls_enabled = hls_enabled;
    }
}

export class BrokerAvailability {
    broker: Broker;
    used_bytes: number;
    quota_bytes: number | null | undefined;

    constructor(
        broker: Broker,
        used_bytes: number,
        quota_bytes: number | null | undefined
    ) {
        this.broker = broker;
        this.used_bytes = used_bytes;
        this.quota_bytes = quota_bytes;
    }
}

export class Tag {
    pk: number;
    tag_name: string;
    creation_timestamp: string;
    fk_create_user: number;
    edit_timestamp: string;
    fk_edit_user: number;
    tag_category: string | null | undefined;
    auto_match_condition_post: string | null | undefined;
    auto_match_condition_collection: string | null | undefined;

    constructor(
        pk: number,
        tag_name: string,
        creation_timestamp: string,
        fk_create_user: number,
        edit_timestamp: string,
        fk_edit_user: number,
        tag_category: string | null | undefined,
        auto_match_condition_post: string | null | undefined,
        auto_match_condition_collection: string | null | undefined
    ) {
        this.pk = pk;
        this.tag_name = tag_name;
        this.creation_timestamp = creation_timestamp;
        this.fk_create_user = fk_create_user;
        this.edit_timestamp = edit_timestamp;
        this.fk_edit_user = fk_edit_user;
        this.tag_category = tag_category;
        this.auto_match_condition_post = auto_match_condition_post;
        this.auto_match_condition_collection = auto_match_condition_collection;
    }
}

export class TagCategory {
    id: string;
    label: string;
    auto_match_condition_post: string | null | undefined;
    auto_match_condition_collection: string | null | undefined;

    constructor(
        id: string,
        label: string,
        auto_match_condition_post: string | null | undefined,
        auto_match_condition_collection: string | null | undefined
    ) {
        this.id = id;
        this.label = label;
        this.auto_match_condition_post = auto_match_condition_post;
        this.auto_match_condition_collection = auto_match_condition_collection;
    }
}

export function sortTagUsages(a: TagUsage, b: TagUsage): number {
    if (!a.tag.tag_category && !b.tag.tag_category) return a.tag.tag_name.localeCompare(b.tag.tag_name);
    if (!a.tag.tag_category) return 1;
    if (!b.tag.tag_category) return -1;
    return a.tag.tag_category.localeCompare(b.tag.tag_category) || a.tag.tag_name.localeCompare(b.tag.tag_name);
}

export function getIconForTagCategory(tagCategory: string): ReactElement | undefined {
    switch (tagCategory) {
        case "album":
            return <Album/>;
        case "artist":
            return <Palette/>;
        case "character":
            return <Face/>;
        case "genre":
            return <TheaterComedy/>;
        case "type":
            return <Save/>;
        default:
            return undefined;
    }
}

export class TagUsage {
    tag: Tag;
    auto_matched: boolean;

    constructor(tag: Tag, auto_matched: boolean) {
        this.tag = tag;
        this.auto_matched = auto_matched;
    }
}

export class TagEdge {
    fk_parent: number;
    fk_child: number;

    constructor(fk_parent: number, fk_child: number) {
        this.fk_parent = fk_parent;
        this.fk_child = fk_child;
    }
}

export class TagDetailed {
    pk: number;
    tag_name: string;
    creation_timestamp: string;
    create_user: UserPublic;
    edit_timestamp: string;
    edit_user: UserPublic;
    tag_category: TagCategory | null | undefined;
    auto_match_condition_post: string | null | undefined;
    auto_match_condition_collection: string | null | undefined;
    parents: Tag[];
    aliases: Tag[];

    constructor(
        pk: number,
        tag_name: string,
        creation_timestamp: string,
        create_user: UserPublic,
        edit_timestamp: string,
        edit_user: UserPublic,
        tag_category: TagCategory | null | undefined,
        auto_match_condition_post: string | null | undefined,
        auto_match_condition_collection: string | null | undefined,
        parents: Tag[],
        aliases: Tag[]
    ) {
        this.pk = pk;
        this.tag_name = tag_name;
        this.creation_timestamp = creation_timestamp;
        this.create_user = create_user;
        this.edit_timestamp = edit_timestamp;
        this.edit_user = edit_user;
        this.tag_category = tag_category;
        this.auto_match_condition_post = auto_match_condition_post;
        this.auto_match_condition_collection = auto_match_condition_collection;
        this.parents = parents;
        this.aliases = aliases;
    }
}

export class UserGroup {
    pk: number;
    name: string;
    is_public: boolean;
    hidden: boolean;
    fk_owner: number;
    creation_timestamp: string;

    constructor(
        pk: number,
        name: string,
        is_public: boolean,
        hidden: boolean,
        fk_owner: number,
        creation_timestamp: string
    ) {
        this.pk = pk;
        this.name = name;
        this.is_public = is_public;
        this.hidden = hidden;
        this.fk_owner = fk_owner;
        this.creation_timestamp = creation_timestamp;
    }
}

export class GroupAccessDefinition {
    group_pk: number;
    write: boolean;

    constructor(group_pk: number, write: boolean) {
        this.group_pk = group_pk;
        this.write = write;
    }
}

export class PostGroupAccessDetailed {
    fk_post: number;
    write: boolean;
    fk_granted_by: number;
    creation_timestamp: string;
    granted_group: UserGroup;

    constructor(
        fk_post: number,
        write: boolean,
        fk_granted_by: number,
        creation_timestamp: string,
        granted_group: UserGroup
    ) {
        this.fk_post = fk_post;
        this.write = write;
        this.fk_granted_by = fk_granted_by;
        this.creation_timestamp = creation_timestamp;
        this.granted_group = granted_group;
    }
}

export class PostCollectionGroupAccessDetailed {
    fk_post_collection: number;
    write: boolean;
    fk_granted_by: number;
    creation_timestamp: string;
    granted_group: UserGroup;

    constructor(
        fk_post_collection: number,
        write: boolean,
        fk_granted_by: number,
        creation_timestamp: string,
        granted_group: UserGroup
    ) {
        this.fk_post_collection = fk_post_collection;
        this.write = write;
        this.fk_granted_by = fk_granted_by;
        this.creation_timestamp = creation_timestamp;
        this.granted_group = granted_group;
    }
}

export class AnalyzeQueryRequest {
    cursor_pos: number | null | undefined;
    query: string;
    scope: string;

    constructor(cursor_pos: number | null | undefined, query: string, scope: string) {
        this.cursor_pos = cursor_pos;
        this.query = query;
        this.scope = scope;
    }
}

export class Location {
    start: number;
    end: number;

    constructor(start: number, end: number) {
        this.start = start;
        this.end = end;
    }
}

export class CompilerError {
    location: Location;
    msg: string;

    constructor(location: Location, msg: string) {
        this.location = location;
        this.msg = msg;
    }
}

export class QueryCompilationError {
    phase: string;
    errors: CompilerError[]

    constructor(phase: string, errors: CompilerError[]) {
        this.phase = phase;
        this.errors = errors;
    }
}

export class QueryAutocompleteSuggestionType {
    name: string;
    prefix: string;

    constructor(name: string, prefix: string) {
        this.name = name;
        this.prefix = prefix;
    }
}

export class QueryAutocompleteSuggestion {
    text: string;
    display: string;
    target_location: Location;
    suggestion_type: QueryAutocompleteSuggestionType;

    constructor(text: string, display: string, target_location: Location, suggestion_type: QueryAutocompleteSuggestionType) {
        this.text = text;
        this.display = display;
        this.target_location = target_location;
        this.suggestion_type = suggestion_type;
    }
}

export class AnalyzeQueryResponse {
    error: QueryCompilationError | null | undefined;
    suggestions: QueryAutocompleteSuggestion[];

    constructor(error: QueryCompilationError | null | undefined, suggestions: QueryAutocompleteSuggestion[]) {
        this.error = error;
        this.suggestions = suggestions;
    }
}

export class DeletePostsResponse {
    deleted_posts: Post[];
    deleted_objects: S3Object[];

    constructor(
        deleted_posts: Post[],
        deleted_objects: S3Object[]
    ) {
        this.deleted_posts = deleted_posts;
        this.deleted_objects = deleted_objects;
    }
}

export class DeletePostCollectionsResponse {
    deleted_post_collections: PostCollection[];

    constructor(deleted_post_collections: PostCollection[]) {
        this.deleted_post_collections = deleted_post_collections;
    }
}

export interface S3ObjectMetadata {
    object_key: string;
    file_type: string | undefined;
    file_type_extension: string | undefined;
    mime_type: string | undefined;
    title: string | undefined;
    artist: string | undefined;
    album: string | undefined;
    album_artist: string | undefined;
    composer: string | undefined;
    genre: string | undefined;
    date: string | undefined;
    track_number: number | undefined;
    track_count: number | undefined;
    disc_number: number | undefined;
    disc_count: number | undefined;
    duration: string | undefined;
    width: number | undefined;
    height: number | undefined;
    size: number | undefined;
    bit_rate: number | undefined;
    format_name: string | undefined;
    format_long_name: string | undefined;
    video_stream_count: number;
    video_codec_name: string | undefined;
    video_codec_long_name: string | undefined;
    video_frame_rate: number | undefined;
    video_bit_rate_max: number | undefined;
    audio_stream_count: number;
    audio_codec_name: string | undefined;
    audio_codec_long_name: string | undefined;
    audio_sample_rate: number | undefined;
    audio_channels: number | undefined;
    audio_bit_rate_max: number | undefined;
    raw: object;
    loaded: boolean;
}
