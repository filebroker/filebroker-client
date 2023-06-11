import { solid } from "@fortawesome/fontawesome-svg-core/import.macro";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Tab, TabList, TabPanel, Tabs } from "react-tabs";
import ReactTooltip from "react-tooltip";
import App, { ModalContent } from "../App";
import http from "../http-common";

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

    constructor(
        name: string,
        bucket: string,
        endpoint: string,
        access_key: string,
        secret_key: string,
        is_aws_region: boolean,
        remove_duplicate_files: boolean
    ) {
        this.name = name;
        this.bucket = bucket;
        this.endpoint = endpoint;
        this.access_key = access_key;
        this.secret_key = secret_key;
        this.is_aws_region = is_aws_region;
        this.remove_duplicate_files = remove_duplicate_files;
    }
}

function CreateBrokerDialogue({app, modal}: CreateBrokerDialogueProps) {
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

    return (
        <form className="modal-form" onSubmit={async e => {
            e.preventDefault();
            setSubmitDisabled(true);

            try {
                let config = await app.getAuthorization(location, navigate);
                let response = await http.post("/create-broker", new CreateBrokerRequest(name, bucket, endpoint, accessKey, secretKey, isAwsRegion, removeDuplicateFiles), config);
                modal.close(response.data);
            } catch(e: any) {
                if (e.response && e.response.status === 400) {
                    app.openModal("Error", <p>The provided S3 config is invalid, make sure the endpoint is reachable, the bucket and region are valid and the provided credentials have access to the bucket.</p>);
                } else {
                    console.error("Failed to create broker", e);
                }
            }

            setSubmitDisabled(false);
        }}>
            <p>Add a new S3 file server. You may add an S3 bucket from any Amazon AWS region<br></br>or any S3 compatible storage solution, such as MinIO.<br></br>
                To host your files on a pay-what-you-use cloud bucket, check out <a className="standard-link" href="https://aws.amazon.com/s3/">Amazon S3</a>,<br></br>
                to explore free and self-hosted solutions, check out <a className="standard-link" href="https://www.min.io/">MinIO</a>.</p>

            <Tabs onSelect={(index) => setAwsRegion(index === 0)}>
                <TabList>
                    <Tab>Amazon S3</Tab>
                    <Tab>Other S3 storage</Tab>
                </TabList>

                <TabPanel>
                    <table className="fieldset-container">
                        <tbody>
                            <tr className="form-row">
                                <td className="form-label"><label>Broker Name</label></td>
                                <td className="form-field"><input type={"text"} placeholder="Choose Any Name" value={name} onChange={e => setName(e.currentTarget.value)} required></input></td>
                            </tr>
                            <tr className="form-row">
                                <td className="form-label"><label>S3 Bucket</label></td>
                                <td className="form-field"><input type={"text"} placeholder="Name of S3 Bucket" value={bucket} onChange={e => setBucket(e.currentTarget.value)} required></input></td>
                            </tr>
                            <tr className="form-row">
                                <td className="form-label"><label>AWS Region</label></td>
                                <td className="form-field"><input type={"text"} placeholder="e.g. eu-west-2" value={endpoint} onChange={e => setEndpoint(e.currentTarget.value)} required></input></td>
                            </tr>
                            <tr className="form-row">
                                <td className="form-label"><label>Access Key</label></td>
                                <td className="form-field"><input type={"text"} placeholder="Access Key / User Name" value={accessKey} onChange={e => setAccessKey(e.currentTarget.value)} required></input></td>
                            </tr>
                            <tr className="form-row">
                                <td className="form-label"><label>Secret Key</label></td>
                                <td className="form-field"><input type={"text"} placeholder="Secret Key / Password" value={secretKey} onChange={e => setSecretKey(e.currentTarget.value)} required></input></td>
                            </tr>
                            <tr className="form-row">
                                <td className="form-label">
                                    <FontAwesomeIcon icon={solid("circle-info")} data-tip="With this option enabled, duplicate files uploads that generate the same file hash will be removed and new posts will reference the existing file instead."></FontAwesomeIcon>
                                    <ReactTooltip effect="solid" type="info" place="right"></ReactTooltip>
                                </td>
                            </tr>
                            <tr className="form-row">
                                <td className="form-label"><label>Merge Duplicate Files</label></td>
                                <td className="form-field"><input type={"checkbox"} checked={removeDuplicateFiles} onChange={e => setRemoveDuplicateFiles(e.currentTarget.checked)}></input></td>
                            </tr>
                        </tbody>
                    </table>
                </TabPanel>
                <TabPanel>
                    <table className="fieldset-container">
                        <tbody>
                            <tr className="form-row">
                                <td className="form-label"><label>Broker Name</label></td>
                                <td className="form-field"><input type={"text"} placeholder="Choose Any Name" value={name} onChange={e => setName(e.currentTarget.value)} required></input></td>
                            </tr>
                            <tr className="form-row">
                                <td className="form-label"><label>S3 Bucket</label></td>
                                <td className="form-field"><input type={"text"} placeholder="Name of S3 Bucket" value={bucket} onChange={e => setBucket(e.currentTarget.value)} required></input></td>
                            </tr>
                            <tr className="form-row">
                                <td className="form-label"><label>Endpoint URL</label></td>
                                <td className="form-field"><input type={"text"} placeholder="URL of S3 endpoint" value={endpoint} onChange={e => setEndpoint(e.currentTarget.value)} required></input></td>
                            </tr>
                            <tr className="form-row">
                                <td className="form-label"><label>Access Key</label></td>
                                <td className="form-field"><input type={"text"} placeholder="Access Key / User Name" value={accessKey} onChange={e => setAccessKey(e.currentTarget.value)} required></input></td>
                            </tr>
                            <tr className="form-row">
                                <td className="form-label"><label>Secret Key</label></td>
                                <td className="form-field"><input type={"text"} placeholder="Secret Key / Password" value={secretKey} onChange={e => setSecretKey(e.currentTarget.value)} required></input></td>
                            </tr>
                            <tr className="form-row">
                                <td className="form-label">
                                    <FontAwesomeIcon icon={solid("circle-info")} data-tip="With this option enabled, duplicate files uploads that generate the same file hash will be removed and new posts will reference the existing file instead."></FontAwesomeIcon>
                                    <ReactTooltip effect="solid" type="info" place="right"></ReactTooltip>
                                </td>
                            </tr>
                            <tr className="form-row">
                                <td className="form-label"><label>Merge Duplicate Files</label></td>
                                <td className="form-field"><input type={"checkbox"} checked={removeDuplicateFiles} onChange={e => setRemoveDuplicateFiles(e.currentTarget.checked)} required></input></td>
                            </tr>
                        </tbody>
                    </table>
                </TabPanel>
            </Tabs>

            <div className="modal-form-submit-btn"><button type="submit" className="standard-button-large" disabled={
                submitDisabled || name.length === 0 || bucket.length === 0 || endpoint.length === 0 || accessKey.length === 0 || secretKey.length === 0
            }>Register</button></div>
        </form>
    );
}

export default CreateBrokerDialogue;
