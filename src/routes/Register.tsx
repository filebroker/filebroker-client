import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import App from "../App";
import http from "../http-common";
import {LoginResponse} from "./Login";
import HCaptcha from "@hcaptcha/react-hcaptcha";

export class UserRegistration {
    user_name: string;
    password: string;
    email: string | null;
    avatar_url: string | null;
    captcha_token: string | null;

    constructor(
        userName: string,
        password: string,
        email: string | null,
        avatar_url: string | null,
        captcha_token: string | null
    ) {
        this.user_name = userName;
        this.password = password;
        this.email = email;
        this.avatar_url = avatar_url;
        this.captcha_token = captcha_token;
    }
}

class RegisterProps {
    app: App;

    constructor(app: App) {
        this.app = app;
    }
}

function Register({app}: RegisterProps) {
    const [password, setPassword] = useState("");
    const [userName, setUserName] = useState("");
    const [loginDisabled, setLoginDisabled] = useState(false);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const navigate = useNavigate();
 
    async function register() {
        try {
            let response = await http.post<LoginResponse>("/register", new UserRegistration(userName, password, null, null, captchaToken));
            setLoginDisabled(false);
            app.handleLogin(response.data);
            navigate("/profile");
        } catch (e) {
            setLoginDisabled(false);
            console.error("Register failed: " + e);
        }
    }

    useEffect(() => {
        return () => {
            setPassword("");
            setUserName("");
        };
    }, []);

    return (
        <div id="Register">
            <div className="standard-form">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    setLoginDisabled(true);
                    register();
                }}>
                    <h1>Register</h1>
                    <div className="standard-form-field"><input type="text" placeholder="User Name" value={userName}
                        onChange={(e) => setUserName(e.currentTarget.value)} required></input></div>
                    <div className="standard-form-field"><input type="password" placeholder="Password" value={password}
                        onChange={(e) => setPassword(e.currentTarget.value)} required></input></div>
                    <HCaptcha sitekey={process.env.REACT_APP_CAPTCHA_SITEKEY!} onVerify={setCaptchaToken} theme="dark"/>
                    <div className="standard-form-field"><button type="submit" className="standard-button-large" disabled={loginDisabled || userName.length === 0 || password.length === 0 || !captchaToken}>Register</button></div>
                </form>
            </div>
        </div>
    );
}

export default Register;
