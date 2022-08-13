import { useNavigate } from "react-router-dom";
import App, { User } from "./App";
import http from "./http-common";

class ProfilePageProps {
    app: App;
    user: User;

    constructor(app: App, user: User) {
        this.app = app;
        this.user = user;
    }
}

export function ProfilePage({app, user}: ProfilePageProps) {
    const navigate = useNavigate();

    async function handleLogout() {
        await http.post("/logout", null, { withCredentials: true });
        app.setState({
            jwt: null,
            user: null,
            loginExpiry: null
        });
        navigate("/");
    }

    return (
        <div id="Profile">
            <div className="standard-form">
                <button className="standard-button" onClick={handleLogout}>Logout</button>
                <h1>Profile</h1>
                <p>{user.user_name}</p>
            </div>
        </div>
    );
}
