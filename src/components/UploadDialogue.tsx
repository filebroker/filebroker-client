import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ReactTooltip from "react-tooltip";
import App, { ModalContent } from "../App";
import http from "../http-common";
import { solid } from '@fortawesome/fontawesome-svg-core/import.macro';
import CreateBrokerDialogue from "./CreateBrokerDialogue";
import React from "react";
import { BrokerAvailability, PostDetailed, S3Object, UserGroup } from "../Model";
import "./UploadDialogue.css";
import { TagCreator, TagSelector } from "./TagEditor";
import { Box, Button, FormControl, IconButton, InputLabel, LinearProgress, LinearProgressProps, ListItemText, MenuItem, Paper, Select, Tab, Tabs, TextField, Typography } from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import { GroupSelector } from "./GroupEditor";
import { EditPostRequest } from "../routes/Post";
import AddIcon from '@mui/icons-material/Add';
import { TabPanel, a11yProps } from "./TabPanel";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { formatBytes } from "../Util";
import VisibilitySelect from "./VisibilitySelect";

class UploadDialogueProps {
    app: App;
    modal: ModalContent;

    constructor(app: App, modal: ModalContent) {
        this.app = app;
        this.modal = modal;
    }
}

class GrantedPostGroupAccess {
    group_pk: number;
    write: boolean;

    constructor(group_pk: number, write: boolean) {
        this.group_pk = group_pk;
        this.write = write;
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
    is_public: boolean;
    public_edit: boolean;
    group_access: GrantedPostGroupAccess[] | null;
    description: string | null;

    constructor(
        data_url: string | null,
        source_url: string | null,
        title: string | null,
        entered_tags: string[] | null,
        selected_tags: number[] | null,
        s3_object: string | null,
        thumbnail_url: string | null,
        is_public: boolean,
        public_edit: boolean,
        group_access: GrantedPostGroupAccess[] | null,
        description: string | null
    ) {
        this.data_url = data_url;
        this.source_url = source_url;
        this.title = title;
        this.entered_tags = entered_tags;
        this.selected_tags = selected_tags;
        this.s3_object = s3_object;
        this.thumbnail_url = thumbnail_url;
        this.is_public = is_public;
        this.public_edit = public_edit;
        this.group_access = group_access;
        this.description = description;
    }
}

class UploadResponse {
    s3_object: S3Object;
    posts: PostDetailed[];

    constructor(s3_object: S3Object, posts: PostDetailed[]) {
        this.s3_object = s3_object;
        this.posts = posts;
    }
}

interface ProgressObserver {
    setProgress: (progress: number | undefined) => void;
    setStep: (step: number) => void;
}

class ProgressSubject {
    private observers: ProgressObserver[] = [];

    public attach(observer: ProgressObserver) {
        this.observers.push(observer);
    }

    public detach(observerToRemove: ProgressObserver) {
        this.observers = this.observers.filter(observer => observer !== observerToRemove);
    }

    public setProgress(progress: number | undefined) {
        this.observers.forEach(observer => observer.setProgress(progress));
    }

    public setStep(step: number) {
        this.observers.forEach(observer => observer.setStep(step));
    }
}

function LinearProgressWithLabel(props: LinearProgressProps & { value?: number | undefined }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress variant={props.value === undefined ? "indeterminate" : "determinate"} {...props} />
            </Box>
            <Box sx={{ minWidth: 35 }}>
                <Typography variant="body2" color="text.secondary">{props.value === undefined ? "..." : `${Math.round(props.value)}%`}</Typography>
            </Box>
        </Box>
    );
}

function UploadProgress({ progressSubject, steps }: { progressSubject: ProgressSubject, steps: number }) {
    const [progress, setProgress] = useState<number | undefined>(0);
    const [step, setStep] = useState(0);

    const onProgressUpdate: ProgressObserver = {
        setProgress: setProgress,
        setStep: setStep
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
            <LinearProgressWithLabel value={progress} />
            <Box sx={{ minWidth: 35 }}>
                <Typography variant="body2" color="text.secondary">{`${step} / ${steps}`}</Typography>
            </Box>
        </div>
    );
}

function UploadDialogue({ app, modal }: UploadDialogueProps) {
    const location = useLocation();
    const navigate = useNavigate();

    const [isUploadingFolder, setUploadingFolder] = useState(false);
    const [brokers, setBrokers] = useState<BrokerAvailability[]>([]);
    const [selectedBroker, setSelectedBroker] = useState<string | undefined>(undefined);
    const [file, setFile] = useState<File | null>(null);
    const [fileLabel, setFileLabel] = useState("No file chosen");
    const hiddenFileInput = React.useRef<HTMLInputElement | null>(null);
    const [fileList, setFileList] = useState<FileList | null>(null);

    const [enteredTags, setEnteredTags] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<number[]>([]);

    const [publicPost, setPublicPost] = useState(false);
    const [publicEdit, setPublicEdit] = useState(false);
    const [currentUserGroups, setCurrentUserGroups] = useState<UserGroup[]>([]);
    const [selectedUserGroups, setSelectedUserGroups] = useState<UserGroup[]>([]);
    const [selectedUserGroupsReadOnly, setSelectedUserGroupsReadOnly] = useState<number[]>([]);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    useEffect(() => {
        let fetch = async () => {
            let config = await app.getAuthorization(location, navigate);

            http
                .get<BrokerAvailability[]>("/get-brokers", config)
                .then(result => setBrokers(result.data));

            http
                .get<UserGroup[]>("/get-current-user-groups", config)
                .then(result => setCurrentUserGroups(result.data))
        };

        fetch().catch(console.error);
    }, []);

    function setFileLabelTrimmed(name: string) {
        if (name.length > 50) {
            setFileLabel(name.substring(0, 40) + "..." + name.substring(name.length - 20));
        } else {
            setFileLabel(name);
        }
    }

    const brokerSelector = <div className="flex-row">
        <FontAwesomeIcon icon={solid("circle-info")} data-tip="Select or create a new file server to upload files to."></FontAwesomeIcon>
        <ReactTooltip effect="solid" type="info" place="right"></ReactTooltip>
        <div id="broker-selector"><FormControl fullWidth>
            <InputLabel>Broker *</InputLabel>
            <Select label="Broker" value={selectedBroker || ''} onChange={(e) => setSelectedBroker(e.target.value)} required>
                {brokers.sort((a, b) => a.broker.name.localeCompare(b.broker.name)).map((broker) => <MenuItem key={broker.broker.pk} value={broker.broker.pk}>
                    <ListItemText>{broker.broker.name}</ListItemText>
                    <Typography variant="body2" color="text.secondary">
                        {formatBytes(broker.used_bytes)} / {broker.quota_bytes ? formatBytes(broker.quota_bytes) : "∞"}
                    </Typography>
                </MenuItem>)}
            </Select>
        </FormControl></div>
        <IconButton size="medium" onClick={e => {
            e.preventDefault();
            app.openModal("Create Broker", createBrokerModal => <CreateBrokerDialogue app={app} modal={createBrokerModal}></CreateBrokerDialogue>, async () => {
                let config = await app.getAuthorization(location, navigate);

                http
                    .get<BrokerAvailability[]>("/get-brokers", config)
                    .then(result => setBrokers(result.data));
            });
        }}><AddIcon /></IconButton>
    </div>;

    return (
        <div className="modal-form">
            <p>{isUploadingFolder ? "Create posts for each file in the uploaded folder" : "Create a post for a new file upload"}</p>
            <Paper elevation={2} className="fieldset-paper">
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={isUploadingFolder ? 1 : 0} onChange={(_e, idx) => {
                        setUploadingFolder(idx === 1);
                        setFile(null);
                        setFileLabel("No file chosen");
                    }} aria-label="basic tabs example">
                        <Tab label="File" {...a11yProps(0)} />
                        <Tab label="Folder" {...a11yProps(1)} />
                    </Tabs>
                </Box>
                <TabPanel value={isUploadingFolder ? 1 : 0} index={0}>
                    {brokerSelector}
                    <div className="file-selector-row">
                        <Button component="label" variant="contained" startIcon={<CloudUploadIcon />}>
                            Select file
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
                        </Button>
                        <label className="file-name" style={{ flex: "1" }}>{fileLabel}</label>
                    </div>
                </TabPanel>
                <TabPanel value={isUploadingFolder ? 1 : 0} index={1}>
                    {brokerSelector}
                    <div className="file-selector-row">
                        <Button component="label" variant="contained" startIcon={<CloudUploadIcon />}>
                            Select folder
                            {/*@ts-ignore*/}
                            <input id="upload-file-picker" type={"file"} ref={hiddenFileInput} style={{ display: "none" }} directory="" webkitdirectory="" multiple onChange={e => {
                                let fileList = e.target.files;
                                if (fileList) {
                                    setFileList(fileList);
                                    setFileLabelTrimmed(`Selected ${fileList.length} files`);
                                } else {
                                    setFile(null);
                                    setFileLabel("No file chosen");
                                }
                            }}></input>
                        </Button>
                        <label className="file-name">{fileLabel}</label>
                    </div>
                </TabPanel>
            </Paper>
            <Paper elevation={2} hidden={isUploadingFolder} className="fieldset-paper">
                <table className="fieldset-container">
                    <tbody>
                        <tr className="form-row">
                            <td className="form-row-full-td"><TextField label="Title" variant="outlined" value={title} fullWidth onChange={e => setTitle(e.target.value)} inputProps={{ maxLength: 300 }}></TextField></td>
                        </tr>
                        <tr className="form-row">
                            <td className="form-row-full-td"><TextField label="Description" variant="outlined" value={description} fullWidth multiline onChange={e => setDescription(e.target.value)} maxRows={5} inputProps={{ maxLength: 30000 }}></TextField></td>
                        </tr>
                    </tbody>
                </table>
            </Paper>
            <Paper elevation={2} className="fieldset-paper">
                <div id="tag-editor-div">
                    <div className="autocomplete-container">
                        <TagSelector setEnteredTags={setEnteredTags} setSelectedTags={setSelectedTags}></TagSelector>
                    </div>
                    <IconButton size="medium" onClick={e => {
                        e.preventDefault();
                        app.openModal("Create Tag", createTagModal => <TagCreator app={app} modal={createTagModal}></TagCreator>);
                    }}><AddIcon /></IconButton>
                </div>
            </Paper>
            <Paper elevation={2} className="fieldset-paper">
                <table className="fieldset-container">
                    <tbody>
                        <tr className="form-row">
                            <td className="form-row-full-td"><VisibilitySelect isPublic={publicPost} isPublicEdit={publicEdit} setPublic={setPublicPost} setPublicEdit={setPublicEdit} fullWidth /></td>
                        </tr>
                        <tr className="form-row">
                            <td className="form-row-full-td">
                                <GroupSelector
                                    currentUserGroups={currentUserGroups}
                                    selectedUserGroups={selectedUserGroups}
                                    setSelectedUserGroups={setSelectedUserGroups}
                                    selectedUserGroupsReadOnly={selectedUserGroupsReadOnly}
                                    setSelectedUserGroupsReadOnly={setSelectedUserGroupsReadOnly}
                                />
                                <span className="footnote">Groups with the <EditIcon fontSize="small"></EditIcon> icon can edit the post, click the selected group to toggle edit permissions.</span></td>
                        </tr>
                    </tbody>
                </table>
            </Paper>
            <div className="modal-form-submit-btn">
                <Button color="secondary" disabled={((file != null || fileList != null) && !selectedBroker) || (!isUploadingFolder && file === null) || (isUploadingFolder && (fileList === null || fileList.length === 0))} onClick={async (e) => {
                    e.preventDefault();

                    if ((file != null || fileList != null) && !selectedBroker) {
                        app.openModal("Error", <p>You must select a broker when uploading a file</p>);
                        return;
                    }

                    if (isUploadingFolder && (fileList === null || fileList.length === 0)) {
                        app.openModal("Error", <p>No files selected</p>);
                        return;
                    }
                    if (!isUploadingFolder && file === null) {
                        app.openModal("Error", <p>No file selected</p>);
                        return;
                    }

                    if (isUploadingFolder && fileList) {
                        let progressSubject = new ProgressSubject();
                        let uploadProgress = <UploadProgress progressSubject={progressSubject} steps={fileList.length}></UploadProgress>;
                        const uploadProgressModal = app.openModal(
                            "Uploading",
                            uploadProgress,
                            undefined,
                            false
                        );

                        let groupAccess: GrantedPostGroupAccess[] = [];
                        selectedUserGroups.forEach(group => groupAccess.push(new GrantedPostGroupAccess(group.pk, !selectedUserGroupsReadOnly.includes(group.pk))));
                        try {
                            const files = Array.from(fileList);
                            files.sort((a, b) => a.name.localeCompare(b.name, navigator.languages[0] || navigator.language, { numeric: true }));
                            for (let i = 0; i < files.length; i++) {
                                let file = files[i];
                                let config = await app.getAuthorization(location, navigate);
                                let formData = new FormData();
                                formData.append("file", file);
                                let uploadResponse = await http.post<UploadResponse>(`/upload/${selectedBroker}`, formData, {
                                    headers: {
                                        "Content-Type": "multipart/form-data",
                                        authorization: config!.headers.authorization,
                                        "Filebroker-Upload-Size": file.size,
                                    },
                                    onUploadProgress: e => {
                                        progressSubject.setProgress(e.total ? Math.round((100 * e.loaded) / e.total) : undefined);
                                    },
                                });

                                if (uploadResponse.data.posts.length === 0) {
                                    let config = await app.getAuthorization(location, navigate);
                                    await http.post("create-post", new CreatePostRequest(
                                        null,
                                        null,
                                        null,
                                        enteredTags,
                                        selectedTags,
                                        uploadResponse.data.s3_object?.object_key ?? null,
                                        null,
                                        publicPost,
                                        publicEdit && publicPost,
                                        groupAccess,
                                        null
                                    ), config);
                                } else {
                                    let config = await app.getAuthorization(location, navigate);
                                    uploadResponse.data.posts.filter(post => post.is_editable).forEach(async post => {
                                        await http.post(`/edit-post/${post.pk}`, new EditPostRequest(
                                            null,
                                            null,
                                            null,
                                            selectedTags,
                                            enteredTags,
                                            null,
                                            null,
                                            null,
                                            null,
                                            null,
                                            null,
                                            null,
                                            groupAccess,
                                            null
                                        ), config);
                                    });
                                }
                                progressSubject.setStep(i + 1);
                            }

                            uploadProgressModal.close();
                            modal.close();
                            app.openModal("Success", <p>Posts created successfully</p>);
                        } catch (e: any) {
                            uploadProgressModal.close();
                            if (e?.response?.data?.error_code === 400019) {
                                app.openModal("Error", <p>You have run out of available storage for this broker.</p>);
                            } else {
                                console.error("Error occurred creating post for file " + e);
                                app.openModal("Error", <p>An error occurred creating your post, please try again.</p>);
                            }
                        }
                    } else {
                        let progressSubject = new ProgressSubject();
                        let upgloadProgress = <UploadProgress progressSubject={progressSubject} steps={1}></UploadProgress>;
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
                                let uploadResponse = await http.post<UploadResponse>(`/upload/${selectedBroker}`, formData, {
                                    headers: {
                                        "Content-Type": "multipart/form-data",
                                        authorization: config!.headers.authorization,
                                        "Filebroker-Upload-Size": file.size,
                                    },
                                    onUploadProgress: e => {
                                        progressSubject.setProgress(e.total ? Math.round((100 * e.loaded) / e.total) : undefined);
                                    },
                                });

                                progressSubject.setStep(1);
                                s3_object = uploadResponse.data.s3_object;
                            } else {
                                s3_object = null;
                            }

                            let config = await app.getAuthorization(location, navigate);

                            let groupAccess: GrantedPostGroupAccess[] = [];
                            selectedUserGroups.forEach(group => groupAccess.push(new GrantedPostGroupAccess(group.pk, !selectedUserGroupsReadOnly.includes(group.pk))));

                            let postResponse = await http.post<PostDetailed>("create-post", new CreatePostRequest(
                                null,
                                null,
                                title,
                                enteredTags,
                                selectedTags,
                                s3_object?.object_key ?? null,
                                null,
                                publicPost,
                                publicEdit && publicPost,
                                groupAccess,
                                description
                            ), config);

                            uploadProgressModal.close();
                            modal.close();
                            app.openModal("Success", successModal => <p><Link className="standard-link" to={`post/${postResponse.data.pk + location.search}`} onClick={() => successModal.close()}>Post</Link> created successfully</p>);
                        } catch (e: any) {
                            uploadProgressModal.close();
                            if (e?.response?.data?.error_code === 400019) {
                                app.openModal("Error", <p>You have run out of available storage for this broker.</p>);
                            } else {
                                console.error("Error occurred creating post for file " + e);
                                app.openModal("Error", <p>An error occurred creating your post, please try again.</p>);
                            }
                        }
                    }
                }}>{isUploadingFolder ? "Create Posts" : "Create Post"}</Button>
            </div>
        </div>
    );
}

export default UploadDialogue;
