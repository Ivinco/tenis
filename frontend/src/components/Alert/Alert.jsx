import React, {useEffect, useRef, useState} from 'react';
import styles from './Alert.module.css'
import {processTimeStamp} from "../../utils/utils";
import {useDispatch, useSelector} from "react-redux";
import {setDetailedAlert} from "../../store/reducers/alertReducer";
import {switchAlertDetailsModal, switchErrorMessageModal} from "../../store/reducers/modalReducer";
import {sha256} from "js-sha256";
import AlertService from "../../services/AlertService";

const Alert = ({alert}) => {
    const dispatch = useDispatch()
    const isInspectMode = useSelector(state => state.setHeaderMenuItemValue.inspectMode)
    const userEmail = useSelector(state => state.authReducer.user.userEmail)
    const durationRef = useRef(null)
    const commentRef = useRef(null)

    const [isEnabledSilenceWindow, setEnabledSilenceWindow] = useState(false)
    const [isEnabledSilenceButton, setEnabledSilenceButton] = useState(false)
    const [silenceDuration, setSilenceDuration] = useState(null)
    const [silenceComment, setSilenceComment] = useState(null)

    useEffect(() => {
        if (silenceComment && silenceComment.length > 4 && silenceDuration && silenceDuration >= 0){
            setEnabledSilenceButton(true)
        } else {
            setEnabledSilenceButton(false)
        }
    }, [silenceDuration, silenceComment]);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isEnabledSilenceWindow) {
                setEnabledSilenceWindow(false)
            }
        }
        window.addEventListener('keydown', handleEscape)

        return () => {
            window.removeEventListener('keydown', handleEscape)
        }

    }, [isEnabledSilenceWindow]);




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

    const handleKeyDown = (e) => {
        if (e.keyCode === 13) {
            e.preventDefault()
            if (isEnabledSilenceButton) {
                submitSilenceAlert()
            }
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


    const handleSilenceButton = () => {
        setEnabledSilenceWindow(!isEnabledSilenceWindow)
    }

    const handleInfoButton = () => {
        dispatch(setDetailedAlert({alert}))
        dispatch(switchAlertDetailsModal())
    }

    const submitSilenceAlert = async () => {
        let endSilenceTime
        if (silenceDuration > 0) {
            endSilenceTime = Date.now() + Number(silenceDuration) * 60000
        } else {
            endSilenceTime = null
        }
        const silenceRule = {
            project: alert.project,
            host: alert.host,
            alertName: alert.alertName,
            startSilence: Date.now(),
            endSilence: endSilenceTime,
            comment: silenceComment
        }
        try {
            await AlertService.silence(silenceRule)
        }
        catch (e){
            console.log(e)
            dispatch(switchErrorMessageModal("Oops. Something went wrong. Please, try a bit later"))
        }

        setSilenceDuration(null)
        setSilenceComment(null)
        document.getElementById(`duration_${alert._id}`).value = ''
        document.getElementById(`comment_${alert._id}`).value = ''
        setEnabledSilenceWindow(false)
        console.log(silenceRule)
    }



    return (
        <div className={`${isInspectMode ? styles.alertBody : styles.alertBody_small}`} key={alert._id}
             style={{backgroundColor: alertBackground, color: fontColor}}
        >
            <div
                className={`${isInspectMode ? styles.projectName : styles.projectName_small}`}>{alert.project[0].toUpperCase()}</div>
            <div className={`${isInspectMode ? styles.host : styles.host_small}`}>
                <p className={styles.textFields}>{alert.host}</p>
            </div>
            <div className={`${isInspectMode ? styles.responsibleUser : styles.responsibleUser_small}`}
                 style={{
                     backgroundImage: `url(${alert.responsibleUser
                         ? `https://gravatar.com/avatar/${sha256(alert.responsibleUser)}?s=150`
                         : process.env.PUBLIC_URL + "/images/stop-sign.svg"})`
                 }}
                 onClick={e => {
                     e.preventDefault()
                     onAckHandle(ackedAlert)
                 }}
            />
            <div className={`${isInspectMode ? styles.alertName : styles.alertName_small}`}>
                <p className={styles.textFields}>{alert.alertName}</p>
            </div>
            <div
                className={`${isInspectMode ? styles.alertTime : styles.alertTime_small}`}>{processTimeStamp(alert.fired)}</div>
            <div className={`${isInspectMode ? styles.message : styles.message_small}`} data-tooltip={alert.msg}>
                <p className={styles.textFields}>{alert.msg}</p>
            </div>
            <div className={`${styles.silenceWindow} ${isEnabledSilenceWindow ? styles.silenceWindowActive : styles.silenceWindowDisabled} ${isInspectMode ? null : styles.silenceWindow_small}`} >
                <input type="text" className={`${styles.silenceDuration} ${isInspectMode ? null : styles.silenceDuration_small}`}
                       placeholder="duration mins."
                       id={`duration_${alert._id}`}
                       ref={durationRef}
                       onKeyDown={handleKeyDown}
                       onChange={ e => setSilenceDuration(e.target.value)}
                />
                <textarea className={`${styles.silenceComment} ${isInspectMode ? null : styles.silenceComment_small}`}
                          placeholder="comment"
                          id={`comment_${alert._id}`}
                          ref={commentRef}
                          onKeyDown={handleKeyDown}
                          onChange={e => setSilenceComment(e.target.value)}
                />
                <button disabled={!isEnabledSilenceButton}
                        className={`${ isEnabledSilenceButton ? styles.silenceButtonEnabled : styles.silenceButtonDisabled} ${styles.silenceButton} ${isInspectMode ? null : styles.silenceButton_small}`}
                        onClick={(e) => {
                            e.preventDefault()
                            submitSilenceAlert()
                        }}
                >
                    Silence
                </button>
            </div>
            <div className={`${isInspectMode ? styles.controlButton : styles.controlButton_small} ${styles.silence}`}
                 onClick={e => {
                     e.preventDefault()
                     handleSilenceButton()
                 }}
            />
            <div className={`${isInspectMode ? styles.controlButton : styles.controlButton_small} ${styles.refresh}`}/>
            <div className={`${isInspectMode ? styles.controlButton : styles.controlButton_small} ${styles.info}`}
                 onClick={(e) => {
                     e.preventDefault()
                     handleInfoButton()
                 }}
            />
        </div>
    );
};

export default Alert;