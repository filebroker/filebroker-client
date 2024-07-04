import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import App, { ModalContent, User } from "../App";
import http from "../http-common";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { solid } from "@fortawesome/fontawesome-svg-core/import.macro";
import { Button, Paper, TextField } from "@mui/material";
import { emailRegex } from "./Register";
import { PasswordStrengthMeter } from "../components/PasswordStrengthMeter";
import zxcvbn from "zxcvbn";
import { LoginResponse } from "./Login";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { FontAwesomeSvgIcon } from "../components/FontAwesomeSvgIcon";

class ProfilePageProps {
    app: App;
    initialUser: User | null;

    constructor(app: App, initialUser: User | null) {
        this.app = app;
        this.initialUser = initialUser;
    }
}

class UpdateUserRequest {
    display_name: string | null;
    email: string | null;
    avatar_url: string | null;

    constructor(
        display_name: string | null,
        email: string | null,
        avatar_url: string | null
    ) {
        this.display_name = display_name;
        this.email = email;
        this.avatar_url = avatar_url;
    }
}

export function ProfilePage({ app, initialUser }: ProfilePageProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(initialUser);
    const [editMode, setEditMode] = useState(false);
    const [displayName, setDisplayName] = useState("");
    const [userName, setUserName] = useState("");
    const [email, setEmail] = useState("");
    const [emailInvalid, setEmailInvalid] = useState(false);

    async function handleLogout() {
        await http.post("/logout", null, { withCredentials: true });
        app.setState({
            jwt: null,
            user: null,
            loginExpiry: null
        });
        navigate("/");
    }

    useEffect(() => {
        let fetch = async () => {
            let config = await app.getAuthorization(location, navigate);
            let response = await http.get<User>("current-user-info", config);
            setUser(response.data);
        };

        fetch().catch(console.error);
    }, [editMode]);

    useEffect(() => {
        setDisplayName(user?.display_name ?? "");
        setUserName(user?.user_name ?? "");
        setEmail(user?.email ?? "");
    }, [user]);

    useEffect(() => {
        if (email) {
            setEmailInvalid(!emailRegex.test(email));
        } else {
            setEmailInvalid(false);
        }
    }, [email]);

    let profileContent;
    if (user != null) {
        profileContent = <>
            <h1>Profile</h1>
            <TextField
                label="User Name"
                variant="standard"
                value={userName}
                InputProps={{
                    readOnly: true,
                }}
                fullWidth
            />
            <TextField
                label="Display Name"
                variant="outlined"
                value={displayName}
                disabled={!editMode && !displayName}
                InputProps={{
                    readOnly: !editMode,
                }}
                fullWidth
                onChange={e => setDisplayName(e.currentTarget.value)}
                inputProps={{ maxLength: 32 }}
            />
            <TextField
                label="Email"
                variant="outlined"
                value={email}
                disabled={!editMode && !email}
                error={emailInvalid}
                type="email"
                InputProps={{
                    readOnly: !editMode,
                }}
                fullWidth
                onChange={e => setEmail(e.currentTarget.value)}
            />
            {!user.email_confirmed && user.email && <span>
                <button className="underscore-button" onClick={async () => {
                    const loadingModal = app.openLoadingModal();
                    try {
                        let config = await app.getAuthorization(location, navigate);
                        await http.post("send-email-confirmation-link", null, config);
                        loadingModal.close();
                        app.openModal("Success", <p>A confirmation link has been sent to your email address.</p>);
                    } catch (e) {
                        console.error("Failed to send email confirmation link " + e);
                        loadingModal.close();
                        app.openModal("Error", <p>An error occurred sending the confirmation link, please try again.</p>);
                    }
                }}>Click here</button> to confirm your email address</span>}
        </>;
    } else {
        profileContent = <div className="loading-container">
            <FontAwesomeIcon icon={solid("circle-notch")} spin size="6x"></FontAwesomeIcon>
        </div>;
    }

    return (
        <div id="Profile">
            <div className="form-container-center">
                <Paper elevation={2} className="form-paper">
                    <div className="form-paper-content">
                        {profileContent}
                        <div className="form-paper-button-row form-paper-button--expanded">
                            {editMode
                                ? <Button variant="outlined" startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("xmark")} />} onClick={() => setEditMode(false)}>Cancel</Button>
                                : <Button variant="outlined" startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("pen-to-square")} />} onClick={() => setEditMode(true)}>Edit</Button>}
                            <Button variant="outlined" hidden={editMode} startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("sign-out")} />} onClick={handleLogout}>Logout</Button>
                            <Button variant="outlined" hidden={!editMode} disabled={emailInvalid} startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("save")} />} onClick={async () => {
                                const modal = app.openLoadingModal();
                                try {
                                    let config = await app.getAuthorization(location, navigate);
                                    let response = await http.post<User>("edit-user", new UpdateUserRequest(displayName, email, null), config);
                                    setUser(response.data);
                                    setEditMode(false);
                                    modal.close();
                                } catch (e) {
                                    modal.close();
                                    console.error("An error occurred updating the user: " + e);
                                    app.openModal("Error", <p>An error occurred updating the user, please try again.</p>);
                                }
                            }}>Save</Button>
                            {user && <Button variant="outlined" startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("key")} />} onClick={() => {
                                app.openModal("Change Password", (modal) => <ChangePasswordForm app={app} user={user} modal={modal} />);
                            }}>Change Password</Button>}
                        </div>
                    </div>
                </Paper>
            </div>
        </div>
    );
}

class ChangePasswordRequest {
    password: string;
    new_password: string;
    captcha_token: string | null;

    constructor(password: string, new_password: string, captcha_token: string | null) {
        this.password = password;
        this.new_password = new_password;
        this.captcha_token = captcha_token;
    }
}

function ChangePasswordForm({ app, user, modal }: { app: App, user: User, modal: ModalContent }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [loginFailed, setLoginFailed] = useState(false);
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [passwordScore, setPasswordScore] = useState(0);
    const [showCaptcha, setShowCaptcha] = useState(false);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);

    useEffect(() => {
        if (newPassword) {
            setPasswordScore(zxcvbn(newPassword, [user.user_name, user.email ?? "", user.display_name ?? ""]).score);
        } else {
            setPasswordScore(0);
        }
    }, [newPassword, user]);

    useEffect(() => {
        setLoginFailed(false);
    }, [password]);

    return (
        <div className="form-paper-content" style={{ padding: "10px" }}>
            <TextField
                label="Password"
                variant="outlined"
                type="password"
                value={password}
                error={loginFailed || (!!password && password === newPassword)}
                helperText={loginFailed ? "Invalid Credentials" : (!!password && password === newPassword) ? "New password cannot match old password" : null}
                fullWidth
                onChange={e => setPassword(e.currentTarget.value)}
                inputProps={{ maxLength: 255 }}
                required
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
            {showCaptcha &&
                <HCaptcha sitekey={process.env.REACT_APP_CAPTCHA_SITEKEY!} onVerify={setCaptchaToken} theme="dark" onExpire={() => setCaptchaToken(null)} onChalExpired={() => setCaptchaToken(null)} onError={() => setCaptchaToken(null)} />
            }
            <Button disabled={!password || passwordScore < 3 || !newPassword || !passwordConfirm || newPassword !== passwordConfirm || newPassword === password || (showCaptcha && !captchaToken)} size="large" variant="contained" startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("save")} />} onClick={async () => {
                let config = await app.getAuthorization(location, navigate);
                const loadingModal = app.openLoadingModal();
                try {
                    let loginResponse = await http.post<LoginResponse>("change-password", new ChangePasswordRequest(password, newPassword, showCaptcha ? captchaToken : null), { ...config, withCredentials: true });
                    app.handleLogin(loginResponse.data);
                    loadingModal.close();
                    modal.close();
                    app.openModal("Success", <p>Password changed successfully.</p>);
                } catch (e: any) {
                    loadingModal.close();
                    if (e?.response?.status >= 500) {
                        console.log("Changing password failed: " + e);
                        app.openModal("Error", <p>An error occurred changing password, please try again.</p>);
                    } else if (e?.response?.data?.error_code === 400011) {
                        setShowCaptcha(true);
                    } else {
                        setLoginFailed(true);
                    }
                }
            }}>Save</Button>
        </div>
    );
}
