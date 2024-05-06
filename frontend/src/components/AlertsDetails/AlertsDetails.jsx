import React, {useEffect, useRef, useState} from 'react';
import styles from './AlertsDetails.module.css'
import {useSelector} from "react-redux";
import {processAlertComment, processDuration} from "../../utils/utils";
import {Chart} from "react-google-charts";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import {MobileDateTimePicker} from "@mui/x-date-pickers/MobileDateTimePicker";
import dayjs from "dayjs";
import {LocalizationProvider} from "@mui/x-date-pickers/LocalizationProvider";

const AlertsDetails = () => {
    const alert = useSelector(state => state.setAlertReducer.alert)
    const [commentFormIsOpened, setCommentFormIsOpened] = useState(false)
    const [commentFormContent, setCommentFormContent] = useState('')
    const user = useSelector( state => state.authReducer.user)
    const textareaRef = useRef(null)
    const [historyStart, setHistoryStart] = useState(new Date(Date.now() - 24 * 60 * 60 * 1000))
    const [historyEnd, setHistoryEnd] = useState(new Date(Date.now()))


    //TODO change this data

    //init data array
    const data = [
        [
            {type: "string", id: "Title"},
            {type: "string", id: "Severity"},
            {type: "date", id: "Start"},
            {type: "date", id: "End"},
        ]
    ]

    //init colors array
    const colors = []


    //alert history data from backend
    const rawData = {
        history: [
            [
                "OK",
                new Date (2024, 4, 30, 15, 42),
                new Date(2024, 4, 30, 15, 52),
            ],
            [
                "WARNING",
                new Date (2024, 4, 30, 15, 52),
                new Date(2024, 4, 30, 16, 7),
            ],
            [
                "CRITICAL",
                new Date (2024, 4, 30, 16, 7),
                new Date(2024, 4, 30, 16, 58),
            ],
            [
                "OK",
                new Date (2024, 4, 30, 16, 58),
                new Date(2024, 4, 30, 17, 40),
            ],
        ]
    }



    for (let item in rawData.history) {
        rawData.history[item].unshift("STATUS")
        data.push(rawData.history[item])
        switch (rawData.history[item][1]){
            case "OK":
                colors.push("#aee238")
                break
            case "WARNING":
                colors.push("#faeb2e")
                break
            case "CRITICAL":
                colors.push("#fa2516")
                break
            default:
                colors.push("#9f9c9c")
        }
    }


    const options = {
        timeline: {
            groupByRowLabel: true,
            barLabelStyle: {
                fontSize: 25
            },
        },
        backgroundColor: "#ebf8fa",
        colors: colors
    };

    const onCommentClick = () => {
        setCommentFormIsOpened(!commentFormIsOpened)
    }

    useEffect(() => {
        if (commentFormIsOpened && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [commentFormIsOpened]);

    const onSendCommentClick = () => {
        setCommentFormIsOpened(false)
        document.getElementById('commentArea').value = ''
        setCommentFormContent('')
        const processedString = commentFormContent.split(/\s+/).map(word => processAlertComment(word, user.usersCommentReplaceRules))
        alert.alert.comment = (
            <>
                {processedString.map((element, index) => (
                    <React.Fragment key={index}>{element} </React.Fragment>
                ))}
            </>
        )
    }

    const handleEnterKey = (e) => {
        if (e.keyCode === 13) {
            e.preventDefault()
            onSendCommentClick()
        }
    }

    const onHistorySearchClick = (e) => {
        e.preventDefault()
        console.log(`Get Alert status history from ${historyStart} to ${historyEnd}`)
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
                              ref={textareaRef}
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
                <div className={styles.historyBlock}>
                    <h3 className={styles.historyTitle}>Status history</h3>
                    <div className={styles.historyInputBlock}>
                        <div className={styles.historyInputElement}>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <MobileDateTimePicker defaultValue={dayjs(historyStart)} onChange={e => setHistoryStart(e)} ampm={false}/>
                            </LocalizationProvider>
                        </div>
                        <div className={styles.historyInputElement}>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <MobileDateTimePicker defaultValue={dayjs(historyEnd)} onChange={e => setHistoryEnd(e)} ampm={false}/>
                            </LocalizationProvider>
                        </div>
                        <button className={styles.historySearchButton} onClick={e => onHistorySearchClick(e)}></button>
                    </div>
                    <Chart
                    chartType="Timeline"
                    data={data}
                    width="100%"
                    height="200px"
                    options={options}
                    />
                </div>

            </div>
            
        </>
    );
};

export default AlertsDetails;