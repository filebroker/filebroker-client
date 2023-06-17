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
import Modal from 'react-modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { solid } from '@fortawesome/fontawesome-svg-core/import.macro';
import UploadDialogue from './components/UploadDialogue';
import { AnalyzeQueryRequest, AnalyzeQueryResponse, QueryAutocompleteSuggestion } from './Model';
import { replaceStringRange } from './Util';
import { Combobox } from '@filebroker/react-widgets/lib/cjs';
import { EmailConfirmation } from './routes/EmailConfirmation';

export class User {
    user_name: string;
    email: string | null;
    avatar_url: string;
    creation_timestamp: string;
    email_confirmed: boolean;
    display_name: string | null;

    constructor(
        user_name: string,
        email: string | null,
        avatar_url: string,
        creation_timestamp: string,
        email_confirmed: boolean,
        display_name: string | null
    ) {
        this.user_name = user_name;
        this.email = email;
        this.avatar_url = avatar_url;
        this.creation_timestamp = creation_timestamp;
        this.email_confirmed = email_confirmed;
        this.display_name = display_name;
    }
}

export class ModalContent {
    title: string;
    content: JSX.Element | ((modal: ModalContent) => JSX.Element);
    closeCallback: ((result: any) => void) | undefined;
    showCloseButton: boolean;
    app: App;
    closed: boolean = false;

    constructor(title: string, content: JSX.Element | ((modal: ModalContent) => JSX.Element), app: App, closeCallback: ((result: any) => void) | undefined, showCloseButton: boolean) {
        this.title = title;
        this.content = content;
        this.closeCallback = closeCallback;
        this.showCloseButton = showCloseButton;
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
    const [queryAutocompleteSuggestions, setQueryAutocompleteSuggestions] = useState<QueryAutocompleteSuggestion[]>([]);

    useEffect(() => {
        setQueryString(queryParam);
    }, [location]);

    if (hideOnHome && pathName === "/") {
        return null;
    }

    let scheduledRequest: NodeJS.Timeout | null = null;

    function handleQueryChange(cursorPos: number, query: string) {
        setQueryAutocompleteSuggestions([]);
        if (scheduledRequest) {
            clearTimeout(scheduledRequest);
        }
        scheduledRequest = setTimeout(async () => {
            const response = await http.post<AnalyzeQueryResponse>("analyze-query", new AnalyzeQueryRequest(cursorPos, query));
            setQueryAutocompleteSuggestions(response.data.suggestions);
        }, 250);
    }

    return (
        <form className="search-form" onSubmit={e => {
            e.preventDefault();
            let searchParams = new URLSearchParams();
            searchParams.set("query", queryString);
            navigate({ pathname: "/posts", search: searchParams.toString() });
            setQueryAutocompleteSuggestions([]);
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
            <Combobox hideCaret hideEmptyPopup data={queryAutocompleteSuggestions} textField="display" value={queryString} onChange={(value, event) => {
                if (typeof value === "string") {
                    setQueryString(value);
                    let inputElement = event.originalEvent!!.currentTarget as HTMLInputElement;
                    handleQueryChange(inputElement.selectionStart || value.length, value);
                } else {
                    let prevVal = event.lastValue as string;
                    let targetLocation = value.target_location;
                    let newVal = replaceStringRange(prevVal, targetLocation.start, targetLocation.end + 1, value.text);
                    setQueryString(newVal);
                    setQueryAutocompleteSuggestions([]);
                }
            }} placeholder="Search" filter={() => true} autoFocus={!hideOnHome} inputProps={{ autoFocus: !hideOnHome }}></Combobox>
            <button className="search-button" type="submit"><FontAwesomeIcon icon={solid("magnifying-glass")}></FontAwesomeIcon></button>
        </form>
    );
}

export class App extends React.Component<{}, {
    jwt: string | null;
    user: User | null;
    loginExpiry: number | null;
    modalStack: ModalContent[];
}> {

    pendingLogin: Promise<AxiosResponse<LoginResponse, any>> | null;

    constructor(props: any) {
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
        let loginAccountLink;
        if (this.state.user == null) {
            loginAccountLink = <NavLink to="/login">Log In</NavLink>;
        } else {
            loginAccountLink = <NavLink to="/profile">{this.state.user.display_name ?? this.state.user.user_name}</NavLink>;
        }

        const modalStyles = {
            content: {
                top: '50%',
                left: '50%',
                right: 'auto',
                bottom: 'auto',
                marginRight: '-50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: "#161b22",
                color: "white",
                padding: "10px"
            },
            overlay: {
                backgroundColor: "rgba(0, 0, 0, 0.75)",
                zIndex: 1000
            }
        };

        return (
            <BrowserRouter basename={process.env.REACT_APP_PATH ? process.env.REACT_APP_PATH : "/"}>
                <div id="App">
                    <div id="nav">
                        <div id="nav-box-left">
                            <div className="nav-el"><NavLink to="/">Home</NavLink></div>
                            <div className="nav-el"><NavLink to="/posts">Posts</NavLink></div>
                        </div>

                        <div id="search-bar">
                            <PostQueryInput hideOnHome></PostQueryInput>
                        </div>

                        <div id="nav-box-right">
                            <button className="nav-el nav-el-right" onClick={() => {
                                if (this.state.user == null) {
                                    this.openModal("Error", <p>Must be logged in</p>);
                                } else {
                                    this.openModal("Upload", uploadModal => <UploadDialogue app={this} modal={uploadModal}></UploadDialogue>);
                                }
                            }}><FontAwesomeIcon icon={solid("cloud-arrow-up")} /> Upload</button>
                            <div className="nav-el nav-el-right">{loginAccountLink}</div>
                        </div>
                    </div>
                    {this.state.modalStack.map(modal => {
                        return <Modal isOpen={true} style={modalStyles} contentLabel={modal.title} key={modal.title}>
                            <div id="modal-title-row">
                                <button hidden={!modal.showCloseButton} disabled={!modal.showCloseButton} id="modal-close-btn" onClick={() => this.closeModal(modal)}>
                                    <FontAwesomeIcon icon={solid("xmark")} size="2x" />
                                </button>
                                <span id="modal-title">{modal.title}</span>
                            </div>
                            <div id="modal-content">
                                {React.isValidElement(modal.content) ? modal.content : (modal.content as unknown as ((modal: ModalContent) => JSX.Element))(modal)}
                            </div>
                        </Modal>
                    })}
                </div>
                <Routes>
                    <Route path="/" element={<Home></Home>}></Route>
                    <Route path="/posts" element={<PostSearch app={this}></PostSearch>}></Route>
                    <Route path="/login" element={<Login app={this}></Login>}></Route>
                    <Route path="/profile" element={<ProfilePage app={this} initialUser={this.state.user}></ProfilePage>}></Route>
                    <Route path="/register" element={<Register app={this}></Register>}></Route>
                    <Route path="/post/:id" element={<Post app={this}></Post>}></Route>
                    <Route path="/confirm-email/:token" element={<EmailConfirmation app={this}></EmailConfirmation>}></Route>
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

    openModal(title: string, modalElement: JSX.Element | ((modal: ModalContent) => JSX.Element), closeCallback: ((result: any) => void) | undefined = undefined, showCloseButton: boolean = true): ModalContent {
        const modal = new ModalContent(title, modalElement, this, closeCallback, showCloseButton);
        this.setState(state => {
            const newModalStack = state.modalStack.concat(modal);
            return {
                modalStack: newModalStack
            }
        });
        return modal;
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
