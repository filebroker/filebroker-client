import { useEffect, useState } from "react";
import {Link, useLocation, useNavigate} from "react-router-dom";
import http from "./http-common";
import App, {User} from "./App";
import "./Login.css";

class LoginRequest {
    user_name: string;
    password: string;

    constructor(user_name: string, password: string) {
        this.user_name = user_name;
        this.password = password;
    }
}

export class LoginResponse {
    token: string;
    expiration_secs: number;
    user: User;

    constructor(token: string, expiration_secs: number, user: User) {
        this.token = token;
        this.expiration_secs = expiration_secs;
        this.user = user;
    }
}

class LoginProps {
    app: App;

    constructor(app: App) {
        this.app = app;
    }
}

function Login({app}: LoginProps) {
    const [password, setPassword] = useState("");
    const [userName, setUserName] = useState("");
    const [loginFailed, setLoginFailed] = useState(false);
    const [loginDisabled, setLoginDisabled] = useState(false);
    const navigate = useNavigate();
    const { state }: any = useLocation();
 
    async function login() {
        try {
            let response = await http.post<LoginResponse>("/login", new LoginRequest(userName, password), { withCredentials: true });
            app.handleLogin(response.data);
            setLoginDisabled(false);
            setLoginFailed(false);
            if (state && state.from) {
                navigate(state.from, { replace: true });
            } else {
                navigate("/", { replace: true });
            }
        } catch (e) {
            setLoginDisabled(false);
            setLoginFailed(true);
            console.log("Login failed: " + e);
        }
    }

    useEffect(() => {
        return () => {
            setPassword("");
            setUserName("");
            setLoginFailed(false);
        };
    }, []);

    let loginFailedComponent;
    if (loginFailed) {
        loginFailedComponent = <div id="login-failed"><p>Login failed</p></div>
    }

    return (
        <div id="Login">
            <div className="standard-form">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    setLoginDisabled(true);
                    login();
                }}>
                    <h1>Login</h1>
                    <div id="register-link"><p>Or <Link to="/register">register</Link> for a new account</p></div>
                    {loginFailedComponent}
                    <div className="standard-form-field"><input type="text" placeholder="User Name" value={userName}
                        onChange={(e) => setUserName(e.currentTarget.value)} required></input></div>
                    <div className="standard-form-field"><input type="password" placeholder="Password" value={password}
                        onChange={(e) => setPassword(e.currentTarget.value)} required></input></div>
                    <div className="standard-form-field"><button type="submit" className="standard-button-large" disabled={loginDisabled || userName.length == 0 || password.length == 0}>Login</button></div>
                </form>
            </div>
        </div>
    );
}

export default Login;
