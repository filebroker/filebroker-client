import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import App, { User } from "../App";
import http from "../http-common";
import { LoginResponse } from "./Login";

class ProfilePageProps {
    app: App;
    initialUser: User | null;

    constructor(app: App, initialUser: User | null) {
        this.app = app;
        this.initialUser = initialUser;
    }
}

export function ProfilePage({app, initialUser}: ProfilePageProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(initialUser);

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
            try {
                let response = await http.post<LoginResponse>("/try-refresh-login", null, { withCredentials: true });
                app.handleLogin(response.data);
                setUser(response.data.user);
            } catch (e: any) {
                console.log("Failed to refresh login: " + e);
                if (e.response.status === 401) {
                    navigate("/login", { state: { from: location }, replace: true})
                }
            }
        };

        if (app.state.user != null) {
            setUser(app.state.user);
        } else {
            fetch().catch(console.error);
        }
    }, []);

    let profileContent;
    if (user != null) {
        profileContent = <div id="profile-content">
            <h1>Profile</h1>
            <p>{user.user_name}</p>
        </div>;
    } else {
        profileContent = <div id="profile-content"><p>Loading...</p></div>
    }

    return (
        <div id="Profile">
            <div className="standard-form">
                <button className="standard-button-large" onClick={handleLogout}>Logout</button>
                {profileContent}
            </div>
        </div>
    );
}
