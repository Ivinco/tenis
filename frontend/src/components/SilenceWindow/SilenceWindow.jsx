import React, {useEffect, useRef, useState} from 'react';
import style from "./SilenceWindow.module.css"
import modalHeaderStyles from "../AlertsDetails/AlertsDetails.module.css"
import {useDispatch, useSelector} from "react-redux";
import {sha256} from "js-sha256";
import {setModalError} from "../../store/reducers/modalReducer";
import AlertService from "../../services/AlertService";
import {setSilenceRules} from "../../store/reducers/silenceRulesReducer";

function SilenceWindow() {
    const dispatch = useDispatch()
    const projectRef = useRef(null);
    const hostnameRef = useRef(null);
    const alertNameRef = useRef(null);
    const silenceDurationRef = useRef(null);
    const commentFieldRef = useRef(null);
    const [ruleId, setRuleId] = useState(null);
    const [project, setProject] = useState("")
    const [hostname, setHostname] = useState("")
    const [alertName, setAlertName] = useState("")
    const [silenceDuration, setSilenceDuration] = useState(undefined)
    const [comment, setComment] = useState("")
    const [selectedRules, setSelectedRules] = useState([])
    const [activeSilenceButton, setActiveSilenceButton] = useState(false)

    const rules = useSelector(state => state.setSilenceRules.rules)

    useEffect(() => {
        if ( comment && comment.length > 4 && (project || hostname || alertName)  ) {
            setActiveSilenceButton(true)
        } else {
            setActiveSilenceButton( false)
        }
    }, []);

    useEffect(() => {
        if (selectedRules.length < 1){
            setRuleId(null)
        }
    }, [selectedRules]);


    const refreshRules = async () => {
        const newRules = []
        try {
            const response = await AlertService.getSileneced()
            response.data.forEach((rule) => {
                newRules.push(rule)
            })
        }
        catch (e) {
            dispatch(setModalError("Oops. Something went wrong. Please, try a bit later"))
        }
        dispatch(setSilenceRules(newRules))
    }

    const handleEnterKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault()
            if (activeSilenceButton) {
                onSilenceHandler()
            }
        }
    }

    const onSilenceHandler =  async () => {
        if (ruleId) {
            try {
                await AlertService.unsilence([{silenceId:ruleId}])
            }
            catch (e) {
                dispatch(setModalError("Oops. Something went wrong. Please, try a bit later"))
            }
        }
        let endSilenceTime
        if (silenceDuration) {
            endSilenceTime = Date.now() + Number(silenceDuration) * 60000
        } else {
            endSilenceTime = null
        }
        const silenceRule = {
            project: project,
            host: hostname,
            alertName: alertName,
            startSilence: Date.now(),
            endSilence: endSilenceTime,
            comment: comment
        }
        try {
             await AlertService.silence(silenceRule)
        }
        catch (e){
            dispatch(setModalError("Oops. Something went wrong. Please, try a bit later"))
        }

        setRuleId(null)
        setProject("")
        setHostname("")
        setAlertName("")
        setSilenceDuration(0)
        setComment("")
        setSelectedRules([])

        refreshRules()
    }

    const onDeleteHandler =  async () => {
        let unsilenceRules = []
        selectedRules.forEach((rule) => {unsilenceRules.push({silenceId: rule._id})})
        try {
            await AlertService.unsilence(unsilenceRules)
        }
        catch (e) {
            dispatch(setModalError("Oops. Something went wrong. Please, try a bit later"))
        }

        setSelectedRules([])

        refreshRules()
    }

    const onEditHandler =  async (rule) => {
        setRuleId(rule._id)
        setProject(rule.project)
        setHostname(rule.host)
        setAlertName(rule.alertName)
        setSilenceDuration(Math.floor((rule.endSilence - Date.now()) / 60000))
        setComment(rule.comment)

    }

    const onRuleHandler = (rule) => {
        if (selectedRules.some(selectedRule => selectedRule._id === rule._id)) {
            setSelectedRules(selectedRules.filter(selectedRule => selectedRule._id !== rule._id))
        } else {
            setSelectedRules([...selectedRules, rule])
        }
    }



    return (
        <div className={style.silenceBody}>
            <div className={modalHeaderStyles.alertHeader}>
                <div className={modalHeaderStyles.alertLogo}/>
                <div className={modalHeaderStyles.alertTitle}> Silence Rules</div>
            </div>
            <div className={style.silenceContent}>
                <div className={style.silenceForm}>
                    <input type="text" placeholder="Project name" className={style.silenceInputField}
                           onChange={e => setProject(e.target.value)}
                           value={project}
                           id={"project_input_global"}
                           ref={projectRef}
                           onKeyDown={handleEnterKeyDown}
                    />
                    <input type="text" placeholder="Host Name" className={style.silenceInputField}
                           onChange={e => setHostname(e.target.value)}
                           value={hostname}
                           id={"host_input_global"}
                           ref={hostnameRef}
                           onKeyDown={handleEnterKeyDown}
                    />
                    <input type="text" placeholder="Alert Name" className={style.silenceInputField}
                           onChange={e => setAlertName(e.target.value)}
                           value={alertName}
                           id={"alert_input_global"}
                           ref={alertNameRef}
                           onKeyDown={handleEnterKeyDown}
                    />
                    <input type="text" placeholder="Silence duration (min)" className={style.silenceInputField}
                           onChange={e => setSilenceDuration(e.target.value)}
                           value={silenceDuration}
                           id={"duration_input_global"}
                           ref={silenceDurationRef}
                           onKeyDown={handleEnterKeyDown}
                    />
                    <textarea placeholder="Comment" className={style.silenceInputField}
                              onChange={e => setComment(e.target.value)}
                              id={"silenced_comment_input_global"}
                              ref={commentFieldRef}
                              value={comment}
                              onKeyDown={handleEnterKeyDown}
                    />
                    <button className={`${style.silenceButton} 
                ${comment && comment.length > 4 && (project || hostname || alertName) 
                        ? style.silenceButtonEnabled
                        : style.silenceButtonDisabled}`}
                            onClick={e => {
                                e.preventDefault()
                                onSilenceHandler()
                            }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    onSilenceHandler()
                                }
                            }}
                            disabled={!comment}
                    >Silence
                    </button>
                </div>
                <div className={style.cationContainer}>
                    <p className={style.tableCaption}>Silence Rules</p>
                    <div className={style.controlButtonsContainer}>
                        <button
                            className={`${style.controlButton} ${selectedRules.length === 1 ? style.controlButtonEnabled : style.controlButtonDisabled}`}
                            disabled={selectedRules.length !== 1}
                            onClick={e => {
                                e.preventDefault()
                                onEditHandler(selectedRules[0])
                            }}
                        >
                            Edit
                        </button>
                        <button
                            className={`${style.controlButton} ${selectedRules.length > 0 ? style.controlButtonEnabled : style.controlButtonDisabled}`}
                            onClick={e => {
                                e.preventDefault()
                                onDeleteHandler()
                            }}
                            disabled={!selectedRules.length > 0}
                        >
                            Delete
                        </button>
                    </div>
                </div>
                <table className={style.silenceTable}>
                    <thead className={style.tableHeader}>
                    <tr>
                        <th scope="col" className={style.tableHeaderElement}> Author</th>
                        <th scope="col" className={style.tableHeaderElement}> Project</th>
                        <th scope="col" className={style.tableHeaderElement}> Host name</th>
                        <th scope="col" className={style.tableHeaderElement}> Alert name</th>
                        <th scope="col" className={style.tableHeaderElement}> Silenced till</th>
                        <th scope="col" className={style.tableHeaderElement}> Comment</th>
                    </tr>
                    </thead>
                    <tbody className={style.tableBody}>
                    {
                        rules.map(rule => (
                            <tr className={`${style.tableRow} ${selectedRules.some(selectedRule => selectedRule._id === rule._id) ? style.tableRowSelected : null}`}
                                key={rule._id}
                                onClick={e => {
                                    e.preventDefault()
                                    onRuleHandler(rule)
                                }}
                            >
                                <td className={`${style.tableCell} ${style.ruleAuthor}`}
                                    style={{backgroundImage: `url(https://gravatar.com/avatar/${sha256(rule.author)}?s=150)`}}
                                />
                                <td className={style.tableCell}>{rule.project}</td>
                                <td className={style.tableCell}>{rule.host}</td>
                                <td className={style.tableCell}>{rule.alertName}</td>
                                {/*<td className={style.tableCell}>{new Date(parseInt(rule.endSilence, 10)).toLocaleString()}</td>*/}
                                <td className={style.tableCell}>
                                    {rule.endSilence !== null
                                        ? new Date(parseInt(rule.endSilence, 10)).toLocaleString()
                                        : "permanent"
                                    }
                                </td>
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