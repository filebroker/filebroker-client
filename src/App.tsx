import React from 'react';
import {BrowserRouter, Navigate, NavLink, Route, Routes} from "react-router-dom";
import logo from './logo.svg';
import './App.css';
import http from "./http-common";
import Home from './Home';
import Login, {LoginResponse} from './Login';
import {ProfilePage} from "./ProfilePage";
import Register from './Register';

export class User {
    user_name: string;
    email: string;
    avatar_url: string;
    creation_timestamp: string;

    constructor(
        user_name: string,
        email: string,
        avatar_url: string,
        creation_timestamp: string,
    ) {
        this.user_name = user_name;
        this.email = email;
        this.avatar_url = avatar_url;
        this.creation_timestamp = creation_timestamp;
    }
}

export class App extends React.Component<{}, {
    jwt: string | null;
    user: User | null;
    showRegisterMask: boolean;
    showLoginMask: boolean;
    initialLoginChecked: boolean;
}> {
    refreshLoginTimeout: NodeJS.Timeout | null;

    constructor(props: any) {
        super(props);
        this.state = {
            jwt: null,
            user: null,
            showRegisterMask: false,
            showLoginMask: false,
            initialLoginChecked: false
        };

        this.handleLogin = this.handleLogin.bind(this);
        this.refreshLogin = this.refreshLogin.bind(this);

        this.refreshLoginTimeout = null;
    }

    componentDidMount() {
        if (this.state.initialLoginChecked === false && this.refreshLoginTimeout === null) {
            http.post<LoginResponse>("/try-refresh-login")
                .then(response => {
                    if (this.refreshLoginTimeout !== null) {
                        clearTimeout(this.refreshLoginTimeout);
                    }
                    this.refreshLoginTimeout = setTimeout(this.refreshLogin, Math.max(10, response.data.expiration_secs) * 1000);
                    this.setState({
                        jwt: response.data.token,
                        user: response.data.user,
                        initialLoginChecked: true
                    });
                })
                .catch(() => {
                    console.log("INFO: Initial login expired or not present");
                    this.setState({
                        initialLoginChecked: true
                    });
                });
        }
    }

    componentWillUnmount() {
        if (this.refreshLoginTimeout !== null) {
            clearTimeout(this.refreshLoginTimeout);
            this.refreshLoginTimeout = null;
        }
    }

    render(): React.ReactNode {
        if (this.state.initialLoginChecked === false) {
            return (
                <LoadingPage></LoadingPage>
            );
        }

        let loginAccountLink;
        let profileElement;
        if (this.state.user == null) {
            loginAccountLink = <NavLink to="/login">Log In</NavLink>;
            profileElement = <Navigate to="/login"></Navigate>;
        } else {
            loginAccountLink = <NavLink to="/profile">{this.state.user.user_name}</NavLink>;
            profileElement = <ProfilePage user={this.state.user}></ProfilePage>;
        }

        return (
            <BrowserRouter basename={process.env.REACT_APP_PATH ? process.env.REACT_APP_PATH : "/"}>
                <div className="App">
                    <div id="nav">
                        <div id="nav-link">
                            <NavLink to="/">Home</NavLink>
                        </div>
                        <div id="nav-right">
                            {loginAccountLink}
                        </div>
                    </div>
                </div>
                <Routes>
                    <Route path="/" element={<Home></Home>}></Route>
                    <Route path="/login" element={<Login app={this}></Login>}></Route>
                    <Route path="/profile" element={profileElement}></Route>
                    <Route path="/register" element={<Register app={this}></Register>}></Route>
                    <Route path="*" element={<NotFoundPage></NotFoundPage>}></Route>
                </Routes>
            </BrowserRouter>
        );
    }

    async handleLogin(loginResponse: LoginResponse) {
        this.setState({
            jwt: loginResponse.token,
            user: loginResponse.user
        });

        setTimeout(this.refreshLogin, Math.max(10, loginResponse.expiration_secs) * 1000);
    }

    async refreshLogin() {
        try {
            let response = await http.post<LoginResponse>("/refresh-login");
            this.setState({
                jwt: response.data.token
            });

            setTimeout(this.refreshLogin, Math.max(10, response.data.expiration_secs) * 1000);
        } catch (e) {
            console.log("Failed to refresh login: " + e);
        }
    }

    getAuthHeader() {
        return {
            headers: {
                authorization: `Bearer ${this.state.jwt}`
            }
        }
    }
}

export class LoadingPage extends React.Component {
    constructor(props: any) {
        super(props);
    }

    render() {
        return (
            <div className="App">
                <header className="App-header">
                    <img src={logo} className="App-logo" alt="logo"/>
                    <h1>Loading</h1>
                </header>
            </div>
        );
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
