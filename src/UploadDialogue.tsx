import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ReactTooltip from "react-tooltip";
import App, { ModalContent } from "./App";
import http from "./http-common";
import { solid } from '@fortawesome/fontawesome-svg-core/import.macro';
import CreateBrokerDialogue from "./CreateBrokerDialogue";
import React from "react";
import ProgressBar from 'react-bootstrap/ProgressBar';
import { Broker, PostDetailed, S3Object, Tag } from "./Model";
import "./UploadDialogue.css";
import { TagCreator, TagSelector } from "./TagEditor";

class UploadDialogueProps {
    app: App;
    modal: ModalContent;

    constructor(app: App, modal: ModalContent) {
        this.app = app;
        this.modal = modal;
    }
}

class CreatePostRequest {
    data_url: string | null;
    source_url: string | null;
    title: string | null;
    entered_tags: string[] | null;
    selected_tags: number[] | null;
    s3_object: string | null;
    thumbnail_url: string | null;

    constructor(
        data_url: string | null,
        source_url: string | null,
        title: string | null,
        entered_tags: string[] | null,
        selected_tags: number[] | null,
        s3_object: string | null,
        thumbnail_url: string | null,
    ) {
        this.data_url = data_url;
        this.source_url = source_url;
        this.title = title;
        this.entered_tags = entered_tags;
        this.selected_tags = selected_tags;
        this.s3_object = s3_object;
        this.thumbnail_url = thumbnail_url;
    }
}

type ProgressObserver = (progress: number) => void;

class ProgressSubject {
    private observers: ProgressObserver[] = [];

    public attach(observer: ProgressObserver) {
        this.observers.push(observer);
    }

    public detach(observerToRemove: ProgressObserver) {
        this.observers = this.observers.filter(observer => observer !== observerToRemove);
    }

    public setProgress(progress: number) {
        this.observers.forEach(observer => observer(progress));
    }
}

function UploadProgress({ progressSubject }: { progressSubject: ProgressSubject }) {
    const [progress, setProgress] = useState(0);

    const onProgressUpdate: ProgressObserver = (progress) => {
        setProgress(progress);
    };

    useEffect(() => {
        progressSubject.attach(onProgressUpdate);

        return () => {
            progressSubject.detach(onProgressUpdate);
        }
    }, [])

    return (
        <div id="upload-progress">
            <p>Uploading File</p>
            <ProgressBar now={progress} />
        </div>
    );
}

function UploadDialogue({ app, modal }: UploadDialogueProps) {
    const location = useLocation();
    const navigate = useNavigate();

    const [brokers, setBrokers] = useState<Broker[]>([]);
    const [selectedBroker, setSelectedBroker] = useState<string | undefined>(undefined);
    const [file, setFile] = useState<File | null>(null);
    const [fileLabel, setFileLabel] = useState("No file chosen");
    const hiddenFileInput = React.useRef<HTMLInputElement | null>(null);

    const [enteredTags, setEnteredTags] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<number[]>([]);

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
        <div className="modal-form">
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
                                    app.openModal("Create Broker", createBrokerModal => <CreateBrokerDialogue app={app} modal={createBrokerModal}></CreateBrokerDialogue>, async () => {
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
                                <button className="standard-button" onClick={e => { e.preventDefault(); hiddenFileInput.current?.click(); }}>Choose File</button>
                                <input id="upload-file-picker" type={"file"} ref={hiddenFileInput} style={{ display: "none" }} onChange={e => {
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
            </fieldset>
            <div id="tag-editor-div">
                <TagSelector setEnteredTags={setEnteredTags} setSelectedTags={setSelectedTags}></TagSelector>
                <button className="standard-button" onClick={e => {
                    e.preventDefault();
                    app.openModal("Create Tag", createTagModal => <TagCreator app={app} modal={createTagModal}></TagCreator>);
                }}><FontAwesomeIcon icon={solid("plus")}></FontAwesomeIcon></button>
            </div>
            <div className="modal-form-submit-btn">
                <button className="standard-button-large" onClick={async e => {
                    e.preventDefault();

                    if (file != null && !selectedBroker) {
                        app.openModal("Error", <p>You must select a broker when uploading a file</p>);
                        return;
                    }

                    let progressSubject = new ProgressSubject();
                    let upgloadProgress = <UploadProgress progressSubject={progressSubject}></UploadProgress>;
                    const uploadProgressModal = app.openModal(
                        "Uploading",
                        upgloadProgress,
                        undefined,
                        false
                    );

                    try {
                        let s3_object: S3Object | null;
                        if (file != null && selectedBroker) {
                            let config = await app.getAuthorization(location, navigate);
                            let formData = new FormData();
                            formData.append("file", file);
                            let uploadResponse = await http.post<S3Object>(`/upload/${selectedBroker}`, formData, {
                                headers: {
                                    "Content-Type": "multipart/form-data",
                                    authorization: config!.headers.authorization
                                },
                                onUploadProgress: e => {
                                    progressSubject.setProgress(Math.round((100 * e.loaded) / e.total));
                                },
                            });

                            s3_object = uploadResponse.data;
                        } else {
                            s3_object = null;
                        }

                        let config = await app.getAuthorization(location, navigate);
                        let postResponse = await http.post<PostDetailed>("create-post", new CreatePostRequest(
                            null,
                            null,
                            null,
                            enteredTags,
                            selectedTags,
                            s3_object?.object_key ?? null,
                            null
                        ), config);

                        uploadProgressModal.close();
                        modal.close();
                        app.openModal("Success", successModal => <p><Link className="standard-link" to={`post/${postResponse.data.pk + location.search}`} onClick={() => successModal.close()}>Post</Link> created successfully</p>);
                    } catch (e) {
                        uploadProgressModal.close();
                        console.error("Error occurred while uploading post", e);
                        app.openModal("Error", <p>An error occurred creating your post, please try again.</p>);
                    }
                }}>Create Post</button>
            </div>
        </div>
    );
}

export default UploadDialogue;
