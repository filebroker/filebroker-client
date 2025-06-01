import { useEffect, useRef, useState } from "react";
import App from "../App";
import http from "../http-common";
import { Tag } from "../Model";

import "./TagGlossary.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { solid } from "@fortawesome/fontawesome-svg-core/import.macro";
import { Button, InputAdornment, Pagination, TextField, useMediaQuery } from "@mui/material";
import {TagCategoryList, TagCreator} from "../components/TagEditor";
import { FontAwesomeSvgIcon } from "../components/FontAwesomeSvgIcon";
import { Link } from "react-router-dom";

interface GetTagReponse {
    tags: Tag[];
    count: number;
}

let scheduledRequest: NodeJS.Timeout | null = null;

export function TagGlossary({ app }: { app: App }) {
    const [page, setPage] = useState(0);
    const [filter, setFilter] = useState("");

    const [tags, setTags] = useState<{ [key: string]: Tag[] }>({});
    const [count, setCount] = useState(0);

    const [loading, setLoading] = useState(false);

    const isInitialMount = useRef(true);

    const useLargeControls = useMediaQuery('(min-width: 400px)');
    const isDesktop = app.isDesktop();

    const groupTagsByFirstLetter = (tags: Tag[]): { [key: string]: Tag[] } => {
        return tags.reduce((acc, tag) => {
            const firstLetter = tag.tag_name[0].toLowerCase();
            if (!acc[firstLetter]) {
                acc[firstLetter] = [];
            }
            acc[firstLetter].push(tag);
            return acc;
        }, {} as { [key: string]: Tag[] });
    };

    const loadTags = async () => {
        const search = new URLSearchParams();
        search.set("page", page.toString());
        search.set("filter", filter);
        setLoading(true);
        try {
            const response = await http.get<GetTagReponse>("/get-tags?" + search);
            setTags(groupTagsByFirstLetter(response.data.tags));
            setCount(response.data.count);
        } catch (e: any) {
            console.error("Failed to load tags", e);
            app.openModal("Error", <div>An unexpected Error occurred</div>);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (scheduledRequest) {
            clearTimeout(scheduledRequest);
            scheduledRequest = null;
        }
        loadTags();
    }, [page]);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        if (scheduledRequest) {
            clearTimeout(scheduledRequest);
        }
        scheduledRequest = setTimeout(() => {
            setPage(0);
            loadTags();
        }, 500);
    }, [filter]);

    return (
        <div id="TagGlossary">
            <div id="tag-glossary-container">
                <div id="tag-glossary-action-row">
                    <TextField label="Filter" value={filter} onChange={(e) => setFilter(e.currentTarget.value)} InputProps={{ startAdornment: <InputAdornment position="start"><FontAwesomeIcon icon={solid("filter")} /></InputAdornment> }}/>
                    <div className="button-row">
                        <Button startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("list")} />} onClick={e => {
                            e.preventDefault();
                            app.openModal("Tag Categories", modal => <TagCategoryList app={app} modal={modal} />);
                        }} hidden={!(app.getUser()?.is_admin)}>Categories</Button>
                        <Button startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("add")} />} disabled={!app.isLoggedIn()} onClick={e => {
                            e.preventDefault();
                            app.openModal("Create Tag", createTagModal => <TagCreator app={app} modal={createTagModal}></TagCreator>, (result) => {
                                if (result) {
                                    loadTags();
                                }
                            });
                        }}>Create</Button>
                    </div>
                </div>
                {loading
                    ? <div className="loading-container"><FontAwesomeIcon icon={solid("circle-notch")} spin size="6x" /></div>
                    : <ul className="tag-glossary-list">
                        {Object.keys(tags).sort().map((letter: string) => (
                            <div key={letter} className="tag-glossary-section">
                                <h2 className="tag-glossary-letter">{letter.toUpperCase()}</h2>
                                    {tags[letter].map((tag, index) => (
                                        <li key={index} className="tag-glossary-item"><Link className="undecorated-link" to={`/tag/${tag.pk}`}>{tag.tag_name}</Link></li>
                                    ))}
                            </div>
                        ))}
                    </ul>
                }
            </div>
            <div id='page-button-container' style={{
                gridTemplateColumns: isDesktop ? "1fr 2fr 1fr" : "4fr 1fr",
                paddingRight: isDesktop ? "25px" : "10px",
                paddingLeft: isDesktop ? "25px" : "10px",
            }}>
                {isDesktop && <div id="page-full-count">{count !== null && <span>{count} tags</span>}</div>}
                <div id="page-grid-pagination-container" style={{ justifySelf: isDesktop ? "center" : "flex-start" }}>
                    <Pagination
                        page={page + 1}
                        count={Math.ceil(count / 1000)}
                        showFirstButton
                        showLastButton={true}
                        hideNextButton={!isDesktop}
                        hidePrevButton={!isDesktop}
                        siblingCount={isDesktop ? 3 : 1}
                        boundaryCount={isDesktop ? 1 : 0}
                        color='primary'
                        size={useLargeControls ? (isDesktop ? 'large' : 'medium') : 'small'}
                        onChange={(_e, value) => setPage(value - 1)}
                    />
                </div>
            </div>
        </div>
    );
}
