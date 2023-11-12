import styles from './Header.module.css'
import HeaderMenuItem from "../HeaderMenuItem/HeaderMenuItem";
import {headerMenuItems} from "../../utils/vars";
import {useDispatch, useSelector} from "react-redux";
import {switchLoginModal, switchProfileModal} from "../../store/reducers/modalReducer";

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
    return (
        <>
            <div className={styles.logo}></div>
            <button className={`${styles.headerButton} ${isLogged ? styles.headerButtonEnabled : styles.headerButtonDisabled}`}
            disabled={!isLogged}
            onClick={() => {
                console.log("REFRESH BUTTON")
            }}> Refresh</button>
            <ul className={styles.headerMenu}>
                {
                    headerMenuItems.map((item, index) =>

                        <HeaderMenuItem item={item} key={index}/>
                    )
                }


            </ul>
            <button className={`${styles.headerButton} ${isLogged ? styles.headerButtonEnabled : styles.headerButtonDisabled}`}
                    disabled={!isLogged}
            onClick={() => {
                console.log("SCHEDULE DOWN TIME")
            }}> Schedule DT</button>
            {/*<div className={`${styles.avatar} ${isLogged ? styles.avatar_personal : styles.avatar_unknown}`} onClick={e => {onAvatarClick(e)}}></div>*/}
            <div className={styles.avatar} style={{backgroundImage: `url(${isLogged ? userInfo.userImage : process.env.PUBLIC_URL + "/images/avatar.svg"})`}} onClick={e => {onAvatarClick(e)}}></div>
        </>
    )
}

export default Header;