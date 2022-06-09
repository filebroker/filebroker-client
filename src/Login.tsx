import React from "react";
import {Link} from "react-router-dom";
import http from "./http-common";
import App, {User} from "./App";

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

class Login extends React.Component<{ app: App }, {
    password: string;
    userName: string;
}> {

    constructor(props: any) {
        super(props);
        this.state = {
            password: "",
            userName: ""
        }

        this.login = this.login.bind(this);
    }

    render(): React.ReactNode {
        return (
            <div className="LoginPage">
                <input type="text" placeholder="User Name"
                       onChange={(e) => this.setState({userName: e.currentTarget.value})}></input>
                <input type="password" placeholder="Password"
                       onChange={(e) => this.setState({password: e.currentTarget.value})}></input>
                <button onClick={this.login}>Login</button>
                <Link to="/register">Register</Link>
            </div>
        );
    }

    async login() {
        let response = await http.post<LoginResponse>("/login", new LoginRequest(this.state.userName, this.state.password), { withCredentials: true });
        await this.props.app.handleLogin(response.data);
    }

}

export default Login;
