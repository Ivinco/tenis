import styles from './Header.module.css'
import commonStyles from '../../styles/common.module.css'
import {useDispatch, useSelector} from "react-redux";
import {
    openModal,
    setModalError,
} from "../../store/reducers/modalReducer";
import FilterMenu from "../FilterMenu/FilterMenu";
import {switchFilterMenu} from "../../store/reducers/hiddenMenuReducer";
import {switchInspectMode} from "../../store/reducers/headerMenuReducer";
import AlertService from "../../services/AlertService";
import {setSilenceRules} from "../../store/reducers/silenceRulesReducer";
import usePortalParam from "../../hooks/usePortalParam";

const Header = () => {
    const dispatch = useDispatch()
    const isLogged = useSelector(state => state.authReducer.isLogged)
    const userInfo = useSelector(state => state.authReducer.user)
    const alerts = useSelector(state => state.setAlertReducer.alertsNumber)
    const isInspectMode = useSelector(state => state.setHeaderMenuItemValue.inspectMode)
    const setPortalParams = usePortalParam()

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

    const onInspectClick = () => {
        dispatch(switchInspectMode())
    }
    const onFilterClick = () => {
        dispatch(switchFilterMenu())
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

    return (
        <>
            <div className={styles.header}>
                <div className={styles.logo}></div>
                <div className={`${styles.onDutyPortal} ${isLogged ? styles.onDutyPortalActive : null}`}>
                    {isLogged ? " On call: Vasya Pupkin" : null}
                </div>
                <div className={styles.alertsCount}
                     style={{borderColor: !isLogged ? "grey" : null}}
                >
                    {
                        isLogged
                            ?
                            <>
                                <p className={styles.alertsNumber}>{alerts}</p>
                                <p className={styles.alertsCountTitle}>Total alerts fired</p>
                            </>
                            : null
                    }

                </div>

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
                    className={`${styles.funcButton} ${styles.inspectButton} ${isLogged ? styles.funcButtonEnabled : null} ${commonStyles.buttonHint}`}
                    style={!isInspectMode ? {backgroundColor: "#a0f1e2"} : {}}
                    data-tooltip="inspect mode"
                    disabled={!isLogged}
                    onClick={(e) => {
                        e.preventDefault()
                        onInspectClick()
                    }}
                />

                <button
                    className={`${styles.funcButton} ${styles.refreshButton} ${isLogged ? styles.funcButtonEnabled : null} ${commonStyles.buttonHint}`}
                    data-tooltip="recheck all alerts"
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