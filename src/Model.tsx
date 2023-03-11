export class PostDetailed {
    pk: number;
    data_url: string | null;
    source_url: string | null;
    title: string | null;
    creation_timestamp: string;
    fk_create_user: number;
    score: number;
    s3_object: S3Object | null;
    thumbnail_url: string | null;
    prev_post_pk: number | null;
    next_post_pk: number | null;
    is_public: boolean;
    public_edit: boolean;
    description: string | null;
    is_editable: boolean;
    tags: Tag[];
    group_access: PostGroupAccessDetailed[];

    constructor(
        pk: number,
        data_url: string | null,
        source_url: string | null,
        title: string | null,
        creation_timestamp: string,
        fk_create_user: number,
        score: number,
        s3_object: S3Object | null,
        thumbnail_url: string | null,
        prev_post_pk: number | null,
        next_post_pk: number | null,
        is_public: boolean,
        public_edit: boolean,
        description: string | null,
        is_editable: boolean,
        tags: Tag[],
        group_access: PostGroupAccessDetailed[]
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
        this.prev_post_pk = prev_post_pk;
        this.next_post_pk = next_post_pk;
        this.is_public = is_public;
        this.public_edit = public_edit;
        this.description = description;
        this.is_editable = is_editable;
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
    hls_master_playlist: string | null;
    hls_disabled: boolean;

    constructor(
        object_key: string,
        sha256_hash: string | null,
        size_bytes: number,
        mime_type: string,
        fk_broker: number,
        fk_uploader: number,
        thumbnail_object_key: string | null,
        creation_timestamp: string,
        hls_master_playlist: string | null,
        hls_disabled: boolean,
    ) {
        this.object_key = object_key;
        this.sha256_hash = sha256_hash;
        this.size_bytes = size_bytes;
        this.mime_type = mime_type;
        this.fk_broker = fk_broker;
        this.fk_uploader = fk_uploader;
        this.thumbnail_object_key = thumbnail_object_key;
        this.creation_timestamp = creation_timestamp;
        this.hls_master_playlist = hls_master_playlist;
        this.hls_disabled = hls_disabled;
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

export class Tag {
    pk: number;
    tag_name: string;
    creation_timestamp: string;

    constructor(
        pk: number,
        tag_name: string,
        creation_timestamp: string
    ) {
        this.pk = pk;
        this.tag_name = tag_name;
        this.creation_timestamp = creation_timestamp;
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

export class GrantedPostGroupAccess {
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

export class AnalyzeQueryRequest {
    cursor_pos: number | null | undefined;
    query: string;

    constructor(cursor_pos: number | null | undefined, query: string) {
        this.cursor_pos = cursor_pos;
        this.query = query;
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
