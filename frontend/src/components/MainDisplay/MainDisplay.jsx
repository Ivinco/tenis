import styles from './MainDisplay.module.css'
import React, {useEffect, useState} from 'react';
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
    const isInspectMode = useSelector(state => state.setHeaderMenuItemValue.inspectMode)

    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    let rowHeight
    if(windowWidth > 1650 && isInspectMode){
        rowHeight = 95
    } else if ((1150 < windowWidth && windowWidth <= 1650) && isInspectMode) {
        rowHeight = 60
    } else {
        rowHeight = 47
    }

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
                        itemSize={rowHeight}
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

