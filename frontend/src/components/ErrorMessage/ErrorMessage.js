import React from 'react';
import styles from './ErrorMessage.module.css'



const ErrorMessage = ({message}) => {
    return (
        <>
            <div className={styles.errorMessageHeader}>
                <div className={styles.errorMessageLogo}/>
                <div className={styles.errorMessageIcon}/>
            </div>
            <div className={styles.errorMessageMessage}>{message}</div>
        </>
    );
};

export default ErrorMessage;