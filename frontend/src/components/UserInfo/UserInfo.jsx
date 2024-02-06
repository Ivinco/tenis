import React from 'react';
import styles from './UserInfo.module.css'
import {useDispatch, useSelector} from "react-redux";
import {logoutAction} from "../../store/reducers/authReducer";
import {closeModal} from "../../store/reducers/modalReducer";
import {setAlertsNumber} from "../../store/reducers/alertReducer";


const UserInfo = () => {
    const dispatch = useDispatch()
    const user = useSelector(state => state.authReducer.user)

    const onLogout = (e) => {
        e.preventDefault()
        localStorage.removeItem('token')
        dispatch(logoutAction())
        dispatch(closeModal())
        dispatch(setAlertsNumber(0))
    }
    return (
        <>
            <div className={styles.userInfoHeader}>
                <div className={styles.userInfoLogo}/>
                <div className={styles.userInfoTitle}>{user.userName}</div>
            </div>
            <div className={styles.userInfoBody}>
                <ul className={styles.userInfoInfoBlock}>
                    <li className={styles.userInfoItem}> ID: {user.userId}</li>
                    <li className={styles.userInfoItem}> Name: {user.userName}</li>
                    <li className={styles.userInfoItem}> Email: {user.userEmail}</li>
                </ul>
                <div className={styles.userInfoAvatar} style={{ backgroundImage: `url(${user.userImage})`}}/>
            </div>

            <button className={styles.logoutButton} onClick={(e) => onLogout(e)}>LOGOUT</button>
        </>
    );
};

export default UserInfo;