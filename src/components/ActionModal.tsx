import { Button, ButtonGroup } from "@mui/material";
import { ModalContent } from "../App";

export interface Action {
    name: string;
    fn: (modalContent?: ModalContent) => any;
}

export function ActionModal({ modalContent, text, actions, showCancelButton = true }: { modalContent: ModalContent, text: string, actions: Action[], showCancelButton?: boolean }) {
    return (
        <div id="ActionModal">
            <div id="action-modal-text">
                <p>{text}</p>
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
                                returnValue = await action.fn(modalContent);
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
