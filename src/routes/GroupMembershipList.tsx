import {UserGroupInvite, UserGroupInviteDetailed, UserGroupMembershipDetailed} from "../Model";
import {Button, IconButton, Paper, Tooltip, Typography} from "@mui/material";
import {Direction, PaginatedTable, PaginatedTableData, PaginatedTableHandle} from "../components/PaginatedTable";
import http, {getSiteBaseURI} from "../http-common";
import {Link, useLocation, useNavigate} from "react-router-dom";
import App from "../App";
import {FontAwesomeSvgIcon} from "../components/FontAwesomeSvgIcon";
import {solid} from "@fortawesome/fontawesome-svg-core/import.macro";
import React, {useRef, useState} from "react";
import {GroupCreator} from "./GroupDetailPage";
import {QueryAutocompleteSearchBox} from "../components/QueryInput";
import {performSearchQuery, UserGroupQueryObject} from "../Search";
import SearchIcon from '@mui/icons-material/Search';
import urlJoin from "url-join";
import {enqueueSnackbar} from "notistack";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import DoneIcon from '@mui/icons-material/Done';
import {ActionModal} from "../components/ActionModal";

export interface GetCurrentUserGroupMembershipsResponse {
    total_count: number,
    memberships: UserGroupMembershipDetailed[],
}

export interface GetCurrentUserGroupInvitesResponse {
    total_count: number,
    invites: UserGroupInviteDetailed[],
}

export interface RevokeUserGroupInviteResponse {
    prev: UserGroupInvite,
    updated: UserGroupInvite | null | undefined,
}

export function GroupSearch({app}: { app: App }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const tableRef = useRef<PaginatedTableHandle>(null);
    const [queryLoading, setQueryLoading] = useState(false);

    const executeSearch = async (page: number, rowsPerPage: number): Promise<PaginatedTableData<UserGroupQueryObject>> => {
        const search = new URLSearchParams();
        search.set("query", searchQuery);
        search.set("page", page.toString());
        search.set("limit", rowsPerPage.toString());

        setQueryLoading(true);
        try {
            const response = await performSearchQuery("/user_group?" + search, app, location, navigate);
            return {
                totalCount: response.full_count || 10000,
                data: response.user_groups || []
            };
        } catch (e) {
            console.error("Failed to search groups", e);
            throw e;
        } finally {
            setQueryLoading(false);
        }
    };

    return (
        <div id="GroupSearch">
            <div className="form-paper-content">
                <QueryAutocompleteSearchBox queryString={searchQuery} setQueryString={setSearchQuery} scope="user_group" onSubmit={() => {
                    tableRef.current?.setPage(0);
                    tableRef.current?.reload();
                }} isLoading={queryLoading} />
                <PaginatedTable<UserGroupQueryObject>
                    ref={tableRef}
                    columns={[
                        { id: "name", name: "Name", renderCellValue: (group) => group.name },
                        { id: "owner", name: "Owner", renderCellValue: (group) => group.owner.display_name ?? group.owner.user_name },
                        { id: "creation_timestamp", name: "Created At", renderCellValue: (group) => new Date(group.creation_timestamp).toLocaleString() },
                    ]}
                    loadDataFn={executeSearch}
                    dataRowPropsFn={(userGroup) => ({
                        key: userGroup.pk,
                        component: Link,
                        to: `/group/${userGroup.pk}`,
                        hover: true,
                        sx: {
                            textDecoration: 'none',
                            color: 'inherit',
                            cursor: 'pointer',
                            '&:visited': { color: 'inherit' },
                            '& td': {
                                textDecoration: 'none',
                                color: 'inherit',
                            },
                        }
                    })}
                />
            </div>
        </div>
    );
}

export function GroupMembershipList({app}: { app: App }) {
    const location = useLocation();
    const navigate = useNavigate();
    const tableRef = useRef<PaginatedTableHandle>(null);
    const inviteTableRef = useRef<PaginatedTableHandle>(null);

    return (
        <div id="GroupMembershipList" className="full-page-component">
            <div className="full-page-content-wrapper">
                <Paper elevation={2} className="form-paper">
                    <div className="form-paper-content">
                        <h2>Groups</h2>
                        <PaginatedTable<UserGroupMembershipDetailed>
                            ref={tableRef}
                            columns={[
                                { id: "group.name", name: "Name", renderCellValue: (groupMembership) => groupMembership.group.name, allowSorting: true },
                                { id: "group.owner", name: "Owner", renderCellValue: (groupMembership) => groupMembership.group.owner.display_name ?? groupMembership.group.owner.user_name },
                                { id: "granted_by", name: "Added By", renderCellValue: (groupMembership) => groupMembership.granted_by.display_name ?? groupMembership.granted_by.user_name },
                                { id: "creation_timestamp", name: "Joined At", renderCellValue: (groupMembership) => new Date(groupMembership.creation_timestamp).toLocaleString(), allowSorting: true },
                            ]}
                            loadDataFn={async (page, rowsPerPage, orderBy: string | undefined, orderDirection: Direction | undefined) => {
                                let config = await app.getAuthorization(location, navigate);
                                let response =
                                    await http.get<GetCurrentUserGroupMembershipsResponse>(`/get-current-user-group-memberships?page=${page}&limit=${rowsPerPage}&ordering=${orderDirection === "desc" ? "-" : ""}${orderBy ? orderBy : ""}`, config);

                                return {
                                    totalCount: response.data.total_count,
                                    data: response.data.memberships
                                };
                            }}
                            dataRowPropsFn={(groupMembership) => ({
                                key: groupMembership.group.pk,
                                component: Link,
                                to: `/group/${groupMembership.group.pk}`,
                                hover: true,
                                sx: {
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    cursor: 'pointer',
                                    '&:visited': { color: 'inherit' },
                                    '& td': {
                                        textDecoration: 'none',
                                        color: 'inherit',
                                    },
                                }
                            })}
                        />
                        <div className="form-paper-button-row">
                            <Button
                                startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("add")} />}
                                onClick={() => app.openModal(
                                    "Create Group",
                                    (modal) => <GroupCreator app={app} modal={modal} />,
                                    (result) => {
                                        if (result) {
                                            tableRef.current?.reload();
                                        }
                                    }
                                )}
                            >Create Group</Button>
                            <Button startIcon={<SearchIcon />} onClick={() => app.openModal("Search Groups", <GroupSearch app={app} />)}>Search Groups</Button>
                        </div>
                    </div>
                </Paper>
                <Paper elevation={2} className="form-paper" sx={{ minHeight: "fit-content" }}>
                    <Typography variant="h6" component="h2">Open Invites</Typography>
                    <PaginatedTable<UserGroupInviteDetailed>
                        ref={inviteTableRef}
                        columns={[
                            { id: "group.name", name: "Group", renderCellValue: (invite) => invite.user_group.name, allowSorting: true },
                            { id: "code", name: "Code", renderCellValue: (invite) => invite.code },
                            { id: "create_user", name: "Create User", renderCellValue: (invite) => invite.create_user.display_name ?? invite.create_user.user_name },
                            { id: "creation_timestamp", name: "Created At", renderCellValue: (invite) => new Date(invite.creation_timestamp).toLocaleString(), allowSorting: true },
                            { id: "expiration_timestamp", name: "Expires At", renderCellValue: (invite) => invite.expiration_timestamp && new Date(invite.expiration_timestamp).toLocaleString(), allowSorting: true },
                            { id: "copy_link", name: "", renderCellValue: (invite) => <Tooltip title="Copy invite link to clipboard">
                                    <IconButton
                                        size="small"
                                        sx={{ width: "fit-content", height: "fit-content" }}
                                        onClick={() => {
                                            navigator.clipboard.writeText(urlJoin(getSiteBaseURI(), "invite", invite.code)).then(() => {
                                                enqueueSnackbar({
                                                    message: "Invite code copied to clipboard",
                                                    variant: "success"
                                                });
                                            });
                                        }}
                                    >
                                        <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip> },
                            { id: "accept_invite", name: "", renderCellValue: (invite) => <Tooltip title="Accept invite and join group">
                                    <IconButton
                                        size="small"
                                        sx={{ width: "fit-content", height: "fit-content" }}
                                        component={Link}
                                        to={`/invite/${invite.code}`}
                                    >
                                        <DoneIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip> },
                            { id: "reject_invite", name: "", renderCellValue: (invite) => <Tooltip title="Reject invite">
                                    <IconButton
                                        size="small"
                                        sx={{ width: "fit-content", height: "fit-content" }}
                                        onClick={() => app.openModal(
                                            "Delete Invite",
                                            (modal) => <ActionModal
                                                modalContent={modal}
                                                text={`Delete invite for group ${invite.user_group.name}`}
                                                actions={[
                                                    {
                                                        name: "Ok",
                                                        fn: async () => {
                                                            const loadingModal = app.openLoadingModal();
                                                            try {
                                                                let config = await app.getAuthorization(location, navigate);
                                                                let response = await http.post<RevokeUserGroupInviteResponse>(`/revoke-user-group-invite/${invite.code}`, undefined, config);
                                                                enqueueSnackbar({
                                                                    message: "Invite deleted",
                                                                    variant: "success"
                                                                });
                                                                return response.data;
                                                            } catch (e) {
                                                                console.error("Failed to delete invite", e);
                                                                enqueueSnackbar({
                                                                    message: "Failed to delete invite",
                                                                    variant: "error"
                                                                });
                                                                throw e;
                                                            } finally {
                                                                loadingModal.close();
                                                            }
                                                        }
                                                    }
                                                ]}
                                            />,
                                            (result) => {
                                                if (result) {
                                                    inviteTableRef.current?.reload();
                                                }
                                            }
                                        )}
                                    >
                                        <RemoveCircleOutlineIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip> }
                        ]}
                        loadDataFn={async (page, rowsPerPage, orderBy: string | undefined, orderDirection: Direction | undefined) => {
                            let config = await app.getAuthorization(location, navigate);
                            let response = await http.get<GetCurrentUserGroupInvitesResponse>(`get-current-user-group-invites?page=${page}&limit=${rowsPerPage}&ordering=${orderDirection === "desc" ? "-" : ""}${orderBy ? orderBy : "-creation_timestamp"}`, config);

                            return {
                                totalCount: response.data.total_count,
                                data: response.data.invites
                            };
                        }}
                    />
                </Paper>
            </div>
        </div>
    );
}
