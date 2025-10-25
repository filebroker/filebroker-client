import Cropper, {Area} from "react-easy-crop";
import {useRef, useState} from "react";
import {App, ModalContent, User} from "../App";
import {Button, Slider, Stack} from "@mui/material";
import {ZoomIn, ZoomOut} from "@mui/icons-material";
import {useLocation, useNavigate} from "react-router-dom";
import http, {getApiUrl} from "../http-common";
import urlJoin from "url-join";
import {enqueueSnackbar} from "notistack";

/**
 *  Image cropper for profile avatars.
 *
 *  NOTE: When used in a modal, disable scaling effect transitions using disableTransitions. See https://github.com/ValentinH/react-easy-crop/issues/400
 */
export function AvatarCropper({sourceObjectKey, modal, userGroupPk, app}: {
    sourceObjectKey: string,
    modal?: ModalContent,
    userGroupPk?: number | undefined,
    app: App
}) {
    const location = useLocation();
    const navigate = useNavigate();
    const [crop, setCrop] = useState({x: 0, y: 0});
    const [zoom, setZoom] = useState(1);
    const croppedArea = useRef<Area | undefined>(undefined);

    const imgSrc = urlJoin(getApiUrl(), "get-object", sourceObjectKey);

    return (
        <div id="AvatarCropper" style={{minWidth: "350px", minHeight: "350px"}}>
            <div style={{minWidth: "350px", minHeight: "350px", position: "relative"}}>
                <Cropper
                    image={imgSrc}
                    crop={crop}
                    onCropChange={setCrop}
                    zoom={zoom}
                    onZoomChange={setZoom}
                    maxZoom={9}
                    aspect={1}
                    onCropComplete={(_, croppedAreaPixels) => {
                        croppedArea.current = croppedAreaPixels;
                    }}
                />
            </div>
            <div style={{display: "flex", width: "100%", flexDirection: "row", justifyContent: "space-between", marginTop: "10px"}}>
                <Stack spacing={2} direction="row" sx={{ alignItems: 'center', mb: 1, width: "200px" }}>
                    <ZoomOut />
                    <Slider value={zoom} onChange={(_, value) => setZoom(value as number)} min={1} max={9} step={0.1} />
                    <ZoomIn />
                </Stack>
                <Button variant="outlined" color="secondary" disabled={!(croppedArea.current)} onClick={async () => {
                    const currentArea = croppedArea.current;
                    if (!currentArea) {
                        return;
                    }
                    const loadingModal = app.openLoadingModal();
                    try {
                        let config = await app.getAuthorization(location, navigate);
                        let req = {
                            source_object_key: sourceObjectKey,
                            width: currentArea.width,
                            height: currentArea.height,
                            x: currentArea.x,
                            y: currentArea.y
                        };
                        if (userGroupPk) {
                            let response = await http.post<User>(`/create-user-group-avatar/${userGroupPk}`, req, config);
                            enqueueSnackbar({
                                message: "Avatar saved",
                                variant: "success"
                            });
                            modal?.close(response.data);
                        } else {
                            let response = await http.post<User>("create-user-avatar", req, config);
                            enqueueSnackbar({
                                message: "Avatar saved",
                                variant: "success"
                            });
                            app.updateUserData(response.data);
                            modal?.close(response.data);
                        }
                    } catch (e: any) {
                        if (e?.response?.data?.error_code === 500017) {
                            app.openModal("Error", <p>Cannot save avatar image because site admin has not set up a system bucket.</p>);
                        } else {
                            console.error("Failed to set user avatar", e);
                            enqueueSnackbar({
                                message: "Failed to save avatar",
                                variant: "error"
                            });
                        }
                    } finally {
                        loadingModal.close();
                    }
                }}>Save</Button>
            </div>
        </div>
    );
}
