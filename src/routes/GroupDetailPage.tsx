import {Link, useLocation, useNavigate, useParams} from "react-router-dom";
import App, {ModalContent} from "../App";
import http, {getApiUrl, getSiteBaseURI} from "../http-common";
import React, {ReactNode, useEffect, useRef, useState} from "react";
import {
    BrokerAccessInnerJoined,
    sortTagUsages,
    Tag, UserGroupAuditLogInnerJoined,
    UserGroupDetailed, UserGroupInviteDetailed, UserGroupInviteInnerJoined,
    UserGroupJoined, UserGroupMembership,
    UserGroupMembershipInnerJoined,
    UserPublic
} from "../Model";
import {
    Avatar, Box,
    Button,
    Checkbox,
    ClickAwayListener,
    FormControlLabel, FormLabelProps,
    Grow,
    IconButton, InputAdornment, ListItemIcon, ListItemText, MenuItem,
    MenuList,
    Paper, Popper, Tab, Tabs, TextField, Typography
} from "@mui/material";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {regular, solid} from "@fortawesome/fontawesome-svg-core/import.macro";
import {PostPicker} from "../components/PostPicker";
import {AvatarCropper} from "../components/AvatarCropper";
import urlJoin from "url-join";
import {ReadOnlyTextField, StyledTextField} from "../index";
import {TagCreator, TagSelector} from "../components/TagEditor";
import {FontAwesomeSvgIcon} from "../components/FontAwesomeSvgIcon";
import {UserGroupEditHistoryDialogue} from "../components/PostEditHistoryDialogue";
import {enqueueSnackbar} from "notistack";
import ReactTooltip from "react-tooltip";
import AddIcon from "@mui/icons-material/Add";
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import GroupRemoveIcon from '@mui/icons-material/GroupRemove';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AddLinkIcon from '@mui/icons-material/AddLink';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import BlockIcon from '@mui/icons-material/Block';
import VisibilityIcon from '@mui/icons-material/Visibility';
import UndoIcon from '@mui/icons-material/Undo';
import {ActionModal} from "../components/ActionModal";
import {a11yProps, TabPanel} from "../components/TabPanel";
import {Direction, PaginatedTable, PaginatedTableHandle, PaginatedTableRowAction} from "../components/PaginatedTable";
import {formatBytes} from "../Util";
import {RevokeUserGroupInviteResponse} from "./GroupMembershipList";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import {PostCollectionQueryObject, PostQueryObject, SearchResult} from "../Search";
import {PreviewGrid} from "../components/PaginatedGridView";

export interface GetUserGroupMembersResponse {
    total_count: number,
    members: UserGroupMembershipInnerJoined[],
}

export interface GetUserGroupAuditLogsResponse {
    total_count: number,
    audit_logs: UserGroupAuditLogInnerJoined[],
}

export interface GetUserGroupInvitesResponse {
    total_count: number,
    invites: UserGroupInviteInnerJoined[],
}

export interface GetUserGroupBrokersResponse {
    total_count: number,
    brokers: BrokerAccessInnerJoined[],
}

export interface ChangeUserGroupMembershipResponse {
    prev: UserGroupMembership,
    updated: UserGroupMembership | null | undefined,
    changed: boolean,
}

export function GroupCreator({modal, app}: { modal?: ModalContent, app: App }) {
    const navigate = useNavigate();
    const location = useLocation();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isPublic, setIsPublic] = useState(false);
    const [allowMemberInvite, setAllowMemberInvite] = useState(false);
    const [enteredTags, setEnteredTags] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<number[]>([]);

    return (
        <div id="GroupCreator">
            <Paper elevation={2} className="fieldset-paper">
                <div className="form-paper-content">
                    <StyledTextField
                        label="Name"
                        variant="outlined"
                        value={name}
                        fullWidth
                        onChange={e => setName(e.currentTarget.value)}
                        inputProps={{ maxLength: 255 }}
                    />
                    <StyledTextField
                        label="Description"
                        variant="outlined"
                        value={description}
                        fullWidth
                        multiline
                        maxRows={5}
                        onChange={e => setDescription(e.currentTarget.value)}
                        inputProps={{ maxLength: 30000 }}
                    />
                    <div className="flex-row">
                        <div className="autocomplete-container">
                            <TagSelector setEnteredTags={setEnteredTags} setSelectedTags={setSelectedTags}></TagSelector>
                        </div>
                        <IconButton size="medium" onClick={e => {
                            e.preventDefault();
                            app.openModal("Create Tag", createTagModal => <TagCreator app={app} modal={createTagModal}></TagCreator>);
                        }}><AddIcon /></IconButton>
                    </div>
                    <div className="flex-row">
                        <FormControlLabel
                            control={<Checkbox checked={isPublic}
                                               onChange={(e) => setIsPublic(e.currentTarget.checked)}
                                               sx={{'&.Mui-disabled': {color: 'text.primary'}}}/>}
                            label="Public"
                            sx={{ opacity: 1, '& .MuiFormControlLabel-label.Mui-disabled': {color: 'text.primary'} }}
                        />
                        <FontAwesomeIcon icon={solid("circle-info")} data-tip="Public groups are visible for all users and can be joined without invite."></FontAwesomeIcon>
                        <ReactTooltip effect="solid" type="info" place="right"></ReactTooltip>
                    </div>
                    <div className="flex-row">
                        <FormControlLabel
                            control={<Checkbox checked={allowMemberInvite} onChange={(e) => setAllowMemberInvite(e.currentTarget.checked)} sx={{'&.Mui-disabled': {color: 'text.primary'}}} />}
                            label="Allow Member Invite"
                            sx={{ opacity: 1, '& .MuiFormControlLabel-label.Mui-disabled': {color: 'text.primary'} }}
                        />
                        <FontAwesomeIcon icon={solid("circle-info")} data-tip="Allows non-admin users to invite new members, this option is ineffective for public groups."></FontAwesomeIcon>
                        <ReactTooltip effect="solid" type="info" place="right"></ReactTooltip>
                    </div>
                    <div className="form-paper-button-row">
                        <Button color="secondary" startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={regular("floppy-disk")} />} onClick={async () => {
                            const loadingModal = app.openLoadingModal();
                            try {
                                const config = await app.getAuthorization(location, navigate);
                                const result = await http.post<UserGroupDetailed>(`/create-user-group`, {
                                    name: name,
                                    description: description,
                                    is_public: isPublic,
                                    allow_member_invite: allowMemberInvite,
                                    entered_tags: enteredTags,
                                    selected_tags: selectedTags
                                }, config);
                                enqueueSnackbar({
                                    message: (
                                        <span>
                                            Group <Link className="standard-link" to={`group/${result.data.pk}`}>{result.data.name}</Link> created
                                        </span>
                                    ),
                                    variant: "success"
                                });
                                modal?.close(result.data);
                            } catch (e: any) {
                                console.error("Failed to create group", e);
                                if (e.response?.status === 401) {
                                    enqueueSnackbar({
                                        message: "Your credentials have expired, try refreshing the page.",
                                        variant: "error"
                                    });
                                } else {
                                    enqueueSnackbar({
                                        message: "An error occurred creating group, please try again",
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

export function GroupDetailPage({app}: {app: App}) {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [group, setGroup] = useState<UserGroupDetailed | null>(null);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isPublic, setIsPublic] = useState(false);
    const [allowMemberInvite, setAllowMemberInvite] = useState(false);
    const [membership, setMembership] = useState<UserGroupMembershipInnerJoined | null | undefined>(null);
    const [tags, setTags] = useState<(string | Tag)[]>([]);
    const [enteredTags, setEnteredTags] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<number[]>([]);

    const [activeTab, setActiveTab] = useState(0);
    const [activeInvitesOnly, setActiveInvitesOnly] = useState(true);
    const memberTableRef = useRef<PaginatedTableHandle>(null);
    const adminTableRef = useRef<PaginatedTableHandle>(null);
    const inviteTableRef = useRef<PaginatedTableHandle>(null);
    const banTableRef = useRef<PaginatedTableHandle>(null);
    useEffect(() => {
        inviteTableRef.current?.reload();
    }, [activeInvitesOnly]);

    const [posts, setPosts] = useState<PostQueryObject[]>([]);
    const [collections, setCollections] = useState<PostCollectionQueryObject[]>([]);

    const [editMode, setEditMode] = useState(false);
    const [inviteMenuAnchor, setInviteMenuAnchor] = React.useState<null | HTMLElement>(null);

    const updateGroup = (group: UserGroupDetailed | null) => {
        setGroup(group);
        setName(group?.name ?? "");
        setDescription(group?.description ?? "");
        setIsPublic(group?.is_public ?? false);
        setAllowMemberInvite(group?.allow_member_invite ?? false);
        setTags(group?.tags?.sort(sortTagUsages).map(tagUsage => tagUsage.tag) ?? []);
        setSelectedTags(group?.tags?.map(tagUsage => tagUsage.tag.pk) ?? []);
    };

    const loadGroup = async () => {
        updateGroup(null);
        const loadingModal = app.openLoadingModal()
        try {
            const config = await app.getAuthorization(location, navigate);
            const response = await http.get<UserGroupJoined>(`/get-user-group/${id}`, config);
            updateGroup(response.data.group);
            setMembership(response.data.membership);
        } catch (e: any) {
            console.error("Failed to load group", e);
            if (e?.response?.data?.error_code === 403001) {
                app.openModal("Error", <div>Cannot access group</div>);
            } else {
                app.openModal("Error", <div>An unexpected error occurred ({e?.response?.data?.error_code})</div>);
            }
        } finally {
            loadingModal.close();
        }
    };

    const loadPosts = async () => {
        if (group) {
            try {
                const config = await app.getAuthorization(location, navigate, false);
                const response = await http.get<SearchResult>(`/search?query=${encodeURIComponent(`.shared_with_group(${group.pk}) %limit(5)`)}`, config);
                setPosts(response.data.posts || []);
            } catch (e: any) {
                console.error("Failed to load posts", e);
            }
        }
    };
    const loadCollections = async () => {
        if (group) {
            try {
                const config = await app.getAuthorization(location, navigate, false);
                const response = await http.get<SearchResult>(`/search/collection?query=${encodeURIComponent(`.shared_with_group(${group.pk}) %limit(5)`)}`, config);
                setCollections(response.data.collections || []);
            } catch (e: any) {
                console.error("Failed to load collections", e);
            }
        }
    };
    useEffect(() => {
        if (group) {
            loadPosts();
            loadCollections();
        }
    }, [group]);

    useEffect(() => {
        loadGroup();
    }, [id, editMode]);

    const memberUpdateAction = (
        tableRef: React.RefObject<PaginatedTableHandle>,
        label: string,
        modalTextFn: (member: UserGroupMembershipInnerJoined) => string,
        requestBodyFn: (value?: string) => { action: "promote" | "demote" | "kick" | "ban" | "unban", reason?: string },
        successMessageFn: (member: UserGroupMembershipInnerJoined) => string,
        disableForRow?: (member: UserGroupMembershipInnerJoined) => boolean,
        icon?: ReactNode,
        color?: FormLabelProps["color"],
        additionalModalContent?: (value: string, setValue: (v: string) => void) => ReactNode,
    ): PaginatedTableRowAction<UserGroupMembershipInnerJoined> => ({
        label: label,
        exec: (member) => app.openModal(
            "Confirm",
            (modal) => <ActionModal
                modalContent={modal}
                text={modalTextFn(member)}
                additionalContent={additionalModalContent}
                actions={[
                    {
                        name: "Ok",
                        fn: async (_, reason) => {
                            const loadingModal = app.openLoadingModal();
                            try {
                                let config = await app.getAuthorization(location, navigate);
                                let response = await http.post<ChangeUserGroupMembershipResponse>(`/change-user-group-membership/${group!!.pk}/${member.user.pk}`, requestBodyFn(reason), config);

                                enqueueSnackbar({
                                    message: successMessageFn(member),
                                    variant: "success"
                                });

                                return response.data;
                            } finally {
                                loadingModal.close();
                            }
                        }
                    }
                ]}
            />,
            (result: ChangeUserGroupMembershipResponse) => {
                if (result && result.changed) {
                    tableRef.current?.reload();
                }
            }
        ),
        disableForRow: disableForRow,
        icon: icon,
        color: color,
    });

    return (
        <div id="GroupDetailPage" className="full-page-component">
            <div className="full-page-content-wrapper">
                <Paper elevation={2} className="form-paper">
                    {group
                    ?   <div className="form-paper-content">
                            <div className="form-paper-button-row">
                                <Button color="secondary" startIcon={<GroupAddIcon />} hidden={!group.user_can_invite} onClick={(e) => {
                                    setInviteMenuAnchor(e.currentTarget);
                                }}>Invite</Button>
                                <Button color="secondary" startIcon={<PersonAddIcon />} hidden={Boolean(membership) || group.owner.pk === app.getUser()?.pk} onClick={() => {
                                    app.openModal("Join Group", (modal) => <ActionModal
                                        modalContent={modal}
                                        text={`Join group ${group?.name}`}
                                        actions={[{
                                            name: "Ok",
                                            fn: async (modal) => {
                                                const loadingModal = app.openLoadingModal();
                                                try {
                                                    const config = await app.getAuthorization(location, navigate);
                                                    const response = await http.post<UserGroupJoined>(`/join-user-group/${id}`, undefined, config);

                                                    enqueueSnackbar({
                                                        message: `Joined group ${group?.name}`,
                                                        variant: "success"
                                                    });

                                                    modal?.close(response.data);
                                                } finally {
                                                    loadingModal.close();
                                                }
                                            }
                                        }]}
                                    />, (result) => {
                                        if (result) {
                                            updateGroup(result.group);
                                            setMembership(result.membership);
                                        }
                                    });
                                }}>Join</Button>
                                <Button color="error" startIcon={<GroupRemoveIcon />} hidden={!membership || membership.is_owner || membership.revoked} onClick={async () => {
                                    const loadingModal = app.openLoadingModal();
                                    try {
                                        const config = await app.getAuthorization(location, navigate);
                                        await http.delete(`/leave-user-group/${id}`, config);

                                        navigate({
                                            pathname: "/groups"
                                        });

                                        enqueueSnackbar({
                                            message: `Left group ${group?.name}`,
                                            variant: "success"
                                        });
                                    } finally {
                                        loadingModal.close();
                                    }
                                }}>Leave</Button>
                                <Button color="error" startIcon={<BlockIcon/>} disabled hidden={!membership?.revoked}>You are banned from this group</Button>
                            </div>
                            <IconButton disabled={!group.is_editable} sx={{ width: "fit-content", justifySelf: "center", alignSelf: "center" }} onClick={() => app.openModal("Select Avatar", (modal) => <PostPicker app={app} constriction={"@type ~= \"image/%\""} onPostSelect={(post) => {
                                app.openModal(
                                    "Avatar Cropper",
                                    (avatarCropperModal) => <AvatarCropper sourceObjectKey={post.s3_object.object_key} modal={avatarCropperModal} app={app} userGroupPk={group!!.pk} />,
                                    (result) => {
                                        if (result) {
                                            modal.close(result);
                                            updateGroup(result);
                                        }
                                    },
                                    true,
                                    true,
                                    false,
                                    true
                                );
                            }} /> )}>
                                <Avatar sx={{ width: 100, height: 100 }} src={group.avatar_object_key ? urlJoin(getApiUrl(), "get-object", group.avatar_object_key) : undefined}>
                                    {!group.avatar_object_key && group.name.split(/\s+/i, 3).filter(s => s.length > 0).map(s => s[0].toUpperCase())}
                                </Avatar>
                            </IconButton>
                            <StyledTextField
                                label="Name"
                                variant="outlined"
                                value={name}
                                disabled={!editMode}
                                fullWidth
                                onChange={e => setName(e.currentTarget.value)}
                                inputProps={{ maxLength: 255 }}
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
                                inputProps={{ maxLength: 30000 }}
                            />
                            <TagSelector setSelectedTags={setSelectedTags} setEnteredTags={setEnteredTags} values={tags} readOnly={!editMode} enableTagLink />
                            <div className="flex-row">
                                <FormControlLabel
                                    control={<Checkbox checked={isPublic} disabled={!editMode} readOnly={!editMode}
                                                       onChange={(e) => setIsPublic(e.currentTarget.checked)}
                                                       sx={{'&.Mui-disabled': {color: 'text.primary'}}}/>}
                                    label="Public"
                                    sx={{ opacity: 1, '& .MuiFormControlLabel-label.Mui-disabled': {color: 'text.primary'} }}
                                />
                                <FontAwesomeIcon icon={solid("circle-info")} data-tip="Public groups are visible for all users and can be joined without invite."></FontAwesomeIcon>
                                <ReactTooltip effect="solid" type="info" place="right"></ReactTooltip>
                            </div>
                            <div className="flex-row">
                                <FormControlLabel
                                    control={<Checkbox checked={allowMemberInvite} disabled={!editMode} readOnly={!editMode} onChange={(e) => setAllowMemberInvite(e.currentTarget.checked)} sx={{'&.Mui-disabled': {color: 'text.primary'}}} />}
                                    label="Allow Member Invite"
                                    sx={{ opacity: 1, '& .MuiFormControlLabel-label.Mui-disabled': {color: 'text.primary'} }}
                                />
                                <FontAwesomeIcon icon={solid("circle-info")} data-tip="Allows non-admin users to invite new members, this option is ineffective for public groups."></FontAwesomeIcon>
                                <ReactTooltip effect="solid" type="info" place="right"></ReactTooltip>
                            </div>
                            <ReadOnlyTextField label="Owner" variant="standard" value={group.owner.display_name ?? group.owner.user_name} />
                            <div className={"form-paper-button-row" + (editMode ? " form-paper-button--expanded" : "")}>
                                {editMode
                                    ? <Button startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("xmark")} />} onClick={() => setEditMode(false)}>Cancel</Button>
                                    : <div className="button-row">
                                        <Button startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("pen-to-square")} />} hidden={!group.is_editable} onClick={() => setEditMode(true)}>Edit</Button>
                                        <Button startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("clock-rotate-left")} />} hidden={!group.is_editable} onClick={() => app.openModal("History", modal => <UserGroupEditHistoryDialogue app={app} user_group={group} modal={modal} />, (result) => {
                                            if (result) {
                                                updateGroup(result);
                                            }
                                        })}>History</Button>
                                    </div>}
                                <Button color="secondary" startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={regular("floppy-disk")} />} hidden={!editMode} onClick={async () => {
                                    const loadingModal = app.openLoadingModal();
                                    try {
                                        const config = await app.getAuthorization(location, navigate);
                                        const result = await http.post<UserGroupDetailed>(`/edit-user-group/${id}`, {
                                            name: name,
                                            description: description,
                                            is_public: isPublic,
                                            allow_member_invite: allowMemberInvite,
                                            tags_overwrite: enteredTags,
                                            tag_pks_overwrite: selectedTags
                                        }, config);
                                        updateGroup(result.data);enqueueSnackbar({
                                            message: "Group edited",
                                            variant: "success"
                                        });
                                    } catch (e: any) {
                                        console.error("Failed to update group", e);
                                        if (e.response?.status === 401) {
                                            enqueueSnackbar({
                                                message: "Your credentials have expired, try refreshing the page.",
                                                variant: "error"
                                            });
                                        } else {
                                            enqueueSnackbar({
                                                message: "An error occurred editing group, please try again",
                                                variant: "error"
                                            });
                                        }
                                    } finally {
                                        loadingModal.close();
                                        setEditMode(false);
                                    }
                                }}>Save</Button>
                            </div>
                        </div>
                    : <div><FontAwesomeIcon icon={solid("circle-notch")} spin size="6x" /></div>}
                </Paper>
                {(group?.owner?.pk === app.getUser()?.pk || !(membership && membership.revoked)) && <div className="group-tabs-wrapper" style={{ width: "60%", minWidth: "max(25vh, min(375px, calc(100vw - 40px)))" }}>
                    <Paper elevation={2} className="fieldset-paper">
                        {group
                            ? <div className="form-paper-content">
                                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                                    <Tabs variant="scrollable" scrollButtons="auto" value={activeTab} onChange={(_e, val: number) => setActiveTab(val)}>
                                        <Tab label="Members" {...a11yProps(0)} />
                                        <Tab label="Admins" {...a11yProps(1)} />
                                        <Tab label="Brokers" {...a11yProps(2)} />
                                        {(group.owner.pk === app.getUser()?.pk || membership?.administrator) && <Tab label="Invites" {...a11yProps(3)} />}
                                        {(group.owner.pk === app.getUser()?.pk || membership?.administrator) && <Tab label="Audit Logs" {...a11yProps(4)} />}
                                        {(group.owner.pk === app.getUser()?.pk || membership?.administrator) && <Tab label="Banned Users" {...a11yProps(5)} />}
                                    </Tabs>
                                </Box>
                                <TabPanel value={activeTab} index={0}>
                                    <PaginatedTable<UserGroupMembershipInnerJoined>
                                        ref={memberTableRef}
                                        columns={[
                                            { id: "user", name: "User", renderCellValue: (member) => member.user.display_name ?? member.user.user_name, allowSorting: true },
                                            { id: "creation_timestamp", name: "Joined At", renderCellValue: (member) => new Date(member.creation_timestamp).toLocaleString(), allowSorting: true },
                                            { id: "granted_by", name: "Granted By", renderCellValue: (member) => member.granted_by.display_name ?? member.granted_by.user_name, allowSorting: true },
                                            { id: "administrator", name: "Admin", renderCellValue: (member) => member.administrator ? "Yes" : "No" },
                                        ]}
                                        loadDataFn={async (page, rowsPerPage, orderBy: string | undefined, orderDirection: Direction | undefined) => {
                                            let config = await app.getAuthorization(location, navigate);
                                            let response = await http.get<GetUserGroupMembersResponse>(`/get-user-group-members/${group!!.pk}?page=${page}&limit=${rowsPerPage}&ordering=${orderDirection === "desc" ? "-" : ""}${orderBy ? orderBy : "-creation_timestamp"}`, config);

                                            return {
                                                totalCount: response.data.total_count,
                                                data: response.data.members
                                            };
                                        }}
                                        rowActions={[
                                            memberUpdateAction(
                                                memberTableRef,
                                                "Promote to Admin",
                                                (member) => `Promote ${member.user.display_name ?? member.user.user_name} to admin?`,
                                                (_) => ({ action: "promote" }),
                                                (member) => `Promoted ${member.user.display_name ?? member.user.user_name} to admin`,
                                                (member) => group.owner.pk !== app.getUser()?.pk || member.administrator,
                                                <SupervisorAccountIcon />,
                                            ),
                                            memberUpdateAction(
                                                memberTableRef,
                                                "Demote Admin",
                                                (member) => `Demote admin ${member.user.display_name ?? member.user.user_name} and remove admin privileges?`,
                                                (_) => ({ action: "demote" }),
                                                (member) => `User ${member.user.display_name ?? member.user.user_name} demoted`,
                                                (member) => group.owner.pk !== app.getUser()?.pk || !member.administrator,
                                                <PersonOffIcon />,
                                            ),
                                            memberUpdateAction(
                                                memberTableRef,
                                                "Kick Member",
                                                (member) => `Kick user ${member.user.display_name ?? member.user.user_name}? Kicked users will have their membership deleted but may join / be invited again. You may optionally specify a reason below.`,
                                                (reason) => ({ action: "kick", reason: reason }),
                                                (member) => `Removed user ${member.user.display_name ?? member.user.user_name} from group`,
                                                (_) => !(group.owner.pk === app.getUser()?.pk || membership?.administrator),
                                                <GroupRemoveIcon />,
                                                undefined,
                                                (reason, setReason) => (<TextField label="Reason" multiline fullWidth rows={3} value={reason} onChange={(e) => setReason(e.currentTarget.value)} />),
                                            ),
                                            memberUpdateAction(
                                                memberTableRef,
                                                "Ban Member",
                                                (member) => `Ban user ${member.user.display_name ?? member.user.user_name}? Banned users will have their membership revoked and will not be able to join / be invited again until unbanned. You may optionally specify a reason below.`,
                                                (reason) => ({ action: "ban", reason: reason }),
                                                (member) => `Banned user ${member.user.display_name ?? member.user.user_name} from group`,
                                                (_) => !(group.owner.pk === app.getUser()?.pk || membership?.administrator),
                                                <BlockIcon />,
                                                "error",
                                                (reason, setReason) => (<TextField label="Reason" multiline fullWidth rows={3} value={reason} onChange={(e) => setReason(e.currentTarget.value)} />),
                                            ),
                                        ]}
                                    />
                                </TabPanel>
                                <TabPanel value={activeTab} index={1}>
                                    <PaginatedTable<UserGroupMembershipInnerJoined>
                                        ref={adminTableRef}
                                        columns={[
                                            { id: "user", name: "User", renderCellValue: (member) => member.user.display_name ?? member.user.user_name, allowSorting: true },
                                            { id: "creation_timestamp", name: "Joined At", renderCellValue: (member) => new Date(member.creation_timestamp).toLocaleString(), allowSorting: true },
                                            { id: "granted_by", name: "Granted By", renderCellValue: (member) => member.granted_by.display_name ?? member.granted_by.user_name, allowSorting: true },
                                        ]}
                                        loadDataFn={async (page, rowsPerPage, orderBy: string | undefined, orderDirection: Direction | undefined) => {
                                            let config = await app.getAuthorization(location, navigate);
                                            let response = await http.get<GetUserGroupMembersResponse>(`/get-user-group-members/${group!!.pk}?page=${page}&limit=${rowsPerPage}&admins_only=true&ordering=${orderDirection === "desc" ? "-" : ""}${orderBy ? orderBy : "-creation_timestamp"}`, config);

                                            return {
                                                totalCount: response.data.total_count,
                                                data: response.data.members
                                            };
                                        }}
                                        rowActions={[
                                            memberUpdateAction(
                                                adminTableRef,
                                                "Demote Admin",
                                                (member) => `Demote admin ${member.user.display_name ?? member.user.user_name} and remove admin privileges?`,
                                                (_) => ({ action: "demote" }),
                                                (member) => `User ${member.user.display_name ?? member.user.user_name} demoted`,
                                                (member) => group.owner.pk !== app.getUser()?.pk || !member.administrator,
                                                <PersonOffIcon />,
                                            ),
                                            memberUpdateAction(
                                                adminTableRef,
                                                "Kick Member",
                                                (member) => `Kick user ${member.user.display_name ?? member.user.user_name}? Kicked users will have their membership deleted but may join / be invited again. You may optionally specify a reason below.`,
                                                (reason) => ({ action: "kick", reason: reason }),
                                                (member) => `Removed user ${member.user.display_name ?? member.user.user_name} from group`,
                                                (_) => !(group.owner.pk === app.getUser()?.pk || membership?.administrator),
                                                <GroupRemoveIcon />,
                                                undefined,
                                                (reason, setReason) => (<TextField label="Reason" multiline fullWidth rows={3} value={reason} onChange={(e) => setReason(e.currentTarget.value)} />)
                                            ),
                                            memberUpdateAction(
                                                adminTableRef,
                                                "Ban Member",
                                                (member) => `Ban user ${member.user.display_name ?? member.user.user_name}? Banned users will have their membership revoked and will not be able to join / be invited again until unbanned. You may optionally specify a reason below.`,
                                                (reason) => ({ action: "ban", reason: reason }),
                                                (member) => `Banned user ${member.user.display_name ?? member.user.user_name} from group`,
                                                (_) => !(group.owner.pk === app.getUser()?.pk || membership?.administrator),
                                                <BlockIcon />,
                                                "error",
                                                (reason, setReason) => (<TextField label="Reason" multiline fullWidth rows={3} value={reason} onChange={(e) => setReason(e.currentTarget.value)} />)
                                            ),
                                        ]}
                                    />
                                </TabPanel>
                                <TabPanel value={activeTab} index={2}>
                                    <PaginatedTable<BrokerAccessInnerJoined>
                                        columns={[
                                            { id: "broker.name", name: "Broker", renderCellValue: (brokerAccess) => brokerAccess.broker.name, allowSorting: true },
                                            { id: "write", name: "Admin Group", renderCellValue: (brokerAccess) => brokerAccess.write ? "Yes" : "No" },
                                            { id: "quota", name: "Quota Per User", renderCellValue: (brokerAccess) => brokerAccess.quota ? formatBytes(brokerAccess.quota) : "∞" },
                                            { id: "used_bytes", name: "Bytes Used By Group", renderCellValue: (brokerAccess) => formatBytes(brokerAccess.used_bytes) },
                                            { id: "granted_by", name: "Granted By", renderCellValue: (brokerAccess) => brokerAccess.granted_by.display_name ?? brokerAccess.granted_by.user_name, allowSorting: true },
                                            { id: "creation_timestamp", name: "Granted At", renderCellValue: (brokerAccess) => new Date(brokerAccess.creation_timestamp).toLocaleString(), allowSorting: true},
                                        ]}
                                        loadDataFn={async (page, rowsPerPage, orderBy: string | undefined, orderDirection: Direction | undefined) => {
                                            let config = await app.getAuthorization(location, navigate);
                                            let response = await http.get<GetUserGroupBrokersResponse>(`/get-user-group-brokers/${group!!.pk}?page=${page}&limit=${rowsPerPage}&ordering=${orderDirection === "desc" ? "-" : ""}${orderBy ? orderBy : "broker.name"}`, config);

                                            return {
                                                totalCount: response.data.total_count,
                                                data: response.data.brokers,
                                            };
                                        }}
                                    />
                                </TabPanel>
                                <TabPanel value={activeTab} index={3}>
                                    <PaginatedTable<UserGroupInviteInnerJoined>
                                        ref={inviteTableRef}
                                        columns={[
                                            { id: "code", name: "Code", renderCellValue: (invite) => invite.code },
                                            { id: "create_user", name: "Create User", renderCellValue: (invite) => invite.create_user.display_name ?? invite.create_user.user_name, allowSorting: true },
                                            { id: "invited_user", name: "Invited User", renderCellValue: (invite) => invite.invited_user?.display_name ?? invite.invited_user?.user_name },
                                            { id: "creation_timestamp", name: "Created At", renderCellValue: (invite) => new Date(invite.creation_timestamp).toLocaleString(), allowSorting: true },
                                            { id: "expiration_timestamp", name: "Expires At", renderCellValue: (invite) => invite.expiration_timestamp && new Date(invite.expiration_timestamp).toLocaleString(), allowSorting: true },
                                            { id: "last_used_timestamp", name: "Last Used", renderCellValue: (invite) => invite.last_used_timestamp && new Date(invite.last_used_timestamp).toLocaleString(), allowSorting: true },
                                            { id: "max_uses", name: "Max Uses", renderCellValue: (invite) => invite.max_uses },
                                            { id: "uses_count", name: "Uses Count", renderCellValue: (invite) => invite.uses_count },
                                            { id: "revoked", name: "Revoked", renderCellValue: (invite) => invite.revoked ? "Yes" : "No" },
                                            { id: "link", name: "", renderCellValue: (invite) => invite.active && <IconButton
                                                    size="small"
                                                    sx={{ width: "fit-content", height: "fit-content" }}
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(urlJoin(getSiteBaseURI(), "invite", invite.code));
                                                        enqueueSnackbar({
                                                            message: "Invite code copied to clipboard",
                                                            variant: "success"
                                                        });
                                                    }}
                                                >
                                                    <ContentCopyIcon fontSize="small" />
                                                </IconButton>}
                                        ]}
                                        loadDataFn={async (page, rowsPerPage, orderBy: string | undefined, orderDirection: Direction | undefined) => {
                                            let config = await app.getAuthorization(location, navigate);
                                            let response = await http.get<GetUserGroupInvitesResponse>(`get-user-group-invites/${group!!.pk}?page=${page}&limit=${rowsPerPage}&active_only=${activeInvitesOnly}&ordering=${orderDirection === "desc" ? "-" : ""}${orderBy ? orderBy : "-creation_timestamp"}`, config);

                                            return {
                                                totalCount: response.data.total_count,
                                                data: response.data.invites
                                            };
                                        }}
                                        rowActions={[
                                            {
                                                label: "Revoke Invite",
                                                exec: (invite) => app.openModal(
                                                    "Confirm",
                                                    (modal) => <ActionModal
                                                        modalContent={modal}
                                                        text={`Revoke Invite ${invite.code}? This invite will no longer be usable and cannot be recovered.`}
                                                        actions={[
                                                            {
                                                                name: "Ok",
                                                                fn: async () => {
                                                                    const loadingModal = app.openLoadingModal();
                                                                    try {
                                                                        let config = await app.getAuthorization(location, navigate);
                                                                        let response = await http.post<RevokeUserGroupInviteResponse>(`/revoke-user-group-invite/${invite.code}`, undefined, config);

                                                                        enqueueSnackbar({
                                                                            message: `Invite ${invite.code} has been revoked.`,
                                                                            variant: "success"
                                                                        });

                                                                        return response.data;
                                                                    } finally {
                                                                        loadingModal.close();
                                                                    }
                                                                }
                                                            }
                                                        ]}
                                                    />,
                                                    (result: RevokeUserGroupInviteResponse) => {
                                                        if (result && result.updated) {
                                                            inviteTableRef.current?.reload();
                                                        }
                                                    }
                                                ),
                                                color: "error",
                                                icon: <RemoveCircleOutlineIcon />
                                            }
                                        ]}
                                    />
                                    <FormControlLabel control={<Checkbox checked={activeInvitesOnly} onChange={(e) => setActiveInvitesOnly(e.currentTarget.checked)} />} label={"Active Only"} />
                                </TabPanel>
                                <TabPanel value={activeTab} index={4}>
                                    <PaginatedTable<UserGroupAuditLogInnerJoined>
                                        columns={[
                                            { id: "user", name: "User", renderCellValue: (log) => log.user.display_name ?? log.user.user_name },
                                            { id: "action", name: "Action", renderCellValue: (log) => log.action },
                                            { id: "target_user", name: "Target User", renderCellValue: (log) => log.target_user?.display_name ?? log.target_user?.user_name },
                                            { id: "invite_code", name: "Invite Code", renderCellValue: (log) => log.invite_code },
                                            {
                                                id: "reason",
                                                name: "Reason",
                                                renderCellValue: (log) => log.reason && (
                                                    <div style={{display: "flex", alignItems: "center", maxWidth: 400}}>
                                                        <Typography
                                                            variant="body2"
                                                            noWrap
                                                            sx={{
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                                whiteSpace: "nowrap",
                                                                maxWidth: "100%",
                                                                mr: 1,
                                                            }}
                                                        >
                                                                <span data-tip={log.reason}>
                                                                    {log.reason.length > 140 ? log.reason.slice(0, 137) + "..." : log.reason || ""}
                                                                </span>
                                                            <ReactTooltip effect="solid" place="top"/>
                                                        </Typography>
                                                        <IconButton
                                                            size="small"
                                                            sx={{ml: 1}}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                app.openModal(
                                                                    "Reason",
                                                                    <Typography variant="body2"
                                                                                sx={{whiteSpace: "pre-wrap"}}>
                                                                        <ReadOnlyTextField value={log.reason} multiline fullWidth rows={3} sx={{ minWidth: "350px" }} />
                                                                    </Typography>
                                                                );
                                                            }}
                                                        >
                                                            <VisibilityIcon fontSize="small"/>
                                                        </IconButton>
                                                    </div>)
                                            },
                                            { id: "timestamp", name: "Timestamp", renderCellValue: (log) => new Date(log.creation_timestamp).toLocaleString() }
                                        ]}
                                        loadDataFn={async (page, rowsPerPage) => {
                                            let config = await app.getAuthorization(location, navigate);
                                            let response = await http.get<GetUserGroupAuditLogsResponse>(`/get-user-group-audit-logs/${group!!.pk}?page=${page}&limit=${rowsPerPage}`, config);

                                            return {
                                                totalCount: response.data.total_count,
                                                data: response.data.audit_logs,
                                            };
                                        }}
                                    />
                                </TabPanel>
                                <TabPanel value={activeTab} index={5}>
                                    <PaginatedTable<UserGroupMembershipInnerJoined>
                                        ref={banTableRef}
                                        columns={[
                                            { id: "user", name: "User", renderCellValue: (member) => member.user.display_name ?? member.user.user_name, allowSorting: true },
                                            { id: "creation_timestamp", name: "Joined At", renderCellValue: (member) => new Date(member.creation_timestamp).toLocaleString(), allowSorting: true },
                                            { id: "granted_by", name: "Granted By", renderCellValue: (member) => member.granted_by.display_name ?? member.granted_by.user_name, allowSorting: true },
                                            { id: "administrator", name: "Admin", renderCellValue: (member) => member.administrator ? "Yes" : "No" },
                                        ]}
                                        loadDataFn={async (page, rowsPerPage, orderBy: string | undefined, orderDirection: Direction | undefined) => {
                                            let config = await app.getAuthorization(location, navigate);
                                            let response = await http.get<GetUserGroupMembersResponse>(`/get-user-group-members/${group!!.pk}?page=${page}&limit=${rowsPerPage}&revoked_only=true&ordering=${orderDirection === "desc" ? "-" : ""}${orderBy ? orderBy : "-creation_timestamp"}`, config);

                                            return {
                                                totalCount: response.data.total_count,
                                                data: response.data.members
                                            };
                                        }}
                                        rowActions={[
                                            memberUpdateAction(
                                                banTableRef,
                                                "Unban Member",
                                                (member) => `Unban user ${member.user.display_name ?? member.user.user_name}? After unbanning, the user will be able to join / be invited again.`,
                                                () => ({ action: "unban" }),
                                                (member) => `Unbanned user ${member.user.display_name ?? member.user.user_name} from group`,
                                                () => !(group.owner.pk === app.getUser()?.pk || membership?.administrator),
                                                <UndoIcon />,
                                            ),
                                        ]}
                                    />
                                </TabPanel>
                            </div>
                            : <div><FontAwesomeIcon icon={solid("circle-notch")} spin size="6x" /></div>}
                    </Paper>
                </div> }
                {group && posts.length > 0 && <PreviewGrid title="Posts" items={posts} searchLink={`/posts?query=${encodeURIComponent(`.shared_with_group(${group.pk})`)}`} onItemClickPath={(item) => `/post/${item.pk}`} />}
                {group && collections.length > 0 && <PreviewGrid title="Collections" items={collections} searchLink={`/collections?query=${encodeURIComponent(`.shared_with_group(${group.pk})`)}`} onItemClickPath={(item) => `/collection/${item.pk}`} />}
            </div>
            <Popper
                open={Boolean(inviteMenuAnchor)}
                anchorEl={inviteMenuAnchor}
                role={undefined}
                placement="bottom-start"
                transition
                sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}
            >
                {({ TransitionProps, placement }) => (
                    <Grow
                        {...TransitionProps}
                        style={{
                            transformOrigin:
                                placement === "bottom-start" ? "left top" : "left bottom",
                        }}
                    >
                        <Paper>
                            <ClickAwayListener onClickAway={() => setInviteMenuAnchor(null)}>
                                <MenuList
                                    autoFocusItem={Boolean(inviteMenuAnchor)}
                                    id="nav-menu"
                                    sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}
                                    onKeyDown={(event) => {
                                        if (event.key === "Tab") {
                                            event.preventDefault();
                                            setInviteMenuAnchor(null);
                                        } else if (event.key === "Escape") {
                                            setInviteMenuAnchor(null);
                                        }
                                    }}
                                >
                                    <MenuItem onClick={() => {
                                        setInviteMenuAnchor(null);
                                        app.openModal("Invite User", (modal) => <UserInviteDialogue group={group!} modal={modal} app={app} />);
                                    }}>
                                        <ListItemIcon><PersonAddIcon /></ListItemIcon>
                                        <ListItemText>Invite User</ListItemText>
                                    </MenuItem>
                                    <MenuItem onClick={() => {
                                        setInviteMenuAnchor(null);
                                        app.openModal("Create Invite Link", (modal) => <CreateInviteLinkDialogue group={group!} modal={modal} app={app} />);
                                    }}>
                                        <ListItemIcon><AddLinkIcon /></ListItemIcon>
                                        <ListItemText>Create invite link</ListItemText>
                                    </MenuItem>
                                </MenuList>
                            </ClickAwayListener>
                        </Paper>
                    </Grow>
                )}
            </Popper>
        </div>
    );
}

function CreateInviteLinkDialogue({group, modal, app}: { group: UserGroupDetailed, modal?: ModalContent, app: App }) {
    const location = useLocation();
    const navigate = useNavigate();

    const [expirationDays, setExpirationDays] = useState<number | undefined>(7);
    const [maxUses, setMaxUses] = useState<number | undefined>();

    const [isLoading, setIsLoading] = useState(false);
    const [expirationInvalid, setExpirationInvalid] = useState(false);
    const [maxUsesInvalid, setMaxUsesInvalid] = useState(false);

    return (
        <div className="modal-form">
            <Paper elevation={2} className="fieldset-paper">
                <div className="form-paper-content">
                    <TextField
                        label="Expiration (days)"
                        variant="outlined"
                        value={expirationDays}
                        onChange={(e) => {
                            setExpirationInvalid(false);
                            let value = e.target.value;
                            if (value) {
                                const intValue = parseInt(value);
                                setExpirationDays(intValue);
                                if (intValue < 1 || intValue > 3600) {
                                    setExpirationInvalid(true);
                                } else {
                                    setExpirationInvalid(false);
                                }
                            } else {
                                setExpirationDays(undefined);
                            }
                        }}
                        type="number"
                        inputProps={{ min: 1, max: 3600 }}
                        error={expirationInvalid}
                        helperText={expirationInvalid && "Expiration must be between 1 and 3600 days"}
                    />
                    <TextField
                        label="Max Uses"
                        variant="outlined"
                        value={maxUses}
                        onChange={(e) => {
                            setMaxUsesInvalid(false);
                            let value = e.target.value;
                            if (value) {
                                const intValue = parseInt(value);
                                setMaxUses(intValue);
                                if (intValue < 1) {
                                    setMaxUsesInvalid(true);
                                } else {
                                    setMaxUsesInvalid(false);
                                }
                            } else {
                                setMaxUses(undefined);
                            }
                        }}
                        type="number"
                        inputProps={{ min: 1 }}
                        error={maxUsesInvalid}
                        helperText={maxUsesInvalid && "Max uses must be greater than 0"}
                    />
                </div>
            </Paper>
            <div className="modal-form-submit-btn">
                <Button color="secondary" disabled={isLoading || expirationInvalid || maxUsesInvalid} startIcon={isLoading && <FontAwesomeIcon icon={solid("circle-notch")} spin />} onClick={async () => {
                    setIsLoading(true);
                    try {
                        const config = await app.getAuthorization(location, navigate);
                        const res = await http.post<UserGroupInviteDetailed>(`/create-user-group-invite/${group.pk}`, {
                            expiration_days: expirationDays,
                            max_uses: maxUses,
                        }, config);

                        const groupInvite = res.data;

                        modal?.close();

                        app.openModal("Success", <div className="modal-form">
                            <Paper elevation={2} className="fieldset-paper">
                                <div className="form-paper-content">
                                    <Typography variant="body1">Invite code has been created.</Typography>
                                    <TextField
                                        label="Invite Code"
                                        value={urlJoin(getSiteBaseURI(), "invite", groupInvite.code)}
                                        fullWidth
                                        InputProps={{
                                            readOnly: true,
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(urlJoin(getSiteBaseURI(), "invite", groupInvite.code));
                                                            enqueueSnackbar({
                                                                message: "Invite code copied to clipboard",
                                                                variant: "success"
                                                            });
                                                        }}
                                                        edge="end"
                                                    >
                                                        <ContentCopyIcon />
                                                    </IconButton>
                                                </InputAdornment>
                                            )
                                        }}
                                    />
                                </div>
                            </Paper>
                        </div>);
                    } finally {
                        setIsLoading(false);
                    }
                }}>Create Invite Link</Button>
            </div>
        </div>
    );
}

function UserInviteDialogue({group, modal, app}: { group: UserGroupDetailed, modal?: ModalContent, app: App }) {
    const location = useLocation();
    const navigate = useNavigate();

    const [userName, setUserName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isUserInvalid, setIsUserInvalid] = useState(false);

    return (
        <div className="modal-form">
            <Paper elevation={2} className="fieldset-paper">
                <div className="form-paper-content">
                    <TextField
                        label="User Name"
                        variant="outlined"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        inputProps={{ maxLength: 25 }}
                        error={isUserInvalid}
                        helperText={isUserInvalid && "User Not Found"}
                    />
                    <span className="footnote">Enter name of user to invite, meaning the unique user name, not the display name.</span>
                </div>
            </Paper>
            <div className="modal-form-submit-btn">
                <Button color="secondary" disabled={!userName || isLoading} startIcon={isLoading && <FontAwesomeIcon icon={solid("circle-notch")} spin />} onClick={async () => {
                    setIsLoading(true);
                    setIsUserInvalid(false);
                    try {
                        let user;
                        try {
                            const res = await http.get<UserPublic>(`/get-user-public-name/${encodeURIComponent(userName)}`);
                            user = res.data;
                        } catch (e) {
                            console.error("Failed to load user data", e);
                            setIsUserInvalid(true);
                            return;
                        }

                        const config = await app.getAuthorization(location, navigate);
                        const res = await http.post<UserGroupInviteDetailed>(`/create-user-group-invite/${group.pk}`, {
                            invited_user_pk: user.pk,
                            expiration_days: 7,
                            max_uses: 1
                        }, config);

                        const groupInvite = res.data;

                        modal?.close();

                        app.openModal("Success", <div className="modal-form">
                            <Paper elevation={2} className="fieldset-paper">
                                <div className="form-paper-content">
                                    <Typography variant="body1">User {user.user_name} has been invited to group {group.name}. They can find the invite on their groups page. Alternatively you can send them the following invite link (only valid for that user).</Typography>
                                    <TextField
                                        label="Invite Code"
                                        value={urlJoin(getSiteBaseURI(), "invite", groupInvite.code)}
                                        fullWidth
                                        InputProps={{
                                            readOnly: true,
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(urlJoin(getSiteBaseURI(), "invite", groupInvite.code));
                                                            enqueueSnackbar({
                                                                message: "Invite code copied to clipboard",
                                                                variant: "success"
                                                            });
                                                        }}
                                                        edge="end"
                                                    >
                                                        <ContentCopyIcon />
                                                    </IconButton>
                                                </InputAdornment>
                                            )
                                        }}
                                    />
                                </div>
                            </Paper>
                        </div>);
                    } catch (e: any) {
                        console.error("Failed to create invite", e);
                        if (e?.response?.data?.error_code === 400022) {
                            app.openModal("Error", <div>User already a member</div>);
                        } else if (e?.response?.data?.error_code === 403006) {
                            app.openModal("Error", <div>User is banned from group</div>);
                        } else {
                            app.openModal("Error", <div>An unexpected error occurred</div>);
                        }
                    } finally {
                        setIsLoading(false);
                    }
                }}>Invite</Button>
            </div>
        </div>
    );
}
