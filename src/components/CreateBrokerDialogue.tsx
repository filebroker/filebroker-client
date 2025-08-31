import { solid } from "@fortawesome/fontawesome-svg-core/import.macro";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ReactTooltip from "react-tooltip";
import App, { ModalContent } from "../App";
import http from "../http-common";
import { Box, Button, Checkbox, FormControlLabel, FormGroup, Tab, Tabs, TextField } from "@mui/material";
import { TabPanel, a11yProps } from "./TabPanel";
import { enqueueSnackbar } from "notistack";

class CreateBrokerDialogueProps {
    app: App;
    modal: ModalContent;

    constructor(app: App, modal: ModalContent) {
        this.app = app;
        this.modal = modal;
    }
}

class CreateBrokerRequest {
    name: string;
    bucket: string;
    endpoint: string;
    access_key: string;
    secret_key: string;
    is_aws_region: boolean;
    remove_duplicate_files: boolean;
    enable_presigned_get: boolean;
    is_system_bucket: boolean;

    constructor(
        name: string,
        bucket: string,
        endpoint: string,
        access_key: string,
        secret_key: string,
        is_aws_region: boolean,
        remove_duplicate_files: boolean,
        enable_presigned_get: boolean = true,
        is_system_bucket: boolean = false,
    ) {
        this.name = name;
        this.bucket = bucket;
        this.endpoint = endpoint;
        this.access_key = access_key;
        this.secret_key = secret_key;
        this.is_aws_region = is_aws_region;
        this.remove_duplicate_files = remove_duplicate_files;
        this.enable_presigned_get = enable_presigned_get;
        this.is_system_bucket = is_system_bucket;
    }
}

function CreateBrokerDialogue({ app, modal }: CreateBrokerDialogueProps) {
    const location = useLocation();
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [bucket, setBucket] = useState("");
    const [endpoint, setEndpoint] = useState("");
    const [accessKey, setAccessKey] = useState("");
    const [secretKey, setSecretKey] = useState("");
    const [removeDuplicateFiles, setRemoveDuplicateFiles] = useState(true);
    const [isAwsRegion, setAwsRegion] = useState(true);
    const [submitDisabled, setSubmitDisabled] = useState(false);
    const [enablePresignedGet, setEnablePresignedGet] = useState(true);
    const [isSystemBucket, setIsSystemBucket] = useState(false);

    return (
        <form className="modal-form" onSubmit={async e => {
            e.preventDefault();
            setSubmitDisabled(true);

            try {
                let config = await app.getAuthorization(location, navigate);
                let response = await http.post("/create-broker", new CreateBrokerRequest(name, bucket, endpoint, accessKey, secretKey, isAwsRegion, removeDuplicateFiles, enablePresignedGet, isSystemBucket), config);
                modal.close(response.data);
                enqueueSnackbar({
                    message: "Broker created successfully",
                    variant: "success",
                });
            } catch (e: any) {
                if (e.response && e.response.status === 400) {
                    app.openModal("Error", <p>The provided S3 config is invalid, make sure the endpoint is reachable, the bucket and region are valid and the provided credentials have access to the bucket.</p>);
                } else if (e.response?.status === 401) {
                    app.openModal("Error", <p>Your credentials have expired, try refreshing the page.</p>);
                } else {
                    console.error("Failed to create broker", e);
                }
            }

            setSubmitDisabled(false);
        }}>
            <p>Add a new S3 file server. You may add an S3 bucket from any Amazon AWS region<br></br>or any S3 compatible storage solution, such as MinIO.<br></br>
                To host your files on a pay-what-you-use cloud bucket, check out <a className="standard-link" href="https://aws.amazon.com/s3/">Amazon S3</a>,<br></br>
                to explore free and self-hosted solutions, check out <a className="standard-link" href="https://www.min.io/">MinIO</a>.</p>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={isAwsRegion ? 0 : 1} onChange={(_e, idx) => setAwsRegion(idx === 0)} aria-label="basic tabs example">
                    <Tab label="Amazon S3" {...a11yProps(0)} />
                    <Tab label="Other S3 storage" {...a11yProps(1)} />
                </Tabs>
            </Box>
            <TabPanel value={0} index={0}>
                <FormGroup className="form-container">
                    <TextField
                        label="Broker Name"
                        variant="outlined"
                        value={name}
                        fullWidth
                        onChange={(e) => setName(e.currentTarget.value)}
                        inputProps={{ maxLength: 32 }}
                        placeholder="Choose Any Name"
                    />
                    <TextField
                        label="S3 Bucket"
                        variant="outlined"
                        value={bucket}
                        fullWidth
                        onChange={(e) => setBucket(e.currentTarget.value)}
                        inputProps={{ maxLength: 255 }}
                        placeholder="Name of S3 Bucket"
                    />
                    <TextField
                        label={isAwsRegion ? "AWS Region" : "Endpoint URL"}
                        variant="outlined"
                        value={endpoint}
                        fullWidth
                        onChange={(e) => setEndpoint(e.currentTarget.value)}
                        inputProps={{ maxLength: 2048 }}
                        placeholder={isAwsRegion ? "e.g. eu-west-2" : "URL of S3 endpoint"}
                    />
                    <TextField
                        label="Access Key"
                        variant="outlined"
                        value={accessKey}
                        fullWidth
                        onChange={(e) => setAccessKey(e.currentTarget.value)}
                        inputProps={{ maxLength: 255 }}
                        placeholder="Access Key / User Name"
                    />
                    <TextField
                        label="Secret Key"
                        variant="outlined"
                        value={secretKey}
                        fullWidth
                        onChange={(e) => setSecretKey(e.currentTarget.value)}
                        inputProps={{ maxLength: 255 }}
                        placeholder="Secret Key / Password"
                    />
                    <div className="flex-row">
                        <FormControlLabel control={<Checkbox checked={removeDuplicateFiles} onChange={(e) => setRemoveDuplicateFiles(e.currentTarget.checked)} />} label="Merge Duplicate Files" />
                        <FontAwesomeIcon icon={solid("circle-info")} data-tip="With this option enabled, duplicate files uploads that generate the same file hash will be removed and new posts will reference the existing file instead."></FontAwesomeIcon>
                        <ReactTooltip effect="solid" type="info" place="right"></ReactTooltip>
                    </div>
                    <div className="flex-row">
                        <FormControlLabel control={<Checkbox checked={enablePresignedGet} onChange={(e) => setEnablePresignedGet(e.currentTarget.checked)} />} label="Enable Presigned Get" />
                        <FontAwesomeIcon icon={solid("circle-info")} data-tip="With this option enabled, clients can stream content from the bucket directly using a presigned get URL, rather than through the filebroker server. Requires CORS permissions adding the filebroker domain as allowed origin for your bucket."></FontAwesomeIcon>
                        <ReactTooltip effect="solid" type="info" place="right"></ReactTooltip>
                    </div>
                    <div className="flex-row" hidden={app.getUser()?.is_admin !== true}>
                        <FormControlLabel control={<Checkbox checked={isSystemBucket} onChange={(e) => setIsSystemBucket(e.currentTarget.checked)} />} label="Set System Bucket" />
                        <FontAwesomeIcon icon={solid("circle-info")} data-tip="Set this bucket as the system bucket, which will be used for storing system data such as user avatars." />
                        <ReactTooltip effect="solid" type="info" place="right" />
                    </div>
                </FormGroup>
            </TabPanel>

            <div className="modal-form-submit-btn"><Button color="secondary" type="submit" disabled={
                submitDisabled || name.length === 0 || bucket.length === 0 || endpoint.length === 0 || accessKey.length === 0 || secretKey.length === 0
            }>Create Broker</Button></div>
        </form>
    );
}

export default CreateBrokerDialogue;
