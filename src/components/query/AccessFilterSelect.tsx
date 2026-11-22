import { useEffect, useState } from "react";
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from "@mui/material";
import PublicIcon from "@mui/icons-material/Public";
import GroupsIcon from "@mui/icons-material/Groups";
import PersonIcon from "@mui/icons-material/Person";
import CheckIcon from "@mui/icons-material/Check";

import { AccessFilter } from "../../QueryState";

const OPTIONS = [
    { value: "all", label: "All", icon: <PublicIcon fontSize="small" /> },
    { value: "shared", label: "Shared", icon: <GroupsIcon fontSize="small" /> },
    { value: "own", label: "Own", icon: <PersonIcon fontSize="small" /> },
] as const;

export function AccessFilterSelect({
    value,
    onChange,
    disabled = false,
}: {
    value: AccessFilter;
    onChange: (value: AccessFilter) => void;
    disabled?: boolean;
}) {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (disabled) {
            setAnchor(null);
        }
    }, [disabled]);

    return (
        <>
            <Tooltip title={`Access: ${value}`}>
                <IconButton
                    size="small"
                    disabled={disabled}
                    aria-label={`Access: ${value}`}
                    aria-haspopup="menu"
                    onClick={(e) => setAnchor(e.currentTarget)}
                >
                    {value === "all" ? <PublicIcon /> : value === "shared" ? <GroupsIcon /> : <PersonIcon />}
                </IconButton>
            </Tooltip>

            <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
                {OPTIONS.map((option) => (
                    <MenuItem
                        key={option.value}
                        selected={value === option.value}
                        onClick={() => {
                            setAnchor(null);
                            onChange(option.value);
                        }}
                    >
                        <ListItemIcon>{option.icon}</ListItemIcon>
                        <ListItemText>{option.label}</ListItemText>
                        {value === option.value && <CheckIcon fontSize="small" />}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
}
