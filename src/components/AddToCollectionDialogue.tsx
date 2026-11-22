import {
    Avatar,
    List,
    ListItem,
    ListItemAvatar,
    ListItemButton,
    ListItemText,
    Pagination,
    Typography,
} from "@mui/material";
import App, { ModalContent } from "../App";
import { useEffect, useState } from "react";
import { PostCollectionQueryObject, performSearchQuery } from "../Search";
import urlJoin from "url-join";
import http, { getApiUrl } from "../http-common";
import { ActionModal } from "./ActionModal";
import "./AddToCollectionDialogue.css";
import { useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeSvgIcon } from "./FontAwesomeSvgIcon";
import { faSquarePlus } from "@fortawesome/free-solid-svg-icons";
import { CreateCollectionDialogue } from "./CreateCollectionDialogue";
import { PostCollectionDetailed } from "../Model";
import { useSnackbar } from "notistack";
import { AccessFilter, PostQuerySelection } from "../QueryState";
import { EmbeddedQueryInput } from "./EmbeddedQueryInput";

export function AddToCollectionDialogue({
    app,
    postPks,
    modal,
    postQuery,
}: {
    app: App;
    postPks: number[];
    modal?: ModalContent;
    postQuery?: PostQuerySelection;
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
    const [selectableCollections, setSelectableCollections] = useState<PostCollectionQueryObject[]>([]);
    const [listPage, setListPage] = useState(0);
    const [pageCount, setPageCount] = useState<number | null>(null);
    const { enqueueSnackbar } = useSnackbar();

    useEffect(() => {
        let active = true;

        const search = new URLSearchParams({
            query: submittedSearch.query,
            page: listPage.toString(),
            writable_only: "true",
            limit: "15",
        });

        if (app.isLoggedIn()) {
            search.set("access_filter", submittedSearch.accessFilter);
        }

        setQueryLoading(true);

        performSearchQuery(`/collection?${search.toString()}`, app, location, navigate)
            .then((result) => {
                if (active) {
                    setPageCount(result.pages);
                    setSelectableCollections(result.collections ?? []);
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
    }, [submittedSearch, listPage]);

    const errorHandler = (e: any) => {
        console.error(e);
        let message = "Failed to update collection";
        if (e?.response?.data?.error_code === 400010) {
            message = "Could not update collection: Invalid query";
        } else if (e?.response?.data?.error_code === 400017) {
            message = "Collection exceeded maximum size";
        }
        enqueueSnackbar({
            message: message,
            variant: "error",
        });
    };

    return (
        <div id="AddToCollectionDialogue">
            <div id="add-to-collection-title">
                <p>Add {postQuery ? "all found" : postPks.length} posts to collection:</p>
            </div>
            <div id="add-to-collection-search-box">
                <EmbeddedQueryInput
                    app={app}
                    scope="collection"
                    placeholder="Search collections"
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
            </div>
            <div id="add-to-collection-list">
                <List
                    sx={{
                        width: "100%",
                    }}
                >
                    <ListItemButton
                        onClick={() =>
                            app.openModal(
                                "Create Collection",
                                (modal) => (
                                    <CreateCollectionDialogue
                                        postPks={postPks}
                                        modal={modal}
                                        app={app}
                                        postQuery={postQuery}
                                    />
                                ),
                                (result) => {
                                    if (result) {
                                        modal?.close(result);
                                    }
                                }
                            )
                        }
                    >
                        <ListItemAvatar>
                            <FontAwesomeSvgIcon icon={faSquarePlus} />
                        </ListItemAvatar>
                        <ListItemText>Create</ListItemText>
                    </ListItemButton>
                    {selectableCollections.map((collection) => (
                        <ListItem
                            key={"selectable_collection_" + collection.pk}
                            sx={{ paddingTop: "0", paddingBottom: "0" }}
                            id={"add-to-collection-list-item-" + collection.pk}
                        >
                            <ListItemButton
                                id={"add-to-collection-list-item-btn-" + collection.pk}
                                sx={{
                                    paddingTop: "0",
                                    paddingBottom: "0",
                                    paddingLeft: "0",
                                    paddingRight: "0",
                                }}
                                onClick={() =>
                                    app.openModal(
                                        "Confirm",
                                        (modalContent) => (
                                            <ActionModal
                                                modalContent={modalContent}
                                                text={`Adding ${postQuery ? "all found" : postPks.length} posts to collection ${collection.title}`}
                                                actions={[
                                                    {
                                                        name: "Ok",
                                                        fn: async () => {
                                                            const loadingModal = app.openLoadingModal();
                                                            try {
                                                                const config = await app.getAuthorization(
                                                                    location,
                                                                    navigate
                                                                );
                                                                try {
                                                                    const response =
                                                                        await http.post<PostCollectionDetailed>(
                                                                            `/edit-collection/${collection.pk}`,
                                                                            {
                                                                                added_post_pks: postPks,
                                                                                added_post_query: postQuery?.query,
                                                                                post_query_constriction:
                                                                                    postQuery?.constriction,
                                                                                post_query_access_filter:
                                                                                    postQuery?.access_filter,
                                                                                duplicate_mode: "reject",
                                                                            },
                                                                            config
                                                                        );
                                                                    enqueueSnackbar({
                                                                        message: `Added ${postQuery ? "all found posts" : `${postPks.length} post${postPks.length !== 1 ? "s" : ""}`} to collection`,
                                                                        variant: "success",
                                                                    });
                                                                    loadingModal.close();
                                                                    return response.data;
                                                                } catch (e: any) {
                                                                    loadingModal.close();
                                                                    if (e?.response?.data?.error_code === 400018) {
                                                                        app.openModal(
                                                                            "Duplicates detected",
                                                                            (duplicatesModal) => (
                                                                                <ActionModal
                                                                                    modalContent={duplicatesModal}
                                                                                    text={`Found ${e?.response?.data?.duplicate_post_collection_items?.length?.toString() ?? ""} duplicates. Select 'ignore' to add those items anyway or 'skip' to skip all duplicates.`}
                                                                                    actions={[
                                                                                        {
                                                                                            name: "Ignore",
                                                                                            fn: async () => {
                                                                                                const loadingModal =
                                                                                                    app.openLoadingModal();
                                                                                                try {
                                                                                                    const config =
                                                                                                        await app.getAuthorization(
                                                                                                            location,
                                                                                                            navigate
                                                                                                        );
                                                                                                    const response =
                                                                                                        await http.post<PostCollectionDetailed>(
                                                                                                            `/edit-collection/${collection.pk}`,
                                                                                                            {
                                                                                                                added_post_pks:
                                                                                                                    postPks,
                                                                                                                added_post_query:
                                                                                                                    postQuery?.query,
                                                                                                                post_query_constriction:
                                                                                                                    postQuery?.constriction,
                                                                                                                post_query_access_filter:
                                                                                                                    postQuery?.access_filter,
                                                                                                                duplicate_mode:
                                                                                                                    "ignore",
                                                                                                            },
                                                                                                            config
                                                                                                        );
                                                                                                    loadingModal.close();
                                                                                                    enqueueSnackbar({
                                                                                                        message: `Added ${postQuery ? "all found posts" : `${postPks.length} post${postPks.length !== 1 ? "s" : ""}`} to collection`,
                                                                                                        variant:
                                                                                                            "success",
                                                                                                    });
                                                                                                    modal?.close(
                                                                                                        response.data
                                                                                                    );
                                                                                                    return response.data;
                                                                                                } catch (e: any) {
                                                                                                    loadingModal.close();
                                                                                                    errorHandler(e);
                                                                                                }
                                                                                            },
                                                                                        },
                                                                                        {
                                                                                            name: "Skip",
                                                                                            fn: async () => {
                                                                                                const loadingModal =
                                                                                                    app.openLoadingModal();
                                                                                                try {
                                                                                                    const config =
                                                                                                        await app.getAuthorization(
                                                                                                            location,
                                                                                                            navigate
                                                                                                        );
                                                                                                    const response =
                                                                                                        await http.post<PostCollectionDetailed>(
                                                                                                            `/edit-collection/${collection.pk}`,
                                                                                                            {
                                                                                                                added_post_pks:
                                                                                                                    postPks,
                                                                                                                added_post_query:
                                                                                                                    postQuery?.query,
                                                                                                                post_query_constriction:
                                                                                                                    postQuery?.constriction,
                                                                                                                post_query_access_filter:
                                                                                                                    postQuery?.access_filter,
                                                                                                                duplicate_mode:
                                                                                                                    "skip",
                                                                                                            },
                                                                                                            config
                                                                                                        );
                                                                                                    loadingModal.close();
                                                                                                    enqueueSnackbar({
                                                                                                        message: `Added post(s) to collection`,
                                                                                                        variant:
                                                                                                            "success",
                                                                                                    });
                                                                                                    modal?.close(
                                                                                                        response.data
                                                                                                    );
                                                                                                    return response.data;
                                                                                                } catch (e: any) {
                                                                                                    loadingModal.close();
                                                                                                    errorHandler(e);
                                                                                                }
                                                                                            },
                                                                                        },
                                                                                    ]}
                                                                                />
                                                                            )
                                                                        );
                                                                    } else {
                                                                        errorHandler(e);
                                                                    }
                                                                }
                                                            } catch (e: any) {
                                                                errorHandler(e);
                                                            }
                                                        },
                                                    },
                                                ]}
                                            />
                                        ),
                                        (returnValue) => {
                                            if (returnValue) {
                                                modal?.close(returnValue);
                                            }
                                        }
                                    )
                                }
                            >
                                {collection.thumbnail_object_key && (
                                    <ListItemAvatar id={"add-to-collection-list-item-avatar-" + collection.pk}>
                                        <Avatar
                                            variant="rounded"
                                            id={"add-to-collection-list-item-avatar-avatar-" + collection.pk}
                                            src={urlJoin(getApiUrl(), "get-object", collection.thumbnail_object_key)}
                                        />
                                    </ListItemAvatar>
                                )}
                                <ListItemText
                                    id={"add-to-collection-list-item-text-" + collection.pk}
                                    primary={collection.title}
                                    secondary={
                                        <Typography variant="caption">
                                            {collection.create_user.display_name ?? collection.create_user.user_name}
                                        </Typography>
                                    }
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </div>
            <div id="add-to-collection-pagination">
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
            </div>
        </div>
    );
}
