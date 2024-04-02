import React, {useState} from 'react';
import style from "./SilenceWindow.module.css"
import modalHeaderStyles from "../AlertsDetails/AlertsDetails.module.css"
import {useDispatch, useSelector} from "react-redux";
import {processDuration} from "../../utils/utils";
import {sha256} from "js-sha256";
import AuthService from "../../services/AuthService";
import {switchErrorMessageModal} from "../../store/reducers/modalReducer";
import AlertService from "../../services/AlertService";

function SilenceWindow() {
    const dispatch = useDispatch()
    const userEmail = useSelector(state => state.authReducer.user.userEmail)
    const [hostname, setHostname] = useState("")
    const [alertName, setAlertName] = useState("")
    const [silenceDuration, setSilenceDuration] = useState(null)
    const [comment, setComment] = useState("")
    const [selectedRule, setSelectedRule] = useState("")

    const rules = [
        {
            ruleId: "010b29c9-7a8f-4a70-ba4f-498d72e2da7c",
            hostname: "repo01",
            alertName: "disk space usage 90%",
            startSilence : "1709213217",
            endSilence: "1709386017",
            comment: "Planned data migration",
            author: "stanislav@ivinco.com"
        },
        {
            ruleId: "3a0cbe28-6f5f-4093-8d9e-7074bf6eefef",
            hostname: "monitor",
            alertName: "High CPU load",
            startSilence : "1709213217",
            endSilence: "1709386017",
            comment: "Planned data migration",
            author: "sys@ivinco.com"
        }
    ]

    const onSilenceHandler =  async () => {
        let endSilenceTime
        if (silenceDuration) {
            endSilenceTime = Date.now() + Number(silenceDuration) * 60000
        } else {
            endSilenceTime = null
        }
        const silenceRule = {
            hostName: hostname,
            alertName: alertName,
            startSilence: Date.now(),
            endSilence: endSilenceTime,
            comment: comment
        }
        try {
             await AlertService.silence(silenceRule)
        }
        catch (e){
            console.log(e)
            dispatch(switchErrorMessageModal("Oops. Something went wrong. Please, try a bit later"))
        }
        setHostname("")
        setAlertName("")
        setSilenceDuration(0)
        setComment("")
        console.log(silenceRule)
    }

    const onRuleHandler = (rule) => {
        if (selectedRule === rule) {
            setSelectedRule("")
        } else {
            setSelectedRule(rule)
        }
        console.log(selectedRule)
    }



    return (
        <div className={style.silenceBody}>
            <div className={modalHeaderStyles.alertHeader}>
                <div className={modalHeaderStyles.alertLogo}/>
                <div className={modalHeaderStyles.alertTitle}> Silenced Alerts</div>
            </div>
            <div className={style.silenceContent}>
                <div className={style.silenceForm}>
                    <input type="text" placeholder="Host Name" className={style.silenceInputField}
                           onChange={e => setHostname(e.target.value)}
                           value={hostname}
                    />
                    <input type="text" placeholder="Alert Name" className={style.silenceInputField}
                           onChange={e => setAlertName(e.target.value)}
                           value={alertName}
                    />
                    <input type="text" placeholder="Silence duration (min)" className={style.silenceInputField}
                           onChange={e => setSilenceDuration(e.target.value)}
                           value={silenceDuration}
                    />
                    <textarea placeholder="Comment" className={style.silenceInputField}
                              onChange={e => setComment(e.target.value)}
                              value={comment}
                    />
                    <button className={`${style.silenceButton} 
                ${hostname && alertName && silenceDuration && comment
                        ? style.silenceButtonEnabled
                        : style.silenceButtonDisabled}`}
                            onClick={e => {
                                e.preventDefault()
                                onSilenceHandler()
                            }}
                            disabled={!comment}
                    >Silence
                    </button>
                </div>
                <div className={style.cationContainer}>
                    <p className={style.tableCaption}>Silence Rules</p>
                    <div className={style.controlButtonsContainer}>
                        <button className={style.controlButton}>Edit</button>
                        <button className={style.controlButton}>Delete</button>
                    </div>
                </div>
                <table className={style.silenceTable}>
                    <thead className={style.tableHeader}>
                    <tr>
                        <th scope="col" className={style.tableHeaderElement}> Author</th>
                        <th scope="col" className={style.tableHeaderElement}> Host name</th>
                        <th scope="col" className={style.tableHeaderElement}> Alert name</th>
                        <th scope="col" className={style.tableHeaderElement}> Silenced till</th>
                        <th scope="col" className={style.tableHeaderElement}> Comment</th>
                    </tr>
                    </thead>
                    <tbody className={style.tableBody}>
                    {
                        rules.map(rule => (
                            <tr className={`${style.tableRow} ${rule.ruleId === selectedRule ? style.tableRowSelected : null}`}
                                key={rule.ruleId}
                                onClick={e => {
                                    e.preventDefault()
                                    onRuleHandler(rule.ruleId)
                                }}
                            >
                                <td className={`${style.tableCell} ${style.ruleAuthor}`}
                                    style={{backgroundImage: `url(https://gravatar.com/avatar/${sha256(rule.author)}?s=150)`}}
                                />
                                <td className={style.tableCell}>{rule.hostname}</td>
                                <td className={style.tableCell}>{rule.alertName}</td>
                                <td className={style.tableCell}>{new Date(parseInt(rule.endSilence, 10) * 1000).toLocaleString()}</td>
                                <td className={style.tableCell}>{rule.comment}</td>
                            </tr>
                        ))
                    }
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default SilenceWindow;