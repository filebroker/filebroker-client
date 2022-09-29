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

export class S3Object {
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
    }
}
