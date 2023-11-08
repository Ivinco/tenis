import React from 'react';
import styles from "./MainDisplay.module.css";
import Alert from "../Alert/Alert";
import {useSelector} from "react-redux";
import {useConnectSocket} from "../../hooks/useConnectSocket";

const MainDisplay = () => {
    const isActiveSocket = useSelector(state => state.webSocket.isOpened)
    const rawAlerts = useConnectSocket()

    return (
        <div className={styles.mainDisplay}>
            {isActiveSocket ? (
                rawAlerts.map((alert) => (
                    <Alert alert={alert} key={alert.id}></Alert>
                ))
            ) : (
                <div style={{textAlign: 'center', fontSize: '2rem', marginTop: '20px'}}>NO CONNECTION</div>
            )}
        </div>
    );
};

export default MainDisplay;