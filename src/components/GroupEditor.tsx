import { Autocomplete, Chip, TextField } from "@mui/material";
import { UserGroup } from "../Model";
import EditIcon from '@mui/icons-material/Edit';
import { useState } from "react";

export function GroupSelector({ disabled = false, limit = 50, currentUserGroups, selectedUserGroups, setSelectedUserGroups, selectedUserGroupsReadOnly, setSelectedUserGroupsReadOnly, readOnly = false }: {
    disabled?: boolean,
    limit?: number,
    currentUserGroups: UserGroup[],
    selectedUserGroups: UserGroup[],
    setSelectedUserGroups: (v: UserGroup[]) => void,
    selectedUserGroupsReadOnly: number[],
    setSelectedUserGroupsReadOnly: (v: number[]) => void,
    readOnly?: boolean
}) {
    const [inputDisabled, setInputDisabled] = useState(false);
    return (
        <Autocomplete
            multiple
            disabled={disabled || inputDisabled || readOnly}
            options={currentUserGroups}
            getOptionLabel={userGroup => userGroup.name}
            readOnly={readOnly}
            renderInput={params => {
                const { InputProps, ...restParams } = params;
                const { startAdornment, ...restInputProps } = InputProps;
                return <TextField
                    {...restParams}
                    InputProps={{ ...restInputProps, startAdornment: (startAdornment && <div style={{ maxHeight: "200px", overflowY: "auto" }}>{startAdornment}</div>) }}
                    label="Groups"
                    sx={{
                        "& .MuiInputLabel-root.Mui-disabled": {
                            color: "white",
                        },
                        "& .MuiInputBase-root.Mui-disabled": {
                            "& > fieldset": {
                                borderColor: "rgba(0, 0, 0, 0.23)",
                                color: "white",
                            }
                        }
                    }}
                />;
            }}
            renderTags={(tagValue, getTagProps) => tagValue.map((option, index) => (
                <Chip
                    {...getTagProps({ index })}
                    color="primary"
                    variant="outlined"
                    disabled={false}
                    label={typeof option === "string" ? option : option.name}
                    icon={selectedUserGroupsReadOnly.includes(option.pk) ? undefined : <EditIcon/>}
                    onClick={!readOnly ? () => {
                        if (selectedUserGroupsReadOnly.includes(option.pk)) {
                            setSelectedUserGroupsReadOnly(selectedUserGroupsReadOnly.filter(i => i !== option.pk));
                        } else {
                            setSelectedUserGroupsReadOnly(selectedUserGroupsReadOnly.concat([option.pk]));
                        }
                    } : undefined}
                />
            ))}
            value={selectedUserGroups}
            isOptionEqualToValue={(option, value) => option.pk === value.pk}
            onChange={(_e, newVal) => {
                setSelectedUserGroups(newVal);
                setSelectedUserGroupsReadOnly(selectedUserGroupsReadOnly.filter(i => selectedUserGroups.some(group => group.pk === i)));
                if (newVal.length >= limit) {
                    setInputDisabled(true);
                } else if (inputDisabled) {
                    setInputDisabled(false);
                }
            }}
        />
    );
}
