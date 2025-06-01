import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import Modal from 'react-modal';
import {createTheme, styled, ThemeProvider} from '@mui/material/styles';
import {closeSnackbar, SnackbarProvider} from 'notistack';
import {
    Autocomplete,
    FormControl,
    FormLabelProps,
    IconButton,
    InputLabel,
    Select,
    SelectProps,
    TextField,
    TextFieldProps,
    TextFieldVariants,
    useMediaQuery,
    useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import * as React from "react";
import {ChipTypeMap} from "@mui/material/Chip";
import {AutocompleteProps} from "@mui/material/Autocomplete/Autocomplete";

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

Modal.setAppElement("#root");

const MUI_THEME = createTheme({
    typography: {
        "fontFamily": `-apple-system, BlinkMacSystemFont, 'Montserrat', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif`,
        "allVariants": {
            "color": "white"
        },
        button: {
            textTransform: 'none'
        }
    },
    palette: {
        mode: 'dark',
        primary: {
            main: "#ffffff"
        },
        secondary: {
            main: "#42a5f5"
        }
    },
    components: {
        MuiAutocomplete: {
            styleOverrides: {

            }
        }
    }
});

const StyledTextFieldStyle = styled(TextField)(({ theme, color }) => {
    return {
        "& .MuiInputLabel-root.Mui-disabled": {
            color: "white",
        },
        "& .MuiOutlinedInput-root.Mui-disabled": {
            "& fieldset": {
                borderColor: color ? theme.palette[color].main : "rgba(0, 0, 0, 0.23)",
                color: color ? theme.palette[color].main : "white",
            },
        },
        "& .MuiOutlinedInput-input.Mui-disabled": {
            color: "white",
            'WebkitTextFillColor': 'white',
        },
    };
})

export const StyledTextField = (props: TextFieldProps) => {
    return (<StyledTextFieldStyle
        {...props}
        InputProps={{
            ...props.InputProps,
            readOnly: props.disabled,
        }}
        InputLabelProps={{
            ...props.InputLabelProps,
            shrink: true,
        }}
    />);
}

const StyledReadOnlyTextField = styled(TextField)(({ theme, color }) => {
    const themeColor = color ? theme.palette[color].main : "rgba(255, 255, 255, 0.42)";

    return {
        "& .MuiInputBase-input": {
            cursor: "default", // Prevent pointer cursor
        },
        "& .MuiInput-underline:before": {
            borderBottom: `1px solid ${themeColor}`, // Remove default underline
        },
        "& .MuiInput-underline:hover:before": {
            borderBottom: `1px solid ${themeColor} !important`, // Prevent underline on hover
        },
        "& .MuiInput-underline:after": {
            borderBottom: `1px solid ${themeColor}`, // Remove underline when focused
        },
    };
});

export const ReadOnlyTextField = (props: TextFieldProps) => {
    return (
        <StyledReadOnlyTextField
            focused
            {...props}
            InputProps={{
                ...props.InputProps,
                readOnly: true
            }}
            InputLabelProps={{
                ...props.InputLabelProps,
                shrink: true,
            }}
        />
    );
}

export const StyledSelect = <V, >({
                                      id,
                                      label,
                                      readOnly = false,
                                      fullWidth = false,
                                      color,
                                      value,
                                      onChange,
                                      children,
                                      ...rest
                                  }: SelectProps<V>) => {
    const theme = useTheme();
    return (
        <FormControl style={{width: fullWidth ? undefined : "150px", flexGrow: 0}} fullWidth={fullWidth}>
            <InputLabel id={`${id}-label`} color={color}><span
                style={{color: color ? theme.palette[color].main : "white"}}>{label}</span></InputLabel>
            <Select
                labelId={`${id}-label`}
                id={id}
                label={label}
                value={value}
                readOnly={readOnly}
                disabled={readOnly}
                color={color}
                sx={{
                    "&.MuiInputLabel-root.Mui-disabled": {
                        color: "white",
                    },
                    "&.MuiOutlinedInput-root.Mui-disabled": {
                        "& fieldset": {
                            borderColor: color ? theme.palette[color].main : "rgba(0, 0, 0, 0.23)",
                            color: color ? theme.palette[color].main : "white",
                        },
                    },
                    "& .MuiOutlinedInput-input.Mui-disabled": {
                        'WebkitTextFillColor': 'white',
                    },
                }}
                onChange={onChange}
                {...rest}
            >
                {children}
            </Select>
        </FormControl>
    );
};

export const StyledAutocomplete = <
    Value,
    Multiple extends boolean | undefined = false,
    DisableClearable extends boolean | undefined = false,
    FreeSolo extends boolean | undefined = false,
    ChipComponent extends React.ElementType = ChipTypeMap['defaultComponent'],
>({
      color,
      label,
      placeholder,
      readOnly,
      value,
      variant,
      ...props
  }: Omit<AutocompleteProps<Value, Multiple, DisableClearable, FreeSolo, ChipComponent>, "renderInput"> & {
    label: string,
    color?: FormLabelProps["color"],
    variant?: TextFieldVariants,
}) => {
    const theme = useTheme();
    return (
        <Autocomplete
            {...props}
            value={value}
            disabled={readOnly}
            readOnly={readOnly}
            renderInput={params => {
                const {InputProps, ...restParams} = params;
                const {startAdornment, ...restInputProps} = InputProps;
                return <TextField
                    {...restParams}
                    InputProps={{
                        ...restInputProps,
                        startAdornment: (startAdornment &&
                            <div style={{maxHeight: "100px", overflowY: "auto"}}>{startAdornment}</div>)
                    }}
                    InputLabelProps={readOnly ? {shrink: true} : undefined}
                    label={label}
                    placeholder={value || readOnly ? undefined : placeholder}
                    variant={variant}
                    sx={{
                        "& .MuiOutlinedInput-input.Mui-disabled": {
                            'WebkitTextFillColor': 'white',
                        },
                        "& .MuiInputLabel-root.Mui-disabled": {
                            color: color ? theme.palette[color].main : "white",
                        },
                        "& .MuiInputBase-root.Mui-disabled": {
                            "& > fieldset": {
                                borderColor: color ? theme.palette[color].main : "rgba(0, 0, 0, 0.23)",
                                color: "white",
                            }
                        }
                    }}
                />;
            }}
        />
    );
};

const DimensionAwareApp = () => {
    const matches = useMediaQuery('(min-width: 800px)');
    return (<App isDesktop={matches} />)
};

root.render(
    <ThemeProvider theme={MUI_THEME}>
        <SnackbarProvider autoHideDuration={6000} anchorOrigin={{ horizontal: "right", vertical: "bottom" }} action={(snackbarId) => (
            <IconButton onClick={() => closeSnackbar(snackbarId)}>
                <CloseIcon color='primary' />
            </IconButton>
        )}>
            <DimensionAwareApp />
        </SnackbarProvider>
    </ThemeProvider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
