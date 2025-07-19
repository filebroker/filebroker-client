import React, { useEffect, useState } from 'react';
import { BrowserRouter, Location, NavigateFunction, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { solid } from '@fortawesome/fontawesome-svg-core/import.macro';
import UploadDialogue from './components/UploadDialogue';
import { EmailConfirmation } from './routes/EmailConfirmation';
import PostCollectionSearch from './routes/PostCollectionSearch';
import { PostCollection } from './routes/PostCollection';
import { QueryAutocompleteSuggestionCombobox } from './components/QueryAutocompleteSuggestions';
import { Box, CircularProgress, Grow, IconButton, Modal, Paper } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Container, Nav, Navbar } from 'react-bootstrap';
import NavbarCollapse from 'react-bootstrap/esm/NavbarCollapse';
import 'bootstrap/dist/css/bootstrap.min.css';
import { TagGlossary } from './routes/TagGlossary';
import { TagDetailPage } from './routes/TagDetailPage';

declare module 'react' {
    interface CSSProperties {
        [key: `--${string}`]: string | number
    }
}

export class User {
    pk: number;
    user_name: string;
    email: string | null;
    avatar_url: string;
    creation_timestamp: string;
    email_confirmed: boolean;
    display_name: string | null;
    is_admin: boolean;
    is_banned: boolean;

    constructor(
        pk: number,
        user_name: string,
        email: string | null,
        avatar_url: string,
        creation_timestamp: string,
        email_confirmed: boolean,
        display_name: string | null,
        is_admin: boolean,
        is_banned: boolean
    ) {
        this.pk = pk;
        this.user_name = user_name;
        this.email = email;
        this.avatar_url = avatar_url;
        this.creation_timestamp = creation_timestamp;
        this.email_confirmed = email_confirmed;
        this.display_name = display_name;
        this.is_admin = is_admin;
        this.is_banned = is_banned;
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

    constructor(title: string, content: JSX.Element | ((modal: ModalContent) => JSX.Element), app: App, closeCallback: ((result: any) => void) | undefined, allowClose: boolean, preventStretch: boolean, disableFocus: boolean) {
        this.title = title;
        this.content = content;
        this.closeCallback = closeCallback;
        this.allowClose = allowClose;
        this.disableFocus = disableFocus;
        this.preventStretch = preventStretch;
        this.app = app;
    }

    close(result: any = undefined) {
        this.app.closeModal(this, result);
    }
}

export function PostQueryInput({ hideOnHome }: { hideOnHome?: boolean }) {
    const location = useLocation();
    const search = location.search;
    const navigate = useNavigate();
    const pathName = location.pathname;

    let searchParams = new URLSearchParams(search);
    let queryParam: string = searchParams.get("query") ?? "";
    const [queryString, setQueryString] = useState(queryParam);

    useEffect(() => {
        setQueryString(queryParam);
    }, [location]);

    if (hideOnHome && pathName === "/") {
        return null;
    }

    let searchSite = "/posts";
    if (pathName === "/collections") {
        searchSite = pathName;
    } else if (pathName.startsWith("/collection/")) {
        searchSite = pathName.split("/").filter((part) => part.length > 0).slice(0, 2).join("/");
    }

    let scope = "post";
    let placeholder = "Search Post";
    if (pathName.startsWith("/collection/")) {
        scope = "collection_item";
        const collectionId = pathName.split("/")[2];
        scope += `_${collectionId}`;
        placeholder = "Search Within Collection";
    } else if (pathName.startsWith("/collections")) {
        scope = "collection";
        placeholder = "Search Collection";
    }

    return (
        <form className="search-form" onSubmit={e => {
            e.preventDefault();
            let searchParams = new URLSearchParams();
            searchParams.set("query", queryString);
            navigate({ pathname: searchSite, search: searchParams.toString() });
            document.getElementById("App")?.focus();

            // hack: input field on PostSearch page remains focused after submitting query, since the input field cannot be accessed directly (ref prop gets overridden)
            // retrieve it via id and blur
            if (hideOnHome) {
                document.querySelectorAll("[id^=rw_][id$=_input]").forEach(el => {
                    if (el instanceof HTMLElement) {
                        el.blur();
                    }
                });
            }
        }}>
            <QueryAutocompleteSuggestionCombobox queryString={queryString} setQueryString={setQueryString} scope={scope} autoFocus={!hideOnHome} placeholder={placeholder} />
            <button className="search-button" type="submit"><FontAwesomeIcon icon={solid("magnifying-glass")}></FontAwesomeIcon></button>
        </form>
    );
}

export class App extends React.Component<{ isDesktop: boolean }, {
    jwt: string | null;
    user: User | null;
    loginExpiry: number | null;
    modalStack: ModalContent[];
}> {

    pendingLogin: Promise<AxiosResponse<LoginResponse, any>> | null;

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
        const pathName = window.location.pathname;
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

        return (
            <BrowserRouter basename={process.env.REACT_APP_PATH ? process.env.REACT_APP_PATH : "/"}>
                <div id="App">
                    <Navbar expand={this.isDesktop()} fixed='top' collapseOnSelect variant='dark'>
                        <Container style={{ margin: "0", width: "100%", flex: "1 auto", maxWidth: "none" }}>
                            <Navbar.Toggle aria-controls="responsive-navbar-nav" />
                            <NavbarCollapse style={this.isDesktop() ? {
                                justifyContent: "flex-start",
                                marginLeft: "25px"
                            } : {}}>
                                <Nav>
                                    <Nav.Link eventKey={0} active={pathName === "/"} className="nav-el" as={NavLink} to="/">Home</Nav.Link>
                                    <Nav.Link eventKey={1} active={pathName.startsWith("/post")} className="nav-el" as={NavLink} to="/posts">Posts</Nav.Link>
                                    <Nav.Link eventKey={2} active={pathName.startsWith("/collection")} className="nav-el" as={NavLink} to="/collections">Collections</Nav.Link>
                                </Nav>
                            </NavbarCollapse>

                            <div id="search-bar" style={{ position: this.isDesktop() ? "relative" : "absolute", width: this.isDesktop() ? "100%" : "calc(100vw - 68px)", right: this.isDesktop() ? "auto" : "12px", top: this.isDesktop() ? "auto" : "13px", "--search-bar-width": this.isDesktop() ? "25vw" : "calc(100vw - 68px - 27px - 24px)" }}>
                                <PostQueryInput hideOnHome></PostQueryInput>
                            </div>
                            <NavbarCollapse style={this.isDesktop() ? {
                                justifyContent: "flex-end",
                                marginRight: "25px",
                            } : {}}>
                                <Nav>
                                    <Nav.Item><button className="nav-el nav-el-right" disabled={!this.isLoggedIn()} style={{ textAlign: "left", fontSize: "var(--bs-nav-link-font-size)", fontWeight: "500" }} onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        if (this.state.user == null) {
                                            this.openModal("Error", <p>Must be logged in</p>);
                                        } else {
                                            this.openModal("Upload", uploadModal => <UploadDialogue app={this} modal={uploadModal}></UploadDialogue>);
                                        }
                                    }}><FontAwesomeIcon icon={solid("cloud-arrow-up")} /> Upload</button></Nav.Item>
                                    <Nav.Link eventKey={5} active className="nav-el" as={NavLink} to="/tags">Tags</Nav.Link>
                                    <Nav.Link eventKey={6} active className="nav-el nav-el-right" as={NavLink} to={this.state.user == null ? "/login" : "/profile"}>{this.state.user == null ? "Log In" : (this.state.user.display_name ?? this.state.user.user_name)}</Nav.Link>
                                </Nav>
                            </NavbarCollapse>
                        </Container>
                    </Navbar>
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
                                <Grow in={!modal.closed} timeout={MODAL_TRANSITION_TIMEOUT}>
                                    <Paper elevation={0} sx={paperStyle(modal.preventStretch)}>
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
                                    </Paper>
                                </Grow>
                            </Box>
                        </Modal>
                    )}
                </div>
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
                    <Route path="*" element={<NotFoundPage></NotFoundPage>}></Route>
                </Routes>
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

    private _lastPath: string | undefined;

    componentDidUpdate(): void {
        // Check if the pathname has changed
        const currentPath = window.location.pathname;
        if (this._lastPath && this._lastPath !== currentPath) {
            // Clear all modals when navigation occurs
            if (this.state.modalStack.length > 0) {
                this.setState({ modalStack: [] });
            }
        }
        this._lastPath = currentPath;
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
    ): ModalContent {
        const modal = new ModalContent(title, modalElement, this, closeCallback, allowClose, preventStretch, disableFocus);
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
        }, MODAL_TRANSITION_TIMEOUT);
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
