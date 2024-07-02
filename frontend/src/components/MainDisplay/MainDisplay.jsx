import styles from './MainDisplay.module.css'
import alertStyles from '../Alert/Alert.module.css'
import React, {useEffect, useMemo, useState} from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from "react-virtualized-auto-sizer";
import {useConnectSocket} from "../../hooks/useConnectSocket";
import Alert from "../Alert/Alert";
import {useDispatch, useSelector} from "react-redux";
import {
    setAlertsNumber,
    setCriticalAlertsNumber, setEmergencyAlertsNumber, setOtherAlertsNumber,
    setTotalAlertsNumber,
    setWarningAlertsNumber
} from "../../store/reducers/alertReducer";
import AlertGroup from "../AlertGroup/AlertGroup";
import {groupByField, sortList} from "../../utils/utils";
import {alertNameGroups, alertsToGroup, hostNameGroups} from "../../utils/grouping";
import {HISTORY_DISPLAY, SILENCED_DISPLAY} from "../../store/actions/DISPLAY_ACTIONS";
import {LocalizationProvider} from "@mui/x-date-pickers/LocalizationProvider";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import {MobileDateTimePicker} from "@mui/x-date-pickers/MobileDateTimePicker";
import dayjs from "dayjs";
import AlertService from "../../services/AlertService";
import {setModalError} from "../../store/reducers/modalReducer";

export default function MainDisplay() {
    useConnectSocket(localStorage.getItem('token'))
    const dispatch = useDispatch()
    const isActiveSocket = useSelector(state => state.webSocket.isOpened)
    const allAlerts = useSelector(state => state.webSocket.alerts)
    const isInspectMode = useSelector(state => state.setHeaderMenuItemValue.inspectMode)
    const activeProject = useSelector(state => state.setHeaderMenuItemValue.project)
    const isGrouped = useSelector(state => state.setHeaderMenuItemValue.grouping)
    const foundAlerts = useSelector(state => state.setAlertReducer.foundAlerts)
    const displayMode = useSelector(state => state.setDisplay.display)
    const [windowWidth, setWindowWidth] = useState(window.innerWidth)
    const [startDate, setStartDate] = useState(new Date());
    const [historyAlertList, setHistoryAlertList] = useState([]);
    const [sortingFeature, setSortingFeature] = useState(undefined);
    const [sortingDirection, setSortingDirection] = useState(undefined);

    const sortedAlerts = useMemo(() => {
        if (!sortingFeature){
            return allAlerts
        }
        return sortList([...allAlerts], sortingFeature, sortingDirection)
    }, [allAlerts, sortingFeature, sortingDirection])


    let rawAlerts
    let alertList
    let alertsToDisplay
    let rowHeight

    switch(displayMode){
        case SILENCED_DISPLAY:
            rawAlerts = sortedAlerts.filter((alert) => alert.silenced === true)
            break
        case HISTORY_DISPLAY:
            rawAlerts = historyAlertList
            break
        default:
            rawAlerts = sortedAlerts.filter((alert) => alert.silenced === false)
    }

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

    if(windowWidth > 2150 && !isInspectMode){
        rowHeight = 95
    } else if ((1150 < windowWidth && windowWidth <= 2150) && !isInspectMode) {
        rowHeight = 60
    } else if (isInspectMode){
        rowHeight = 32
    }

    else  {
        rowHeight = 47
    }

    if (foundAlerts){
        alertList = [...foundAlerts]
    } else {
        alertList = [...rawAlerts]
    }


    //Here we filter all alerts by project and display only related ones
    switch (activeProject){
        case "All":
                alertsToDisplay = alertList
            break
        default:
            alertsToDisplay = alertList.filter((alert) => alert.project === activeProject)
    }
    //Define ungrouped alerts which will be displayed in virtual list
    let ungroupedAlerts = alertsToDisplay
    let totalAlertsNumber = alertsToDisplay.length
    let emergencyAlertsNumber = alertsToDisplay.filter((alert) => alert.severity === 'EMERGENCY').length
    let criticalAlertsNumber = alertsToDisplay.filter(alert => alert.severity === 'CRITICAL').length
    let warningAlertsNumber = alertsToDisplay.filter(alert => alert.severity === 'WARNING').length
    let otherAlertsNumber = alertsToDisplay.filter(alert => alert.severity !== 'CRITICAL' && alert.severity !== 'WARNING' && alert.severity !== 'EMERGENCY').length
    dispatch(setTotalAlertsNumber(totalAlertsNumber))
    dispatch(setEmergencyAlertsNumber(emergencyAlertsNumber))
    dispatch(setCriticalAlertsNumber(criticalAlertsNumber))
    dispatch(setWarningAlertsNumber(warningAlertsNumber))
    dispatch(setOtherAlertsNumber(otherAlertsNumber))

    //This block defines grouping functionality
    const alertGroups = []
    if (isGrouped){
        //Here we are grouping alerts by Hostname
        const groupsByHost = groupByField(alertsToDisplay, 'host')
        //Process alerts grouped by name
        const hostnameGroups = hostNameGroups(groupsByHost)
        hostnameGroups.forEach(group => alertGroups.push(group))

        const hostnameAlerts = alertsToGroup(alertGroups)
        ungroupedAlerts = alertsToDisplay.filter(alert => !hostnameAlerts.has(alert._id));
        //Here we are grouping alerts by Alert Name
        const groupsByAlertName = groupByField(ungroupedAlerts, 'alertName')
        //Process alerts grouped by Alert Name
        const alertnameGroups = alertNameGroups(groupsByAlertName)
        alertnameGroups.forEach(group => alertGroups.push(group))
        const alertnameAlerts = alertsToGroup(alertGroups)
        ungroupedAlerts = ungroupedAlerts.filter(alert => !alertnameAlerts.has(alert._id))
    }

    const handleSortButton = (feature) => {
        setSortingFeature(feature)
        setSortingDirection(sortingDirection === 'asc' ? 'desc' : 'asc')
    }


    //Define row for virtual list of ungrouped alerts
    const alertRow = ({index, style}) => (
        <div style={style}>
            <Alert alert={ungroupedAlerts[index]}/>
        </div>
    )

    const onClickHandler = async (e) => {
        e.preventDefault()
        const datetime = Date.parse(startDate) / 1000
        try {
            const response = await AlertService.getHistoryAlerts(datetime)
            const historyAlerts = response.data.history
            setHistoryAlertList(historyAlerts)
        }
        catch (e) {
            dispatch(setModalError("Oops. Something went wrong. Please, try a bit later"))
        }
    }



    return (
        <div className={styles.mainDisplay}>
            <div className={`${styles.groupWrapper} ${!isInspectMode ? null : styles.groupWrapper_small}`}>
                <div className={styles.alertsHeader}>
                    <div className={`${isInspectMode ? styles.projectHeader_small : styles.projectHeader}`}>
                        <button className={`${isInspectMode ? styles.filterButton_small : styles.filterButton} ${sortingFeature ==='project' ? sortingDirection === 'asc' ? styles.filterButtonAsc : styles.filterButtonDesc : null}`}
                        onClick={(e) => {
                            e.preventDefault()
                            handleSortButton('project')
                        }}
                        >
                            PRJ
                        </button>
                    </div>
                    <div className={`${ isInspectMode ? styles.hostHeader_small : styles.hostHeader}`}>
                        <button className={`${isInspectMode ? styles.filterButton_small: styles.filterButton} ${sortingFeature ==='host' ? sortingDirection === 'asc' ? styles.filterButtonAsc : styles.filterButtonDesc : null}`}
                        onClick={(e) => {
                            e.preventDefault()
                            handleSortButton('host')
                        }}
                        >
                            Host
                        </button>
                    </div>
                    <div className={`${isInspectMode ? styles.userHeader_small : styles.userHeader}`}>User</div>
                    <div className={`${isInspectMode ? styles.alertHeader_small : styles.alertHeader}`}>
                        <button className={`${isInspectMode ? styles.filterButton_small : styles.filterButton} ${sortingFeature ==='alertName' ? sortingDirection === 'asc' ? styles.filterButtonAsc : styles.filterButtonDesc : null}`}
                                onClick={(e) => {
                                    e.preventDefault()
                                    handleSortButton('alertName')
                                }}
                        >
                            Alert Name
                        </button>
                    </div>
                    <div className={`${isInspectMode ? styles.timeHeader_small : styles.timeHeader}`}>
                        <button className={`${isInspectMode ? styles.filterButton_small : styles.filterButton} ${sortingFeature ==='fired' ? sortingDirection === 'asc' ? styles.filterButtonAsc : styles.filterButtonDesc : null}`}
                                onClick={(e) => {
                                    e.preventDefault()
                                    handleSortButton('fired')
                                }}
                        >
                            Fired Time
                        </button>
                    </div>
                    <div className={`${isInspectMode ? styles.messageHeader_small : styles.messageHeader}`}>
                        <button className={`${isInspectMode ? styles.filterButton_small : styles.filterButton} ${sortingFeature ==='msg' ? sortingDirection === 'asc' ? styles.filterButtonAsc : styles.filterButtonDesc : null}`}
                                onClick={(e) => {
                                    e.preventDefault()
                                    handleSortButton('msg')
                                }}
                        >
                            Alert Message
                        </button>
                    </div>
                    <div className={`${isInspectMode ? styles.controlButtonHeader_small : styles.controlButtonHeader}`}></div>
                    <div className={`${isInspectMode ? styles.controlButtonHeader_small : styles.controlButtonHeader}`}></div>
                    <div className={`${isInspectMode ? styles.controlButtonHeader_small : styles.controlButtonHeader}`}></div>
                </div>

            </div>
            {isActiveSocket ?
                <>
                    {displayMode === HISTORY_DISPLAY
                        ?
                        <div className={styles.dateField}>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <MobileDateTimePicker defaultValue={dayjs(startDate)} onChange={e => setStartDate(e)}
                                                      ampm={false}/>
                            </LocalizationProvider>
                            <button className={styles.submitDateButton} onClick={e => onClickHandler(e)}/>
                        </div>
                        :
                        null
                    }

                    {alertGroups.length > 0
                        ?
                        alertGroups.map(group => (
                            <div className={
                                `${styles.groupWrapper} 
                                ${!isInspectMode ? null : styles.groupWrapper_small}`
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
                        width={width*0.98}
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

