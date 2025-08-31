import {AppBar, Avatar, Box, Button, IconButton, List, ListItem, styled, Toolbar} from "@mui/material";
import React from "react";
import MenuIcon from "@mui/icons-material/Menu";
import {GlobalQueryInput} from "./QueryInput";
import {Link} from "react-router-dom";
import urlJoin from "url-join";
import {getApiUrl, getPublicUrl} from "../http-common";
import App from "../App";
import UploadDialogue from "./UploadDialogue";
import {FontAwesomeSvgIcon} from "./FontAwesomeSvgIcon";
import {solid} from "@fortawesome/fontawesome-svg-core/import.macro";

const StyledAppBar = styled(AppBar)(({ theme }) => ({
    backgroundColor: "#000a14e6",
    backdropFilter: "blur(6px)",
    webkitBackdropFilter: "blur(6px)",
    fontWeight: 500,
    fontSize: "18px",
    boxShadow: "none",
    transition: "none",
    backgroundImage: "none",
}));

const NavLinkButton = styled(Button)({
    fontSize: "inherit",
    fontWeight: "inherit",
    fontFamily: "inherit",
    color: "inherit",
    textTransform: "inherit",
    textDecoration: "inherit",
    '&:hover': {
        color: '#2a52be'
    }
}) as typeof Button;

const NavLinkOutlinedButton = styled(Button)({
    fontSize: "inherit",
    fontWeight: "inherit",
    fontFamily: "inherit",
    color: "inherit",
    textTransform: "inherit",
    textDecoration: "inherit",
}) as typeof Button;

const NavLinkIconButton = styled(IconButton)({
    fontSize: "inherit",
    fontWeight: "inherit",
    fontFamily: "inherit",
    color: "inherit",
    textTransform: "inherit",
    textDecoration: "inherit",
    '&:hover': {
        color: '#2a52be'
    }
}) as typeof IconButton;

export default function NavBar({ app }: { app: App }) {
    return (
        <StyledAppBar position="fixed">
            <Toolbar disableGutters>
                <Box sx={{ flex: "1", display: app.isDesktop() ? "none" : "flex", justifyContent: "space-between", alignContent: "center", alignItems: "center", marginLeft: "10px", marginRight: "10px" }}>
                    <IconButton
                        size="large"
                        aria-label="mobile navigation menu"
                        aria-controls="menu-appbar"
                        onClick={() => app.openModal("", (modal) =>
                            <List sx={{display: "flex", flexDirection: "column", alignItems: "center", justifyItems: "center", justifyContent: "center", width: "100%", height: "100%"}}>
                                <ListItem sx={{display: "flex", width: "fit-content"}}><NavLinkButton component={Link} to={"/"} onClick={() => modal.close()}>
                                    <img src={urlJoin(getPublicUrl(), "logo192.png")} alt="Logo" height="48"/>
                                </NavLinkButton></ListItem>
                                <ListItem sx={{display: "flex", width: "fit-content"}}>
                                    <NavLinkButton component={Link} to={"/posts"} onClick={() => modal.close()}>Posts</NavLinkButton>
                                </ListItem>
                                <ListItem sx={{display: "flex", width: "fit-content"}}>
                                    <NavLinkButton component={Link} to={"/collections"} onClick={() => modal.close()}>Collections</NavLinkButton>
                                </ListItem>
                                <ListItem sx={{display: "flex", width: "fit-content"}}>
                                    <NavLinkButton
                                        variant="text"
                                        disabled={!app.isLoggedIn()}
                                        startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("cloud-arrow-up")}/>}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            if (app.isLoggedIn()) {
                                                app.openModal("Upload", uploadModal =>
                                                    <UploadDialogue
                                                        app={app}
                                                        modal={uploadModal}></UploadDialogue>);
                                            } else {
                                                app.openModal("Error", <p>Must be logged in</p>);
                                            }
                                        }}>Upload</NavLinkButton>
                                </ListItem>
                                <ListItem sx={{display: "flex", width: "fit-content"}}>
                                    <NavLinkButton component={Link} to="/tags" onClick={() => modal.close()}>Tags</NavLinkButton>
                                </ListItem>
                                <ListItem sx={{display: "flex", width: "fit-content"}}>
                                    {app.isLoggedIn()
                                        ? <NavLinkIconButton component={Link} to={"/profile"}>
                                            <Avatar sx={{ width: 48, height: 48 }} src={app.getUser()?.avatar_object_key ? urlJoin(getApiUrl(), "get-object", app.getUser()!.avatar_object_key!) : undefined}>
                                                {!(app.getUser()?.avatar_object_key) && (app.getUser()!.display_name ?? app.getUser()!.user_name).split(/\s+/i, 3).filter(s => s.length > 0).map(s => s[0].toUpperCase())}
                                            </Avatar>
                                        </NavLinkIconButton>
                                        : <NavLinkOutlinedButton component={Link} to={"/login"} variant="contained" color="secondary">Log In</NavLinkOutlinedButton>
                                    }
                                </ListItem>
                            </List>)}
                        color="inherit"
                    >
                        <MenuIcon/>
                    </IconButton>
                    <Box sx={{ flex: "1", display: "flex", justifyContent: "center" }}>
                        <GlobalQueryInput hideOnHome />
                    </Box>
                </Box>
                <Box sx={{ flex: 1, display: app.isDesktop() ? "flex" : "none", justifyContent: "space-between", alignContent: "center", alignItems: "center", marginLeft: "25px", marginRight: "25px" }}>
                    <Box sx={{ flex: "1", display: "flex", alignItems: "center" }}>
                        <NavLinkButton component={Link} to={"/"}>
                            <img src={urlJoin(getPublicUrl(), "logo192.png")} alt="Logo" height="48"/>
                        </NavLinkButton>
                        <NavLinkButton component={Link} to={"/posts"}>Posts</NavLinkButton>
                        <NavLinkButton component={Link} to={"/collections"}>Collections</NavLinkButton>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "center", width: "calc(25vw - 50px)" }}>
                        <GlobalQueryInput hideOnHome />
                    </Box>
                    <Box sx={{ flex: "1", display: "flex", justifyContent: "flex-end" }}>
                        <NavLinkButton variant="text" disabled={!app.isLoggedIn()} startIcon={<FontAwesomeSvgIcon fontSize="inherit" icon={solid("cloud-arrow-up")} />} onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (app.isLoggedIn()) {
                                app.openModal("Upload", uploadModal => <UploadDialogue app={app} modal={uploadModal}></UploadDialogue>);
                            } else {
                                app.openModal("Error", <p>Must be logged in</p>);
                            }
                        }}>Upload</NavLinkButton>
                        <NavLinkButton component={Link} to="/tags">Tags</NavLinkButton>
                        {app.isLoggedIn()
                            ? <NavLinkIconButton component={Link} to={"/profile"}>
                                <Avatar sx={{ width: 40, height: 40 }} src={app.getUser()?.avatar_object_key ? urlJoin(getApiUrl(), "get-object", app.getUser()!.avatar_object_key!) : undefined}>
                                    {!(app.getUser()?.avatar_object_key) && (app.getUser()!.display_name ?? app.getUser()!.user_name).split(/\s+/i, 3).filter(s => s.length > 0).map(s => s[0].toUpperCase())}
                                </Avatar>
                            </NavLinkIconButton>
                            : <NavLinkOutlinedButton component={Link} to={"/login"} variant="contained" color="secondary">Log In</NavLinkOutlinedButton>
                        }
                    </Box>
                </Box>
            </Toolbar>
        </StyledAppBar>
    );
}
