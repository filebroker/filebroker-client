import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import http from "../http-common";
import App, { ModalContent, User } from "../App";
import "./Login.css";
import { Button, Paper, TextField, Tooltip } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { solid } from "@fortawesome/fontawesome-svg-core/import.macro";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { emailRegex } from "./Register";
import { PasswordStrengthMeter } from "../components/PasswordStrengthMeter";
import zxcvbn from "zxcvbn";
import { FontAwesomeSvgIcon } from "../components/FontAwesomeSvgIcon";

class LoginRequest {
    user_name: string;
    password: string;
    captcha_token: string | null;

    constructor(user_name: string, password: string, captcha_token: string | null) {
        this.user_name = user_name;
        this.password = password;
        this.captcha_token = captcha_token;
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

function Login({ app }: LoginProps) {
    const [password, setPassword] = useState("");
    const [userName, setUserName] = useState("");
    const [loginFailed, setLoginFailed] = useState(false);
    const [loginDisabled, setLoginDisabled] = useState(false);
    const [showCaptcha, setShowCaptcha] = useState(false);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const navigate = useNavigate();
    const { state }: any = useLocation();

    async function login() {
        const modal = app.openLoadingModal();
        try {
            let response = await http.post<LoginResponse>("/login", new LoginRequest(userName, password, showCaptcha ? captchaToken : null), { withCredentials: true });
            app.handleLogin(response.data);
            setLoginDisabled(false);
            setLoginFailed(false);
            if (state && state.from) {
                navigate(state.from, { replace: true });
            } else {
                navigate("/", { replace: true });
            }
            modal.close();
        } catch (e: any) {
            setLoginDisabled(false);
            modal.close();
            if (e?.response?.status >= 500) {
                console.log("Login failed: " + e);
                app.openModal("Error", <p>An error occurred logging in, please try again.</p>);
            } else if (e?.response?.data?.error_code === 400011) {
                setShowCaptcha(true);
            } else {
                setLoginFailed(true);
            }
        }
    }

    useEffect(() => {
        return () => {
            setPassword("");
            setUserName("");
            setLoginFailed(false);
        };
    }, []);

    useEffect(() => {
        setLoginFailed(false);
    }, [password, userName]);

    return (
        <div id="Login">
            <div className="form-container-center">
                <Paper elevation={2} className="form-paper">
                    <form className="form-paper-content" onSubmit={(e) => {
                        e.preventDefault();
                        setLoginDisabled(true);
                        login();
                    }}>
                        <h1>Login</h1>
                        <p>Or <Link className="underscore-button" to="/register">register</Link> for a new account</p>
                        <TextField
                            label="User Name"
                            variant="outlined"
                            value={userName}
                            error={loginFailed}
                            helperText={loginFailed && "Invalid Credentials"}
                            fullWidth
                            onChange={e => setUserName(e.currentTarget.value)}
                            inputProps={{ maxLength: 32 }}
                        />
                        <TextField
                            label="Password"
                            variant="outlined"
                            type="password"
                            value={password}
                            error={loginFailed}
                            helperText={loginFailed && "Invalid Credentials"}
                            fullWidth
                            onChange={e => setPassword(e.currentTarget.value)}
                            inputProps={{ maxLength: 255 }}
                        />
                        {showCaptcha &&
                            <HCaptcha sitekey={process.env.REACT_APP_CAPTCHA_SITEKEY!} onVerify={setCaptchaToken} theme="dark" onExpire={() => setCaptchaToken(null)} onChalExpired={() => setCaptchaToken(null)} onError={() => setCaptchaToken(null)} />
                        }
                        <Button type="submit" disabled={loginDisabled || userName.length === 0 || password.length === 0 || loginFailed || (showCaptcha && !captchaToken)} size="large" variant="contained" startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("right-to-bracket")} />}>Login</Button>
                        <button className="underscore-button" type="button" onClick={e => {
                            e.preventDefault();
                            app.openModal(
                                "Reset Password",
                                modal => <ResetPasswordForm app={app} modal={modal} initialUserName={userName} />,
                                (result: any) => {
                                    if (result) {
                                        app.handleLogin(result);
                                        setLoginDisabled(false);
                                        setLoginFailed(false);
                                        if (state && state.from) {
                                            navigate(state.from, { replace: true });
                                        } else {
                                            navigate("/", { replace: true });
                                        }
                                    }
                                }
                            );
                        }}>Forgot Password?</button>
                    </form>
                </Paper>
            </div>
        </div>
    );
}

class SendPasswordResetRequest {
    user_name: string;
    email: string;
    captcha_token: string | null;

    constructor(
        user_name: string,
        email: string,
        captcha_token: string | null
    ) {
        this.user_name = user_name;
        this.email = email;
        this.captcha_token = captcha_token;
    }
}

class PasswordResetRequest {
    user_name: string;
    email: string;
    otp: string;
    new_password: string;

    constructor(
        user_name: string,
        email: string,
        otp: string,
        new_password: string
    ) {
        this.user_name = user_name;
        this.email = email;
        this.otp = otp;
        this.new_password = new_password;
    }
}

function ResetPasswordForm({ app, modal, initialUserName }: { app: App, modal: ModalContent, initialUserName: string }) {
    const [userName, setUserName] = useState(initialUserName);
    const [email, setEmail] = useState("");
    const [emailInvalid, setEmailInvalid] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [passwordScore, setPasswordScore] = useState(0);
    const [invalidCredentials, setInvalidCredentials] = useState(false);

    useEffect(() => {
        if (email) {
            setEmailInvalid(!emailRegex.test(email));
        } else {
            setEmailInvalid(false);
        }
    }, [email]);

    useEffect(() => {
        if (newPassword) {
            setPasswordScore(zxcvbn(newPassword).score);
        } else {
            setPasswordScore(0);
        }
    }, [newPassword]);

    useEffect(() => {
        setInvalidCredentials(false);
    }, [otp]);

    useEffect(() => {
        setEmailSent(false);
    }, [userName, email])

    return (
        <div className="form-paper-content" style={{ padding: "10px" }}>
            <TextField
                label="User Name"
                variant="outlined"
                value={userName}
                type="email"
                fullWidth
                onChange={e => setUserName(e.currentTarget.value)}
            />
            <div className="form-paper-row">
                <TextField
                    label="Email"
                    variant="outlined"
                    value={email}
                    error={emailInvalid}
                    type="email"
                    fullWidth
                    onChange={e => setEmail(e.currentTarget.value)}
                />
                <Tooltip title="Password reset email will only be sent if the provided email address matches the verified email of the given user. For privacy reasons you will not get any feedback whether the address actually belongs to the given user.">
                    <FontAwesomeIcon icon={solid("circle-info")} />
                </Tooltip>
            </div>
            {emailSent && <>
                <TextField
                    label="OTP"
                    variant="outlined"
                    value={otp}
                    error={invalidCredentials}
                    fullWidth
                    onChange={e => setOtp(e.currentTarget.value)}
                />
                <TextField
                    label="New Password"
                    name="passwordNoFill"
                    type="password"
                    variant="outlined"
                    value={newPassword}
                    // use !! to force this to be a boolean instead of boolean | string
                    error={!!(passwordConfirm && newPassword && newPassword !== passwordConfirm)}
                    helperText={passwordConfirm && newPassword && newPassword !== passwordConfirm && "Passwords do not match"}
                    fullWidth
                    onChange={e => setNewPassword(e.currentTarget.value)} inputProps={{ maxLength: 255 }}
                    required
                    autoComplete="new-password"
                />
                {newPassword && <PasswordStrengthMeter passwordScore={passwordScore} />}
                <TextField
                    label="Confirm Password"
                    name="passwordNoFill2"
                    type="password"
                    variant="outlined"
                    value={passwordConfirm}
                    // use !! to force this to be a boolean instead of boolean | string
                    error={!!(passwordConfirm && newPassword && newPassword !== passwordConfirm)}
                    helperText={passwordConfirm && newPassword && newPassword !== passwordConfirm && "Passwords do not match"}
                    fullWidth
                    onChange={e => setPasswordConfirm(e.currentTarget.value)} inputProps={{ maxLength: 255 }}
                    required
                    autoComplete="new-password"
                />
            </>}
            {emailSent
                ? <Button size="large" variant="contained"  startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("key")} />} disabled={!email || emailInvalid || !userName || passwordScore < 3 || !newPassword || !passwordConfirm || newPassword !== passwordConfirm || invalidCredentials} onClick={async () => {
                    const loadingModal = app.openLoadingModal();
                    try {
                        let response = await http.post<LoginResponse>("reset-password", new PasswordResetRequest(userName, email, otp, newPassword), { withCredentials: true });
                        loadingModal.close();
                        modal.close(response.data);
                        app.openModal("Success", <p>Password has been reset and you are now logged in.</p>);
                    } catch (e: any) {
                        loadingModal.close();
                        if (e?.response?.data?.error_code === 401001) {
                            setInvalidCredentials(true);
                        } else if (e?.response?.data?.error_code === 400013) {
                            app.openModal("Error", <p>New password too weak.</p>);
                        } else {
                            console.log("Password reset failed: " + e);
                            app.openModal("Error", <p>An error occurred resetting the password, please try again.</p>);
                        }
                    }
                }}>Reset Password</Button>
                : <>
                    <HCaptcha sitekey={process.env.REACT_APP_CAPTCHA_SITEKEY!} onVerify={setCaptchaToken} theme="dark" onExpire={() => setCaptchaToken(null)} onChalExpired={() => setCaptchaToken(null)} onError={() => setCaptchaToken(null)} />
                    <Button size="large" variant="contained" startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("paper-plane")} />} disabled={!email || emailInvalid || !userName || !captchaToken} onClick={async () => {
                        const loadingModal = app.openLoadingModal();
                        try {
                            await http.post("send-password-reset", new SendPasswordResetRequest(userName, email, captchaToken));
                            setEmailSent(true);
                            loadingModal.close();
                            app.openModal("Email Sent", successModal => <div style={{ textAlign: "center" }}>
                                <p>If the provided email address matches the verified email of the provided user, an email with an OTP has been sent.<br></br>You can close this message and enter the OTP as well as select a new password.</p>
                                <Button size="large" variant="contained" startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("check")} />} onClick={() => successModal.close()}>Ok</Button>
                            </div>);
                        } catch (e) {
                            loadingModal.close();
                            console.error("Failed to send password reset mail: " + e);
                            app.openModal("Error", <p>Failed to send password reset email. Please try again.</p>);
                        }
                    }}>Send Reset OTP</Button>
                </>
            }
        </div>
    );
}

export default Login;
