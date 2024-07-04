import { useLocation, useNavigate, useParams } from "react-router-dom";
import App from "../App";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { solid } from "@fortawesome/fontawesome-svg-core/import.macro";
import { useEffect, useState } from "react";
import http from "../http-common";
import { Paper } from "@mui/material";

export function EmailConfirmation({ app }: { app: App }) {
    let { token } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [emailConfirmed, setEmailConfirmed] = useState(false);
    const [emailConfirmationFailed, setEmailConfirmationFailed] = useState(false);

    useEffect(() => {
        let fetch = async () => {
            let config = await app.getAuthorization(location, navigate);
            await http.post(`/confirm-email/${token}`, null, config);
            setEmailConfirmed(true);
        };

        fetch().catch((e) => {
            console.log("Could not confirm email: " + e);
            setEmailConfirmationFailed(true);
        });
    }, [token]);

    let loadingContainer;
    if (emailConfirmed) {
        loadingContainer = <>
            <FontAwesomeIcon icon={solid("check")} size="6x"></FontAwesomeIcon>
            <p>Email confirmation succeeded, you may now close this tab.</p>
        </>
    } else if (emailConfirmationFailed) {
        loadingContainer = <>
            <FontAwesomeIcon icon={solid("x")} size="6x"></FontAwesomeIcon>
            <p>Email confirmation failed. Please try again.</p>
        </>
    } else {
        loadingContainer = <>
            <FontAwesomeIcon icon={solid("circle-notch")} spin size="6x"></FontAwesomeIcon>
            <p>Confirming Email</p>
        </>
    }

    return <>
        <div id="EmailConfirmation">
            <div className="form-container-center">
                <Paper elevation={2} className="form-paper">
                    <div className="form-paper-content">
                        {loadingContainer}
                    </div>
                </Paper>
            </div>
        </div>
    </>;
}
