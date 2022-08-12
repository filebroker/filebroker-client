import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Home() {
    const navigate = useNavigate();
    const [queryString, setQueryString] = useState("");

    let queryInput = <input id="query-input" type="text" value={queryString} onChange={e => setQueryString(e.currentTarget.value)}></input>;

    function handleSearchQuery() {
        navigate({pathname: "/posts", search: "?query=" + queryString});
        window.location.reload();
    }

    return (
        <div id="Home">
            <h1>filebroker</h1>
            {queryInput}
            <button onClick={handleSearchQuery}>Search</button>
        </div>
    );
}

export default Home;
