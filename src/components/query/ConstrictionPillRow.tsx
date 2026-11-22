import { useEffect, useState } from "react";
import { Box, Chip, IconButton, Tooltip } from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import { useLocation, useNavigate } from "react-router-dom";

import App from "../../App";
import http from "../../http-common";
import {
    StoredConstriction,
    StoredQueryScope,
    resolveSelectedConstriction,
    setSelectedConstriction,
} from "../../QueryState";
import { ManageConstrictionsModal } from "./ManageConstrictionsModals";

interface ConstrictionPillRowProps {
    app: App;
    scope: StoredQueryScope;
}

function sortConstrictions(constrictions: StoredConstriction[]): StoredConstriction[] {
    return [...constrictions].sort(
        (a, b) => Number(a.fk_user !== null) - Number(b.fk_user !== null) || a.name.localeCompare(b.name) || a.pk - b.pk
    );
}

export function ConstrictionPillRow({ app, scope }: ConstrictionPillRowProps) {
    const location = useLocation();
    const navigate = useNavigate();

    const userPk = app.getUser()?.pk;

    const [constrictions, setConstrictions] = useState<StoredConstriction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        setLoading(true);
        setConstrictions([]);

        const load = async () => {
            try {
                // No login prompt for passive loading.
                // Anonymous users receive global constrictions.
                const config = await app.getAuthorizationWithLoginModal(false);

                const response = await http.get<StoredConstriction[]>("/get-stored-constrictions", {
                    ...config,
                    params: { scope },
                });

                if (active) {
                    setConstrictions(sortConstrictions(response.data));
                }
            } catch (e) {
                if (active) {
                    console.error("Failed to load constrictions:", e);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        void load();

        return () => {
            active = false;
        };
    }, [app, scope, userPk]);

    const selected = resolveSelectedConstriction(new URLSearchParams(location.search), constrictions);

    const selectConstriction = (constriction: StoredConstriction | null) => {
        const params = setSelectedConstriction(new URLSearchParams(location.search), constriction);

        navigate({
            pathname: location.pathname,
            search: params.toString(),
        });
    };

    const isSelected = (item: StoredConstriction) => selected.type === "stored" && selected.constriction.pk === item.pk;

    const onSaved = (saved: StoredConstriction, previous: StoredConstriction | null) => {
        setConstrictions((current) => sortConstrictions([...current.filter((item) => item.pk !== saved.pk), saved]));

        // If the edited constriction is active, update the URL to reflect its new name and/or FQL condition.
        if (previous && selected.type === "stored" && selected.constriction.pk === previous.pk) {
            selectConstriction(saved);
        }
    };

    const onDeleted = (deleted: StoredConstriction) => {
        setConstrictions((current) => current.filter((item) => item.pk !== deleted.pk));

        // Preserve the current URL. If the deleted constriction was selected, resolveSelectedConstriction will now represent it as a temporary constriction.
    };

    const openManagement = async () => {
        try {
            // Prompt for login if necessary, without redirecting.
            const config = await app.getAuthorizationWithLoginModal();

            if (!config) {
                return;
            }

            app.openModal(
                "Manage constrictions",
                <ManageConstrictionsModal
                    app={app}
                    scope={scope}
                    initialConstrictions={constrictions}
                    onSaved={onSaved}
                    onDeleted={onDeleted}
                />
            );
        } catch (e) {
            console.error("Failed to open constriction management:", e);
        }
    };

    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                minWidth: 0,
                gap: 1.5,
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    flexWrap: "wrap",
                    flex: 1,
                    minWidth: 0,
                    gap: 0.75,
                }}
            >
                <Chip
                    label="All"
                    clickable
                    color={selected.type === "none" ? "secondary" : "default"}
                    variant={selected.type === "none" ? "filled" : "outlined"}
                    onClick={() => selectConstriction(null)}
                />

                {constrictions.map((item) => {
                    const active = isSelected(item);

                    return (
                        <Tooltip
                            key={item.pk}
                            title={(item.fk_user === null ? "Global" : "Personal") + ": " + item.condition}
                        >
                            <Chip
                                label={item.name}
                                clickable
                                color={active ? "secondary" : "default"}
                                variant={active ? "filled" : "outlined"}
                                onClick={() => selectConstriction(item)}
                            />
                        </Tooltip>
                    );
                })}

                {!loading && selected.type === "temporary" && (
                    <Tooltip title={"Temporary constriction: " + selected.condition}>
                        <Chip
                            icon={<LinkIcon />}
                            label={selected.name}
                            color="secondary"
                            onDelete={() => selectConstriction(null)}
                        />
                    </Tooltip>
                )}
            </Box>

            <Tooltip title="Manage constrictions">
                <IconButton
                    aria-label="Manage constrictions"
                    onClick={() => void openManagement()}
                    sx={{
                        flexShrink: 0,
                    }}
                >
                    <FilterAltIcon />
                </IconButton>
            </Tooltip>
        </Box>
    );
}
