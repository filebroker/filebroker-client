import React from "react";

class Home extends React.Component {
    constructor(props: any) {
        super(props);
        this.state = {
            showRegisterMask: false,
            showLoginMask: false,
            user: null
        };
    }

    render() {
        return (
            <div className="Home">
                <h1>Welcome</h1>
            </div>
        );
    }
}

export default Home;
