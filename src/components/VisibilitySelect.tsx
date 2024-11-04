import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";

export default function VisibilitySelect({ isPublic, isPublicEdit, readOnly = false, setPublic, setPublicEdit, fullWidth = false }: {
    isPublic: boolean,
    isPublicEdit: boolean,
    readOnly?: boolean,
    setPublic: (v: boolean) => void,
    setPublicEdit: (v: boolean) => void,
    fullWidth?: boolean
}) {
    return (
        <FormControl style={{ width: fullWidth ? undefined : "150px", flexGrow: 0 }} fullWidth={fullWidth}>
            <InputLabel id="post-visibility-select-label">Visibility</InputLabel>
            <Select
                labelId="post-visibility-select-label"
                id="post-visibility-select"
                label="Visibility"
                value={isPublic ? (isPublicEdit ? "public-edit" : "public") : "private"}
                readOnly={readOnly}
                disabled={readOnly}
                sx={{
                    "&.MuiInputLabel-root.Mui-disabled": {
                        color: "white",
                    },
                    "&.MuiOutlinedInput-root.Mui-disabled": {
                        "& fieldset": {
                            borderColor: "rgba(0, 0, 0, 0.23)",
                            color: "white",
                        },
                    },
                    "& .MuiOutlinedInput-input.Mui-disabled": {
                        '-webkit-text-fill-color': 'white',
                    },
                }}
                onChange={e => {
                    if (e.target.value === "public") {
                        setPublic(true);
                        setPublicEdit(false);
                    } else if (e.target.value === "public-edit") {
                        setPublic(true);
                        setPublicEdit(true);
                    } else {
                        setPublic(false);
                        setPublicEdit(false);
                    }
                }}
            >
                <MenuItem value="private">Private</MenuItem>
                <MenuItem value="public">Public View</MenuItem>
                <MenuItem value="public-edit">Public Edit</MenuItem>
            </Select>
        </FormControl >
    );
};
