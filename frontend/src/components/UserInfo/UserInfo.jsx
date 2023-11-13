import React from 'react';
import styles from './UserInfo.module.css'
import {useDispatch, useSelector} from "react-redux";
import {logoutAction} from "../../store/reducers/authReducer";
import {closeModal} from "../../store/reducers/modalReducer";


const UserInfo = () => {
    const dispatch = useDispatch()
    const user = useSelector(state => state.authReducer.user)

    const onLogout = (e) => {
        e.preventDefault()
        dispatch(logoutAction())
        dispatch(closeModal())
    }
    return (
        <>
            <div className={styles.userInfoHeader}>
                <div className={styles.userInfoLogo}/>
                <div className={styles.userInfoTitle}>{user.userName}</div>
            </div>
            <ul className={styles.userInfoInfoBlock}>
                <li className={styles.userInfoItem}> ID: {user.userId}</li>
                <li className={styles.userInfoItem}> Name: {user.userName}</li>
            </ul>
            <button className={styles.logoutButton} onClick={(e) => onLogout(e)}>LOGOUT</button>
        </>
    );
};

export default UserInfo;