import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import App from "../App";
import http from "../http-common";
import { LoginResponse } from "./Login";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { TextField } from "@mui/material";
import { PasswordStrengthMeter } from "../components/PasswordStrengthMeter";
import zxcvbn from "zxcvbn";

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

interface CheckUsernameResponse {
    valid: boolean;
    available: boolean;
}

class RegisterProps {
    app: App;

    constructor(app: App) {
        this.app = app;
    }
}

function Register({ app }: RegisterProps) {
    const [password, setPassword] = useState("");
    const [userName, setUserName] = useState("");
    const [loginDisabled, setLoginDisabled] = useState(false);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [passwordScore, setPasswordScore] = useState(0);
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [userNameInvalid, setUserNameInvalid] = useState(false);
    const [userNameTaken, setUserNameTaken] = useState(false);
    const [checkedUserName, setCheckedUserName] = useState<string | null>(null);
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

    async function checkUserName() {
        if (userName && userName !== checkedUserName) {
            let userNameToCheck = userName;
            let response = await http.get<CheckUsernameResponse>(`/check-username/${encodeURIComponent(userNameToCheck)}`);
            setUserNameInvalid(!response.data.valid);
            setUserNameTaken(!response.data.available);
            setCheckedUserName(userNameToCheck);
        }
    }

    useEffect(() => {
        return () => {
            setPassword("");
            setUserName("");
        };
    }, []);

    useEffect(() => {
        if (password) {
            setPasswordScore(zxcvbn(password, [userName]).score);
        } else {
            setPasswordScore(0);
        }
    }, [password]);

    return (
        <div id="Register">
            <div className="standard-form">
                <form autoComplete="off" onSubmit={(e) => {
                    e.preventDefault();
                    setLoginDisabled(true);
                    register();
                }}>
                    <h1>Register</h1>
                    <table className="fieldset-container">
                        <tbody>
                            <tr className="form-row">
                                <td className="form-row-full-td">
                                    <TextField
                                        label="User Name"
                                        variant="outlined"
                                        value={userName}
                                        fullWidth
                                        onChange={e => { setUserNameInvalid(false); setUserNameTaken(false); setUserName(e.currentTarget.value) }}
                                        inputProps={{ maxLength: 50 }}
                                        required
                                        onBlur={checkUserName}
                                    />
                                </td>
                            </tr>
                            {userName && userNameInvalid &&
                                <tr className="form-row">
                                    <p className="error-txt">User name is invalid: Cannot contain whitespace</p>
                                </tr>
                            }
                            {userName && userNameTaken && !userNameInvalid &&
                                <tr className="form-row">
                                    <p className="error-txt">User name is taken</p>
                                </tr>
                            }
                            <tr className="form-row">
                                <td className="form-row-full-td">
                                    <TextField
                                        label="Password"
                                        name="passwordNoFill"
                                        type="password"
                                        variant="outlined"
                                        value={password}
                                        fullWidth
                                        onChange={e => setPassword(e.currentTarget.value)} inputProps={{ maxLength: 255 }}
                                        required
                                        autoComplete="new-password"
                                    />
                                </td>
                            </tr>
                            {password &&
                                <tr className="form-row">
                                    <PasswordStrengthMeter passwordScore={passwordScore} />
                                    <br />
                                </tr>
                            }
                            <tr className="form-row">
                                <td className="form-row-full-td">
                                    <TextField
                                        label="Confirm Password"
                                        name="passwordNoFill2"
                                        type="password"
                                        variant="outlined"
                                        value={passwordConfirm}
                                        fullWidth
                                        onChange={e => setPasswordConfirm(e.currentTarget.value)} inputProps={{ maxLength: 255 }}
                                        required
                                        autoComplete="new-password"
                                    />
                                </td>
                            </tr>
                            {passwordConfirm && password && password !== passwordConfirm &&
                                <tr className="form-row">
                                    <p className="error-txt">Passwords do not match</p>
                                </tr>
                            }
                        </tbody>
                    </table>
                    <HCaptcha sitekey={process.env.REACT_APP_CAPTCHA_SITEKEY!} onVerify={setCaptchaToken} theme="dark" onExpire={() => setCaptchaToken(null)} onChalExpired={() => setCaptchaToken(null)} onError={() => setCaptchaToken(null)} />
                    <div className="standard-form-field"><button type="submit" className="standard-button-large" disabled={loginDisabled || userName.length === 0 || password.length === 0 || !captchaToken || passwordScore < 3 || !passwordConfirm || password !== passwordConfirm}>Register</button></div>
                </form>
            </div>
        </div>
    );
}

export default Register;
