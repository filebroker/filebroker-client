import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { performSearchQuery, PostQueryObject } from "../Search";
import App from "../App";
import "./PostPicker.css";
import { Box, Button, ImageList, ImageListItem, ImageListItemBar, Pagination } from "@mui/material";
import urlJoin from "url-join";
import { getApiUrl, getPublicBasePath } from "../http-common";
import { LazyLoadImage } from "react-lazy-load-image-component";
import { EmbeddedQueryInput } from "./EmbeddedQueryInput";
import { AccessFilter } from "../QueryState";

export function PostPicker({
    app,
    onPostSelect,
    constriction = "",
}: {
    app: App;
    onPostSelect: (post: PostQueryObject) => void;
    constriction?: string;
}) {
    const location = useLocation();
    const navigate = useNavigate();
    const [submittedSearch, setSubmittedSearch] = useState(() => ({
        query: "",
        accessFilter: (app.isLoggedIn()
            ? (app.getUserPreferences()?.default_access_filter ?? "all")
            : "all") as AccessFilter,
        version: 0,
    }));
    const [queryLoading, setQueryLoading] = useState(false);
    const [selectablePosts, setSelectablePosts] = useState<PostQueryObject[]>([]);
    const [listPage, setListPage] = useState(0);
    const [pageCount, setPageCount] = useState<number | null>(null);

    useEffect(() => {
        let active = true;

        const search = new URLSearchParams({
            query: submittedSearch.query,
            constriction,
            page: listPage.toString(),
            limit: "15",
        });

        if (app.isLoggedIn()) {
            search.set("access_filter", submittedSearch.accessFilter);
        }

        setQueryLoading(true);

        performSearchQuery(`/post?${search.toString()}`, app, location, navigate)
            .then((result) => {
                if (active) {
                    setPageCount(result.pages);
                    setSelectablePosts(result.posts ?? []);
                }
            })
            .catch((e) => {
                if (active) {
                    console.error(e);
                }
            })
            .finally(() => {
                if (active) {
                    setQueryLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [submittedSearch, listPage, constriction]);

    return (
        <div id="PostPicker">
            <Box sx={{ display: "flex", flex: "0 0 auto" }}>
                <EmbeddedQueryInput
                    app={app}
                    scope="post"
                    placeholder="Search posts"
                    isLoading={queryLoading}
                    onSubmit={(query, accessFilter) => {
                        setSubmittedSearch((current) => ({
                            query,
                            accessFilter,
                            version: current.version + 1,
                        }));
                        setListPage(0);
                        setPageCount(null);
                    }}
                />
            </Box>
            <Box
                sx={{
                    display: "flex",
                    flex: "1 1 auto",
                    minHeight: 0,
                    overflowY: "auto",
                    overflowX: "hidden",
                }}
            >
                <ImageList
                    gap={10}
                    sx={{
                        width: "100%",
                        m: 0,
                        overflow: "visible",
                        gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))!important",
                    }}
                >
                    {selectablePosts.map((post) => {
                        let thumbnailUrl;
                        if (post.thumbnail_url) {
                            thumbnailUrl = post.thumbnail_url;
                        } else if (post.thumbnail_object_key) {
                            thumbnailUrl = urlJoin(getApiUrl(), "get-object", post.thumbnail_object_key);
                        } else {
                            thumbnailUrl = urlJoin(getPublicBasePath(), "logo512.png");
                        }
                        return (
                            <ImageListItem key={post.pk}>
                                <Button className="post_button" onClick={() => onPostSelect(post)}>
                                    <div key={"flex_" + post.pk} className="paginated_grid_view_item_wrapper_flexbox">
                                        <div key={"thumbnail_wrapper_" + post.pk} className="thumbnail_wrapper">
                                            <div key={"thumbnail_wrapper_img_" + post.pk} className="thumbnail_image">
                                                <LazyLoadImage
                                                    alt={`Thumnail for item ${post.pk}`}
                                                    src={thumbnailUrl}
                                                    effect="blur"
                                                    placeholderSrc={urlJoin(getPublicBasePath(), "logo192.png")}
                                                    className="thumb-img"
                                                />
                                            </div>
                                        </div>
                                        <div key={"footer_" + post.pk} className="paginated_grid_view_item_footer">
                                            <ImageListItemBar
                                                title={post.title}
                                                subtitle={post.create_user.display_name ?? post.create_user.user_name}
                                                position="below"
                                            />
                                        </div>
                                    </div>
                                </Button>
                            </ImageListItem>
                        );
                    })}
                </ImageList>
            </Box>
            <Box
                sx={{
                    display: "flex",
                    flex: "0 0 auto",
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <Pagination
                    page={listPage + 1}
                    count={pageCount ?? 999}
                    showFirstButton
                    showLastButton={pageCount !== null}
                    siblingCount={pageCount !== null ? 1 : 0}
                    boundaryCount={pageCount !== null ? 1 : 0}
                    color="primary"
                    onChange={(_e, page) => setListPage(page - 1)}
                />
            </Box>
        </div>
    );
}
