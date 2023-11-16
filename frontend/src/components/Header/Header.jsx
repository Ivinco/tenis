import styles from './Header.module.css'
import {useDispatch, useSelector} from "react-redux";
import {switchLoginModal, switchProfileModal} from "../../store/reducers/modalReducer";
import FilterMenu from "../FilterMenu/FilterMenu";
import {switchFilterMenu} from "../../store/reducers/hiddenMenuReducer";

const Header = () => {
    const dispatch = useDispatch()
    const isLogged = useSelector(state => state.authReducer.isLogged)
    const userInfo = useSelector(state => state.authReducer.user)

    const onAvatarClick = (e) => {
        e.preventDefault()
        if (!isLogged){
            dispatch(switchLoginModal())
        } else {
            dispatch(switchProfileModal())
        }

    }
    const onFilterClick = () => {
        dispatch(switchFilterMenu())
    }
    return (
        <>
            <div className={styles.header}>
                <div className={styles.logo}></div>
                <div className={`${styles.onDutyPortal} ${isLogged ? styles.onDutyPortalActive : null}`}>
                    {isLogged ? " On call: Vasya Pupkin" : null}
                </div>
                <nav className={styles.navbar}>
                    <ul className={styles.itemsBlock}>
                        <li className={styles.navItem}>
                            <button className={`${styles.headerButton} ${isLogged ? styles.headerButtonEnabled : styles.headerButtonDisabled}`}
                                    disabled={!isLogged}
                                    onClick={() => {
                                        console.log("PENDING BUTTON")
                                    }}> Pending</button>
                        </li>
                        <li className={styles.navItem}>
                            <button className={`${styles.headerButton} ${isLogged ? styles.headerButtonEnabled : styles.headerButtonDisabled}`}
                                    disabled={!isLogged}
                                    onClick={() => {
                                        console.log("INBOX BUTTON")
                                    }}> Inbox</button>
                        </li>
                        <li>
                            <button className={`${styles.headerButton} ${isLogged ? styles.headerButtonEnabled : styles.headerButtonDisabled}`}
                                    disabled={!isLogged}
                                    onClick={() => {
                                        console.log("SCHEDULE DOWN TIME")
                                    }}> Schedule DT</button>
                        </li>
                    </ul>
                </nav>

                <button className={`${styles.funcButton} ${styles.refreshButton} ${isLogged ? styles.funcButtonEnabled : null}`}/>

                <button className={`${styles.funcButton} ${styles.filterButton} ${isLogged ? styles.funcButtonEnabled : null}`}
                        disabled={!isLogged}
                        onClick={e => {
                            e.preventDefault()
                            onFilterClick()
                        }}
                />
                <div className={styles.avatar}
                     style={{backgroundImage: `url(${isLogged ? userInfo.userImage : process.env.PUBLIC_URL + "/images/avatar.svg"})`}}
                     onClick={e => {onAvatarClick(e)}}/>
            </div>
            <FilterMenu/>
        </>
    )
}

export default Header;