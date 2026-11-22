import { useState } from "react";
import { Alert, Box, Button, TextField } from "@mui/material";
import axios from "axios";

import App, { ModalContent } from "../../App";
import http from "../../http-common";
import { QueryDefinition, StoredQueryScope } from "../../QueryState";

interface SaveQueryModalProps {
    app: App;
    modal: ModalContent;
    scope: StoredQueryScope;
    definition: QueryDefinition;
    initialName?: string;
    onSaved: () => void;
}

export function SaveQueryModal({ app, modal, scope, definition, initialName = "", onSaved }: SaveQueryModalProps) {
    const [name, setName] = useState(initialName);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const save = async () => {
        const trimmedName = name.trim();

        if (!trimmedName || saving) {
            return;
        }

        setSaving(true);
        setError("");

        try {
            const config = await app.getAuthorizationWithLoginModal();

            if (!config) {
                return;
            }

            await http.post(
                "/save-query",
                {
                    scope,
                    name: trimmedName,
                    query_definition: definition,
                },
                config
            );

            onSaved();
            modal.close();
        } catch (e) {
            if (axios.isAxiosError(e)) {
                const compilationErrors = e.response?.data?.compilation_errors;

                setError(
                    compilationErrors?.length
                        ? `Failed to compile query: ${compilationErrors[0].msg}`
                        : (e.response?.data?.message ?? "Failed to save query")
                );
            } else {
                setError(e instanceof Error ? e.message : "Failed to save query");
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box
            component="form"
            onSubmit={(e) => {
                e.preventDefault();
                void save();
            }}
            sx={{
                width: "min(400px, 80vw)",
                display: "flex",
                flexDirection: "column",
                gap: 2,
            }}
        >
            <TextField
                fullWidth
                autoFocus
                size="small"
                label="Query name"
                value={name}
                disabled={saving}
                onChange={(e) => setName(e.target.value)}
                slotProps={{
                    htmlInput: { maxLength: 255 },
                }}
            />

            {error && <Alert severity="error">{error}</Alert>}

            <Box
                sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 1,
                }}
            >
                <Button type="button" disabled={saving} onClick={() => modal.close()}>
                    Cancel
                </Button>

                <Button type="submit" color="secondary" disabled={!name.trim() || saving} loading={saving}>
                    Save
                </Button>
            </Box>
        </Box>
    );
}
