import React from 'react';
import styles from './Alert.module.css'
import {processTimeStamp} from "../../utils/utils";
import {useDispatch} from "react-redux";
import {setDetailedAlert} from "../../store/reducers/alertReducer";
import {switchAlertDetailsModal} from "../../store/reducers/modalReducer";

const Alert = ({alert}, key) => {
    const dispatch = useDispatch()
    let alertBackground
    let fontColor
    switch (alert.severity.toUpperCase()){
        case 'WARNING':
            alertBackground = '#DBBE3B'
            fontColor = 'black'
            break
        case 'CRITICAL':
            alertBackground = '#802C06'
            fontColor = 'white'
            break
        case 'EMERGENCY':
            alertBackground = '#6E2D92'
            fontColor = 'white'
            break
        default:
            alertBackground = '#858585'
            fontColor = 'black'
    }


    const handleInfoButton = () => {
        dispatch(setDetailedAlert({alert}))
        dispatch(switchAlertDetailsModal())
    }

    return (
        <div className={styles.alertBody} key={key}
        style={{ backgroundColor: alertBackground, color: fontColor}}
        >
            <div className={styles.projectName}>{alert.project[0].toUpperCase()}</div>
            <div className={styles.host}>{alert.host}</div>
            <div className={styles.responsibleUser}
                 style={{backgroundImage: `url(${alert.responsibleUser ? process.env.PUBLIC_URL + "/images/stop-sign.svg" : process.env.PUBLIC_URL + "/images/stop-sign.svg"})`}}
            />
            <div className={styles.alertName}> {alert.alertName}</div>
            <div className={styles.alertTime}>{processTimeStamp(alert.fired)}</div>
            <div className={styles.message}> {alert.msg}</div>
            <div className={styles.info}
            onClick={(e) => {
                e.preventDefault()
                handleInfoButton()
            }}
            />
        </div>
    );
};

export default Alert;