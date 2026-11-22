import React, { JSX } from "react";
import { BrowserRouter, Location, Navigate, NavigateFunction, Route, Routes, useLocation } from "react-router-dom";
import "@filebroker/react-widgets/lib/styles.css";
import "./App.css";
import http from "./http-common";
import PostSearch from "./routes/PostSearch";
import Login, { LoginForm, LoginResponse, UserPreferences } from "./routes/Login";
import { ProfilePage } from "./routes/ProfilePage";
import Register from "./routes/Register";
import Post from "./routes/Post";
import Home from "./routes/Home";
import { AxiosResponse } from "axios";
import { EmailConfirmation } from "./routes/EmailConfirmation";
import PostCollectionSearch from "./routes/PostCollectionSearch";
import { PostCollection } from "./routes/PostCollection";
import { Box, CircularProgress, Grow, IconButton, Modal, Paper } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import "bootstrap/dist/css/bootstrap.min.css";
import { TagGlossary } from "./routes/TagGlossary";
import { TagDetailPage } from "./routes/TagDetailPage";
import NavBar from "./components/NavBar";
import { GroupMembershipList } from "./routes/GroupMembershipList";
import { GroupDetailPage } from "./routes/GroupDetailPage";
import { closeSnackbar, SnackbarProvider } from "notistack";
import { RedeemUserGroupInvite } from "./routes/RedeemUserGroupInvite";
import BrokerListPage from "./routes/BrokerListPage";
import { BrokerDetailPage } from "./routes/BrokerDetailPage";
import { getConfiguredAppPath } from "./config";
import { AccessFilter } from "./QueryState";

declare module "react" {
    interface CSSProperties {
        [key: `--${string}`]: string | number;
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
        disableTransition: boolean = false
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

export interface PatchUserPreferencesRequest {
    advanced_query_mode?: boolean | undefined;
    auto_play_audio?: boolean | undefined;
    auto_play_video?: boolean | undefined;
    auto_play_audio_in_collection?: boolean | undefined;
    auto_play_video_in_collection?: boolean | undefined;
    default_access_filter?: AccessFilter | undefined;
}

function NormalizeAnonymousAccessFilter({ app, children }: { app: App; children: React.ReactElement }) {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const hasAccessFilter = params.has("access_filter");

    const url = location.pathname + location.search;

    const [authCheck, setAuthCheck] = React.useState<{
        url: string;
        authenticated: boolean;
    } | null>(null);

    React.useEffect(() => {
        if (!hasAccessFilter || app.isLoggedIn()) {
            return;
        }

        let active = true;

        app.getAuthorizationWithLoginModal(false).then((config) => {
            if (active) {
                setAuthCheck({
                    url,
                    authenticated: !!config,
                });
            }
        });

        return () => {
            active = false;
        };
    }, [app, url, hasAccessFilter]);

    if (!hasAccessFilter || app.isLoggedIn() || (authCheck?.url === url && authCheck.authenticated)) {
        return children;
    }

    if (authCheck?.url !== url) {
        // Wait for silent authentication before deciding whether
        // to remove the parameter.
        return null;
    }

    params.delete("access_filter");

    return (
        <Navigate
            replace
            to={{
                pathname: location.pathname,
                search: params.toString(),
                hash: location.hash,
            }}
        />
    );
}

function DefaultAccessFilterRoute({ app, children }: { app: App; children: React.ReactElement }) {
    const location = useLocation();
    const defaultAccessFilter = app.isLoggedIn() ? (app.getUserPreferences()?.default_access_filter ?? "all") : "all";

    if (defaultAccessFilter !== "all" && !location.search) {
        return (
            <Navigate
                replace
                to={{
                    pathname: location.pathname,
                    search: `?access_filter=${defaultAccessFilter}`,
                }}
            />
        );
    }

    return children;
}

export class App extends React.Component<
    { isDesktop: boolean },
    {
        jwt: string | null;
        user: User | null;
        loginExpiry: number | null;
        modalStack: ModalContent[];
        userPreferences: UserPreferences | null;
    }
> {
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
            modalStack: [],
            userPreferences: null,
        };

        this.handleLogin = this.handleLogin.bind(this);

        this.pendingLogin = null;
    }

    render(): React.ReactNode {
        const paperStyle = (preventStretch: boolean) => ({
            px: "32px",
            pt: "12px",
            pb: "24px",
            height: preventStretch || this.isDesktop() ? "fit-content" : "100dvh",
            width: preventStretch || this.isDesktop() ? "fit-content" : "100dvw",
            maxHeight: "100vh",
            maxWidth: "100vw",
            minWidth: preventStretch ? "fit-content" : "250px",
            display: "flex",
            flexDirection: "column",
            outline: "none",
            overflowX: "auto" as "auto",
            overflowY: "auto" as "auto",
            boxShadow: "0px 4px 20px 4px rgba(0, 0, 0, 0.8)",
        });
        const modalPaper = (modal: ModalContent) => (
            <Paper
                elevation={0}
                sx={{
                    ...paperStyle(modal.preventStretch),
                    ...(!modal.title && !modal.allowClose ? { pt: "32px", pb: "32px" } : {}),
                }}
            >
                {(modal.allowClose || modal.title) && (
                    <div className="modal-title-row">
                        {modal.allowClose && (
                            <IconButton
                                className="modal-close-btn"
                                size="large"
                                hidden={!modal.allowClose}
                                disabled={!modal.allowClose}
                                onClick={() => this.closeModal(modal)}
                            >
                                <CloseIcon fontSize="inherit" />
                            </IconButton>
                        )}
                        <span id="modal-title">{modal.title}</span>
                    </div>
                )}
                <div
                    className={`modal-content${modal.allowClose || modal.title ? " modal-content-with-title-row" : ""}`}
                    style={{
                        maxHeight: this.isDesktop() ? "80vh" : "100dvh",
                        maxWidth: this.isDesktop() ? "80vw" : "100dvh",
                        overflow: "auto",
                        width: "100%",
                        flex: "1 1 auto",
                        display: "flex",
                        minHeight: 0,
                        boxSizing: "border-box",
                    }}
                >
                    {React.isValidElement(modal.content)
                        ? modal.content
                        : (modal.content as unknown as (modal: ModalContent) => JSX.Element)(modal)}
                </div>
            </Paper>
        );

        return (
            <BrowserRouter basename={getConfiguredAppPath()}>
                <SnackbarProvider
                    autoHideDuration={6000}
                    anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                    action={(snackbarId) => (
                        <IconButton onClick={() => closeSnackbar(snackbarId)}>
                            <CloseIcon color="primary" />
                        </IconButton>
                    )}
                >
                    <div id="App">
                        <NavBar app={this} />
                        {this.state.modalStack.map((modal, idx) => (
                            <Modal
                                open
                                key={"modal_" + idx}
                                disableAutoFocus={modal.disableFocus}
                                onClose={() => {
                                    if (modal.allowClose) {
                                        modal.close();
                                    }
                                }}
                            >
                                <Box
                                    sx={{
                                        position: "absolute" as "absolute",
                                        top: "50%",
                                        left: "50%",
                                        transform: "translate(-50%, -50%)",
                                        display: "flex",
                                    }}
                                >
                                    {modal.disableTransition ? (
                                        modalPaper(modal)
                                    ) : (
                                        <Grow in={!modal.closed} timeout={MODAL_TRANSITION_TIMEOUT}>
                                            {modalPaper(modal)}
                                        </Grow>
                                    )}
                                </Box>
                            </Modal>
                        ))}
                    </div>

                    <RouteChangeHandler onChange={this.onRouteChange} />

                    <NormalizeAnonymousAccessFilter app={this}>
                        <Routes>
                            <Route path="/" element={<Home app={this}></Home>}></Route>
                            <Route
                                path="/posts"
                                element={
                                    <DefaultAccessFilterRoute app={this}>
                                        <PostSearch app={this} />
                                    </DefaultAccessFilterRoute>
                                }
                            ></Route>
                            <Route path="/login" element={<Login app={this}></Login>}></Route>
                            <Route
                                path="/profile"
                                element={<ProfilePage app={this} initialUser={this.state.user}></ProfilePage>}
                            ></Route>
                            <Route path="/register" element={<Register app={this}></Register>}></Route>
                            <Route path="/post/:id" element={<Post app={this}></Post>}></Route>
                            <Route
                                path="/confirm-email/:token"
                                element={<EmailConfirmation app={this}></EmailConfirmation>}
                            ></Route>
                            <Route
                                path="/collections"
                                element={
                                    <DefaultAccessFilterRoute app={this}>
                                        <PostCollectionSearch app={this} />
                                    </DefaultAccessFilterRoute>
                                }
                            />
                            <Route
                                path="/collection/:id"
                                element={
                                    <DefaultAccessFilterRoute app={this}>
                                        <PostCollection app={this} />
                                    </DefaultAccessFilterRoute>
                                }
                            />
                            <Route path="/collection/:collection_id/post/:id" element={<Post app={this} />} />
                            <Route path="/tags" element={<TagGlossary app={this} />} />
                            <Route path="/tag/:id" element={<TagDetailPage app={this} />} />
                            <Route path="/groups" element={<GroupMembershipList app={this} />} />
                            <Route path="/group/:id" element={<GroupDetailPage app={this} />} />
                            <Route path="/invite/:invite_code" element={<RedeemUserGroupInvite app={this} />} />
                            <Route path="/brokers" element={<BrokerListPage app={this} />} />
                            <Route path="/broker/:id" element={<BrokerDetailPage app={this} />} />
                            <Route path="*" element={<NotFoundPage></NotFoundPage>}></Route>
                        </Routes>
                    </NormalizeAnonymousAccessFilter>
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
            promise = http.post<LoginResponse>("/try-refresh-login", null, {
                withCredentials: true,
            });
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

    handleLogin(loginResponse: LoginResponse | null | undefined) {
        let loginExpiry;
        if (loginResponse) {
            let now = Date.now();
            let expirationTime = (loginResponse.expiration_secs / 3) * 2;
            loginExpiry = now + expirationTime * 1000;
        } else {
            loginExpiry = null;
        }

        this.setState(
            (state) => ({
                jwt: loginResponse?.token ?? null,
                user: loginResponse?.user ?? null,
                loginExpiry: loginExpiry,
                userPreferences: loginResponse
                    ? (loginResponse.preferences ??
                      (state.user?.pk === loginResponse.user.pk ? state.userPreferences : null))
                    : null,
            }),
            () => {
                this.pendingLogin = null;
            }
        );
    }

    isLoggedIn(): boolean {
        return this.state.user != null;
    }

    getUser(): User | null {
        return this.state.user;
    }

    updateUserData(user: User) {
        this.setState({
            user: user,
        });
    }

    getUserPreferences(): UserPreferences | null {
        return this.state.userPreferences;
    }

    updateUserPreferences(request: PatchUserPreferencesRequest) {
        this.withAuthorization((config) => {
            http.patch<UserPreferences>("/patch-user-preferences", request, config)
                .then((response) => this.setUserPreferences(response.data))
                .catch((e) => console.error("Failed to path user preferences:", e));
        }, true);
    }

    setUserPreferences(preferences: UserPreferences) {
        this.setState({
            userPreferences: preferences,
        });
    }

    getAuthConfigForJwt(jwt: string): { headers: { authorization: string } } | undefined {
        return {
            headers: {
                authorization: `Bearer ${jwt}`,
            },
        };
    }

    getAuthorizationWithLoginModal(
        showLoginFormIfLoggedOut: boolean = true
    ): Promise<{ headers: { authorization: string } } | undefined> {
        return new Promise((resolve) => {
            this.withAuthorization(resolve, showLoginFormIfLoggedOut);
        });
    }

    withAuthorization(
        cb: (config: { headers: { authorization: string } } | undefined) => void,
        showLoginFormIfLoggedOut: boolean = true
    ) {
        if (this.state.loginExpiry == null || this.state.jwt == null || this.state.loginExpiry < Date.now()) {
            let promise;
            if (this.pendingLogin != null) {
                promise = this.pendingLogin;
            } else {
                promise = http.post<LoginResponse>("/try-refresh-login", null, {
                    withCredentials: true,
                });
                this.pendingLogin = promise;
            }
            promise
                .then((loginResponse) => {
                    this.handleLogin(loginResponse.data);
                    if (!loginResponse.data) {
                        if (showLoginFormIfLoggedOut) {
                            this.openModal(
                                "",
                                (modal) => <LoginForm app={this} modal={modal} />,
                                (loginResponse: LoginResponse) => {
                                    this.handleLogin(loginResponse);
                                    if (loginResponse) {
                                        cb(this.getAuthConfigForJwt(loginResponse.token));
                                    } else {
                                        cb(undefined);
                                    }
                                }
                            );
                        } else {
                            cb(undefined);
                        }
                    } else {
                        cb(this.getAuthConfigForJwt(loginResponse.data.token));
                    }
                })
                .catch((e) => {
                    console.log("Failed to refresh login: " + e);
                    if (e.response?.status === 401 && showLoginFormIfLoggedOut) {
                        this.openModal(
                            "",
                            (modal) => <LoginForm app={this} modal={modal} />,
                            (loginResponse: LoginResponse) => {
                                this.handleLogin(loginResponse);
                                cb(loginResponse ? this.getAuthConfigForJwt(loginResponse.token) : undefined);
                            }
                        );
                    } else {
                        cb(undefined);
                    }
                });
        } else {
            cb(this.getAuthConfigForJwt(this.state.jwt));
        }
    }

    async getAuthorization(
        location: Location,
        navigate: NavigateFunction,
        require: boolean = true
    ): Promise<{ headers: { authorization: string } } | undefined> {
        if (this.state.loginExpiry == null || this.state.jwt == null || this.state.loginExpiry < Date.now()) {
            let promise;
            if (this.pendingLogin != null) {
                promise = this.pendingLogin;
            } else {
                promise = http.post<LoginResponse>("/try-refresh-login", null, {
                    withCredentials: true,
                });
                this.pendingLogin = promise;
            }
            try {
                let response = await promise;
                this.handleLogin(response.data);
                if (!response.data) {
                    if (require) {
                        navigate("/login", {
                            state: { from: location },
                            replace: true,
                        });
                        throw new Error("Failed to try refresh login with empty response");
                    } else {
                        return undefined;
                    }
                }
                return {
                    headers: {
                        authorization: `Bearer ${response.data.token}`,
                    },
                };
            } catch (e: any) {
                console.log("Failed to refresh login: " + e);
                if (!require) {
                    return undefined;
                }
                if (e.response?.status === 401) {
                    navigate("/login", {
                        state: { from: location },
                        replace: true,
                    });
                }
                throw e;
            }
        } else {
            return {
                headers: {
                    authorization: `Bearer ${this.state.jwt}`,
                },
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
        disableTransition: boolean = false
    ): ModalContent {
        const modal = new ModalContent(
            title,
            modalElement,
            this,
            closeCallback,
            allowClose,
            preventStretch,
            disableFocus,
            disableTransition
        );
        this.setState((state) => {
            const newModalStack = state.modalStack.concat(modal);
            return {
                modalStack: newModalStack,
            };
        });
        return modal;
    }

    openLoadingModal() {
        return this.openModal(
            "",
            <div
                style={{
                    margin: "0",
                    padding: "0",
                    width: "40px",
                    height: "40px",
                    overflow: "hidden",
                }}
            >
                <CircularProgress size={40} color="primary" />
            </div>,
            undefined,
            false,
            true,
            true
        );
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
        setTimeout(
            () => {
                this.setState((state) => {
                    const currLen = state.modalStack.length;
                    const removeIndex = state.modalStack.indexOf(modal);
                    if (removeIndex < 0) {
                        return {
                            modalStack: state.modalStack,
                        };
                    }

                    let newModalStack;
                    if (removeIndex === currLen - 1) {
                        newModalStack = state.modalStack.slice(0, currLen - 1);
                    } else if (removeIndex === 0) {
                        newModalStack = state.modalStack.slice(1);
                    } else {
                        newModalStack = state.modalStack
                            .slice(0, removeIndex)
                            .concat(state.modalStack.slice(removeIndex + 1));
                    }

                    return {
                        modalStack: newModalStack,
                    };
                });
            },
            modal.disableTransition ? 0 : MODAL_TRANSITION_TIMEOUT
        );
        this.setState((state) => {
            return {
                modalStack: state.modalStack,
            };
        });
    }

    isDesktop(): boolean {
        return this.props.isDesktop;
    }
}

export class NotFoundPage extends React.Component {
    render(): React.ReactNode {
        return <h1>404 Not Found</h1>;
    }
}

export default App;
