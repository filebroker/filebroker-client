import {
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    ListItem,
    ListItemText,
    Paper,
    Tab,
    Tabs, TextField,
    Typography
} from "@mui/material";
import {useLocation, useNavigate, useParams} from "react-router-dom";
import React, {useEffect, useRef, useState} from "react";
import {
    Broker, BrokerAccess,
    BrokerAuditLogInnerJoined, BrokerDetailed,
    isBrokerDetailed, updateBrokerWithValues, UserGroup, UserPublic
} from "../Model";
import App, {ModalContent} from "../App";
import http from "../http-common";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {regular, solid} from "@fortawesome/fontawesome-svg-core/import.macro";
import {ReadOnlyTextField, StyledAutocomplete, StyledTextField} from "../index";
import StorageIcon from "@mui/icons-material/Storage";
import ReactTooltip from "react-tooltip";
import {FontAwesomeSvgIcon} from "../components/FontAwesomeSvgIcon";
import {enqueueSnackbar} from "notistack";
import CloudIcon from '@mui/icons-material/Cloud';
import {a11yProps, TabPanel} from "../components/TabPanel";
import {Direction, PaginatedTable, PaginatedTableHandle} from "../components/PaginatedTable";
import {formatBytes} from "../Util";
import DataUsageIcon from '@mui/icons-material/DataUsage';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import RemoveModeratorIcon from '@mui/icons-material/RemoveModerator';
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import {ActionModal} from "../components/ActionModal";

interface VerifyBucketConnectionResponse {
    is_valid: boolean;
    error_message: string | null | undefined;
}

interface BrokerAccessInnerJoined {
    pk: number;
    granted_group: UserGroup | null | undefined;
    write: boolean;
    quota: number | null | undefined;
    used_bytes: number;
    granted_by: UserPublic;
    creation_timestamp: string;
}

interface GetBrokerAccessResponse {
    total_count: number;
    broker_access: BrokerAccessInnerJoined[],
}

interface GetBrokerAuditLogsResponse {
    total_count: number;
    audit_logs: BrokerAuditLogInnerJoined[];
}

const gibToBytes = (gib: number): number => gib * (1024 ** 3);

export function BrokerAccessCreator({broker, modal, app}: { broker: Broker | BrokerDetailed, modal?: ModalContent, app: App }) {
    const location = useLocation();
    const navigate = useNavigate();

    const [currentUserGroups, setCurrentUserGroups] = useState<UserGroup[]>([]);

    useEffect(() => {
        let fetch = async () => {
            let config = await app.getAuthorization(location, navigate);

            http
                .get<UserGroup[]>("/get-current-user-groups", config)
                .then(result => setCurrentUserGroups(result.data))
        };

        fetch().catch(console.error);
    }, []);

    const [groupInput, setGroupInput] = useState("");
    const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
    const [quota, setQuota] = useState<number | null>(null);
    const [isAdminAccess, setIsAdminAccess] = useState(false);

    const [isQuotaInvalid, setIsQuotaInvalid] = useState(false);
    const [isGroupInvalid, setIsGroupInvalid] = useState(false);
    useEffect(() => {
        setIsQuotaInvalid((quota != null && quota < 0.001) || (quota == null && selectedGroup == null));
    }, [quota, selectedGroup]);
    useEffect(() => {
        if ((isAdminAccess && selectedGroup == null) || (!app.getUser()?.is_admin && selectedGroup == null)) {
            setIsGroupInvalid(true);
        } else {
            setIsGroupInvalid(false);
        }
    }, [selectedGroup, isAdminAccess]);

    return (
        <div id="BrokerAccessCreator">
            <Paper elevation={2} className="fieldset-paper">
                <div className="form-paper-content">
                    <p>Grant access to members of the selected group to upload files to this broker.
                    The quota limits the amount of storage space available to each user within the group, no quota means unlimited storage.</p>
                    <StyledAutocomplete
                        label="Group"
                        options={currentUserGroups}
                        getOptionLabel={(option) => option.name}
                        value={selectedGroup}
                        onChange={(_event: any, newValue: UserGroup | null) => setSelectedGroup(newValue)}
                        inputValue={groupInput}
                        onInputChange={(_event, newInputValue) => setGroupInput(newInputValue)}
                        isOptionEqualToValue={(option, value) => option.pk === value.pk}
                        renderOption={(props, option) => (
                            <ListItem {...props}>
                                <ListItemText primary={option.name} />
                            </ListItem>
                        )}
                        error={isGroupInvalid}
                        helperText={isGroupInvalid ? isAdminAccess ? "Group is required for admin access" : "Group is required" : undefined}
                    />
                    <TextField
                        type="number"
                        label="Quota (GB)"
                        value={quota}
                        onChange={(e) => e.target.value === "" ? setQuota(null) : setQuota(Number(e.target.value))}
                        error={isQuotaInvalid}
                        helperText={isQuotaInvalid ? quota === null ? "Quota may not be empty for public access." : "Quota must be empty or greater than 0." : undefined}
                    />
                    <div className="flex-row">
                        <FormControlLabel
                            control={<Checkbox checked={isAdminAccess}
                                               onChange={(e) => setIsAdminAccess(e.currentTarget.checked)}
                                               sx={{'&.Mui-disabled': { color: 'text.primary' }}}/>}
                            label="Admin Access"
                            sx={{ opacity: 1, '& .MuiFormControlLabel-label.Mui-disabled': { color: 'text.primary' } }}
                        />
                        <FontAwesomeIcon icon={solid("warning")} data-tip="BEWARE: Granting admin privileges means that admins of the selected groups will be able to view broker credentials, edit broker details and bucket configuration and grant access to other groups."/>
                        <ReactTooltip effect="solid" type="warning" place="right"></ReactTooltip>
                    </div>
                    <div className="form-paper-button-row">
                        <Button color="secondary" disabled={isQuotaInvalid || isGroupInvalid} startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={regular("floppy-disk")} />} onClick={async () => {
                            const loadingModal = app.openLoadingModal();
                            try {
                                const config = await app.getAuthorization(location, navigate);
                                const response = await http.post<BrokerAccess>(`/create-broker-access/${broker.pk}`, {
                                    user_group_pk: selectedGroup !== null ? selectedGroup.pk : undefined,
                                    quota: quota !== null ? gibToBytes(quota) : undefined,
                                    is_admin: isAdminAccess
                                }, config);
                                enqueueSnackbar({
                                    message: "Broker access created",
                                    variant: "success",
                                })
                                modal?.close(response.data);
                            } catch (e: any) {
                                console.error("Failed to create broker access", e);
                                if (e.response?.status === 401) {
                                    enqueueSnackbar({
                                        message: "Your credentials have expired, try refreshing the page.",
                                        variant: "error"
                                    });
                                } else if (e?.response?.data?.error_code === 400024) {
                                    app.openModal("Error", <p>Broker access for this group already exists</p>);
                                } else {
                                    enqueueSnackbar({
                                        message: "An error occurred creating broker access, please try again",
                                        variant: "error"
                                    });
                                }
                            } finally {
                                loadingModal.close();
                            }
                        }}>Save</Button>
                    </div>
                </div>
            </Paper>
        </div>
    );
}

export function ChangeQuotaForm({broker, brokerAccess, modal, app}: { broker: Broker | BrokerDetailed, brokerAccess: BrokerAccessInnerJoined, modal?: ModalContent, app: App }) {
    const location = useLocation();
    const navigate = useNavigate();

    const [quota, setQuota] = useState<number | null>(null);
    const [isQuotaInvalid, setIsQuotaInvalid] = useState(false);
    useEffect(() => {
        setIsQuotaInvalid((quota != null && quota < 0.001) || (quota == null && !brokerAccess.granted_group));
    }, [quota, broker, brokerAccess]);

    return (
        <Paper elevation={2} className="fieldset-paper">
            <div className="form-paper-content">
                <TextField
                    type="number"
                    label="Quota (GB)"
                    value={quota}
                    onChange={(e) => e.target.value === "" ? setQuota(null) : setQuota(Number(e.target.value))}
                    error={isQuotaInvalid}
                    helperText={isQuotaInvalid ? quota === null ? "Quota may not be empty for public access." : "Quota must be empty or greater than 0." : undefined}
                />
                <div className="form-paper-button-row">
                    <Button color="secondary" disabled={isQuotaInvalid} startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={regular("floppy-disk")} />} onClick={async () => {
                        const loadingModal = app.openLoadingModal();
                        try {
                            const config = await app.getAuthorization(location, navigate);
                            const response = await http.post<BrokerAccess>(`/change-broker-access-quota/${broker.pk}/${brokerAccess.pk}`, {
                                quota: quota !== null ? gibToBytes(quota) : undefined
                            }, config);
                            enqueueSnackbar({
                                message: "Quota updated",
                                variant: "success",
                            })
                            modal?.close(response.data);
                        } catch (e: any) {
                            if (e.response?.status === 401) {
                                enqueueSnackbar({
                                    message: "Your credentials have expired, try refreshing the page.",
                                    variant: "error"
                                });
                            } else {
                                enqueueSnackbar({
                                    message: "An error occurred updating quota, please try again",
                                    variant: "error"
                                });
                            }
                        } finally {
                            loadingModal.close();
                        }
                    }}>Save</Button>
                </div>
            </div>
        </Paper>
    );
}

export function BrokerDetailPage({app}: {app: App}) {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [broker, setBroker] = useState<BrokerDetailed | null>(null);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [removeDuplicateFiles, setRemoveDuplicateFiles] = useState<boolean>(false);
    const [enablePresignedGet, setEnablePresignedGet] = useState<boolean>(false);
    const [bucket, setBucket] = useState("");
    const [endpoint, setEndpoint] = useState("");
    const [accessKey, setAccessKey] = useState("");
    const [secretKey, setSecretKey] = useState("");
    const [isAwsRegion, setIsAwsRegion] = useState(false);
    const [isSystemBucket, setIsSystemBucket] = useState(false);

    const [editMode, setEditMode] = useState(false);
    const [bucketEditMode, setBucketEditMode] = useState(false);

    const [activeTab, setActiveTab] = useState(0);

    const brokerAccessTableRef = useRef<PaginatedTableHandle>(null);

    const updateBroker = (newBroker: Broker | BrokerDetailed | null) => {
        if (isBrokerDetailed(newBroker)) {
            setBroker(newBroker);
        } else if (newBroker != null && broker) {
            setBroker(updateBrokerWithValues(broker, newBroker));
        }
        setName(newBroker?.name ?? "");
        setDescription(newBroker?.description ?? "");
        setRemoveDuplicateFiles(newBroker?.remove_duplicate_files ?? false);
        setEnablePresignedGet(newBroker?.enable_presigned_get ?? false);
        setBucket(newBroker?.bucket ?? "");
        setEndpoint(newBroker?.endpoint ?? "");
        setAccessKey(newBroker?.access_key ?? "");
        setSecretKey(newBroker?.secret_key ?? "");
        setIsAwsRegion(newBroker?.is_aws_region ?? false);
        setIsSystemBucket(newBroker?.is_system_bucket ?? false);
    };

    const loadBroker = async () => {
        updateBroker(null);
        const loadingModal = app.openLoadingModal();
        try {
            const config = await app.getAuthorization(location, navigate);
            const response = await http.get<BrokerDetailed>(`/get-broker/${id}`, config);
            updateBroker(response.data);
        } finally {
            loadingModal.close();
        }
    };

    useEffect(() => {
        loadBroker();
    }, [id, editMode, bucketEditMode]);

    return (
        <div id="BrokerDetailPage" className="full-page-component">
            <div className="full-page-content-wrapper">
                <Paper elevation={2} className="form-paper">
                    {broker
                        ? <div className="form-paper" style={{ flexDirection: "row" }}>
                            <div className="form-paper-content" style={{ paddingLeft: "20px", paddingRight: "20px" }}>
                                <Typography variant="h3" component="h2"><StorageIcon fontSize={"inherit"}/></Typography>
                                <h2>Broker</h2>
                                <StyledTextField
                                    label="Name"
                                    variant="outlined"
                                    value={name}
                                    fullWidth
                                    disabled={!editMode}
                                    onChange={e => setName(e.currentTarget.value)}
                                    inputProps={{maxLength: 255}}
                                />
                                <StyledTextField
                                    label="Description"
                                    variant="outlined"
                                    value={description}
                                    disabled={!editMode}
                                    fullWidth
                                    multiline
                                    maxRows={5}
                                    onChange={e => setDescription(e.currentTarget.value)}
                                    inputProps={{maxLength: 30000}}
                                />
                                <div className="flex-row">
                                    <FormControlLabel
                                        control={<Checkbox checked={removeDuplicateFiles}
                                                           disabled={!editMode}
                                                           readOnly={!editMode}
                                                           onChange={(e) => setRemoveDuplicateFiles(e.currentTarget.checked)}
                                                           sx={{'&.Mui-disabled': { color: 'text.primary' }}}/>}
                                        label="Merge Duplicate Files"
                                        sx={{
                                            opacity: 1,
                                            '& .MuiFormControlLabel-label.Mui-disabled': { color: 'text.primary' }
                                        }}
                                    />
                                    <FontAwesomeIcon icon={solid("circle-info")}
                                                     data-tip="With this option enabled, duplicate files uploads that generate the same file hash will be removed and new posts will reference the existing file instead."/>
                                    <ReactTooltip effect="solid" type="info" place="right"></ReactTooltip>
                                </div>
                                <div className="flex-row">
                                    <FormControlLabel
                                        control={<Checkbox checked={enablePresignedGet}
                                                           disabled={!editMode}
                                                           readOnly={!editMode}
                                                           onChange={(e) => setEnablePresignedGet(e.currentTarget.checked)}
                                                           sx={{'&.Mui-disabled': { color: 'text.primary' }}}/>}
                                        label="Enable Presigned Get"
                                        sx={{
                                            opacity: 1,
                                            '& .MuiFormControlLabel-label.Mui-disabled': { color: 'text.primary' }
                                        }}
                                    />
                                    <FontAwesomeIcon icon={solid("circle-info")}
                                                     data-tip="With this option enabled, clients can stream content from the bucket directly using a presigned get URL, rather than through the filebroker server. Requires CORS permissions adding the filebroker domain as allowed origin for your bucket."/>
                                    <ReactTooltip effect="solid" type="info" place="right"></ReactTooltip>
                                </div>
                                <div className="flex-row" hidden={app.getUser()?.is_admin !== true}>
                                    <FormControlLabel
                                        control={<Checkbox checked={isSystemBucket}
                                                           disabled={!editMode}
                                                           readOnly={!editMode}
                                                           onChange={(e) => setIsSystemBucket(e.currentTarget.checked)}
                                                           sx={{'&.Mui-disabled': { color: 'text.primary' }}}/>}
                                        label="Is System Bucket"
                                        sx={{ opacity: 1, '& .MuiFormControlLabel-label.Mui-disabled': { color: 'text.primary' } }}
                                    />
                                    <FontAwesomeIcon icon={solid("circle-info")}
                                                     data-tip="Set this bucket as the system bucket, which will be used for storing system data such as user avatars. There is no more than one system bucket, so setting this bucket as system will remove the previous system bucket."/>
                                    <ReactTooltip effect="solid" type="info" place="right"></ReactTooltip>
                                </div>
                                <div className={"form-paper-button-row" + (editMode ? " form-paper-button--expanded" : "")}>
                                    {editMode
                                        ? <Button
                                            startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("xmark")}/>}
                                            onClick={() => setEditMode(false)}
                                          >Cancel</Button>
                                        : <div className="button-row">
                                            <Button
                                                startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("pen-to-square")}/>}
                                                hidden={!broker.is_admin}
                                                onClick={() => setEditMode(true)}
                                            >Edit</Button>
                                        </div>}
                                    <Button
                                        color="secondary"
                                        startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={regular("floppy-disk")}/>}
                                        hidden={!editMode}
                                        onClick={async () => {
                                            const loadingModal = app.openLoadingModal();
                                            try {
                                                const config = await app.getAuthorization(location, navigate);
                                                const response = await http.post<Broker>(`/edit-broker/${id}`, {
                                                    name: name,
                                                    description: description,
                                                    remove_duplicate_files: removeDuplicateFiles,
                                                    enable_presigned_get: enablePresignedGet,
                                                    is_system_bucket: app.getUser()?.is_admin === true ? isSystemBucket : undefined
                                                }, config);
                                                updateBroker(response.data);
                                                enqueueSnackbar({
                                                    message: "Broker updated",
                                                    variant: "success",
                                                });
                                            } catch (e: any) {
                                                console.error("Failed to update broker", e);
                                                if (e.response?.status === 401) {
                                                    enqueueSnackbar({
                                                        message: "Your credentials have expired, try refreshing the page.",
                                                        variant: "error"
                                                    });
                                                } else {
                                                    enqueueSnackbar({
                                                        message: "An error occurred editing broker, please try again",
                                                        variant: "error"
                                                    });
                                                }
                                            } finally {
                                                loadingModal.close();
                                                setEditMode(false);
                                            }
                                        }}
                                    >Save</Button>
                                </div>
                            </div>
                            {broker.is_admin && <Paper elevation={4} sx={{ minWidth: "fit-content" }}>
                                <div className="form-paper-content" style={{ padding: "20px" }}>
                                    <h5><CloudIcon/> Bucket Connection</h5>
                                    <StyledTextField
                                        label="Bucket"
                                        variant="outlined"
                                        value={bucket}
                                        fullWidth
                                        disabled={!bucketEditMode}
                                        onChange={e => setBucket(e.currentTarget.value)}
                                        inputProps={{maxLength: 255}}
                                    />
                                    <StyledTextField
                                        label={isAwsRegion ? "AWS Region" : "Endpoint URL"}
                                        variant="outlined"
                                        value={endpoint}
                                        fullWidth
                                        disabled={!bucketEditMode}
                                        onChange={e => setEndpoint(e.currentTarget.value)}
                                        inputProps={{maxLength: 255}}
                                    />
                                    <StyledTextField
                                        label="Access Key"
                                        variant="outlined"
                                        value={accessKey}
                                        fullWidth
                                        disabled={!bucketEditMode}
                                        onChange={e => setAccessKey(e.currentTarget.value)}
                                        inputProps={{ maxLength: 255 }}
                                        type="password"
                                    />
                                    <StyledTextField
                                        label="Secret Key"
                                        variant="outlined"
                                        value={secretKey}
                                        fullWidth
                                        disabled={!bucketEditMode}
                                        onChange={e => setSecretKey(e.currentTarget.value)}
                                        inputProps={{ maxLength: 255 }}
                                        type="password"
                                    />
                                    <div className="flex-row">
                                        <FormControlLabel
                                            control={<Checkbox checked={isAwsRegion}
                                                               disabled={!bucketEditMode}
                                                               readOnly={!bucketEditMode}
                                                               onChange={(e) => setIsAwsRegion(e.currentTarget.checked)}
                                                               sx={{'&.Mui-disabled': { color: 'text.primary' }}}/>}
                                            label="Is AWS Region"
                                            sx={{
                                                opacity: 1,
                                                '& .MuiFormControlLabel-label.Mui-disabled': { color: 'text.primary' }
                                            }}
                                        />
                                        <FontAwesomeIcon icon={solid("circle-info")}
                                                         data-tip="Check if this S3 bucket is hosted on AWS S3, in which case you can specify the AWS region, rather than an endpoint URL."/>
                                        <ReactTooltip effect="solid" type="info" place="right"/>
                                    </div>
                                    <div className={"form-paper-button-row" + (bucketEditMode ? " form-paper-button--expanded" : "")}>
                                        {bucketEditMode
                                            ? <Button
                                                startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("xmark")}/>}
                                                onClick={() => setBucketEditMode(false)}
                                              >Cancel</Button>
                                            : <div className="button-row">
                                                <Button
                                                    startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("pen-to-square")}/>}
                                                    hidden={!broker.is_admin}
                                                    onClick={() => setBucketEditMode(true)}
                                                >Edit</Button>
                                                <Button
                                                    startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("plug")}/>}
                                                    onClick={async () => {
                                                        const loadingModal = app.openLoadingModal();
                                                        try {
                                                            const config = await app.getAuthorization(location, navigate);
                                                            const response = await http.post<VerifyBucketConnectionResponse>(`/verify-bucket-connection/${id}`, {}, config);
                                                            if (response.data.is_valid) {
                                                                app.openModal("Success", <p>The S3 config is valid.
                                                                    Connection to
                                                                    bucket {broker?.bucket} established.</p>);
                                                            } else {
                                                                showBucketConnectionError(app, response.data.error_message);
                                                            }
                                                        } catch (e) {
                                                            console.error("Failed to test broker connection", e);
                                                            enqueueSnackbar({
                                                                message: "Failed to test broker connection",
                                                                variant: "error"
                                                            });
                                                        } finally {
                                                            loadingModal.close();
                                                        }
                                                    }}
                                                >Test Connection</Button>
                                            </div>}
                                        <Button
                                            color="secondary"
                                            startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={regular("floppy-disk")}/>}
                                            hidden={!bucketEditMode}
                                            onClick={async () => {
                                                const loadingModal = app.openLoadingModal();
                                                try {
                                                    const config = await app.getAuthorization(location, navigate);
                                                    const response = await http.post<Broker>(`/edit-broket-bucket/${id}`, {
                                                        bucket: bucket,
                                                        endpoint: endpoint,
                                                        access_key: accessKey,
                                                        secret_key: secretKey,
                                                        is_aws_region: isAwsRegion
                                                    }, config);
                                                    updateBroker(response.data);
                                                    enqueueSnackbar({
                                                        message: "Broker updated",
                                                        variant: "success",
                                                    });
                                                } catch (e: any) {
                                                    console.error("Failed to update broker", e);
                                                    if (e.response?.status === 401) {
                                                        enqueueSnackbar({
                                                            message: "Your credentials have expired, try refreshing the page.",
                                                            variant: "error"
                                                        });
                                                    } else if (e?.response?.data?.error_code === 400007) {
                                                        showBucketConnectionError(app, e?.response?.data?.message);
                                                    } else {
                                                        enqueueSnackbar({
                                                            message: "An error occurred editing broker, please try again",
                                                            variant: "error"
                                                        });
                                                    }
                                                } finally {
                                                    loadingModal.close();
                                                    setEditMode(false);
                                                }
                                            }}
                                        >Test and Save</Button>
                                    </div>
                                </div>
                            </Paper>}
                        </div>
                        : <div><FontAwesomeIcon icon={solid("circle-notch")} spin size="6x"/></div>}
                    {broker && <div style={{ display: "flex", flexDirection: "row" }}>
                        <ReadOnlyTextField label="Your Usage" variant="standard" value={`${formatBytes(broker.used_bytes)} / ${broker.quota_bytes ? formatBytes(broker.quota_bytes) : "∞"}`}/>
                        {broker.total_used_bytes && <ReadOnlyTextField label="Total Usage" variant="standard" value={`${formatBytes(broker.total_used_bytes)}`}/>}
                        <ReadOnlyTextField label="Owner" variant="standard" value={broker.owner.display_name ?? broker.owner.user_name}/>
                    </div>}
                </Paper>
                {broker && broker.is_admin && <div className="broker-tabs-wrapper" style={{ width: "60%", minWidth: "max(25vh, min(375px, calc(100vw - 40px)))" }}>
                    <Paper elevation={2} className="fieldset-paper">
                        <div className="form-paper-content">
                            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                                <Tabs variant="scrollable" scrollButtons="auto" value={activeTab} onChange={(_e, val: number) => setActiveTab(val)}>
                                    <Tab label="Broker Access" {...a11yProps(0)} />
                                    <Tab label="Audit Logs" {...a11yProps(0)} />
                                </Tabs>
                            </Box>
                            <TabPanel value={activeTab} index={0}>
                                <PaginatedTable<BrokerAccessInnerJoined>
                                    ref={brokerAccessTableRef}
                                    rowsPerPageOptions={[5, 10, 15]}
                                    columns={[
                                        { id: "user_group.name", name: "Group", renderCellValue: (brokerAccess) => brokerAccess.granted_group?.name, allowSorting: true },
                                        { id: "write", name: "Admin Access", renderCellValue: (brokerAccess) => brokerAccess.write ? "Yes" : "No" },
                                        { id: "quota", name: "Quota Per User", renderCellValue: (brokerAccess) => brokerAccess.quota ? formatBytes(brokerAccess.quota) : "∞" },
                                        { id: "used_bytes", name: "Bytes Used By Access", renderCellValue: (brokerAccess) => formatBytes(brokerAccess.used_bytes) },
                                        { id: "granted_by", name: "Granted By", renderCellValue: (brokerAccess) => brokerAccess.granted_by.display_name ?? brokerAccess.granted_by.user_name, allowSorting: true },
                                        { id: "creation_timestamp", name: "Granted At", renderCellValue: (brokerAccess) => new Date(brokerAccess.creation_timestamp).toLocaleString(), allowSorting: true},
                                    ]}
                                    loadDataFn={async (page, rowsPerPage, orderBy: string | undefined, orderDirection: Direction | undefined) => {
                                        let config = await app.getAuthorization(location, navigate);
                                        let response = await http.get<GetBrokerAccessResponse>(`/get-broker-access/${broker!!.pk}?page=${page}&limit=${rowsPerPage}&ordering=${orderDirection === "desc" ? "-" : ""}${orderBy ? orderBy : "user_group.name"}`, config);

                                        return {
                                            totalCount: response.data.total_count,
                                            data: response.data.broker_access,
                                        }
                                    }}
                                    rowActions={[
                                        {
                                            label: "Change Quota",
                                            exec: (brokerAccess) => app.openModal(
                                                "Change Quota",
                                                (changeQuotaModal) => <ChangeQuotaForm broker={broker} brokerAccess={brokerAccess} modal={changeQuotaModal} app={app} />,
                                                (result) => {
                                                    if (result) {
                                                        brokerAccessTableRef.current?.reload();
                                                    }
                                                }
                                            ),
                                            icon: <DataUsageIcon />
                                        },
                                        {
                                            label: "Grant Admin Rights",
                                            exec: (brokerAccess) => app.openModal(
                                                "Grant Admin Rights",
                                                (modal) => <ActionModal
                                                    modalContent={modal}
                                                    text={`Grant admin rights to group ${brokerAccess.granted_group?.name}. BEWARE: Granting admin privileges means that admins of the selected groups will be able to view broker credentials, edit broker details and bucket configuration and grant access to other groups.`}
                                                    actions={[
                                                        {
                                                            name: "Ok",
                                                            fn: async () => {
                                                                const loadingModal = app.openLoadingModal();
                                                                try {
                                                                    const config = await app.getAuthorization(location, navigate);
                                                                    const response = await http.post<BrokerAccess>(`/change-broker-access-admin/${broker.pk}/${brokerAccess.pk}`, {
                                                                        is_admin: true
                                                                    }, config);
                                                                    enqueueSnackbar({
                                                                        message: "Admin rights granted",
                                                                        variant: "success",
                                                                    });
                                                                    return response.data;
                                                                } catch (e: any) {
                                                                    if (e.response?.status === 401) {
                                                                        enqueueSnackbar({
                                                                            message: "Your credentials have expired, try refreshing the page.",
                                                                            variant: "error"
                                                                        });
                                                                    } else {
                                                                        enqueueSnackbar({
                                                                            message: "An error occurred granting admin rights, please try again",
                                                                            variant: "error"
                                                                        });
                                                                    }
                                                                } finally {
                                                                    loadingModal.close();
                                                                }
                                                            }
                                                        }
                                                    ]}
                                                />,
                                                (result) => {
                                                    if (result) {
                                                        brokerAccessTableRef.current?.reload();
                                                    }
                                                }
                                            ),
                                            icon: <AdminPanelSettingsIcon />,
                                            disableForRow: (brokerAccess) => brokerAccess.write === true || !brokerAccess.granted_group,
                                        },
                                        {
                                            label: "Revoke Admin Rights",
                                            exec: (brokerAccess) => app.openModal(
                                                "Revoke Admin Rights",
                                                (modal) => <ActionModal
                                                    modalContent={modal}
                                                    text={`Revoke admin rights from group ${brokerAccess.granted_group?.name}.`}
                                                    actions={[
                                                        {
                                                            name: "Ok",
                                                            fn: async () => {
                                                                const loadingModal = app.openLoadingModal();
                                                                try {
                                                                    const config = await app.getAuthorization(location, navigate);
                                                                    const response = await http.post<BrokerAccess>(`/change-broker-access-admin/${broker.pk}/${brokerAccess.pk}`, {
                                                                        is_admin: false
                                                                    }, config);
                                                                    enqueueSnackbar({
                                                                        message: "Admin rights revoked",
                                                                        variant: "success",
                                                                    });
                                                                    return response.data;
                                                                } catch (e: any) {
                                                                    if (e.response?.status === 401) {
                                                                        enqueueSnackbar({
                                                                            message: "Your credentials have expired, try refreshing the page.",
                                                                            variant: "error"
                                                                        });
                                                                    } else {
                                                                        enqueueSnackbar({
                                                                            message: "An error occurred revoking admin rights, please try again",
                                                                            variant: "error"
                                                                        });
                                                                    }
                                                                } finally {
                                                                    loadingModal.close();
                                                                }
                                                            }
                                                        }
                                                    ]}
                                                />,
                                                (result) => {
                                                    if (result) {
                                                        brokerAccessTableRef.current?.reload();
                                                    }
                                                }
                                            ),
                                            icon: <RemoveModeratorIcon />,
                                            disableForRow: (brokerAccess) => brokerAccess.write === false,
                                        },
                                        {
                                            label: "Revoke Access",
                                            exec: (brokerAccess) => app.openModal(
                                                "Revoke Access",
                                                (modal) => <ActionModal
                                                    modalContent={modal}
                                                    text={`Revoke access from group ${brokerAccess.granted_group?.name}.`}
                                                    actions={[
                                                        {
                                                            name: "Ok",
                                                            fn: async () => {
                                                                const loadingModal = app.openLoadingModal();
                                                                try {
                                                                    const config = await app.getAuthorization(location, navigate);
                                                                    const response = await http.delete<BrokerAccess>(`/delete-broker-access/${broker.pk}/${brokerAccess.pk}`, config);
                                                                    enqueueSnackbar({
                                                                        message: "Access revoked",
                                                                        variant: "success",
                                                                    });
                                                                    return response.data;
                                                                } finally {
                                                                    loadingModal.close();
                                                                }
                                                            }
                                                        }
                                                    ]}
                                                />,
                                                (result) => {
                                                    if (result) {
                                                        brokerAccessTableRef.current?.reload();
                                                    }
                                                }
                                            ),
                                            icon: <RemoveCircleOutlineIcon />,
                                            color: "error",
                                        }
                                    ]}
                                />
                                <div className="form-paper-button-row" style={{ marginTop: "10px", marginBottom: "10px" }}>
                                    <Button
                                        startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("add")} />}
                                        onClick={() => app.openModal(
                                            "Create Access",
                                            modal => <BrokerAccessCreator broker={broker!!} modal={modal} app={app} />,
                                            result => {
                                                if (result) {
                                                    brokerAccessTableRef.current?.reload();
                                                }
                                            }
                                        )}
                                    >Create Access</Button>
                                </div>
                                <p>No linked group means that the broker access is public. Storage usage shows number of bytes
                                    uploaded to this broker by users that are members of the linked group, if the user is member
                                    of multiple groups that have access, the storage usage counts towards all of those group accesses.
                                    Bytes used by pubic group access counts all uploads by users that are not members of any group with access.</p>
                            </TabPanel>
                            <TabPanel value={activeTab} index={1}>
                                <PaginatedTable<BrokerAuditLogInnerJoined>
                                    columns={[
                                        { id: "user", name: "User", renderCellValue: (log) => log.user.display_name ?? log.user.user_name },
                                        { id: "action", name: "Action", renderCellValue: (log) => log.action },
                                        { id: "target_group", name: "Target Group", renderCellValue: (log) => log.target_group?.name },
                                        { id: "new_quota", name: "New Quota", renderCellValue: (log) => log.new_quota ? formatBytes(log.new_quota) : undefined },
                                        { id: "timestamp", name: "Timestamp", renderCellValue: (log) => new Date(log.creation_timestamp).toLocaleString() }
                                    ]}
                                    loadDataFn={async (page, rowsPerPage) => {
                                        let config = await app.getAuthorization(location, navigate);
                                        let response = await http.get<GetBrokerAuditLogsResponse>(`/get-broker-audit-logs/${broker!!.pk}?page=${page}&limit=${rowsPerPage}`, config);

                                        return {
                                            totalCount: response.data.total_count,
                                            data: response.data.audit_logs
                                        };
                                    }}
                                />
                            </TabPanel>
                        </div>
                    </Paper>
                </div>}
            </div>
        </div>
    );
}

export function showBucketConnectionError(app: App, errorMessage: string | null | undefined) {
    app.openModal("Error", <div>
        <p>The provided S3 config is invalid, make sure the endpoint is
            reachable, the bucket and region are valid and the provided
            credentials have access to the bucket.</p>
        <div style={{ marginBottom: "1rem" }}>
            Error:<br/>
            <pre style={{
                maxHeight: "200px",
                overflowY: "auto",
                overflowX: "hidden",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                padding: "8px",
                backgroundColor: "rgba(0,0,0,0.05)",
                borderRadius: "4px"
            }}>
                <code>
                    {errorMessage}
                </code>
            </pre>
        </div>
    </div>);
}
