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
    display_name: string;
    user_name: string;
    password: string;
    email: string | null;
    avatar_url: string | null;
    captcha_token: string | null;

    constructor(
        display_name: string,
        userName: string,
        password: string,
        email: string | null,
        avatar_url: string | null,
        captcha_token: string | null
    ) {
        this.display_name = display_name;
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

export const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

function Register({ app }: RegisterProps) {
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [userName, setUserName] = useState("");
    const [email, setEmail] = useState("");
    const [emailInvalid, setEmailInvalid] = useState(false);
    const [loginDisabled, setLoginDisabled] = useState(false);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [passwordScore, setPasswordScore] = useState(0);
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [userNameInvalid, setUserNameInvalid] = useState(false);
    const [userNameTaken, setUserNameTaken] = useState(false);
    const [checkedUserName, setCheckedUserName] = useState<string | null>(null);
    const navigate = useNavigate();

    async function register() {
        const modal = app.openLoadingModal();
        try {
            let response = await http.post<LoginResponse>("/register", new UserRegistration(displayName, userName, password, email, null, captchaToken), { withCredentials: true });
            setLoginDisabled(false);
            app.handleLogin(response.data);
            navigate("/profile");
            modal.close();
        } catch (e) {
            setLoginDisabled(false);
            console.error("Register failed: " + e);
            modal.close();
            app.openModal("Error", <p>An error occurred while registering, please try again.</p>);
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
            setPasswordScore(zxcvbn(password, [userName, email, displayName]).score);
        } else {
            setPasswordScore(0);
        }
    }, [password, userName, email, displayName]);

    useEffect(() => {
        if (email) {
            setEmailInvalid(!emailRegex.test(email));
        } else {
            setEmailInvalid(false);
        }
    }, [email]);

    return (
        <div id="Register">
            <div className="standard-form">
                <form onSubmit={(e) => {
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
                                        label="Display Name"
                                        variant="outlined"
                                        value={displayName}
                                        fullWidth
                                        onChange={e => setDisplayName(e.currentTarget.value)}
                                        inputProps={{ maxLength: 32 }}
                                    />
                                </td>
                            </tr>
                            <tr className="form-row">
                                <td className="form-row-full-td">
                                    <TextField
                                        label="User Name"
                                        variant="outlined"
                                        value={userName}
                                        error={userNameInvalid || userNameTaken}
                                        helperText={(userNameInvalid || userNameTaken) && (userNameInvalid ? "User name invalid: cannot contain whitespace" : "User name taken")}
                                        fullWidth
                                        onChange={e => { setUserNameInvalid(false); setUserNameTaken(false); setUserName(e.currentTarget.value) }}
                                        inputProps={{ maxLength: 25 }}
                                        required
                                        onBlur={checkUserName}
                                    />
                                </td>
                            </tr>
                            <tr className="form-row">
                                <td className="form-row-full-td">
                                    <TextField
                                        label="Email"
                                        variant="outlined"
                                        type="email"
                                        error={emailInvalid}
                                        value={email}
                                        fullWidth
                                        onChange={e => setEmail(e.currentTarget.value)}
                                    />
                                </td>
                            </tr>
                            <tr className="form-row">
                                <td className="form-row-full-td">
                                    <TextField
                                        label="Password"
                                        name="passwordNoFill"
                                        type="password"
                                        variant="outlined"
                                        value={password}
                                        // use !! to force this to be a boolean instead of boolean | string
                                        error={!!(passwordConfirm && password && password !== passwordConfirm)}
                                        helperText={passwordConfirm && password && password !== passwordConfirm && "Passwords do not match"}
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
                                        // use !! to force this to be a boolean instead of boolean | string
                                        error={!!(passwordConfirm && password && password !== passwordConfirm)}
                                        helperText={passwordConfirm && password && password !== passwordConfirm && "Passwords do not match"}
                                        fullWidth
                                        onChange={e => setPasswordConfirm(e.currentTarget.value)} inputProps={{ maxLength: 255 }}
                                        required
                                        autoComplete="new-password"
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <HCaptcha sitekey={process.env.REACT_APP_CAPTCHA_SITEKEY!} onVerify={setCaptchaToken} theme="dark" onExpire={() => setCaptchaToken(null)} onChalExpired={() => setCaptchaToken(null)} onError={() => setCaptchaToken(null)} />
                    <div className="standard-form-field"><button type="submit" className="standard-button-large" disabled={loginDisabled || userName.length === 0 || password.length === 0 || !captchaToken || passwordScore < 3 || !passwordConfirm || password !== passwordConfirm || emailInvalid}>Register</button></div>
                </form>
            </div>
        </div>
    );
}

export default Register;
