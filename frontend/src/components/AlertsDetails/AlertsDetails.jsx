import React, {useEffect, useRef, useState} from 'react';
import styles from './AlertsDetails.module.css'
import {useDispatch, useSelector} from "react-redux";
import {processAlertComment, processDuration, stringToDate} from "../../utils/utils";
import {Chart} from "react-google-charts";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import {MobileDateTimePicker} from "@mui/x-date-pickers/MobileDateTimePicker";
import dayjs from "dayjs";
import {LocalizationProvider} from "@mui/x-date-pickers/LocalizationProvider";
import AlertService from "../../services/AlertService";
import {setModalError} from "../../store/reducers/modalReducer";

const AlertsDetails = ({details, history}) => {
    const dispatch = useDispatch();
    const [commentFormIsOpened, setCommentFormIsOpened] = useState(false)
    const [commentFormContent, setCommentFormContent] = useState(details.comment)
    const user = useSelector( state => state.authReducer.user)
    const textareaRef = useRef(null)
    const [historyStart, setHistoryStart] = useState(new Date(Date.now() - 24 * 60 * 60 * 1000))
    const [historyEnd, setHistoryEnd] = useState(new Date(Date.now()))
    const [data, setData] = useState([])
    const [colors, setColors] = useState([])
    const [processedString, setProcessedString] = useState('')
    const [alertComment, setAlertComment] = useState(null)

    useEffect(() => {
        const process = details.comment.split(/\s+/).map(word => processAlertComment(word, user.usersCommentReplaceRules))
        setProcessedString(process)
    },[details.comment])

    useEffect(() => {
        const comment = (
            <>
                {processedString ? processedString.map((element, index) => (
                    <React.Fragment key={index}>{element} </React.Fragment>
                )) : <></>}
            </>
        )
        setAlertComment(comment)
    },[processedString])

    //init data array
    const dataSample = [
        [
            {type: "string", id: "Title"},
            {type: "string", id: "Severity"},
            {type: "date", id: "Start"},
            {type: "date", id: "End"},
        ]
    ]

    const rawData = [...dataSample]

    //init initColors array
    const initColors = []

    //set colors for every item in timeline
    for (let i in history) {
        rawData.push(history[i])
        switch (history[i][1]){
            case "RESOLVED":
                initColors.push("#aee238")
                break
            case "WARNING":
                initColors.push("#faeb2e")
                break
            case "CRITICAL":
                initColors.push("#fa2516")
                break
            default:
                initColors.push("#9f9c9c")
        }
    }

    useEffect(() => {
        const initData = rawData.map(array => array.map( item => stringToDate(item)))
        setData(initData)
        setColors(initColors)
    }, [history])


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

    const onSendCommentClick =  async () => {
        setCommentFormIsOpened(false)
        document.getElementById('commentArea').value = ''
        const alert_id = details.alert_id
        const commentRequest = {
            alert_id: alert_id,
            comment: commentFormContent
        }
        try {
            const commentResponse = await AlertService.postComment(commentRequest)
        } catch (e) {
            dispatch (setModalError("Oops, something went wrong"))
        }
        details.comment = commentFormContent
        setCommentFormContent('')
    }

    const handleEnterKey = (e) => {
        if (e.keyCode === 13) {
            e.preventDefault()
            onSendCommentClick()
        }
    }

    const onHistorySearchClick = async (e) => {
        e.preventDefault()
        const params = {
            alert_id : details.alert_id,
            start: Math.floor(new Date(historyStart).getTime()/1000),
            end: Math.floor(new Date(historyEnd).getTime()/1000),
        }
        const customRawData = [...dataSample]
        const customColors = []
        try {
            const response = await AlertService.getAlert(params)
            const historyRequest = response.data.history.map(item => ["STATUS", ...item])


            for (let i in historyRequest) {
                customRawData.push(historyRequest[i])
                switch (historyRequest[i][1]){
                    case "RESOLVED":
                        customColors.push("#aee238")
                        break
                    case "WARNING":
                        customColors.push("#faeb2e")
                        break
                    case "CRITICAL":
                        customColors.push("#fa2516")
                        break
                    default:
                        customColors.push("#9f9c9c")
                }
            }
            setColors(customColors)
            const customInitData = customRawData.map(array => array.map( item => stringToDate(item)))
            setData(customInitData)
        } catch (err) {
            console.log(err)
        }
    }

    let fontColor
    switch (details.severity.toUpperCase()) {
        case "RESOLVED":
            fontColor = '#779f27'
            break
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
                    {details.severity}
                </div>
            </div>
            <div className={styles.alertDetailsBody}>
                <ul className={styles.alertCommonInfo}>
                    <li className={styles.alertInfoItem}>
                        <p className={styles.alertInfoKey}>Problem:</p>
                        <p className={styles.alertInfoValue}>{details.alertName}</p>
                    </li>
                    <li className={styles.alertInfoItem}>
                        <p className={styles.alertInfoKey}>Problem Host:</p>
                        <p className={styles.alertInfoValue}>{details.host}</p>
                    </li>
                    <li className={styles.alertInfoItem}>
                        <p className={styles.alertInfoKey}>Alert Duration: </p>
                        <p className={styles.alertInfoValue}>{processDuration(details.fired)}</p>
                    </li>
                    <li className={styles.alertInfoItem}>
                        <p className={styles.alertInfoKey}>Responsible Engineer: </p>
                        <p className={styles.alertInfoValue}>{details.responsibleUser ? details.responsibleUser : "UNHANDLED"}</p>
                    </li>
                    <li className={styles.alertInfoItem}>
                        <p className={styles.alertInfoKey}>Alert Details: </p>
                        <p className={styles.alertInfoValue}>{details.msg}</p>
                    </li>
                    <li className={styles.alertInfoItem}>
                        <p className={styles.alertInfoKey}>Comments: </p>
                        <div className={styles.alertCommentButton} onClick={(e) => {
                            e.preventDefault()
                            onCommentClick()
                        }}/>
                        <p className={styles.alertInfoValue}>{alertComment}</p>
                    </li>
                </ul>
                <div className={commentFormIsOpened ? styles.commentBlock : styles.disabledBlock}>
                    <textarea className={styles.alertCommentInput}
                              style={{ display: commentFormIsOpened ? "flex" : "none"}}
                              maxLength="100"
                              id="commentArea"
                              ref={textareaRef}
                              value={commentFormContent}
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
                    details.customFields ?
                        <ul className={styles.alertCommonInfo}>
                            {Object.keys(details.customFields).map((key) => (
                                <li className={styles.alertInfoItem}>
                                    <p className={styles.alertInfoKey}>{key}: </p>
                                    {details.customFields[key].startsWith("https://") ? (
                                        <a
                                            className={styles.alertInfoLink}
                                            href={details.customFields[key]}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {details.customFields[key].split('/')[2]}
                                        </a>
                                    ) : (
                                        <p className={styles.alertInfoValue}>
                                            {details.customFields[key]}
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