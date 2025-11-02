import {
    Button,
    Checkbox,
    IconButton,
    ImageList,
    ImageListItem,
    ImageListItemBar,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Pagination,
    PaginationItem,
    Paper,
    useMediaQuery
} from "@mui/material";
import urlJoin from "url-join";
import { getApiUrl, getPublicUrl } from "../http-common";
import { LazyLoadImage } from "react-lazy-load-image-component";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { solid } from "@fortawesome/fontawesome-svg-core/import.macro";
import { Link, NavLink, useLocation } from "react-router-dom";
import { User } from "../App";

import "./PaginatedGridView.css";
import { useState } from "react";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeSvgIcon } from "./FontAwesomeSvgIcon";
import SelectAllIcon from '@mui/icons-material/SelectAll';
import DeselectIcon from '@mui/icons-material/Deselect';
import {UserPublic} from "../Model";

export interface PaginatedGridViewItem {
    pk: number;
    create_user: User | UserPublic;
    title?: string | null | undefined;
    thumbnail_url?: string | null | undefined;
    thumbnail_object_key?: string | null | undefined;
}

export interface TransformedPaginatedGridViewItem extends PaginatedGridViewItem {
    source: any
}

export interface PaginatedGridViewItemFunction<T> {
    items: T[],
    extraction_fn: (item: T) => TransformedPaginatedGridViewItem
}

export interface GridItemAction {
    name: string;
    icon: IconProp;
    color?: string;
    enableForItem?: (item: TransformedPaginatedGridViewItem) => boolean;
    enableForItemAsync?: (item: TransformedPaginatedGridViewItem) => Promise<boolean>;
    fn: (items: TransformedPaginatedGridViewItem[], cb?: (result: any) => void) => void;
    disallowMultiSelect?: boolean;
    allowExecuteForAll?: boolean;
    disabled?: boolean;
}

export function PaginatedGridView({ itemsProperty, onItemClickPath, stripQueryParamsOnItemClick, pagePath, fullCount, pageCount, gridItemActions = undefined, isDesktop = true }: {
    itemsProperty: PaginatedGridViewItem[] | PaginatedGridViewItemFunction<any>,
    onItemClickPath: (item: PaginatedGridViewItem) => string,
    stripQueryParamsOnItemClick?: boolean,
    pagePath: string,
    fullCount: number | null,
    pageCount: number | null,
    gridItemActions?: GridItemAction[] | undefined,
    isDesktop?: boolean
}) {
    const location = useLocation();
    const search = location.search;

    const useLargeControls = useMediaQuery('(min-width: 400px)');

    let items: TransformedPaginatedGridViewItem[];
    if (Array.isArray(itemsProperty)) {
        items = itemsProperty.map((item) => {
            return {
                pk: item.pk,
                create_user: item.create_user,
                title: item.title,
                thumbnail_url: item.thumbnail_url,
                thumbnail_object_key: item.thumbnail_object_key,
                source: item
            }
        });
    } else if (itemsProperty && itemsProperty.hasOwnProperty("items")) {
        items = itemsProperty.items.map(item => itemsProperty.extraction_fn(item));
    } else {
        items = [];
    }

    let searchParams = new URLSearchParams(search);
    let queryParam: string = searchParams.get("query") ?? "";
    let pageParam: number = +(searchParams.get("page") ?? 0);

    const [gridItemActionMenuAnchor, setGridItemActionMenuAnchor] = useState<HTMLElement | null>(null);
    const [itemMenuOpenPk, setItemMenuOpenPk] = useState<number | null>(null);
    const gridItemActionMenuOpen = Boolean(gridItemActionMenuAnchor);
    const [enabledGridActionsAsync, setEnabledGridActionsAsync] = useState<{ [key: number]: string[] }>({});
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState<TransformedPaginatedGridViewItem[]>([]);

    return (
        <div id="image-wall">
            <div id="image-wall-container">
                <ImageList gap={25} sx={{
                    width: "100%", height: "100%", paddingTop: "25px", paddingBottom: "25px", gridTemplateColumns:
                        'repeat(auto-fill, minmax(360px, 1fr))!important'
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
                                    search: stripQueryParamsOnItemClick ? undefined : search,
                                }} className="paginated_grid_view_item_button" key={"link_" + item.pk} sx={{ height: "100%" }} onClick={(e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
                                    if (selectionMode) {
                                        e.preventDefault();
                                        setSelectedItems((selectedItems) => {
                                            if (selectedItems.findIndex((other) => other.pk === item.pk) >= 0) {
                                                return selectedItems.filter((other) => other.pk !== item.pk);
                                            } else {
                                                return [...selectedItems, item];
                                            }
                                        });
                                    }
                                }}>
                                    <div key={"flex_" + item.pk} className="paginated_grid_view_item_wrapper_flexbox">
                                        <div key={"thumbnail_wrapper_" + item.pk} className="thumbnail_wrapper">
                                            <div key={"thumbnail_wrapper_img_" + item.pk} className="thumbnail_image">
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
                                <div key={"footer_action_btn_" + item.pk} className="paginated_grid_view_item_footer_button">
                                    {selectionMode
                                        ? <Checkbox checked={selectedItems.findIndex((other) => other.pk === item.pk) >= 0} inputProps={{ 'aria-label': 'controlled' }} onChange={(event) => {
                                            if (event.target.checked) {
                                                setSelectedItems((selectedItems) => [...selectedItems, item]);
                                            } else {
                                                setSelectedItems((selectedItems) => selectedItems.filter((other) => other.pk !== item.pk));
                                            }
                                        }} />
                                        : <IconButton color='primary' size='medium' disabled={!gridItemActions || gridItemActions.length === 0} onClick={e => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setGridItemActionMenuAnchor(e.currentTarget);
                                            setItemMenuOpenPk(item.pk);
                                            gridItemActions?.forEach((action) => action.enableForItemAsync?.(item).then((enable) => {
                                                if (enable) {
                                                    setEnabledGridActionsAsync((enabledGridActions) => {
                                                        const newVal = { [item.pk]: [...(enabledGridActions[item.pk] ?? []), action.name] };
                                                        return ({
                                                            ...enabledGridActions,
                                                            ...newVal
                                                        });
                                                    });
                                                }
                                            }));
                                        }}><FontAwesomeSvgIcon icon={solid("ellipsis-vertical")} /></IconButton>
                                    }
                                </div>
                                <Menu
                                    id={"grid_item_menu_" + item.pk}
                                    key={"grid_item_menu_" + item.pk}
                                    open={gridItemActionMenuOpen && itemMenuOpenPk === item.pk}
                                    anchorEl={gridItemActionMenuAnchor}
                                    onClose={() => { setGridItemActionMenuAnchor(null); setItemMenuOpenPk(null); setEnabledGridActionsAsync({}) }}
                                >
                                    {gridItemActions?.map((action) =>
                                        <MenuItem
                                            id={"grid_item_menu_" + item.pk + "_action_" + action.name}
                                            key={"grid_item_menu_" + item.pk + "_action_" + action.name}
                                            color={action.color ?? "white"}
                                            sx={{
                                                color: action.color ?? "white"
                                            }}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setGridItemActionMenuAnchor(null);
                                                setItemMenuOpenPk(null);
                                                action.fn([item]);
                                            }}
                                            disabled={action.disabled || (action.enableForItem && !action.enableForItem(item)) || (action.enableForItemAsync && !enabledGridActionsAsync[item.pk]?.includes(action.name))}
                                        >
                                            <ListItemIcon color={action.color ?? "white"} sx={{
                                                color: action.color ?? "white"
                                            }}><FontAwesomeIcon icon={action.icon} /></ListItemIcon>
                                            <ListItemText color={action.color ?? "white"} sx={{
                                                color: action.color ?? "white"
                                            }} primaryTypographyProps={{ style: { color: action.color ?? "white" } }}>{action.name}</ListItemText>
                                        </MenuItem>)
                                    }
                                </Menu>
                            </ImageListItem>
                        );
                    }
                    )}
                </ImageList>
            </div>
            <div id='page-button-container' style={{
                gridTemplateColumns: isDesktop ? "1fr 2fr 1fr" : "4fr 2fr",
                paddingRight: isDesktop ? "25px" : "10px",
                paddingLeft: isDesktop ? "25px" : "10px",
            }}>
                {isDesktop && <div id="page-full-count">{fullCount !== null && <span>{fullCount} results</span>}</div>}
                <div id="page-grid-pagination-container" style={{ justifySelf: isDesktop ? "center" : "flex-start" }}>
                    <Pagination
                        page={pageParam + 1}
                        count={pageCount ?? 999}
                        showFirstButton
                        showLastButton={pageCount !== null}
                        hideNextButton={!isDesktop}
                        hidePrevButton={!isDesktop}
                        siblingCount={isDesktop ? 3 : 1}
                        boundaryCount={pageCount !== null && isDesktop ? 1 : 0}
                        color='primary'
                        size={useLargeControls ? (isDesktop ? 'large' : 'medium') : 'small'}
                        renderItem={item => {
                            let page = item.page ?? 1;
                            let searchParams = new URLSearchParams();
                            searchParams.set("query", queryParam);
                            searchParams.set("page", (page - 1).toString());
                            let location = { pathname: pagePath, search: searchParams.toString() };
                            return (
                                <PaginationItem
                                    component={NavLink}
                                    to={location}
                                    {...item}
                                />
                            );
                        }}
                    />
                </div>
                <div id="selection-action-tool-row">
                    {selectionMode && isDesktop && <span className="selected-amount-label">{`${selectedItems.length} selected`}</span>}
                    {selectionMode
                        ? <IconButton color='primary' size='medium' onClick={() => { setSelectionMode(false); setSelectedItems([]) }}><DeselectIcon /></IconButton>
                        : <IconButton color='primary' size='medium' onClick={() => setSelectionMode(true)}><SelectAllIcon /></IconButton>
                    }
                    {gridItemActions?.filter((action) => !action.disallowMultiSelect).map((action) =>
                        <IconButton key={'selection_action_' + action.name} color='primary' size='medium' disabled={action.disabled || !(action.allowExecuteForAll || selectedItems.length > 0)} onClick={() => action.fn(selectedItems, (result) => {
                            if (result) {
                                setSelectionMode(false);
                                setSelectedItems([]);
                            }
                        })}>
                            <FontAwesomeSvgIcon icon={action.icon} />
                        </IconButton>)
                    }
                </div>
            </div>
        </div>
    );
}

export function PreviewGrid({ items, title, searchLink, onItemClickPath }: { items: PaginatedGridViewItem[], title: string, searchLink: string, onItemClickPath: (item: PaginatedGridViewItem) => string, }) {
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
