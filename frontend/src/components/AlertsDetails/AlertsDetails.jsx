import React, {useState} from 'react';
import styles from './AlertsDetails.module.css'
import {useSelector} from "react-redux";
import {processDuration} from "../../utils/utils";

const AlertsDetails = () => {
    const alert = useSelector(state => state.setAlertReducer.alert)
    const [commentFormIsOpened, setCommentFormIsOpened] = useState(false)
    const [commentFormContent, setCommentFormContent] = useState('')

    const onCommentClick = () => {
        setCommentFormIsOpened(!commentFormIsOpened)
    }

    const onSendCommentClick = () => {
        setCommentFormIsOpened(false)
        document.getElementById('commentArea').value = ''
        setCommentFormContent('')
        alert.alert.comment = commentFormContent
    }

    const handleEnterKey = (e) => {
        if (e.keyCode === 13) {
            e.preventDefault()
            onSendCommentClick()
        }
    }

    let fontColor
    switch (alert.alert.severity.toUpperCase()) {
        case "WARNING":
            fontColor = '#DBBE3B'
            break
        case "CRITICAL":
            fontColor = '#d34d07'
            break
        case "EMERGENCY":
            fontColor = '#9a0404'
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
                    <li className={styles.alertInfoItem}>
                        <p className={styles.alertInfoKey}>Comments: </p>
                        <div className={styles.alertCommentButton} onClick={(e) => {
                            e.preventDefault()
                            onCommentClick()
                        }}/>
                        <p className={styles.alertInfoValue}>{alert.alert.comment}</p>
                    </li>
                </ul>
                <div className={commentFormIsOpened ? styles.commentBlock : styles.disabledBlock}>
                    <textarea className={styles.alertCommentInput}
                              style={{ display: commentFormIsOpened ? "flex" : "none"}}
                              maxLength="100"
                              id="commentArea"
                              onChange={(e) => setCommentFormContent(e.target.value)}
                              onKeyDown={handleEnterKey}
                    />
                    <button className={commentFormContent ? styles.alertCommentSend: styles.alertCommentSendDisabled}
                            style={{ display: commentFormIsOpened ? "flex" : "none"}}
                            onClick={(e) => {
                        e.preventDefault()
                        onSendCommentClick()
                    }}
                    disabled={!commentFormContent}
                    >
                        Comment
                    </button>
                </div>
                {
                    alert.alert.customFields ?
                        <ul className={styles.alertCommonInfo}>
                            {Object.keys(alert.alert.customFields).map((key) => (
                                <li className={styles.alertInfoItem}>
                                    <p className={styles.alertInfoKey}>{key}: </p>
                                    {alert.alert.customFields[key].startsWith("https://") ? (
                                        <a
                                            className={styles.alertInfoLink}
                                            href={alert.alert.customFields[key]}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {alert.alert.customFields[key].split('/')[2]}
                                        </a>
                                    ) : (
                                        <p className={styles.alertInfoValue}>
                                            {alert.alert.customFields[key]}
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