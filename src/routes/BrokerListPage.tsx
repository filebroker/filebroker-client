import App from "../App";
import {useLocation, useNavigate} from "react-router-dom";
import React, {useRef} from "react";
import {Direction, PaginatedTable, PaginatedTableHandle} from "../components/PaginatedTable";
import {Button, Paper, Typography} from "@mui/material";
import {BrokerDetailed} from "../Model";
import {formatBytes} from "../Util";
import http from "../http-common";
import StorageIcon from '@mui/icons-material/Storage';
import {FontAwesomeSvgIcon} from "../components/FontAwesomeSvgIcon";
import {solid} from "@fortawesome/fontawesome-svg-core/import.macro";
import CreateBrokerDialogue from "../components/CreateBrokerDialogue";

export interface GetBrokersResponse {
    total_count: number,
    brokers: BrokerDetailed[],
}

export default function BrokerListPage({app}: { app: App }) {
    const location = useLocation();
    const navigate = useNavigate();
    const tableRef = useRef<PaginatedTableHandle>(null);

    return (
        <div id="GroupMembershipList" className="full-page-component">
            <div className="full-page-content-wrapper">
                <Paper elevation={2} className="form-paper">
                    <div className="form-paper-content">
                        <Typography variant="h3" component="h2"><StorageIcon fontSize={"inherit"} /></Typography>
                        <h2>Brokers</h2>
                        <PaginatedTable<BrokerDetailed>
                            ref={tableRef}
                            columns={[
                                { id: "name", name: "Name", renderCellValue: (broker) => broker.name, allowSorting: true },
                                { id: "used_bytes", name: "Used (By You)", renderCellValue: (broker) => formatBytes(broker.used_bytes) },
                                { id: "quota_bytes", name: "Quota Per User", renderCellValue: (broker) => broker.quota_bytes ? formatBytes(broker.quota_bytes) : "∞" },
                                { id: "owner", name: "Owner", renderCellValue: (broker) => broker.owner.display_name ?? broker.owner.user_name, allowSorting: true },
                                { id: "creation_timestamp", name: "Created At", renderCellValue: (broker) => new Date(broker.creation_timestamp).toLocaleString(), allowSorting: true },
                            ]}
                            loadDataFn={async (page, rowsPerPage, orderBy: string | undefined, orderDirection: Direction | undefined) => {
                                let config = await app.getAuthorization(location, navigate);
                                let response = await http.get<GetBrokersResponse>(`/get-brokers?page=${page}&limit=${rowsPerPage}&ordering=${orderDirection === "desc" ? "-" : ""}${orderBy ? orderBy : ""}`, config);

                                return {
                                    totalCount: response.data.total_count,
                                    data: response.data.brokers
                                };
                            }}
                        />
                        <div className="form-paper-button-row">
                            <Button
                                startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("add")} />}
                                onClick={() => app.openModal(
                                    "Create Broker",
                                    createBrokerModal => <CreateBrokerDialogue app={app} modal={createBrokerModal}/>,
                                    (result) => {
                                        if (result) {
                                            tableRef.current?.reload();
                                        }
                                    }
                                )}
                            >Create Broker</Button>
                        </div>
                    </div>
                </Paper>
            </div>
        </div>
    );
}
