import React, {useState} from 'react';
import styles from './AlertGroup.module.css'
import alertStyles from '../Alert/Alert.module.css'
import {useSelector} from "react-redux";
import Alert from "../Alert/Alert";

const AlertGroup = ({group, alertHeight}) => {
    const isInspectMode = useSelector(state => state.setHeaderMenuItemValue.inspectMode)
    const [isAlertsBlockOpened, setIsAlertBlockOpened] = useState('false')
    const onAlertClickHandler = (e) => {
        e.preventDefault()
        setIsAlertBlockOpened(!isAlertsBlockOpened)
    }

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
            <div
                className={`${alertStyles.alertBody} ${styles.groupBody} ${isInspectMode ? null : alertStyles.alertBody_small && styles.groupBodyInspected}`}
                style={{backgroundColor: alertBackground, color: fontColor, height: `${alertHeight * 0.9}px`, cursor: 'pointer'}}>
                <div className={`${isInspectMode ? alertStyles.projectName : alertStyles.projectName_small}`}
                     onClick={e => onAlertClickHandler(e)}>{group.project[0].toUpperCase()}</div>
                <div className={`${isInspectMode ? alertStyles.host : alertStyles.host_small} ${isInspectMode ? styles.alertsNumber : styles.alertsNumber_small}`}
                     onClick={e => onAlertClickHandler(e)}>
                    {group.alerts.length}
                </div>
                <div className={`${isInspectMode ? alertStyles.responsibleUser : alertStyles.responsibleUser_small}`}
                     style={{backgroundImage: `url(${alert.responsibleUser ? process.env.PUBLIC_URL + "/images/stop-sign.svg" : process.env.PUBLIC_URL + "/images/stop-sign.svg"})`}}
                />
                <div className={`${isInspectMode ? alertStyles.alertName : alertStyles.alertName_small}`}
                     onClick={e => onAlertClickHandler(e)}>{group.groupFactor}</div>
                <div
                    className={`${isInspectMode ? alertStyles.alertTime : alertStyles.alertTime_small}`}
                    onClick={e => onAlertClickHandler(e)}>
                </div>
                <div className={`${isInspectMode ? alertStyles.message : alertStyles.message_small}`}
                     onClick={e => onAlertClickHandler(e)}>
                    {group.description}
                </div>
                <div className={`${isInspectMode ? alertStyles.refresh : alertStyles.refresh_small}`}/>
                <div className={`${isInspectMode ? alertStyles.info : alertStyles.info_small}`}/>

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