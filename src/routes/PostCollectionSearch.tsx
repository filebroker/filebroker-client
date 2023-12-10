import { solid } from '@fortawesome/fontawesome-svg-core/import.macro';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import App from '../App';
import 'react-lazy-load-image-component/src/effects/blur.css';
import { PaginatedGridView } from '../components/PaginatedGridView';
import { PostCollectionQueryObject, performSearchQuery } from '../Search';
import { DeletePostCollectionsResponse, PostCollectionDetailed } from '../Model';
import http from "../http-common";
import { ActionModal } from '../components/ActionModal';
import { useSnackbar } from 'notistack';

class PostCollectionSearchProps {
    app: App;

    constructor(app: App) {
        this.app = app;
    }
}

function PostCollectionSearch({ app }: PostCollectionSearchProps) {
    const [fullCount, setFullCount] = useState<number | null>(0);
    const [pageCount, setPageCount] = useState<number | null>(0);
    const [collections, setCollections] = useState<PostCollectionQueryObject[]>([]);
    const [modCount, setModCount] = useState(0);
    const location = useLocation();
    const search = location.search;
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    useEffect(() => {
        const modal = app.openLoadingModal();

        performSearchQuery("/collection" + search, app, location, navigate, modal).then(searchResult => {
            setFullCount(searchResult.full_count);
            setPageCount(searchResult.pages);
            setCollections(searchResult.collections ?? []);
            modal.close();
        }).catch(e => {
            modal.close();
            console.error(e);
        });

        return () => {
            setFullCount(0);
            setPageCount(0);
            setCollections([]);
        };
    }, [search, modCount]);

    return (
        <div id="PostCollectionSearch">
            <PaginatedGridView
                itemsProperty={{
                    items: collections,
                    extraction_fn: (collection: PostCollectionQueryObject) => {
                        return {
                            pk: collection.pk,
                            create_user: collection.create_user,
                            title: collection.title,
                            thumbnail_object_key: collection.thumbnail_object_key,
                            source: collection
                        };
                    }
                }}
                onItemClickPath={(collection) => "/collection/" + collection.pk}
                stripQueryParamsOnItemClick={true}
                pagePath='/collections'
                fullCount={fullCount}
                pageCount={pageCount}
                isDesktop={app.isDesktop()}
                gridItemActions={[
                    {
                        name: "Delete collection",
                        icon: solid("trash"),
                        color: "red",
                        enableForItemAsync: async (collection) => {
                            const config = await app.getAuthorization(location, navigate, false);
                            let result = await http.get<PostCollectionDetailed>(`/get-collection/${collection.pk}`, config);
                            return result.data.is_deletable;
                        },
                        fn(items, cb) {
                            app.openModal(
                                items.length > 1000 ? "Error" : "Delete collection",
                                (modal) => {
                                    if (items.length > 1000) {
                                        return <p>Cannot delete more than 1000 collections at once.</p>;
                                    }

                                    return <ActionModal
                                        modalContent={modal}
                                        text={items.length === 1 && items[0].title ? `Delete collection '${items[0].title}'` : `Delete ${items.length} collection${items.length === 1 ? '' : 's'}. Collections you are not allowed to delete will be ignored.`}
                                        actions={[
                                            {
                                                name: "Ok",
                                                fn: async () => {
                                                    const loadingModal = app.openLoadingModal();
                                                    try {
                                                        const config = await app.getAuthorization(location, navigate);
                                                        const result = await http.post<DeletePostCollectionsResponse>("/delete-collections", {
                                                            post_collection_pks: items.map(item => item.pk),
                                                            inaccessible_post_mode: "skip"
                                                        }, config);

                                                        loadingModal.close();
                                                        setModCount(modCount + 1);
                                                        enqueueSnackbar({
                                                            message: `Deleted ${result.data.deleted_post_collections.length} collection${result.data.deleted_post_collections.length !== 1 ? 's' : ''}`,
                                                            variant: "success"
                                                        });
                                                        return result.data;
                                                    } catch (e) {
                                                        console.error(e);
                                                        loadingModal.close();
                                                        enqueueSnackbar({
                                                            message: "Failed to delete collection",
                                                            variant: "error"
                                                        });
                                                    }
                                                }
                                            }
                                        ]}
                                    />;
                                },
                                (result) => cb?.(result)
                            )
                        },
                    }
                ]}
            />
        </div>
    );
}

export default PostCollectionSearch;
