import "./Home.css";
import { GlobalQueryInput } from "../components/query/QueryInput";
import React from "react";
import App from "../App";

function Home({ app }: { app: App }) {
    return (
        <div id="Home">
            <div>
                <h1>filebroker</h1>
            </div>
            <div id="home-search">
                <GlobalQueryInput app={app} />
            </div>
        </div>
    );
}

export default Home;
