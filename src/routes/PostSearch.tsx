import { solid } from '@fortawesome/fontawesome-svg-core/import.macro';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import App from '../App';
import 'react-lazy-load-image-component/src/effects/blur.css';
import { PaginatedGridView } from '../components/PaginatedGridView';
import { PostQueryObject, performSearchQuery } from '../Search';
import { AddToCollectionDialogue } from '../components/AddToCollectionDialogue';
import { ActionModal } from '../components/ActionModal';
import { DeletePostsResponse, PostDetailed } from '../Model';
import http from "../http-common";
import { useSnackbar } from 'notistack';

class PostSearchProps {
    app: App;

    constructor(app: App) {
        this.app = app;
    }
}

function PostSearch({ app }: PostSearchProps) {
    const [fullCount, setFullCount] = useState<number | null>(0);
    const [pageCount, setPageCount] = useState<number | null>(0);
    const [posts, setPosts] = useState<PostQueryObject[]>([]);
    const [modCount, setModCount] = useState(0);
    const location = useLocation();
    const search = location.search;
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    useEffect(() => {
        const modal = app.openLoadingModal();

        performSearchQuery(search, app, location, navigate, modal).then(searchResult => {
            setFullCount(searchResult.full_count);
            setPageCount(searchResult.pages);
            setPosts(searchResult.posts || []);
            modal.close();
        }).catch(e => {
            modal.close();
            console.error(e);
        });

        return () => {
            setFullCount(0);
            setPageCount(0);
            setPosts([]);
        };
    }, [search, modCount]);

    return (
        <div id="PostSearch">
            <PaginatedGridView
                itemsProperty={posts}
                onItemClickPath={(post) => "/post/" + post.pk}
                pagePath='/posts'
                fullCount={fullCount}
                pageCount={pageCount}
                gridItemActions={[
                    {
                        name: "Add to collection",
                        icon: solid("square-plus"),
                        allowExecuteForAll: new URLSearchParams(search).get("query") !== null && fullCount != null && fullCount <= 10000,
                        fn: (items, cb) => {
                            if (items && items.length > 0) {
                                app.openModal("Add to collection", (modal) => <AddToCollectionDialogue app={app} postPks={items.map(item => item.pk)} modal={modal} />, (result) => cb?.(result));
                            } else {
                                app.openModal(
                                    "Confirm adding all results",
                                    (modalContent) => <ActionModal
                                        modalContent={modalContent}
                                        text={`No posts have been selected, meaning all ${fullCount ? fullCount.toString() + ' ' : ''}posts will be added.`}
                                        actions={[{
                                            name: "Ok",
                                            fn: () => app.openModal("Add to collection", (modal) => <AddToCollectionDialogue app={app} postPks={[]} modal={modal} postQuery={new URLSearchParams(search).get("query") ?? undefined} />)
                                        }]}
                                    />,
                                    (result) => cb?.(result)
                                );
                            }
                        }
                    },
                    {
                        name: "Delete post",
                        icon: solid("trash"),
                        color: "red",
                        enableForItemAsync: async (post) => {
                            const config = await app.getAuthorization(location, navigate, false);
                            let searchParams = new URLSearchParams(search);
                            searchParams.set("exclude_window", "true");
                            let result = await http.get<PostDetailed>(`/get-post/${post.pk}?${searchParams}`, config);
                            return result.data.is_deletable;
                        },
                        fn: (items, cb) => app.openModal(
                            "Delete post",
                            (modal) => <ActionModal
                                modalContent={modal}
                                text={items.length === 1 && items[0].title ? `Delete post '${items[0].title}'` : `Delete ${items.length} post${items.length === 1 ? '' : 's'}. Posts you are not allowed to delete will be ignored.`}
                                actions={[
                                    {
                                        name: "Ok",
                                        fn: async () => {
                                            const loadingModal = app.openLoadingModal();
                                            try {
                                                const config = await app.getAuthorization(location, navigate);
                                                const result = await http.post<DeletePostsResponse>("/delete-posts", {
                                                    post_pks: items.map(item => item.pk),
                                                    inaccessible_post_mode: "skip",
                                                    delete_unreferenced_objects: true
                                                }, config);

                                                loadingModal.close();
                                                setModCount(modCount + 1);
                                                enqueueSnackbar({
                                                    message: `Deleted ${result.data.deleted_posts.length} post${result.data.deleted_posts.length !== 1 ? 's' : ''}`,
                                                    variant: "success"
                                                });
                                                return result.data;
                                            } catch (e) {
                                                console.error(e);
                                                loadingModal.close();
                                                enqueueSnackbar({
                                                    message: "Failed to delete post",
                                                    variant: "error"
                                                });
                                            }
                                        }
                                    }
                                ]}
                            />,
                            (result) => cb?.(result)
                        )
                    }
                ]}
            />
        </div>
    );
}

export default PostSearch;
