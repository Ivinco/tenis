import React, {useState} from 'react';
import styles from './AlertGroup.module.css'
import {useSelector} from "react-redux";
import Alert from "../Alert/Alert";

const AlertGroup = ({group, alertHeight}) => {
    const isInspectMode = useSelector(state => state.setHeaderMenuItemValue.inspectMode)
    const [isAlertsBlockOpened, setIsAlertBlockOpened] = useState('false')
    const onAlertClickHandler = (e) => {
        e.preventDefault()
        setIsAlertBlockOpened(!isAlertsBlockOpened)
    }
    const alertBlockHeight = alertHeight*group.alerts.length

    let alertBackground
    let fontColor
    switch (group.severity.toUpperCase()){
        case 'WARNING':
            alertBackground = '#FEFFC1'
            fontColor = 'black'
            break
        case 'CRITICAL':
            alertBackground = '#FFBBBA'
            fontColor = 'black'
            break
        case 'EMERGENCY':
            alertBackground = '#f67d7a'
            fontColor = 'black'
            break
        default:
            alertBackground = '#858585'
            fontColor = 'black'
    }

    return (
        <div className={styles.groupSection} key={group.id}>
        <div className={`${styles.groupBody} ${isInspectMode ? null : styles.groupBody_small} ${isAlertsBlockOpened ? '' : styles.alertGroup}`}
                 style={{ backgroundColor: alertBackground, color: fontColor, height: `${alertHeight}px`}}>
            <div className={`${isInspectMode ? styles.projectName : styles.projectName_small}`} onClick={e => onAlertClickHandler(e)}>{group.project[0].toUpperCase()}</div>
            <div className={`${isInspectMode ? styles.alertsNumber : styles.alertsNumber_small}`} onClick={e => onAlertClickHandler(e)}>{group.alerts.length}</div>
            <div className={`${isInspectMode ? styles.groupAttribute : styles.groupAttribute_small}`} onClick={e => onAlertClickHandler(e)}>{group.groupFactor}</div>
            <div className={`${isInspectMode ? styles.groupResponsibleUser : styles.groupResponsibleUser_small}`}
                 style={{backgroundImage: `url(${alert.responsibleUser ? process.env.PUBLIC_URL + "/images/stop-sign.svg" : process.env.PUBLIC_URL + "/images/stop-sign.svg"})`}}
            />
            <div className={`${isInspectMode ? styles.description : styles.description_small}`} onClick={e => onAlertClickHandler(e)}>
                {group.description}
            </div>
        </div>
            <div className={`${styles.alertBlock} ${isAlertsBlockOpened ? styles.alertBlockHidden : ''}`}
            style={{height: `${alertHeight * group.alerts.length}px`, transition: "height 0.3s"}}>
                {
                    group.alerts.map(alert => (
                        <div style={{height: `${alertHeight}px`}}>
                            <Alert alert={alert}/>
                        </div>
                    ))
                }
            </div>
        </div>
    );
};

export default AlertGroup;