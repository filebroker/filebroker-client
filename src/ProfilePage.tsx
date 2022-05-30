import { userInfo } from 'os';
import React from 'react';
import { User } from "./App";

export class ProfilePage extends React.Component<{
    user: User;
}> {
    constructor(props: any) {
        super(props);
    }

    render() {
        return (
            <div className="ProfilePage">
                <h1>Profile</h1>
                <p>{this.props.user.user_name}</p>
            </div>
        );
    }
}
