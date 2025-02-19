import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import Modal from 'react-modal';
import { createTheme, styled, ThemeProvider } from '@mui/material/styles';
import { closeSnackbar, SnackbarProvider } from 'notistack';
import { IconButton, TextField, TextFieldProps, TextFieldVariants, useMediaQuery } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

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
