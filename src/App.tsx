import React from 'react';
import {BrowserRouter, Location, NavigateFunction, Route, Routes, useLocation} from "react-router-dom";
import "@filebroker/react-widgets/lib/styles.css";
import './App.css';
import http from "./http-common";
import PostSearch from './routes/PostSearch';
import Login, { LoginResponse } from './routes/Login';
import { ProfilePage } from "./routes/ProfilePage";
import Register from './routes/Register';
import Post from './routes/Post';
import Home from './routes/Home';
import { AxiosResponse } from 'axios';
import { EmailConfirmation } from './routes/EmailConfirmation';
import PostCollectionSearch from './routes/PostCollectionSearch';
import { PostCollection } from './routes/PostCollection';
import { Box, CircularProgress, Grow, IconButton, Modal, Paper } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import 'bootstrap/dist/css/bootstrap.min.css';
import { TagGlossary } from './routes/TagGlossary';
import { TagDetailPage } from './routes/TagDetailPage';
import NavBar from "./components/NavBar";
import {GroupMembershipList} from "./routes/GroupMembershipList";
import {GroupDetailPage} from "./routes/GroupDetailPage";
import {closeSnackbar, SnackbarProvider} from "notistack";
import {RedeemUserGroupInvite} from "./routes/RedeemUserGroupInvite";
import BrokerListPage from "./routes/BrokerListPage";
import {BrokerDetailPage} from "./routes/BrokerDetailPage";

declare module 'react' {
    interface CSSProperties {
        [key: `--${string}`]: string | number
    }
}

export class User {
    pk: number;
    user_name: string;
    email: string | null;
    creation_timestamp: string;
    email_confirmed: boolean;
    display_name: string | null;
    is_admin: boolean;
    is_banned: boolean;
    avatar_object_key: string | null;

    constructor(
        pk: number,
        user_name: string,
        email: string | null,
        creation_timestamp: string,
        email_confirmed: boolean,
        display_name: string | null,
        is_admin: boolean,
        is_banned: boolean,
        avatar_object_key: string | null
    ) {
        this.pk = pk;
        this.user_name = user_name;
        this.email = email;
        this.creation_timestamp = creation_timestamp;
        this.email_confirmed = email_confirmed;
        this.display_name = display_name;
        this.is_admin = is_admin;
        this.is_banned = is_banned;
        this.avatar_object_key = avatar_object_key;
    }
}

const MODAL_TRANSITION_TIMEOUT = 200;

export class ModalContent {
    title: string;
    content: JSX.Element | ((modal: ModalContent) => JSX.Element);
    closeCallback: ((result: any) => void) | undefined;
    allowClose: boolean;
    preventStretch: boolean = false;
    disableFocus: boolean = false;
    app: App;
    closed: boolean = false;
    disableTransition: boolean = false;

    constructor(
        title: string,
        content: JSX.Element | ((modal: ModalContent) => JSX.Element),
        app: App,
        closeCallback: ((result: any) => void) | undefined = undefined,
        allowClose: boolean,
        preventStretch: boolean = false,
        disableFocus: boolean = false,
        disableTransition: boolean = false,
    ) {
        this.title = title;
        this.content = content;
        this.closeCallback = closeCallback;
        this.allowClose = allowClose;
        this.disableFocus = disableFocus;
        this.preventStretch = preventStretch;
        this.app = app;
        this.disableTransition = disableTransition;
    }

    close(result: any = undefined) {
        this.app.closeModal(this, result);
    }
}

function RouteChangeHandler({ onChange }: { onChange: (pathname: string) => void }) {
    const location = useLocation();
    React.useEffect(() => {
        onChange(location.pathname);
    }, [location.pathname, onChange]);
    return null;
}


export class App extends React.Component<{ isDesktop: boolean }, {
    jwt: string | null;
    user: User | null;
    loginExpiry: number | null;
    modalStack: ModalContent[];
}> {

    pendingLogin: Promise<AxiosResponse<LoginResponse, any>> | null;

    private _lastPath: string | undefined;

    // clear modal stack when route changes
    onRouteChange = (pathname: string) => {
        if (this._lastPath && this._lastPath !== pathname) {
            if (this.state.modalStack.length > 0) {
                this.setState({ modalStack: [] });
            }
        }
        this._lastPath = pathname;
    };

    constructor(props: { isDesktop: boolean }) {
        super(props);
        this.state = {
            jwt: null,
            user: null,
            loginExpiry: null,
            modalStack: []
        };

        this.handleLogin = this.handleLogin.bind(this);

        this.pendingLogin = null;
    }

    render(): React.ReactNode {
        const paperStyle = (preventStretch: boolean) => ({
            p: "32px",
            height: preventStretch || this.isDesktop() ? 'fit-content' : '100dvh',
            width: preventStretch || this.isDesktop() ? 'fit-content' : '100dvw',
            maxHeight: '100vh',
            maxWidth: '100vw',
            minWidth: preventStretch ? 'fit-content' : '250px',
            display: "flex",
            outline: "none",
            overflowX: "auto" as "auto",
            overflowY: "auto" as "auto",
            boxShadow: "0px 4px 20px 4px rgba(0, 0, 0, 0.8)",
        });
        const modalPaper = (modal: ModalContent) => <Paper elevation={0} sx={paperStyle(modal.preventStretch)}>
            {(modal.allowClose || modal.title) && <div className="modal-title-row">
                {modal.allowClose && <IconButton className='modal-close-btn' size='large'
                                                 hidden={!modal.allowClose}
                                                 disabled={!modal.allowClose}
                                                 onClick={() => this.closeModal(modal)}>
                    <CloseIcon fontSize='inherit'/>
                </IconButton>}
                <span id="modal-title">{modal.title}</span>
            </div>}
            <div
                className={`modal-content${(modal.allowClose || modal.title) ? " modal-content-with-title-row" : ""}`}
                style={{
                    maxHeight: this.isDesktop() ? "80vh" : "100dvh",
                    maxWidth: this.isDesktop() ? "80vw" : "100dvh",
                    overflow: "auto",
                    width: "100%",
                    flex: "1 1 auto",
                    display: "flex"
                }}>
                {React.isValidElement(modal.content) ? modal.content : (modal.content as unknown as ((modal: ModalContent) => JSX.Element))(modal)}
            </div>
        </Paper>;

        return (
            <BrowserRouter basename={process.env.REACT_APP_PATH ? process.env.REACT_APP_PATH : "/"}>
                <SnackbarProvider autoHideDuration={6000} anchorOrigin={{ horizontal: "right", vertical: "bottom" }} action={(snackbarId) => (
                    <IconButton onClick={() => closeSnackbar(snackbarId)}>
                        <CloseIcon color='primary' />
                    </IconButton>
                )}>
                    <div id="App">
                        <NavBar app={this} />
                        {this.state.modalStack.map((modal, idx) =>
                            <Modal
                                open={true}
                                key={"modal_" + idx}
                                disableEscapeKeyDown={!modal.allowClose}
                                disableAutoFocus={modal.disableFocus}
                                onClose={() => {
                                    if (modal.allowClose) {
                                        modal.close();
                                    }
                                }}
                            >
                                <Box sx={{
                                    position: 'absolute' as 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    display: "flex",
                                }}>
                                    {modal.disableTransition
                                        ? (modalPaper(modal))
                                        : (<Grow in={!modal.closed} timeout={MODAL_TRANSITION_TIMEOUT}>
                                            {modalPaper(modal)}
                                        </Grow>)}
                                </Box>
                            </Modal>
                        )}
                    </div>

                    <RouteChangeHandler onChange={this.onRouteChange} />

                    <Routes>
                        <Route path="/" element={<Home></Home>}></Route>
                        <Route path="/posts" element={<PostSearch app={this}></PostSearch>}></Route>
                        <Route path="/login" element={<Login app={this}></Login>}></Route>
                        <Route path="/profile" element={<ProfilePage app={this} initialUser={this.state.user}></ProfilePage>}></Route>
                        <Route path="/register" element={<Register app={this}></Register>}></Route>
                        <Route path="/post/:id" element={<Post app={this}></Post>}></Route>
                        <Route path="/confirm-email/:token" element={<EmailConfirmation app={this}></EmailConfirmation>}></Route>
                        <Route path="/collections" element={<PostCollectionSearch app={this} />} />
                        <Route path="/collection/:id" element={<PostCollection app={this} />} />
                        <Route path="/collection/:collection_id/post/:id" element={<Post app={this} />} />
                        <Route path="/tags" element={<TagGlossary app={this} />} />
                        <Route path="/tag/:id" element={<TagDetailPage app={this} />} />
                        <Route path="/groups" element={<GroupMembershipList app={this} />} />
                        <Route path="/group/:id" element={<GroupDetailPage app={this} />} />
                        <Route path="/invite/:invite_code" element={<RedeemUserGroupInvite app={this} />}/>
                        <Route path="/brokers" element={<BrokerListPage app={this} />} />
                        <Route path="/broker/:id" element={<BrokerDetailPage app={this} />} />
                        <Route path="*" element={<NotFoundPage></NotFoundPage>}></Route>
                    </Routes>
                </SnackbarProvider>
            </BrowserRouter>
        );
    }

    async componentDidMount() {
        if (this.state.jwt != null) {
            return;
        }

        let promise;
        if (this.pendingLogin != null) {
            promise = this.pendingLogin;
        } else {
            promise = http.post<LoginResponse>("/try-refresh-login", null, { withCredentials: true });
            this.pendingLogin = promise;
        }

        try {
            let response = await promise;
            this.handleLogin(response.data);
        } catch (e) {
            console.log("Failed to refresh login: " + e);
            this.handleLogin(null);
        }
    }

    handleLogin(loginResponse: LoginResponse | null) {
        let loginExpiry;
        if (loginResponse) {
            let now = Date.now();
            let expirationTime = loginResponse.expiration_secs / 3 * 2;
            loginExpiry = now + expirationTime * 1000;
        } else {
            loginExpiry = null;
        }

        this.setState({
            jwt: loginResponse?.token ?? null,
            user: loginResponse?.user ?? null,
            loginExpiry: loginExpiry
        }, () => {
            this.pendingLogin = null;
        });
    }

    isLoggedIn(): boolean {
        return this.state.user != null;
    }

    getUser(): User | null {
        return this.state.user;
    }

    updateUserData(user: User) {
        this.setState({
            user: user
        });
    }

    async getAuthorization(location: Location, navigate: NavigateFunction, require: boolean = true): Promise<{ headers: { authorization: string } } | undefined> {
        if (this.state.loginExpiry == null || this.state.jwt == null || this.state.loginExpiry < Date.now()) {
            let promise;
            if (this.pendingLogin != null) {
                promise = this.pendingLogin;
            } else {
                promise = http.post<LoginResponse>("/try-refresh-login", null, { withCredentials: true });
                this.pendingLogin = promise;
            }
            try {
                let response = await promise;
                this.handleLogin(response.data);
                if (!response.data) {
                    if (require) {
                        navigate("/login", { state: { from: location }, replace: true });
                        throw new Error("Failed to try refresh login with empty response");
                    } else {
                        return undefined;
                    }
                }
                return {
                    headers: {
                        authorization: `Bearer ${response.data.token}`
                    }
                };
            } catch (e: any) {
                console.log("Failed to refresh login: " + e);
                if (!require) {
                    return undefined;
                }
                if (e.response?.status === 401) {
                    navigate("/login", { state: { from: location }, replace: true });
                }
                throw e;
            }
        } else {
            return {
                headers: {
                    authorization: `Bearer ${this.state.jwt}`
                }
            };
        }
    }

    openModal(
        title: string,
        modalElement: JSX.Element | ((modal: ModalContent) => JSX.Element),
        closeCallback: ((result: any) => void) | undefined = undefined,
        allowClose: boolean = true,
        preventStretch: boolean = false,
        disableFocus: boolean = false,
        disableTransition: boolean = false,
    ): ModalContent {
        const modal = new ModalContent(title, modalElement, this, closeCallback, allowClose, preventStretch, disableFocus, disableTransition);
        this.setState(state => {
            const newModalStack = state.modalStack.concat(modal);
            return {
                modalStack: newModalStack
            }
        });
        return modal;
    }

    openLoadingModal() {
        return this.openModal("", <div style={{ margin: "0", padding: "0", width: "40px", height: "40px", overflow: "hidden" }}><CircularProgress size={40} color='primary' /></div>, undefined, false, true, true);
    }

    closeModal(modal: ModalContent, result: any = undefined) {
        if (modal.closed) {
            console.warn("Tried to close an already closed modal");
            return;
        }

        const closeCallback = modal.closeCallback;
        if (closeCallback) {
            try {
                closeCallback(result);
            } catch (e: any) {
                console.error("Error in modal close callback: " + e);
            }
        }

        modal.closed = true;
        setTimeout(() => {
            this.setState(state => {
                const currLen = state.modalStack.length;
                const removeIndex = state.modalStack.indexOf(modal);
                if (removeIndex < 0) {
                    return {
                        modalStack: state.modalStack
                    };
                }

                let newModalStack;
                if (removeIndex === currLen - 1) {
                    newModalStack = state.modalStack.slice(0, currLen - 1);
                } else if (removeIndex === 0) {
                    newModalStack = state.modalStack.slice(1);
                } else {
                    newModalStack = state.modalStack.slice(0, removeIndex)
                        .concat(state.modalStack.slice(removeIndex + 1));
                }

                return {
                    modalStack: newModalStack
                };
            });
        }, modal.disableTransition ? 0 : MODAL_TRANSITION_TIMEOUT);
        this.setState(state => {
            return {
                modalStack: state.modalStack
            };
        });
    }

    isDesktop(): boolean {
        return this.props.isDesktop;
    }
}

export class NotFoundPage extends React.Component {
    render(): React.ReactNode {
        return (
            <h1>404 Not Found</h1>
        );
    }
}

export default App;
