import React, {useEffect, useRef, useState} from 'react';
import styles from './Alert.module.css'
import commonStyles from '../../styles/common.module.css'
import {processTimeStamp} from "../../utils/utils";
import {useDispatch, useSelector} from "react-redux";
import {setDetailedAlert} from "../../store/reducers/alertReducer";
import { setModalError, openModal} from "../../store/reducers/modalReducer";
import {sha256} from "js-sha256";
import AlertService from "../../services/AlertService";
import {HISTORY_DISPLAY, MAIN_DISPLAY, SILENCED_DISPLAY} from "../../store/actions/DISPLAY_ACTIONS";
import { useSearchParams } from "react-router-dom";
import usePortalParam from "../../hooks/usePortalParam";

const Alert = ({alert, isGroupRecheck}) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const dispatch = useDispatch()
    const isInspectMode = useSelector(state => state.setHeaderMenuItemValue.inspectMode)
    const userEmail = useSelector(state => state.authReducer.user.userEmail)
    const displayMode = useSelector(state => state.setDisplay.display)
    const durationRef = useRef(null)
    const commentRef = useRef(null)

    const isRecheckAlerts = useSelector(state => state.setAlertReducer.recheckAllAlerts)
    const [isEnabledSilenceWindow, setEnabledSilenceWindow] = useState(false)
    const [isEnabledSilenceButton, setEnabledSilenceButton] = useState(false)
    const [silenceDuration, setSilenceDuration] = useState(undefined)
    const [silenceComment, setSilenceComment] = useState(null)
    const [isRefresh, setIsRefresh] = useState(false)



    useEffect(() => {
        if (silenceComment && silenceComment.length > 4){
            setEnabledSilenceButton(true)
        } else {
            setEnabledSilenceButton(false)
        }
    }, [silenceComment]);

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




    const ackButtonHint = alert.responsibleUser ? "unhandle alert" : "handle alert";
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

            dispatch(setModalError("Oops. Something went wrong. Please, try a bit later"))
        }
    }

    const onRecheckHandle = async () => {
        setIsRefresh(true)

        //Delay for animation
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        await delay(1000);
        try {
            await AlertService.refreshAlerts([["recheck", alert._id]])
        }
        catch (e) {
            dispatch(openModal())
            dispatch(setModalError(e.response.data.name))
        }

        setIsRefresh(false)
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
            alertBackground = '#bab8b8'
            fontColor = 'black'
    }


    const handleSilenceButton = () => {
        setEnabledSilenceWindow(!isEnabledSilenceWindow)
    }

    const handleInfoButton = () => {
        searchParams.set("alert_id", alert._id)
        setSearchParams(searchParams)
        dispatch(setDetailedAlert({alert}))
        dispatch(openModal())
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
            dispatch(setModalError("Oops. Something went wrong. Please, try a bit later"))
        }

        setSilenceDuration(null)
        setSilenceComment(null)
        setEnabledSilenceWindow(false)
    }



    return (
        <div className={`${!isInspectMode ? styles.alertBody : styles.alertBody_small}`} key={alert._id}
             style={{backgroundColor: alertBackground, color: fontColor}}
        >
            <div
                className={`${!isInspectMode ? styles.projectName : styles.projectName_small}`}>{alert.project[0].toUpperCase()}</div>
            <div className={`${!isInspectMode ? styles.host : styles.host_small}`}>
                <p className={styles.textFields}>{alert.host}</p>
            </div>
            <button className={`${!isInspectMode ? styles.responsibleUser : styles.responsibleUser_small} ${commonStyles.buttonHint}`}
                 style={{
                     backgroundImage: `url(${alert.responsibleUser
                         ? `https://gravatar.com/avatar/${sha256(alert.responsibleUser)}?s=150`
                         : process.env.PUBLIC_URL + "/images/stop-sign.svg"})`
                 }}
                    data-tooltip={ackButtonHint}
                 onClick={e => {
                     e.preventDefault()
                     onAckHandle(ackedAlert)
                 }}
                    disabled={displayMode===HISTORY_DISPLAY || displayMode===SILENCED_DISPLAY}
            />
            <div className={`${!isInspectMode ? styles.alertName : styles.alertName_small}`}>
                <p className={styles.textFields}>{alert.alertName}</p>
            </div>
            <div
                className={`${!isInspectMode ? styles.alertTime : styles.alertTime_small}`}>{processTimeStamp(alert.fired)}</div>
            <div className={`${!isInspectMode ? styles.message : styles.message_small}`} data-tooltip={alert.msg}>
                <p className={styles.textFields}>{alert.msg}</p>
            </div>
            <div className={`${styles.silenceWindow} ${isEnabledSilenceWindow ? styles.silenceWindowActive : styles.silenceWindowDisabled} ${!isInspectMode ? null : styles.silenceWindow_small}`} >
                <input type="text" className={`${styles.silenceDuration} ${!isInspectMode ? null : styles.silenceDuration_small}`}
                       placeholder="duration mins."
                       id={`duration_${alert._id}`}
                       ref={durationRef}
                       onKeyDown={handleKeyDown}
                       onChange={ e => setSilenceDuration(e.target.value)}
                />
                <input type="text" className={`${styles.silenceComment} ${!isInspectMode ? null : styles.silenceComment_small}`}
                          placeholder="comment"
                          id={`comment_${alert._id}`}
                          ref={commentRef}
                          onKeyDown={handleKeyDown}
                          onChange={e => setSilenceComment(e.target.value)}
                />
                <button disabled={!isEnabledSilenceButton}
                        className={`${ isEnabledSilenceButton ? styles.silenceButtonEnabled : styles.silenceButtonDisabled} ${styles.silenceButton} ${!isInspectMode ? null : styles.silenceButton_small}`}
                        onClick={(e) => {
                            e.preventDefault()
                            submitSilenceAlert()
                        }}
                >
                    Silence
                </button>
            </div>
            {displayMode === MAIN_DISPLAY
                ? <button className={`${!isInspectMode ? styles.controlButton : styles.controlButton_small} ${styles.silence} ${commonStyles.buttonHint}`}
                  data-tooltip="silence alert"
                          onClick={e => {
                      e.preventDefault()
                      handleSilenceButton()
                  }}
                />
            : null
            }
            <button className={`${!isInspectMode ? styles.controlButton : styles.controlButton_small} ${styles.refresh}  ${isRecheckAlerts ||isGroupRecheck || isRefresh ? commonStyles.rotatedIcon : commonStyles.buttonHint}`}
            data-tooltip="recheck alert"
                    onClick={event => {
                        event.preventDefault()
                        onRecheckHandle()
                    }}
            />
            <button className={`${!isInspectMode ? styles.controlButton : styles.controlButton_small} ${styles.info}  ${commonStyles.buttonHint}`}
                    data-tooltip="alert info"
                 onClick={(e) => {
                     e.preventDefault()
                     handleInfoButton()
                 }}
            />
        </div>
    );
};

export default Alert;