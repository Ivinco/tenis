import styles from './MainDisplay.module.css'
import React from 'react';
import ReactDOM from 'react-dom';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from "react-virtualized-auto-sizer";
import {useConnectSocket} from "../../hooks/useConnectSocket";
import Alert from "../Alert/Alert";
import {useSelector} from "react-redux";

export default function MainDisplay() {
    useConnectSocket(localStorage.getItem('token'))
    const isActiveSocket = useSelector(state => state.webSocket.isOpened)
    const rawAlerts = useSelector(state => state.webSocket.alerts)

    const Row = ({ index, style }) => (
        <div style={style}>Row {index}</div>
    );

    const alertRaw = ({index, style}) => (
        <div style={style}>
            <Alert alert={rawAlerts[index]}/>
        </div>
    )

    return (
        <div className={styles.mainDisplay}>
            {isActiveSocket ?
                <AutoSizer>
                {({height, width}) => (
                    <List
                        className="List"
                        height={height}
                        itemCount={rawAlerts.length}
                        itemSize={125}
                        width={width}
                    >
                        {alertRaw}
                    </List>
                )}
            </AutoSizer>
            : (
            <div style={{textAlign: 'center', fontSize: '2rem', marginTop: '20px'}}>NO CONNECTION</div>
            )}
        </div>


    )
}

