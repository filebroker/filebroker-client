import React from "react";
import App from "./App";
import http from "./http-common";
import {LoginResponse} from "./Login";

export class UserRegistration {
    user_name: string;
    password: string;
    email: string | null;
    avatar_url: string | null;

    constructor(
        userName: string,
        password: string,
        email: string | null,
        avatar_url: string | null
    ) {
        this.user_name = userName;
        this.password = password;
        this.email = email;
        this.avatar_url = avatar_url;
    }
}

class Register extends React.Component<{ app: App }, {
    password: string;
    userName: string;
}> {
    constructor(props: any) {
        super(props);
        this.state = {
            password: "",
            userName: ""
        }

        this.register = this.register.bind(this);
    }

    render(): React.ReactNode {
        return (
            <div className="LoginPage">
                <input type="text" placeholder="User Name"
                       onChange={(e) => this.setState({userName: e.currentTarget.value})}></input>
                <input type="password" placeholder="Password"
                       onChange={(e) => this.setState({password: e.currentTarget.value})}></input>
                <button onClick={this.register}>Register</button>
            </div>
        );
    }

    async register() {
        let response = await http.post<LoginResponse>("/register", new UserRegistration(this.state.userName, this.state.password, null, null));
        this.props.app.handleLogin(response.data);
    }
}

export default Register;
