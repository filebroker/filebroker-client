import { PostQueryInput } from "./App";
import "./Home.css";

function Home() {
    return (
        <div id="Home">
            <div><h1>filebroker</h1></div>
            <div id="home-search">
                <PostQueryInput></PostQueryInput>
            </div>
        </div>
    );
}

export default Home;
