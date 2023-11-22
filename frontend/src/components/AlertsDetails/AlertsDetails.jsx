import React from 'react';
import styles from './AlertsDetails.module.css'
import {useSelector} from "react-redux";
import {processDuration} from "../../utils/utils";

const AlertsDetails = () => {
    const alert = useSelector(state => state.setAlertReducer.alert)
    let fontColor
    switch (alert.alert.severity.toUpperCase()) {
        case "WARNING":
            fontColor = '#DBBE3B'
            break
        case "CRITICAL":
            fontColor = '#802C06'
            break
        case "EMERGENCY":
            fontColor = '#6E2D92'
            break
        default:
            fontColor = '#858585'
    }
    return (
        <>
            <div className={styles.alertHeader}>
                <div className={styles.alertLogo}/>
                <div className={styles.alertTitle} style={{ color: fontColor}}>
                    {alert.alert.severity}
                </div>
            </div>
            <div className={styles.alertDetailsBody}>
                <ul className={styles.alertCommonInfo}>
                    <li className={styles.alertInfoItem}>
                        <p className={styles.alertInfoKey}>Problem:</p>
                        <p className={styles.alertInfoValue}>{alert.alert.alertName}</p>
                    </li>
                    <li className={styles.alertInfoItem}>
                        <p className={styles.alertInfoKey}>Problem Host:</p>
                        <p className={styles.alertInfoValue}>{alert.alert.host}</p>
                    </li>
                    <li className={styles.alertInfoItem}>
                        <p className={styles.alertInfoKey}>Alert Duration: </p>
                        <p className={styles.alertInfoValue}>{processDuration(alert.alert.fired)}</p>
                    </li>
                    <li className={styles.alertInfoItem}>
                        <p className={styles.alertInfoKey}>Responsible Engineer: </p>
                        <p className={styles.alertInfoValue}>{alert.alert.responsibleUser ? alert.alert.responsibleUser : "UNHANDLED"}</p>
                    </li>
                    <li className={styles.alertInfoItem}>
                        <p className={styles.alertInfoKey}>Alert Details: </p>
                        <p className={styles.alertInfoValue}>{alert.alert.msg}</p>
                    </li>
                </ul>
                {
                    alert.alert.customField ?
                        <ul className={styles.alertCommonInfo}>
                            {Object.keys(alert.alert.customField).map((key) => (
                                <li className={styles.alertInfoItem}>
                                    <p className={styles.alertInfoKey}>{key} </p>
                                    {alert.alert.customField[key].startsWith("https://") ? (
                                        <a
                                            className={styles.alertInfoLink}
                                            href={alert.alert.customField[key]}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {alert.alert.customField[key].split('/')[2]}
                                        </a>
                                    ) : (
                                        <p className={styles.alertInfoValue}>
                                            {alert.alert.customField[key]}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>

                        : <></>
                }

            </div>
            
        </>
    );
};

export default AlertsDetails;