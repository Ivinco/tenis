import React from 'react';
import styles from './Alert.module.css'

const Alert = ({alert}, key) => {
    return (
        <div className={styles.alertBody} key={key}>
            <div>USER: {alert.responsibleUser}</div>
            <div>HOST:{alert.host}</div>
            <div> SERVICE: {alert.alertName}</div>
            <div> SEVERITY: {alert.severity}</div>
            <div>MESSAGE: {alert.msg}</div>
            <div>CUSTOM FIELD: {alert.customField}</div>
        </div>
    );
};

export default Alert;