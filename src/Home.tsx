import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Home() {
    const navigate = useNavigate();
    const [queryString, setQueryString] = useState("");

    let queryInput = <input id="query-input" type="text" value={queryString} onChange={e => setQueryString(e.currentTarget.value)}></input>;

    function handleSearchQuery() {
        navigate({pathname: "/posts", search: "?query=" + queryString});
    }

    return (
        <div id="Home">
            <form id="home-search-form" onSubmit={e => {
                e.preventDefault();
                handleSearchQuery();
            }}>
                <div><h1>filebroker</h1></div>
                <div>{queryInput}</div>
                <div><button className="standard-button-large" type="submit">Search</button></div>
            </form>
        </div>
    );
}

export default Home;
