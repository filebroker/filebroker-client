import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ReactTooltip from "react-tooltip";
import App from "./App";
import http from "./http-common";
import { solid } from '@fortawesome/fontawesome-svg-core/import.macro';
import CreateBrokerDialogue from "./CreateBrokerDialogue";
import React from "react";
import ProgressBar from 'react-bootstrap/ProgressBar';

class UploadDialogueProps {
    app: App;

    constructor(app: App) {
        this.app = app;
    }
}

class Broker {
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

class CreatePostRequest {
    data_url: string | null;
    source_url: string | null;
    title: string | null;
    tags: string[] | null;
    s3_object: string | null;
    thumbnail_url: string | null;

    constructor(
        data_url: string | null,
        source_url: string | null,
        title: string | null,
        tags: string[] | null,
        s3_object: string | null,
        thumbnail_url: string | null,
    ) {
        this.data_url = data_url;
        this.source_url = source_url;
        this.title = title;
        this.tags = tags;
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
    creation_timestamp: string;

    constructor(
        object_key: string,
        sha256_hash: string | null,
        size_bytes: number,
        mime_type: string,
        fk_broker: number,
        fk_uploader: number,
        thumbnail_object_key: string | null,
        creation_timestamp: string
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

class Post {
    pk: number;
    data_url: string | null;
    source_url: string | null;
    title: string | null;
    creation_timestamp: string;
    fk_create_user: number;
    score: number;
    s3_object: string | null;
    thumbnail_url: string | null;

    constructor(
        pk: number,
        data_url: string | null,
        source_url: string | null,
        title: string | null,
        creation_timestamp: string,
        fk_create_user: number,
        score: number,
        s3_object: string | null,
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

function UploadDialogue({app}: UploadDialogueProps) {
    const location = useLocation();
    const navigate = useNavigate();

    const [brokers, setBrokers] = useState<Broker[]>([]);
    const [selectedBroker, setSelectedBroker] = useState<string | undefined>(undefined);
    const [file, setFile] = useState<File | null>(null);
    const [fileLabel, setFileLabel] = useState("No file chosen");
    const hiddenFileInput = React.useRef<HTMLInputElement | null>(null);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let fetch = async () => {
            let config = await app.getAuthorization(location, navigate);

            http
                .get<Broker[]>("/get-brokers", config)
                .then(result => setBrokers(result.data));
        };

        fetch().catch(console.error);
    }, []);

    let brokerOptions: JSX.Element[] = [];
    brokers.sort((a, b) => a.name.localeCompare(b.name)).forEach(broker => brokerOptions.push(<option key={broker.pk} value={broker.pk}>{broker.name}</option>));

    function setFileLabelTrimmed(name: string) {
        if (name.length > 50) {
            setFileLabel(name.substring(0, 20) + "..." + name.substring(name.length - 20));
        } else {
            setFileLabel(name);
        }
    }

    return (
        <form className="modal-form" onSubmit={async e => {
            e.preventDefault();

            if (file != null && !selectedBroker) {
                app.openModal("Error", <p>You must select a broker when uploading a file</p>);
                return;
            }

            try {
                let s3_object: S3Object | null;
                if (file != null && selectedBroker) {
                    let config = await app.getAuthorization(location, navigate);
                    let formData = new FormData();
                    formData.append("file", file);
                    let uploadResponse = await http.post<S3Object>(`/upload/${selectedBroker}`, formData, {
                        headers: {
                          "Content-Type": "multipart/form-data",
                          authorization: config.headers.authorization
                        },
                        onUploadProgress: e => {
                            setProgress(Math.round((100 * e.loaded) / e.total));
                        },
                    });

                    s3_object = uploadResponse.data;
                } else {
                    s3_object = null;
                }

                let config = await app.getAuthorization(location, navigate);
                let postResponse = await http.post<Post>("create-post", new CreatePostRequest(
                    null,
                    null,
                    null,
                    null,
                    s3_object?.object_key ?? null,
                    null
                ), config);

                app.closeModal();
                app.openModal("Success", <p><Link to={`post/${postResponse.data.pk + location.search}`} onClick={() => app.closeModal()}>Post</Link> created successfully</p>);
            } catch(e) {
                console.error("Error occurred while uploading post", e);
            }
        }}>
            <p>Create a post for a new file upload</p>
            <fieldset>
                <legend>Upload File</legend>
                <table className="fieldset-container">
                    <tbody>
                        <tr className="form-row">
                            <td className="form-label">
                                <FontAwesomeIcon icon={solid("circle-info")} data-tip="Select or create a new file server to upload files to."></FontAwesomeIcon>
                                <ReactTooltip effect="solid" type="info" place="right"></ReactTooltip>
                            </td>
                        </tr>
                        <tr className="form-row">
                            <td className="form-label"><label>Select broker</label></td>
                            <td className="form-field">
                                <select value={selectedBroker} onChange={e => setSelectedBroker(e.target.value)} disabled={brokerOptions.length === 0}>
                                    <option value={""} hidden>{brokerOptions.length === 0 ? "None Available" : ""}</option>
                                    {brokerOptions}
                                </select>&nbsp;
                                <button className="standard-button" onClick={e => {
                                    e.preventDefault();
                                    app.openModal("Create Broker", <CreateBrokerDialogue app={app}></CreateBrokerDialogue>, async () => {
                                        let config = await app.getAuthorization(location, navigate);

                                        http
                                            .get<Broker[]>("/get-brokers", config)
                                            .then(result => setBrokers(result.data));
                                    });
                                }}><FontAwesomeIcon icon={solid("plus")}></FontAwesomeIcon></button>
                            </td>
                        </tr>
                        <tr className="form-row">
                            <td className="form-label"><label>Pick File</label></td>
                            <td className="form-field">
                                <label className="file-name">{fileLabel}</label>&nbsp;
                                <button className="standard-button" onClick={e => {e.preventDefault(); hiddenFileInput.current?.click();}}>Choose File</button>
                                <input id="upload-file-picker" type={"file"} ref={hiddenFileInput} style={{display: "none"}} onChange={e => {
                                    let fileList = e.target.files;
                                    if (fileList && fileList.length > 0) {
                                        setFile(fileList[0]);
                                        setFileLabelTrimmed(fileList[0].name);
                                    } else {
                                        setFile(null);
                                        setFileLabel("No file chosen");
                                    }
                                }}></input>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <ProgressBar now={progress}/>
            </fieldset>
            <div className="modal-form-submit-btn">
                <button type="submit" className="standard-button-large">Create Post</button>
            </div>
        </form>
    );
}

export default UploadDialogue;
