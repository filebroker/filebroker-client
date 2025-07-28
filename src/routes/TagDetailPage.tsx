import {Link, useLocation, useNavigate, useParams} from "react-router-dom";
import App from "../App";
import http, {getApiUrl, getPublicUrl} from "../http-common";
import React, {useEffect, useState} from "react";
import {getIconForTagCategory, Tag, TagCategory, TagDetailed, TagEdge} from "../Model";
import {
    Button,
    IconButton,
    ImageList,
    ImageListItem,
    ImageListItemBar,
    ListItem,
    ListItemIcon, ListItemText,
    Paper,
} from "@mui/material";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {regular, solid} from "@fortawesome/fontawesome-svg-core/import.macro";

import "./TagDetailPage.css";
import {TagSelector} from "../components/TagEditor";
import {FontAwesomeSvgIcon} from "../components/FontAwesomeSvgIcon";
import {enqueueSnackbar} from "notistack";
import {PostCollectionQueryObject, PostQueryObject, SearchResult} from "../Search";
import urlJoin from "url-join";
import {LazyLoadImage} from "react-lazy-load-image-component";
import {PaginatedGridViewItem} from "../components/PaginatedGridView";
import {AccountTree} from "@mui/icons-material";
import CytoscapeComponent from "react-cytoscapejs";
import cytoscape, {ElementDefinition} from "cytoscape";
import dagre from 'cytoscape-dagre';
import {StyledAutocomplete} from "../index";
import {TagEditHistoryDialogue} from "../components/PostEditHistoryDialogue";
import {QueryAutocompleteTextField} from "../components/QueryInput";

cytoscape.use(dagre);

interface TagHierarchyNode {
    tag: Tag;
    depth: number;
    edges: TagEdge[];
}

interface GetTagHierarchyResponse {
    tag: Tag;
    ancestors: TagHierarchyNode[];
    descendants: TagHierarchyNode[];
}

export function TagDetailPage({ app }: { app: App }) {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [tagCategories, setTagCategories] = useState<TagCategory[]>([]);
    useEffect(() => {
        http.get<TagCategory[]>(`/get-tag-categories`).then(response => {
            setTagCategories(response.data);
        }).catch(e => console.error("Failed to load tag categories", e));
    }, []);

    const [tag, setTag] = useState<TagDetailed | null>(null);
    const [parentTags, setParentTags] = useState<Tag[]>([]);
    const [parentPks, setParentPks] = useState<number[]>([]);
    const [aliasTags, setAliasTags] = useState<Tag[]>([]);
    const [aliasPks, setAliasPks] = useState<number[]>([]);
    const [tagCategoryInput, setTagCategoryInput] = useState<string>("");
    const [tagCategory, setTagCategory] = useState<TagCategory | null>(null);
    const [autoMatchConditionPost, setAutoMatchConditionPost] = useState(tag?.auto_match_condition_post ?? "");
    const [autoMatchConditionCollection, setAutoMatchConditionCollection] = useState(tag?.auto_match_condition_collection ?? "");

    const [posts, setPosts] = useState<PostQueryObject[]>([]);
    const [collections, setCollections] = useState<PostCollectionQueryObject[]>([]);

    const [ancestors, setAncestors] = useState<TagHierarchyNode[]>([]);
    const [descendants, setDescendants] = useState<TagHierarchyNode[]>([]);

    const [editMode, setEditMode] = useState(false);

    const updateTag = (tag: TagDetailed | null) => {
        setTag(tag);
        setParentTags(tag?.parents ?? []);
        setParentPks(tag?.parents?.map(p => p.pk) ?? []);
        setAliasTags(tag?.aliases ?? []);
        setAliasPks(tag?.aliases?.map(a => a.pk) ?? []);
        setTagCategory(tag?.tag_category ?? null);
        setAutoMatchConditionPost(tag?.auto_match_condition_post ?? "");
        setAutoMatchConditionCollection(tag?.auto_match_condition_collection ?? "");
    };

    const loadTag = async () => {
        updateTag(null);
        const loadingModal = app.openLoadingModal();
        try {
            const response = await http.get<TagDetailed>(`/get-tag/${id}`);
            updateTag(response.data);
        } catch (e: any) {
            console.error("Failed to load tag", e);
            if (e?.response?.data?.error_code === 404001) {
                app.openModal("Error", <div>Tag not found</div>);
            } else {
                app.openModal("Error", <div>An unexpected error occurred</div>);
            }
        } finally {
            loadingModal.close();
        }
    };

    useEffect(() => {
        loadTag();
    }, [id, editMode]);

    const loadPosts = async () => {
        if (tag) {
            try {
                const config = await app.getAuthorization(location, navigate, false);
                const response = await http.get<SearchResult>(`/search?query=${encodeURIComponent(`\`${tag.tag_name}\` %limit(5)`)}`, config);
                setPosts(response.data.posts || []);
            } catch (e: any) {
                console.error("Failed to load posts", e);
            }
        }
    };
    const loadCollections = async () => {
        if (tag) {
            try {
                const config = await app.getAuthorization(location, navigate, false);
                const response = await http.get<SearchResult>(`/search/collection?query=${encodeURIComponent(`\`${tag.tag_name}\` %limit(5)`)}`, config);
                setCollections(response.data.collections || []);
            } catch (e: any) {
                console.error("Failed to load collections", e);
            }
        }
    };
    const loadHierarchy = async () => {
        if (tag) {
            try {
                const response = await http.get<GetTagHierarchyResponse>(`/get-tag-hierarchy/${id}`);
                setAncestors(response.data.ancestors);
                setDescendants(response.data.descendants);
            } catch (e: any) {
                console.error("Failed to load tag hierarchy", e);
            }
        }
    };
    useEffect(() => {
        if (tag) {
            loadPosts();
            loadCollections();
            loadHierarchy();
        }
    }, [tag]);

    return (
        <div id="TagDetailPage">
            <div id="tag-detail-content-wrapper">
                <div className="tag-editor">
                    <Paper elevation={2} className="form-paper">
                        {tag
                            ? <div className="form-paper-content">
                                <div className="form-paper-content-top-btn-row">
                                    <IconButton hidden={ancestors.length === 0 && descendants.length === 0} onClick={() => {
                                        const handled: number[] = [];
                                        const elements: ElementDefinition[] = [{ data: { id: tag.pk.toString(), label: tag.tag_name }, selectable: false }];
                                        ancestors.forEach(a => {
                                            if (!handled.includes(a.tag.pk)) {
                                                handled.push(a.tag.pk);
                                                elements.push({ data: { id: a.tag.pk.toString(), label: a.tag.tag_name }, selectable: false });
                                                a.edges.forEach(e => {
                                                    elements.push({ data: { source: e.fk_parent.toString(), target: e.fk_child.toString() }, selectable: false });
                                                });
                                            }
                                        });
                                        descendants.forEach(d => {
                                            if (!handled.includes(d.tag.pk)) {
                                                handled.push(d.tag.pk);
                                                elements.push({ data: { id: d.tag.pk.toString(), label: d.tag.tag_name }, selectable: false });
                                                d.edges.forEach(e => {
                                                    elements.push({ data: { source: e.fk_parent.toString(), target: e.fk_child.toString() }, selectable: false });
                                                });
                                            }
                                        });
                                        app.openModal("Tag Hierarchy", <div className="cytoscape-wrapper">
                                            <CytoscapeComponent
                                                elements={elements}
                                                layout={{
                                                    name: "dagre",
                                                }}
                                                style={{ width: '600px', height: '600px' }}
                                                stylesheet={[
                                                    {
                                                        selector: 'node',
                                                        style: {
                                                            'label': 'data(label)',
                                                            'color': 'white',
                                                            'text-valign': 'center',
                                                            'text-halign': 'center',
                                                            'font-size': '12px'
                                                        }
                                                    },
                                                    {
                                                        selector: 'edge',
                                                        style: {
                                                            'target-arrow-shape': 'triangle',
                                                            'curve-style': 'bezier'
                                                        }
                                                    }
                                                ]}
                                            />
                                        </div>);
                                    }}><AccountTree /></IconButton>
                                </div>
                                <h1>{tag.tag_name}</h1>
                                <TagSelector readOnly={!editMode} values={parentTags} setSelectedTags={setParentPks} limit={25} label="Parents" enableTagLink />
                                <TagSelector readOnly={!editMode} values={aliasTags} setSelectedTags={setAliasPks} limit={25} label="Aliases" enableTagLink />
                                <div className="material-row-flex">
                                    <StyledAutocomplete
                                        id="tag-category-select"
                                        label="Category"
                                        options={tagCategories}
                                        value={tagCategory}
                                        onChange={(_event: any, newValue: TagCategory | null) => setTagCategory(newValue)}
                                        inputValue={tagCategoryInput}
                                        onInputChange={(_event: any, newInputValue: string) => setTagCategoryInput(newInputValue)}
                                        readOnly={!editMode}
                                        isOptionEqualToValue={(option, value) => option.id === value.id}
                                        renderOption={(props, option) => (
                                            <ListItem {...props}>
                                                <ListItemIcon>
                                                    {getIconForTagCategory(option.id)}
                                                </ListItemIcon>
                                                <ListItemText primary={option.label} />
                                            </ListItem>
                                        )}
                                    />
                                </div>
                                {app.getUser()?.is_admin && <div className="material-row-flex">
                                    <QueryAutocompleteTextField
                                        queryString={autoMatchConditionPost}
                                        setQueryString={v => setAutoMatchConditionPost(v)}
                                        label="Auto Match Condition Post"
                                        scope="tag_auto_match_post"
                                        disabled={!editMode}
                                    />
                                </div>}
                                {app.getUser()?.is_admin && <div className="material-row-flex">
                                    <QueryAutocompleteTextField
                                        queryString={autoMatchConditionCollection}
                                        setQueryString={v => setAutoMatchConditionCollection(v)}
                                        label="Auto Match Condition Collection"
                                        scope="tag_auto_match_collection"
                                        disabled={!editMode}
                                    />
                                </div>}
                                <div className={"form-paper-button-row" + (editMode ? " form-paper-button--expanded" : "")}>
                                    {editMode
                                        ? <Button startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("xmark")} />} onClick={() => setEditMode(false)}>Cancel</Button>
                                        : <div className="button-row">
                                            <Button startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("pen-to-square")} />} hidden={!app.isLoggedIn()} onClick={() => setEditMode(true)}>Edit</Button>
                                            <Button startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("clock-rotate-left")} />} hidden={!app.isLoggedIn()} onClick={() => app.openModal("History", modal => <TagEditHistoryDialogue app={app} tag={tag} modal={modal} />, (result) => {
                                                if (result) {
                                                    updateTag(result);
                                                }
                                            })}>History</Button>
                                        </div>}
                                    <Button color="secondary" startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={regular("floppy-disk")} />} hidden={!editMode} onClick={async () => {
                                        const loadingModal = app.openLoadingModal();
                                        try {
                                            let config = await app.getAuthorization(location, navigate);
                                            let response = await http.post<TagDetailed>(`/update-tag/${id}`, new UpdateTagRequest(
                                                null,
                                                parentPks,
                                                null,
                                                null,
                                                aliasPks,
                                                null,
                                                tagCategory?.id ?? "",
                                                app.getUser()?.is_admin ? autoMatchConditionPost : null,
                                                app.getUser()?.is_admin ? autoMatchConditionCollection : null
                                            ), config);
                                            updateTag(response.data);
                                            enqueueSnackbar({
                                                message: "Tag edited",
                                                variant: "success"
                                            });
                                        } catch (e: any) {
                                            let compilation_errors = e.response?.data?.compilation_errors;
                                            if (compilation_errors) {
                                                app.openModal("Error", <div>Failed to compile auto match condition: {compilation_errors[0]?.msg ?? "Unexpected Error"}</div>);
                                            } else {
                                                console.error("Failed to update tag", e);
                                                if (e.response?.status === 401) {
                                                    enqueueSnackbar({
                                                        message: "Your credentials have expired, try refreshing the page.",
                                                        variant: "error"
                                                    });
                                                } else {
                                                    enqueueSnackbar({
                                                        message: "An error occurred editing your tag, please try again",
                                                        variant: "error"
                                                    });
                                                }
                                            }
                                        } finally {
                                            loadingModal.close();
                                            setEditMode(false);
                                        }
                                    }}>Save</Button>
                                </div>
                            </div>
                            : <div><FontAwesomeIcon icon={solid("circle-notch")} spin size="6x" /></div>
                        }
                    </Paper>
                </div>
                {tag && posts.length > 0 && <PreviewGrid title="Posts" items={posts} searchLink={`/posts?query=${encodeURIComponent(`\`${tag.tag_name}\``)}`} onItemClickPath={(item) => `/post/${item.pk}`} />}
                {tag && collections.length > 0 && <PreviewGrid title="Collections" items={collections} searchLink={`/collections?query=${encodeURIComponent(`\`${tag.tag_name}\``)}`} onItemClickPath={(item) => `/collection/${item.pk}`} />}
            </div>
        </div>
    );
}

function PreviewGrid({ items, title, searchLink, onItemClickPath }: { items: PaginatedGridViewItem[], title: string, searchLink: string, onItemClickPath: (item: PaginatedGridViewItem) => string, }) {
    return (
        <Paper elevation={2} className="post-preview-container">
            <h3 className="preview-title"><Link className="undecorated-link" to={searchLink}>{title} <FontAwesomeIcon icon={solid("arrow-up-right-from-square")} /></Link></h3>
            <ImageList cols={5} sx={{
                width: "100%", height: "100%", paddingTop: "25px", paddingBottom: "25px", gridTemplateColumns: "repeat(5, 1fr)", gridAutoFlow: "column"
            }}>
                {items.map(item => {
                    let thumbnailUrl;
                    if (item.thumbnail_url) {
                        thumbnailUrl = item.thumbnail_url;
                    } else if (item.thumbnail_object_key) {
                        thumbnailUrl = urlJoin(getApiUrl(), "get-object", item.thumbnail_object_key);
                    } else {
                        thumbnailUrl = urlJoin(getPublicUrl(), "logo512.png");
                    }

                    return (
                        <ImageListItem key={item.pk}>
                            <Button component={Link} to={{
                                pathname: onItemClickPath(item),
                            }} className="paginated_grid_view_item_button" key={"link_" + item.pk} sx={{ height: "100%" }}>
                                <div key={"flex_" + item.pk} className="paginated_grid_view_item_wrapper_flexbox">
                                    <div key={"thumbnail_wrapper_" + item.pk} className="preview_thumbnail_wrapper">
                                        <div key={"thumbnail_wrapper_img_" + item.pk} className="preview_thumbnail_image">
                                            <LazyLoadImage
                                                alt={`Thumnail for item ${item.pk}`}
                                                src={thumbnailUrl}
                                                effect="blur"
                                                placeholderSrc={urlJoin(getPublicUrl(), "logo192.png")}
                                                className="thumb-img"
                                            />
                                        </div>
                                    </div>
                                    <div key={"footer_" + item.pk} className="paginated_grid_view_item_footer">
                                        <ImageListItemBar
                                            title={item.title}
                                            subtitle={item.create_user.display_name ?? item.create_user.user_name}
                                            position='below'
                                        />
                                    </div>
                                </div>
                            </Button>
                        </ImageListItem>
                    );
                })}
            </ImageList>
        </Paper>
    );
}

class UpdateTagRequest {
    added_parent_pks: number[] | null | undefined;
    parent_pks_overwrite: number[] | null | undefined;
    removed_parent_pks: number[] | null | undefined;
    added_alias_pks: number[] | null | undefined;
    alias_pks_overwrite: number[] | null | undefined;
    removed_alias_pks: number[] | null | undefined;
    tag_category: string | null | undefined;
    auto_match_condition_post: string | null | undefined;
    auto_match_condition_collection: string | null | undefined;

    constructor(
        added_parent_pks: number[] | null | undefined,
        parent_pks_overwrite: number[] | null | undefined,
        removed_parent_pks: number[] | null | undefined,
        added_alias_pks: number[] | null | undefined,
        alias_pks_overwrite: number[] | null | undefined,
        removed_alias_pks: number[] | null | undefined,
        tag_category: string | null | undefined,
        auto_match_condition_post: string | null | undefined,
        auto_match_condition_collection: string | null | undefined
    ) {
        this.added_parent_pks = added_parent_pks;
        this.parent_pks_overwrite = parent_pks_overwrite;
        this.removed_parent_pks = removed_parent_pks;
        this.added_alias_pks = added_alias_pks;
        this.alias_pks_overwrite = alias_pks_overwrite;
        this.removed_alias_pks = removed_alias_pks;
        this.tag_category = tag_category;
        this.auto_match_condition_post = auto_match_condition_post;
        this.auto_match_condition_collection = auto_match_condition_collection;
    }
}
