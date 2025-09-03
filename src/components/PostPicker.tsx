import {useLocation, useNavigate} from "react-router-dom";
import {useEffect, useState} from "react";
import {performSearchQuery, PostQueryObject} from "../Search";
import App from "../App";
import "./PostPicker.css";
import {QueryAutocompleteSearchBox} from "./QueryInput";
import {Box, Button, ImageList, ImageListItem, ImageListItemBar, Pagination} from "@mui/material";
import urlJoin from "url-join";
import {getApiUrl, getPublicUrl} from "../http-common";
import {LazyLoadImage} from "react-lazy-load-image-component";

export function PostPicker({ app, onPostSelect, constriction = "" }: { app: App, onPostSelect: (post: PostQueryObject) => void, constriction?: string }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [queryLoading, setQueryLoading] = useState(false);
    const [selectablePosts, setSelectablePosts] = useState<PostQueryObject[]>([]);
    const [listPage, setListPage] = useState(0);
    const [pageCount, setPageCount] = useState<number | null>(null);

    const executeSearch = (resetPagination: boolean) => {
        if (resetPagination) {
            setListPage(0);
            setPageCount(null);
        }

        const search = new URLSearchParams();
        search.set("query", (constriction.length > 0 ? constriction + " " : constriction) + searchQuery);
        search.set("page", listPage.toString());
        search.set("writable_only", "true");
        search.set("limit", "15");

        setQueryLoading(true);
        performSearchQuery("/post?" + search, app, location, navigate).then(searchResult => {
            setPageCount(searchResult.pages);
            setSelectablePosts(searchResult.posts ?? []);
        }).catch((e) => console.error(e)).finally(() => setQueryLoading(false));
    };

    useEffect(() => {
        executeSearch(false);
    }, [listPage]);

    return (
        <div id="PostPicker">
            <Box sx={{ display: "flex", flex: "0 0 auto" }}>
                <QueryAutocompleteSearchBox
                    queryString={searchQuery}
                    setQueryString={setSearchQuery}
                    scope="post"
                    onSubmit={() => executeSearch(true)}
                    isLoading={queryLoading}
                />
            </Box>
            <Box sx={{ display: "flex", flex: "1 1 auto", overflow: "auto" }}>
                <ImageList gap={10} sx={{
                    width: "100%", gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))!important'
                }}>
                    {selectablePosts.map((post) => {
                        let thumbnailUrl;
                        if (post.thumbnail_url) {
                            thumbnailUrl = post.thumbnail_url;
                        } else if (post.thumbnail_object_key) {
                            thumbnailUrl = urlJoin(getApiUrl(), "get-object", post.thumbnail_object_key);
                        } else {
                            thumbnailUrl = urlJoin(getPublicUrl(), "logo512.png");
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
                                                    placeholderSrc={urlJoin(getPublicUrl(), "logo192.png")}
                                                    className="thumb-img"
                                                />
                                            </div>
                                        </div>
                                        <div key={"footer_" + post.pk} className="paginated_grid_view_item_footer">
                                            <ImageListItemBar
                                                title={post.title}
                                                subtitle={post.create_user.display_name ?? post.create_user.user_name}
                                                position='below'
                                            />
                                        </div>
                                    </div>
                                </Button>
                            </ImageListItem>
                        );
                    })}
                </ImageList>
            </Box>
            <Box sx={{ display: "flex", flex: "0 0 auto", justifyContent: "center", alignItems: "center" }}>
                <Pagination
                    page={listPage + 1}
                    count={pageCount ?? 999}
                    showFirstButton
                    showLastButton={pageCount !== null}
                    siblingCount={pageCount !== null ? 1 : 0}
                    boundaryCount={pageCount !== null ? 1 : 0}
                    color='primary'
                    onChange={(_e, page) => setListPage(page - 1)}
                />
            </Box>
        </div>
    );
}
