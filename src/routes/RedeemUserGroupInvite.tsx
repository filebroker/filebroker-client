import App from "../App";
import {useLocation, useNavigate, useParams} from "react-router-dom";
import {Paper} from "@mui/material";
import {useEffect, useState} from "react";
import http from "../http-common";
import {UserGroupJoined} from "../Model";
import {solid} from "@fortawesome/fontawesome-svg-core/import.macro";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

export function RedeemUserGroupInvite({ app }: { app: App }) {
    let { invite_code } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [userGroupJoined, setUserGroupJoined] = useState<UserGroupJoined | null>(null);
    const [alreadyMember, setAlreadyMember] = useState(false);
    const [userBanned, setUserBanned] = useState(false);
    const [invalidInviteCode, setInvalidInviteCode] = useState(false);
    const [unexpectedError, setUnexpectedError] = useState(false);

    useEffect(() => {
        const fetch = async () => {
            try {
                let config = await app.getAuthorization(location, navigate);
                const res = await http.post<UserGroupJoined>(`/redeem-user-group-invite/${invite_code}`, {}, config);
                setUserGroupJoined(res.data);
            } catch (e: any) {
                if (e?.response?.data?.error_code === 400022) {
                    setAlreadyMember(true);
                } else if (e?.response?.data?.error_code === 403006) {
                    setUserBanned(true);
                } else if (e?.response?.data?.error_code === 400021) {
                    setInvalidInviteCode(true);
                } else {
                    console.error("Failed to redeem user group invite", e);
                    setUnexpectedError(true);
                }
            }
        };

        fetch().catch((e) => console.error(e));
    }, [invite_code]);

    let content;
    if (userGroupJoined) {
        content = <>
            <FontAwesomeIcon icon={solid("check")} size="6x"/>
            <p>You have successfully joined the group {userGroupJoined.group.name}.</p>
        </>;
    } else if (alreadyMember) {
        content = <>
            <FontAwesomeIcon icon={solid("x")} size="6x"/>
            <p>You are already a member of this group.</p>
        </>;
    } else if (userBanned) {
        content = <>
            <FontAwesomeIcon icon={solid("x")} size="6x"/>
            <p>You are banned from this group.</p>
        </>;
    } else if (invalidInviteCode) {
        content = <>
            <FontAwesomeIcon icon={solid("x")} size="6x"/>
            <p>Code has expired or is invalid.</p>
        </>;
    } else if (unexpectedError) {
        content = <>
            <FontAwesomeIcon icon={solid("x")} size="6x"/>
            <p>An unexpected error occurred. Please try again later.</p>
        </>;
    }

    return (
        <div id="RedeemUserGroupInvite">
            <div className="form-container-center">
                <Paper elevation={2} className="form-paper">
                    <div className="form-paper-content">
                        {content}
                    </div>
                </Paper>
            </div>
        </div>
    );
}
