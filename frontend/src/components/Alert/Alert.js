import React from 'react';
import styles from './Alert.module.css'
import {processTimeStamp} from "../../utils/utils";
import {useDispatch, useSelector} from "react-redux";
import {setDetailedAlert} from "../../store/reducers/alertReducer";
import {switchAlertDetailsModal} from "../../store/reducers/modalReducer";

const Alert = ({alert}) => {
    const dispatch = useDispatch()
    const isInspectMode = useSelector(state => state.setHeaderMenuItemValue.inspectMode)
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
                 style={{backgroundImage: `url(${alert.responsibleUser ? process.env.PUBLIC_URL + "/images/stop-sign.svg" : process.env.PUBLIC_URL + "/images/stop-sign.svg"})`}}
            />
            <div className={`${isInspectMode ? styles.alertName : styles.alertName_small}`}>
                <p className={styles.textFields}>{alert.alertName}</p>
            </div>
            <div className={`${isInspectMode ? styles.alertTime : styles.alertTime_small}`}>{processTimeStamp(alert.fired)}</div>
            <div className={`${isInspectMode ? styles.message : styles.message_small}`}>
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