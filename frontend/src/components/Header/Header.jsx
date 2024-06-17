import styles from './Header.module.css'
import commonStyles from '../../styles/common.module.css'
import {useDispatch, useSelector} from "react-redux";
import {
    openModal,
    setModalError,
} from "../../store/reducers/modalReducer";
import FilterMenu from "../FilterMenu/FilterMenu";
import {switchFilterMenu} from "../../store/reducers/hiddenMenuReducer";
import {setGroupingMenuValue, switchInspectMode} from "../../store/reducers/headerMenuReducer";
import AlertService from "../../services/AlertService";
import {setSilenceRules} from "../../store/reducers/silenceRulesReducer";
import usePortalParam from "../../hooks/usePortalParam";
import {recheckAllAlerts, setFoundAlerts} from "../../store/reducers/alertReducer";
import React, {useState} from "react";

const Header = () => {
    const dispatch = useDispatch()
    const isLogged = useSelector(state => state.authReducer.isLogged)
    const userInfo = useSelector(state => state.authReducer.user)
    const alerts = useSelector(state => state.webSocket.alerts)
    const totalAlertsNumbers = useSelector(state => state.setAlertReducer.totalAlertsNumber)
    const emergencyAlertsNumber = useSelector(state => state.setAlertReducer.emergencyAlertsNumber)
    const criticalAlertsNumber = useSelector(state => state.setAlertReducer.criticalAlertsNumber)
    const warningAlertsNumber = useSelector(state => state.setAlertReducer.warningAlertsNumber)
    const otherAlertsNumber = useSelector(state => state.setAlertReducer.otherAlertsNumber)
    const isInspectMode = useSelector(state => state.setHeaderMenuItemValue.inspectMode)
    const setPortalParams = usePortalParam()
    const isRecheckAlerts = useSelector(state => state.setAlertReducer.recheckAllAlerts)
    const isGrouped = useSelector(state => state.setHeaderMenuItemValue.grouping)

    const [searchPhrase, setSearchPhrase] = useState('')

    const onAvatarClick = (e) => {
        e.preventDefault()
        if (!isLogged){
            setPortalParams("login")
            dispatch(openModal())
        } else {
            setPortalParams("userInfo")
            dispatch(openModal())
        }

    }

    const onSearchHandle = (searchString) => {
        const foundAlerts = []
        alerts.forEach(alert => {
            for (const [key, value] of Object.entries(alert)){
                if (typeof value === 'string'){
                    if (value.toLowerCase().includes(searchString.toLowerCase())) {
                        foundAlerts.push(alert)
                    }
                }
            }
        })
        dispatch(setFoundAlerts(foundAlerts))
    }

    const searchReset = () => {
        dispatch(setFoundAlerts(null))
        setSearchPhrase('')
    }

    const onInspectClick = () => {
        dispatch(switchInspectMode())
    }
    const onFilterClick = () => {
        dispatch(switchFilterMenu())
    }

    const onGroupClick = () => {
        dispatch(setGroupingMenuValue())
    }

    const onSilenceClick =  async () => {
        const rules = []
        try {
            const response = await AlertService.getSileneced()
            response.data.forEach((rule) => {
                rules.push(rule)
            })


        }
        catch (e) {
            dispatch(setModalError("Oops. Something went wrong. Please, try a bit later"))
        }
        dispatch(setSilenceRules(rules))
        setPortalParams("silenceRules")
        dispatch(openModal())
    }

    const onRecheckClick = async () => {
        dispatch(recheckAllAlerts(true))

        //Delay for animation
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        await delay(1000);

        try {
            await AlertService.refreshAlerts([["recheck_all",""]])
        }
        catch (e) {
            dispatch(openModal())
            dispatch(setModalError(e.response.data.name))
        }
        dispatch(recheckAllAlerts(false))

    }

    return (
        <>
            <div className={styles.header}>
                <div className={styles.logo}></div>
                <div className={`${styles.onDutyPortal} ${isLogged ? styles.onDutyPortalActive : null}`}>
                    {isLogged ? " On call: Vasya Pupkin" : null}
                </div>
                <form className={styles.searchForm}>
                    <button id="alertSearchButton" type="submit" className={styles.searchButton}
                            onClick={e => {
                                e.preventDefault()
                                onSearchHandle(searchPhrase)
                            }}
                    />
                    <input id="alertSearchField" type="search" className={styles.searchField}
                           placeholder="Search..."
                           onChange={e => setSearchPhrase(e.target.value)}
                           onKeyDown={e => {
                               if (e.key === 'Escape') {
                                   searchReset()
                               }
                           }}
                    />
                    <button id="resetSearchButton"
                            type="reset"
                            className={`${styles.resetSearchButton} ${searchPhrase ? '' : styles.resetSearchButton_hidden}`}
                            onClick={e => searchReset()}
                    />
                </form>
                <div className={styles.alertsCount}
                     style={{borderColor: !isLogged ? "grey" : null}}
                >
                    {
                        isLogged
                            ?
                            <>

                                <p className={`${styles.alertCountItems} ${styles.alertsNumber} ${styles.emergencyAlerts} ${commonStyles.buttonHint}`}
                                data-tooltip="emergency alerts"
                                >
                                    {emergencyAlertsNumber}
                                </p>
                                <p className={`${styles.alertCountItems} ${styles.alertsNumber} ${styles.criticalAlerts} ${commonStyles.buttonHint}`}
                                   data-tooltip="critical alerts"
                                >
                                    {criticalAlertsNumber}
                                </p>
                                <p className={`${styles.alertCountItems} ${styles.alertsNumber} ${styles.warningAlerts} ${commonStyles.buttonHint}`}
                                   data-tooltip="warning alerts"
                                >
                                    {warningAlertsNumber}
                                </p>
                                <p className={`${styles.alertCountItems} ${styles.alertsNumber} ${styles.otherAlerts} ${commonStyles.buttonHint}`}
                                   data-tooltip="other alerts"
                                >
                                    {otherAlertsNumber}
                                </p>
                                <p className={`${styles.alertCountItems} ${styles.alertsCountTitle}`}>TOTAL:</p>
                                <p className={`${styles.alertCountItems} ${styles.alertsNumber} ${styles.totalAlerts}`}>{totalAlertsNumbers}</p>
                            </>
                            : null
                    }

                </div>

                <button
                    className={`${styles.funcButton} ${styles.groupAlerts} ${isLogged ? styles.funcButtonEnabled : null} ${commonStyles.buttonHint}`}
                    style={isGrouped ? {backgroundColor: "#a0f1e2"} : {}}
                    disabled={!isLogged}
                    data-tooltip="group alerts"
                    onClick={(e) => {
                        e.preventDefault()
                        onGroupClick()
                    }}
                />

                <button
                    className={`${styles.funcButton} ${styles.inspectButton} ${isLogged ? styles.funcButtonEnabled : null} ${commonStyles.buttonHint}`}
                    style={isInspectMode ? {backgroundColor: "#a0f1e2"} : {}}
                    data-tooltip="inspect mode"
                    disabled={!isLogged}
                    onClick={(e) => {
                        e.preventDefault()
                        onInspectClick()
                    }}
                />

                <button
                    className={`${styles.funcButton} ${styles.refreshButton} ${isLogged ? styles.funcButtonEnabled : null} ${isRecheckAlerts ? commonStyles.rotatedIcon : commonStyles.buttonHint}`}
                    data-tooltip="recheck all alerts"
                    onClick={e => {
                        e.preventDefault()
                        onRecheckClick()
                    }}
                />

                <button
                    className={`${styles.funcButton} ${styles.silenceButton} ${isLogged ? styles.funcButtonEnabled : null} ${commonStyles.buttonHint}`}
                    disabled={!isLogged}
                    data-tooltip="silence rules"
                    onClick={(e) => {
                        e.preventDefault()
                        onSilenceClick()
                    }}
                />

                <button
                    className={`${styles.funcButton} ${styles.filterButton} ${isLogged ? styles.funcButtonEnabled : null} ${commonStyles.buttonHint}`}
                    data-tooltip="filters"
                    disabled={!isLogged}
                    onClick={e => {
                        e.preventDefault()
                        onFilterClick()
                    }}
                />
                <div className={`${styles.avatar} ${commonStyles.buttonHint}`}
                     style={{backgroundImage: `url(${isLogged ? userInfo.userImage : process.env.PUBLIC_URL + "/images/avatar.svg"})`}}
                     data-tooltip="userinfo"
                     onClick={e => {
                         onAvatarClick(e)
                     }}/>
            </div>
            <FilterMenu/>
        </>
    )
}

export default Header;