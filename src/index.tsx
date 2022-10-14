import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import Modal from 'react-modal';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

Modal.setAppElement("#root");

const MUI_THEME = createTheme({
    typography: {
        "fontFamily": `-apple-system, BlinkMacSystemFont, 'Montserrat', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif`,
        "allVariants": {
            "color": "white"
        }
    },
    palette: {
        primary: {
            main: "#ffffff"
        },
        secondary: {
            main: "#42a5f5"
        }
    },
    components: {
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundColor: "#232629"
                }
            }
        },
        MuiInput: {
            styleOverrides: {
                root: {
                    color: "white"
                }
            }
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    color: "white"
                }
            }
        },
        MuiButtonBase: {
            styleOverrides: {
                root: {
                    color: "white"
                }
            }
        },
        MuiSvgIcon: {
            styleOverrides: {
                root: {
                    color: "white"
                }
            }
        }
    }
});

root.render(
    <ThemeProvider theme={MUI_THEME}>
        <App></App>
    </ThemeProvider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
