import "./Home.css";
import { GlobalQueryInput } from "../components/QueryInput";
import React from "react";

function Home() {
    return (
        <div id="Home">
            <div><h1>filebroker</h1></div>
            <div id="home-search">
                <GlobalQueryInput />
            </div>
        </div>
    );
}

export default Home;
