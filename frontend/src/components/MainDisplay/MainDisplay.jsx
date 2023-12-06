import styles from './MainDisplay.module.css'
import React, {useEffect, useState} from 'react';
import ReactDOM from 'react-dom';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from "react-virtualized-auto-sizer";
import {useConnectSocket} from "../../hooks/useConnectSocket";
import Alert from "../Alert/Alert";
import {useDispatch, useSelector} from "react-redux";
import alert from "../Alert/Alert";
import {setAlertsNumber} from "../../store/reducers/alertReducer";
import AlertGroup from "../AlertGroup/AlertGroup";

export default function MainDisplay() {
    useConnectSocket(localStorage.getItem('token'))
    const dispatch = useDispatch()
    const isActiveSocket = useSelector(state => state.webSocket.isOpened)
    const rawAlerts = useSelector(state => state.webSocket.alerts)
    const isInspectMode = useSelector(state => state.setHeaderMenuItemValue.inspectMode)
    const activeProject = useSelector(state => state.setHeaderMenuItemValue.project)
    const totalAlertsToDisplay = useSelector(state => state.setAlertReducer.alertsNumber)
    const [windowWidth, setWindowWidth] = useState(window.innerWidth)
    let alertsToDisplay
    let rowHeight
    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    if(windowWidth > 1650 && isInspectMode){
        rowHeight = 95
    } else if ((1150 < windowWidth && windowWidth <= 1650) && isInspectMode) {
        rowHeight = 60
    } else {
        rowHeight = 47
    }


    switch (activeProject){
        case "All":
                alertsToDisplay = [...rawAlerts]
            break
        default:
            alertsToDisplay = rawAlerts.filter((alert) => alert.project === activeProject)
    }
    dispatch(setAlertsNumber(alertsToDisplay.length))

    const alertRaw = ({index, style}) => (
        <div style={style}>
            <Alert alert={alertsToDisplay[index]}/>
        </div>
    )

    console.log(totalAlertsToDisplay)

    return (
        <div className={styles.mainDisplay}>
            <div className={`${styles.groupWrapper} ${isInspectMode ? null : styles.groupWrapper_small}`} style={{height: rowHeight}}>
                <AlertGroup />
            </div>

            {isActiveSocket ?
                <AutoSizer>
                {({height, width}) => (
                    <List
                        className="List"
                        height={height}
                        itemCount={alertsToDisplay.length}
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

