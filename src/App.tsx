import React from 'react';
import {BrowserRouter, Location, Navigate, NavigateFunction, NavLink, Route, Routes} from "react-router-dom";
import logo from './logo.svg';
import './App.css';
import http from "./http-common";
import PostSearch from './PostSearch';
import Login, {LoginResponse} from './Login';
import {ProfilePage} from "./ProfilePage";
import Register from './Register';
import Post from './Post';
import Home from './Home';

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
    loginExpiry: number | null;
}> {

    constructor(props: any) {
        super(props);
        this.state = {
            jwt: null,
            user: null,
            showRegisterMask: false,
            showLoginMask: false,
            loginExpiry: null
        };

        this.handleLogin = this.handleLogin.bind(this);
        this.refreshLogin = this.refreshLogin.bind(this);
    }

    render(): React.ReactNode {
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
                        <div className="nav-el"><NavLink to="/">Home</NavLink></div>
                        <div className="nav-el"><NavLink to="/posts">Posts</NavLink></div>
                        <div className="nav-el">{loginAccountLink}</div>
                    </div>
                </div>
                <Routes>
                    <Route path="/" element={<Home></Home>}></Route>
                    <Route path="/posts" element={<PostSearch app={this}></PostSearch>}></Route>
                    <Route path="/login" element={<Login app={this}></Login>}></Route>
                    <Route path="/profile" element={profileElement}></Route>
                    <Route path="/register" element={<Register app={this}></Register>}></Route>
                    <Route path="/post/:id" element={<Post app={this}></Post>}></Route>
                    <Route path="*" element={<NotFoundPage></NotFoundPage>}></Route>
                </Routes>
            </BrowserRouter>
        );
    }

    handleLogin(loginResponse: LoginResponse) {
        this.setState({
            jwt: loginResponse.token,
            user: loginResponse.user,
            loginExpiry: Date.now() + (loginResponse.expiration_secs - 10) * 1000
        });
    }

    async getAuthorization(location: Location, navigate: NavigateFunction) {
        if (this.state.loginExpiry == null || this.state.loginExpiry < Date.now()) {
            try {
                let response = await http.post<LoginResponse>("/try-refresh-login", null, { withCredentials: true });
                if (response.data != null) {
                    this.handleLogin(response.data);
                    return {
                        headers: {
                            authorization: `Bearer ${response.data.token}`
                        }
                    };
                }
            } catch (e: any) {
                console.log("Failed to refresh login: " + e);
                if (e.response.status == 401) {
                    navigate("/login", { state: { from: location }, replace: true})
                }
            }
        } else if (this.state.jwt != null) {
            return {
                headers: {
                    authorization: `Bearer ${this.state.jwt}`
                }
            };
        }
    }

    async refreshLogin() {
        try {
            let response = await http.post<LoginResponse>("/refresh-login", null, { withCredentials: true });
            this.setState({
                jwt: response.data.token
            });

            setTimeout(this.refreshLogin, Math.max(10, response.data.expiration_secs) * 1000);
        } catch (e) {
            console.log("Failed to refresh login: " + e);
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
