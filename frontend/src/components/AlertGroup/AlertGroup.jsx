import React, {useEffect, useRef, useState} from 'react';
import styles from './AlertGroup.module.css'
import alertStyles from '../Alert/Alert.module.css'
import commonStyles from '../../styles/common.module.css'
import {useDispatch, useSelector} from "react-redux";
import Alert from "../Alert/Alert";
import {sha256} from "js-sha256";
import AlertService from "../../services/AlertService";
import {openModal, setModalError} from "../../store/reducers/modalReducer";
import {HISTORY_DISPLAY, MAIN_DISPLAY, SILENCED_DISPLAY} from "../../store/actions/DISPLAY_ACTIONS";

const AlertGroup = ({group, alertHeight}) => {
    const dispatch = useDispatch()
    const isInspectMode = useSelector(state => state.setHeaderMenuItemValue.inspectMode)
    const userEmail = useSelector(state => state.authReducer.user.userEmail)
    const displayMode = useSelector(state => state.setDisplay.display)
    const groupDurationRef = useRef(null)
    const groupCommentRef = useRef(null)

    const [isAlertsBlockOpened, setIsAlertBlockOpened] = useState('false')
    const [isEnabledSilenceWindow, setEnabledSilenceWindow] = useState(false)
    const [isEnabledSilenceButton, setEnabledSilenceButton] = useState(false)
    const isRecheckAllAlerts = useSelector(state => state.setAlertReducer.recheckAllAlerts)
    const [silenceDuration, setSilenceDuration] = useState(undefined)
    const [silenceComment, setSilenceComment] = useState(null)
    const [isRecheck, setIsRecheck] = useState(false)

    let alertBackground
    let fontColor
    let silenceRule
    let silenceRuleHost = ""
    let silenceRuleAlertName = ""

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
        try {
            // if all alerts are acked by current user, they will be unacked
            if (isOneGroupUser && group.alerts[0].responsibleUser === userEmail){
                await AlertService.unack(ackedAlerts)
            } else {
                // if only some of the alerts are acked by current user, they will not be changed
                // all other alerts will be acked by current user
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
            dispatch(setModalError("Oops. Something went wrong. Please, try a bit later"))
        }
    }

    const onRecheckClick = async () => {
        setIsRecheck(true)

        //Delay for animation
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        await delay(1000);

        let recheckList = []
        group.alerts.forEach(alert => {
            recheckList.push(["recheck", alert._id])
        })
        try {
            await AlertService.refreshAlerts(recheckList)
        }
        catch (e) {
            dispatch(openModal())
            dispatch(setModalError(e.response.data.name))
        }
        setIsRecheck(false)
    }


    //Check groupfactor
    if (group.groupFactor.startsWith('Host:')){
        silenceRuleHost = group.groupFactor.substring('Host: '.length);
    }

    if (group.groupFactor.startsWith('Alert Name:')){
        silenceRuleAlertName = group.groupFactor.substring('Alert Name: '.length);
    }

    const handleSilenceButton = () => {
        setEnabledSilenceWindow(!isEnabledSilenceWindow)
    }

    const handleEnterKeyDown = (e) => {
        if (e.keyCode === 13) {
            e.preventDefault()
            if (isEnabledSilenceButton) {
                submitSilenceGroup()
            }
        }
    }

    const submitSilenceGroup = async () => {
        let endSilenceTime
        if (silenceDuration > 0) {
            endSilenceTime = Date.now() + Number(silenceDuration) * 60000
        } else {
            endSilenceTime = null
        }
            silenceRule = {
                project: "",
                host: silenceRuleHost,
                alertName: silenceRuleAlertName,
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
        <div className={styles.groupSection} key={group.id}>
            <div
                className={`${alertStyles.alertBody} ${styles.groupBody} ${!isInspectMode ? null : alertStyles.alertBody_small && styles.groupBodyInspected}`}
                style={{backgroundColor: alertBackground, color: fontColor, height: `${alertHeight * 0.9}px`, cursor: 'pointer'}}>
                <div className={`${!isInspectMode ? alertStyles.projectName : alertStyles.projectName_small}`}
                     onClick={e => onAlertClickHandler(e)}>{group.project[0].toUpperCase()}</div>
                <div className={`${!isInspectMode ? alertStyles.host : alertStyles.host_small} ${!isInspectMode ? styles.alertsNumber : styles.alertsNumber_small}`}
                     onClick={e => onAlertClickHandler(e)}>
                    {group.alerts.length}
                </div>
                <button className={`${!isInspectMode ? alertStyles.responsibleUser : alertStyles.responsibleUser_small}`}
                     style={{backgroundImage: `url(${groupUserImage})`}}
                     onClick={e => {
                         e.preventDefault()
                         onAckClickHandle()
                     }}
                        disabled={displayMode===HISTORY_DISPLAY || displayMode===SILENCED_DISPLAY}
                />
                <div className={`${!isInspectMode ? alertStyles.alertName : alertStyles.alertName_small}`}
                     onClick={e => onAlertClickHandler(e)}>{group.groupFactor}</div>
                <div
                    className={`${!isInspectMode ? alertStyles.alertTime : alertStyles.alertTime_small}`}
                    onClick={e => onAlertClickHandler(e)}>
                </div>
                <div className={`${!isInspectMode ? styles.alertsGroupMessage : styles.alertsGroupMessage_small}`}
                     onClick={e => onAlertClickHandler(e)}>
                    {group.description}
                </div>
                <div
                    className={`${alertStyles.silenceWindow} ${isEnabledSilenceWindow ? alertStyles.silenceWindowActive : alertStyles.silenceWindowDisabled} ${!isInspectMode ? null : alertStyles.silenceWindow_small}`}>
                    <input type="text"
                           className={`${alertStyles.silenceDuration} ${!isInspectMode ? null : alertStyles.silenceDuration_small}`}
                           placeholder="duration mins."
                           id={`duration_${group.id}`}
                           ref={groupDurationRef}
                           onKeyDown={handleEnterKeyDown}
                           onChange={e => setSilenceDuration(e.target.value)}
                    />
                    <input type="text"
                        className={`${alertStyles.silenceComment} ${!isInspectMode ? null : alertStyles.silenceComment_small}`}
                        placeholder="comment"
                        id={`comment_${group.id}`}
                        ref={groupCommentRef}
                        onKeyDown={handleEnterKeyDown}
                        onChange={e => setSilenceComment(e.target.value)}
                    />
                    <button disabled={!isEnabledSilenceButton}
                            className={`${isEnabledSilenceButton ? alertStyles.silenceButtonEnabled : alertStyles.silenceButtonDisabled} ${alertStyles.silenceButton} ${!isInspectMode ? null : alertStyles.silenceButton_small}`}
                            onClick={(e) => {
                                e.preventDefault()
                                submitSilenceGroup()
                            }}
                    >
                        Silence
                    </button>
                </div>
                {displayMode === MAIN_DISPLAY
                    ? <div
                        className={`${!isInspectMode ? alertStyles.controlButton : alertStyles.controlButton_small} ${alertStyles.silence} ${commonStyles.buttonHint}`}
                        data-tooltip="silence group"
                        onClick={(e) => {
                            e.preventDefault()
                            handleSilenceButton()
                        }}
                    />
                    : null
                }
                <div
                    className={`${!isInspectMode ? alertStyles.controlButton : alertStyles.controlButton_small} ${alertStyles.refresh} ${isRecheckAllAlerts || isRecheck ? commonStyles.rotatedIcon : commonStyles.buttonHint}`}
                    data-tooltip="recheck group"
                    onClick={(e) => {
                        e.preventDefault()
                        onRecheckClick()
                    }}
                />
                <div
                    className={`${!isInspectMode ? alertStyles.controlButton : alertStyles.controlButton_small} ${alertStyles.info} ${styles.tempHiddenButton}`}/>

            </div>
            <div className={`${styles.alertBlock} ${isAlertsBlockOpened ? styles.alertBlockHidden : ''}`}
                 style={{height: `${alertHeight * group.alerts.length}px`, transition: "height 0.3s"}}>
                {
                    group.alerts.map(alert => (
                        <div style={{height: `${alertHeight}px`}}>
                            <Alert alert={alert} isGroupRecheck={isRecheck}/>
                        </div>
                    ))
                }
            </div>
        </div>
    );
};

export default AlertGroup;