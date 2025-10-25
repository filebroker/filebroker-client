import { Button, ButtonGroup } from "@mui/material";
import { ModalContent } from "../App";
import {ReactNode, useState} from "react";

export interface Action {
    name: string;
    fn: (modalContent?: ModalContent, additionalContent?: string) => any;
}

export function ActionModal({ modalContent, text, additionalContent, actions, showCancelButton = true }: {
    modalContent: ModalContent,
    text: string,
    additionalContent?: (value: string, setValue: (v: string) => void) => ReactNode;
    actions: Action[],
    showCancelButton?: boolean,
}) {
    const [value, setValue] = useState("");
    return (
        <div id="ActionModal" style={{ display: "flex", flexDirection: "column", gap: "10px", minWidth: "350px" }}>
            <div id="action-modal-text">
                <p>{text}</p>
            </div>
            <div>
                {additionalContent && additionalContent(value, setValue)}
            </div>
            <div id="action-modal-button-row">
                {showCancelButton && <div style={{ "float": "left" }}>
                    <Button color="error" onClick={() => modalContent.close()}>Cancel</Button>
                </div>}
                <div style={{ "float": "right" }}>
                    <ButtonGroup variant="outlined">
                        {actions.map((action) => <Button key={"action_button_" + action.name} onClick={async () => {
                            let returnValue;
                            try {
                                returnValue = await action.fn(modalContent, additionalContent && value);
                            } finally {
                                modalContent.close(returnValue);
                            }
                        }}>{action.name}</Button>)}
                    </ButtonGroup>
                </div>
            </div>
        </div>
    );
}
