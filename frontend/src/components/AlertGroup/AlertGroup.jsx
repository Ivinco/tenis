import React, {useState} from 'react';
import styles from './AlertGroup.module.css'
import alertStyles from '../Alert/Alert.module.css'
import {useDispatch, useSelector} from "react-redux";
import Alert from "../Alert/Alert";
import {sha256} from "js-sha256";
import AlertService from "../../services/AlertService";
import {switchErrorMessageModal} from "../../store/reducers/modalReducer";

const AlertGroup = ({group, alertHeight}) => {
    const dispatch = useDispatch()
    const isInspectMode = useSelector(state => state.setHeaderMenuItemValue.inspectMode)
    const userEmail = useSelector(state => state.authReducer.user.userEmail)
    const [isAlertsBlockOpened, setIsAlertBlockOpened] = useState('false')
    const onAlertClickHandler = (e) => {
        e.preventDefault()
        setIsAlertBlockOpened(!isAlertsBlockOpened)
    }

    //Check if all alerts handled by the same user
    const isOneGroupUser = group.alerts.every(alert => {
        return alert.responsibleUser === group.alerts[0].responsibleUser
    })

    //define icon for group responsible user
    const groupUserImage = (isOneGroupUser && group.alerts[0].responsibleUser !== "")
        ? `https://gravatar.com/avatar/${sha256(group.alerts[0].responsibleUser)}?s=150`
        : "/images/stop-sign.svg"



    let alertBackground
    let fontColor


    const ackedAlerts = group.alerts.map(alert => {
            return {"alertId": alert._id}
    })

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

    const onAckClickHandle =  async () => {
        let response
        try {
            // if all alerts are ached by current user, they will be unacked
            if (isOneGroupUser && group.alerts[0].responsibleUser === userEmail){
                await AlertService.unack(ackedAlerts)
            } else {
                //if only some of the alerts are acked by current user, they will not be changed
                //all other alerts will be acked by current user
                const unackedAlerts = []
                group.alerts.forEach(alert => {
                    if (alert.responsibleUser !== userEmail){
                        unackedAlerts.push({alertId: alert._id})
                    }
                })
                await AlertService.ack(unackedAlerts)
            }
        }
        catch (e) {
            dispatch(switchErrorMessageModal("Oops. Something went wrong. Please, try a bit later"))
        }
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
                     style={{backgroundImage: `url(${groupUserImage})`}}
                     onClick={e => {
                         e.preventDefault()
                         onAckClickHandle()
                     }}
                />
                <div className={`${isInspectMode ? alertStyles.alertName : alertStyles.alertName_small}`}
                     onClick={e => onAlertClickHandler(e)}>{group.groupFactor}</div>
                <div
                    className={`${isInspectMode ? alertStyles.alertTime : alertStyles.alertTime_small}`}
                    onClick={e => onAlertClickHandler(e)}>
                </div>
                <div className={`${isInspectMode ? styles.alertsGroupMessage : styles.alertsGroupMessage_small}`}
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