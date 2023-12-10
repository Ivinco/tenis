import styles from './MainDisplay.module.css'
import React, {useEffect, useState} from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from "react-virtualized-auto-sizer";
import {useConnectSocket} from "../../hooks/useConnectSocket";
import Alert from "../Alert/Alert";
import {useDispatch, useSelector} from "react-redux";
import {setAlertsNumber} from "../../store/reducers/alertReducer";
import AlertGroup from "../AlertGroup/AlertGroup";
import {groupByField} from "../../utils/utils";
import {alertNameGroups, alertsToGroup, hostNameGroups} from "../../utils/grouping";

export default function MainDisplay() {
    useConnectSocket(localStorage.getItem('token'))
    const dispatch = useDispatch()
    const isActiveSocket = useSelector(state => state.webSocket.isOpened)
    const rawAlerts = useSelector(state => state.webSocket.alerts)
    const isInspectMode = useSelector(state => state.setHeaderMenuItemValue.inspectMode)
    const activeProject = useSelector(state => state.setHeaderMenuItemValue.project)
    const isGrouped = useSelector(state => state.setHeaderMenuItemValue.grouping)
    const [windowWidth, setWindowWidth] = useState(window.innerWidth)
    let alertsToDisplay
    let rowHeight

    //Track screen width for dynamic scaling for alert height in virtual list
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


    //Here we filter all alerts by project and display only related ones
    switch (activeProject){
        case "All":
                alertsToDisplay = [...rawAlerts]
            break
        default:
            alertsToDisplay = rawAlerts.filter((alert) => alert.project === activeProject)
    }
    //Define ungrouped alerts which will be displayed in virtual list
    let ungroupedAlerts = alertsToDisplay
    dispatch(setAlertsNumber(alertsToDisplay.length))

    //This block defines grouping functionality
    const alertGroups = []
    if (isGrouped === "Enabled"){
        //Here we are grouping alerts by Hostname
        const groupsByHost = groupByField(alertsToDisplay, 'host')
        //Process alerts grouped by name
        const hostnameGroups = hostNameGroups(groupsByHost)
        hostnameGroups.forEach(group => alertGroups.push(group))

        const hostnameAlerts = alertsToGroup(alertGroups)
        ungroupedAlerts = alertsToDisplay.filter(alert => !hostnameAlerts.has(alert._id));
        const groupsByAlertName = groupByField(ungroupedAlerts, 'alertName')
        const alertnameGroups = alertNameGroups(groupsByAlertName)
        alertnameGroups.forEach(group => alertGroups.push(group))
        const alertnameAlerts = alertsToGroup(alertGroups)
        ungroupedAlerts = ungroupedAlerts.filter(alert => !alertnameAlerts.has(alert._id))
    }


    //Define row for virtual list of ungrouped alerts
    const alertRow = ({index, style}) => (
        <div style={style}>
            <Alert alert={ungroupedAlerts[index]}/>
        </div>
    )



    return (
        <div className={styles.mainDisplay}>
            {isActiveSocket ?
                <>
                    { alertGroups.length > 0
                        ?
                        alertGroups.map(group => (
                            <div className={
                                `${styles.groupWrapper} 
                                ${isInspectMode ? null : styles.groupWrapper_small}`
                            } key={group.id}>
                                <AlertGroup group={group} alertHeight={rowHeight}/>
                            </div>
                        ))

                        : <></>
                    }
                <AutoSizer>
                {({height, width}) => (
                    <List
                        className="List"
                        height={height}
                        itemCount={ungroupedAlerts.length}
                        itemSize={rowHeight}
                        width={width}
                    >
                        {alertRow}
                    </List>
                )}
            </AutoSizer>
                </>
            :
            <div style={{textAlign: 'center', fontSize: '2rem', marginTop: '20px'}}>NO CONNECTION</div>
            }
        </div>
    )
}

