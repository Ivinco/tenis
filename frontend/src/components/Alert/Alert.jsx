import React from 'react';
import styles from './Alert.module.css'
import {processTimeStamp} from "../../utils/utils";
import {useDispatch, useSelector} from "react-redux";
import {setDetailedAlert} from "../../store/reducers/alertReducer";
import {switchAlertDetailsModal, switchErrorMessageModal} from "../../store/reducers/modalReducer";
import {sha256} from "js-sha256";
import UserService from "../../services/UserService";
import {formToJSON} from "axios";
import AlertService from "../../services/AlertService";

const Alert = ({alert}) => {
    const dispatch = useDispatch()
    const isInspectMode = useSelector(state => state.setHeaderMenuItemValue.inspectMode)
    const userEmail = useSelector(state => state.authReducer.user.userEmail)
    const ackedAlert = {"alertId": alert._id}
    const onAckHandle = async (ackedAlert) => {
        try {
            if (alert.responsibleUser === userEmail){
                 await AlertService.unack([ackedAlert])
            } else {
                 await AlertService.ack([ackedAlert])
            }
        }
        catch (e) {
            dispatch(switchErrorMessageModal("Oops. Something went wrong. Please, try a bit later"))
        }
    }

    let alertBackground
    let fontColor
    switch (alert.severity.toUpperCase()){
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


    const handleInfoButton = () => {
        dispatch(setDetailedAlert({alert}))
        dispatch(switchAlertDetailsModal())
    }

    return (
        <div className={`${isInspectMode ? styles.alertBody : styles.alertBody_small}`} key={alert._id}
        style={{ backgroundColor: alertBackground, color: fontColor}}
        >
            <div className={`${isInspectMode ? styles.projectName : styles.projectName_small}`}>{alert.project[0].toUpperCase()}</div>
            <div className={`${isInspectMode ? styles.host : styles.host_small}`}>
                <p className={styles.textFields}>{alert.host}</p>
            </div>
            <div className={`${isInspectMode ? styles.responsibleUser : styles.responsibleUser_small}`}
                 style={{backgroundImage: `url(${alert.responsibleUser 
                         ? `https://gravatar.com/avatar/${sha256(alert.responsibleUser)}?s=150` 
                         : process.env.PUBLIC_URL + "/images/stop-sign.svg"})`}}
                 onClick={ e => {
                     e.preventDefault()
                     onAckHandle(ackedAlert)
                 }}
            />
            <div className={`${isInspectMode ? styles.alertName : styles.alertName_small}`}>
                <p className={styles.textFields}>{alert.alertName}</p>
            </div>
            <div className={`${isInspectMode ? styles.alertTime : styles.alertTime_small}`}>{processTimeStamp(alert.fired)}</div>
            <div className={`${isInspectMode ? styles.message : styles.message_small}`}f data-tooltip={alert.msg}>
                <p className={styles.textFields}>{alert.msg}</p>
            </div>
            <div className={`${isInspectMode ? styles.refresh : styles.refresh_small}`}/>
            <div className={`${isInspectMode ? styles.info : styles.info_small}`}
            onClick={(e) => {
                e.preventDefault()
                handleInfoButton()
            }}
            />
        </div>
    );
};

export default Alert;