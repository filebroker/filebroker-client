import { useEffect, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import EditIcon from "@mui/icons-material/Edit";
import axios from "axios";

import App, { ModalContent } from "../../App";
import http from "../../http-common";
import { StoredConstriction, StoredQueryScope } from "../../QueryState";
import { QueryAutocompleteTextField } from "./QueryInput";

interface ManageConstrictionsModalProps {
    app: App;
    scope: StoredQueryScope;
    initialConstrictions: StoredConstriction[];
    onSaved: (saved: StoredConstriction, previous: StoredConstriction | null) => void;
    onDeleted: (deleted: StoredConstriction) => void;
}

function sortConstrictions(items: StoredConstriction[]): StoredConstriction[] {
    return [...items].sort((a, b) => a.name.localeCompare(b.name) || a.pk - b.pk);
}

function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const compilationErrors = error.response?.data?.compilation_errors;

        if (compilationErrors?.length) {
            return `Failed to compile constriction: ${compilationErrors[0].msg}`;
        }

        return error.response?.data?.message ?? error.message;
    }

    return error instanceof Error ? error.message : "An unexpected error occurred";
}

export function ManageConstrictionsModal({
    app,
    scope,
    initialConstrictions,
    onSaved,
    onDeleted,
}: ManageConstrictionsModalProps) {
    const user = app.getUser();
    const isAdmin = user?.is_admin ?? false;

    const [constrictions, setConstrictions] = useState(sortConstrictions(initialConstrictions));

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        const load = async () => {
            setLoading(true);

            try {
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
                    setError(getErrorMessage(e));
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
    }, [app, scope]);

    const personalConstrictions = constrictions.filter((item) => item.fk_user === user?.pk);
    const globalConstrictions = isAdmin ? constrictions.filter((item) => item.fk_user === null) : [];

    const canManage = (item: StoredConstriction) =>
        user !== null && (item.fk_user === user.pk || (item.fk_user === null && isAdmin));

    const openEditor = (constriction?: StoredConstriction) => {
        app.openModal(constriction ? "Edit constriction" : "New constriction", (actionModal) => (
            <ConstrictionEditorModal
                app={app}
                modal={actionModal}
                scope={scope}
                constriction={constriction}
                onSaved={(saved, previous) => {
                    setConstrictions((current) =>
                        sortConstrictions([...current.filter((item) => item.pk !== saved.pk), saved])
                    );

                    onSaved(saved, previous);
                }}
            />
        ));
    };

    const openDelete = (constriction: StoredConstriction) => {
        app.openModal("Delete constriction", (actionModal) => (
            <DeleteConstrictionModal
                app={app}
                modal={actionModal}
                constriction={constriction}
                onDeleted={(deleted) => {
                    setConstrictions((current) => current.filter((item) => item.pk !== deleted.pk));

                    onDeleted(deleted);
                }}
            />
        ));
    };

    const renderList = (items: StoredConstriction[]) => {
        if (items.length === 0) {
            return (
                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                    No constrictions
                </Typography>
            );
        }

        return (
            <List dense disablePadding>
                {items.map((item) => (
                    <ListItem
                        key={item.pk}
                        divider
                        sx={{
                            px: 0,
                            pr: canManage(item) ? 10 : 0,
                        }}
                        secondaryAction={
                            canManage(item) ? (
                                <Stack direction="row" spacing={0.5}>
                                    <Tooltip title="Edit">
                                        <IconButton
                                            size="small"
                                            aria-label={`Edit ${item.name}`}
                                            onClick={() => openEditor(item)}
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>

                                    <Tooltip title="Delete">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            aria-label={`Delete ${item.name}`}
                                            onClick={() => openDelete(item)}
                                        >
                                            <DeleteOutlinedIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>
                            ) : undefined
                        }
                    >
                        <ListItemText
                            primary={item.name}
                            secondary={item.condition}
                            slotProps={{
                                secondary: {
                                    sx: {
                                        whiteSpace: "pre-wrap",
                                        overflowWrap: "anywhere",
                                    },
                                },
                            }}
                        />
                    </ListItem>
                ))}
            </List>
        );
    };

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                width: "min(600px, 80vw)",
                maxWidth: "100%",
            }}
        >
            {error && <Alert severity="error">{error}</Alert>}

            <Stack spacing={2}>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                    }}
                >
                    <Typography variant="subtitle1">Personal ({personalConstrictions.length}/10)</Typography>

                    <Button
                        size="small"
                        startIcon={<AddIcon />}
                        disabled={loading || (!isAdmin && personalConstrictions.length >= 10)}
                        onClick={() => openEditor()}
                    >
                        New constriction
                    </Button>
                </Box>

                {renderList(personalConstrictions)}

                {isAdmin && (
                    <>
                        <Typography variant="subtitle1">Global</Typography>

                        {renderList(globalConstrictions)}
                    </>
                )}
            </Stack>
        </Box>
    );
}

interface ConstrictionEditorModalProps {
    app: App;
    modal: ModalContent;
    scope: StoredQueryScope;
    constriction?: StoredConstriction;
    onSaved: (saved: StoredConstriction, previous: StoredConstriction | null) => void;
}

export function ConstrictionEditorModal({ app, modal, scope, constriction, onSaved }: ConstrictionEditorModalProps) {
    const [name, setName] = useState(constriction?.name ?? "");
    const [condition, setCondition] = useState(constriction?.condition ?? "");
    const [isGlobal, setIsGlobal] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const save = async () => {
        if (busy || !name.trim() || !condition.trim()) {
            return;
        }

        setBusy(true);
        setError("");

        try {
            const config = await app.getAuthorizationWithLoginModal();

            if (!config) {
                return;
            }

            let saved: StoredConstriction;

            if (constriction) {
                const response = await http.patch<StoredConstriction>(
                    `/edit-stored-constriction/${constriction.pk}`,
                    {
                        name: name.trim(),
                        condition: condition.trim(),
                    },
                    config
                );

                saved = response.data;
            } else {
                const response = await http.post<StoredConstriction>(
                    "/create-stored-constriction",
                    {
                        scope,
                        name: name.trim(),
                        condition: condition.trim(),
                        is_global: isGlobal,
                    },
                    config
                );

                saved = response.data;
            }

            onSaved(saved, constriction ?? null);
            modal.close();
        } catch (e) {
            setError(getErrorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Stack spacing={2} sx={{ width: "min(520px, 80vw)" }}>
            <TextField
                autoFocus
                fullWidth
                size="small"
                label="Name"
                value={name}
                disabled={busy}
                onChange={(e) => setName(e.target.value)}
                slotProps={{
                    htmlInput: { maxLength: 255 },
                }}
            />

            <QueryAutocompleteTextField
                label="FQL condition"
                queryString={condition}
                setQueryString={setCondition}
                scope={scope}
                disabled={busy}
            />

            {!constriction && app.getUser()?.is_admin && (
                <FormControlLabel
                    label="Global constriction"
                    control={
                        <Checkbox checked={isGlobal} disabled={busy} onChange={(e) => setIsGlobal(e.target.checked)} />
                    }
                />
            )}

            <Typography variant="caption" color="text.secondary">
                The FQL condition must be a valid boolean expression. It is combined with the search query.
            </Typography>

            {error && <Alert severity="error">{error}</Alert>}

            <Box
                sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 1,
                }}
            >
                <Button disabled={busy} onClick={() => modal.close()}>
                    Cancel
                </Button>

                <Button
                    color="secondary"
                    disabled={busy || !name.trim() || !condition.trim()}
                    loading={busy}
                    onClick={() => void save()}
                >
                    {constriction ? "Save" : "Create"}
                </Button>
            </Box>
        </Stack>
    );
}

interface DeleteConstrictionModalProps {
    app: App;
    modal: ModalContent;
    constriction: StoredConstriction;
    onDeleted: (deleted: StoredConstriction) => void;
}

export function DeleteConstrictionModal({ app, modal, constriction, onDeleted }: DeleteConstrictionModalProps) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const deleteConstriction = async () => {
        if (busy) {
            return;
        }

        setBusy(true);
        setError("");

        try {
            const config = await app.getAuthorizationWithLoginModal();

            if (!config) {
                return;
            }

            await http.delete(`/delete-stored-constriction/${constriction.pk}`, config);

            onDeleted(constriction);
            modal.close();
        } catch (e) {
            setError(getErrorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Stack spacing={2} sx={{ width: "min(400px, 80vw)" }}>
            <Typography>
                Delete constriction <strong>{constriction.name}</strong>?
            </Typography>

            <Typography variant="body2" color="text.secondary">
                Existing URLs will retain their embedded FQL condition. Only the stored constriction is deleted.
            </Typography>

            {error && <Alert severity="error">{error}</Alert>}

            <Box
                sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 1,
                }}
            >
                <Button disabled={busy} onClick={() => modal.close()}>
                    Cancel
                </Button>

                <Button color="error" disabled={busy} loading={busy} onClick={() => void deleteConstriction()}>
                    Delete
                </Button>
            </Box>
        </Stack>
    );
}
