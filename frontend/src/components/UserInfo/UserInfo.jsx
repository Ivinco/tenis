import React, {useEffect, useState} from 'react';
import styles from './UserInfo.module.css'
import {useDispatch, useSelector} from "react-redux";
import {loginAction, logoutAction} from "../../store/reducers/authReducer";
import {closeModal, setModalError} from "../../store/reducers/modalReducer";
import {setTotalAlertsNumber} from "../../store/reducers/alertReducer";
import usePortalParam from "../../hooks/usePortalParam";
import UserService from "../../services/UserService";
import userService from "../../services/UserService";
import axios from "axios";
import {BACKEND_SERVER} from "../../utils/vars";
import ReactLoading from "react-loading";
import {prepareUser} from "../../utils/utils";


const UserInfo = () => {
    const dispatch = useDispatch()
    const user = useSelector(state => state.authReducer.user)
    const setPortalParam = usePortalParam()
    const [isLoading, setIsLoading] = useState(false)
    const [editInfo, setEditInfo] = React.useState(false);
    const [resetPassword, setResetPassword] = React.useState(false);
    const [newName, setNewName] = React.useState(user.userName);
    const [newEmail, setNewEmail] = React.useState(user.userEmail);
    const [newPhone, setNewPhone] = React.useState(user.userPhone);
    const [newPassword, setNewPassword] = React.useState("");
    const [oldPassword, setOldPassword] = React.useState("");


    useEffect(() => {
        const handleEnterKeyDown = (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                editInfo ? handleEditUserInfo() : resetPassword ? handleResetPassword() : onLogout(e);
            }
        };

        window.addEventListener("keydown", handleEnterKeyDown);

        return () => {
            window.removeEventListener("keydown", handleEnterKeyDown);
        };
    }, [editInfo, resetPassword, newName, newEmail, newPhone, newPassword, oldPassword]);

    const onEditButtonClick = () => {
        setEditInfo(!editInfo);
        setResetPassword(false)
    }

    const handleEditUserInfo = async () => {
        const data = {
            id: user.userId,
            name: newName,
            email: newEmail,
            phone: newPhone,
        }
         try {
            setIsLoading(true);
             const response = await UserService.editUser(data)
             if(response.data) {
                 const user = prepareUser(response.data)
                 dispatch(loginAction(user))
                 setIsLoading(false)
                 setEditInfo(false)
             } else {
                 setIsLoading(false)
                 setEditInfo(false);
             }


         }
         catch (e) {
             setIsLoading(false)
             dispatch(setModalError("Oops. Something went wrong. Please, try a bit later"))
             setPortalParam()
         }

    }

    const handleResetPassword = async () => {
        //check if both fields are filled
        if (oldPassword && newPassword) {
            //make login request to check current password
            try {
                setIsLoading(true)
                await axios.post(`${BACKEND_SERVER}/auth`, {email: user.userEmail, password: oldPassword})
                const data = {
                    id: user.userId,
                    password: newPassword,
                }
                //request to change password
                try {
                    await userService.editUser(data)
                    setIsLoading(false)
                    setResetPassword(false)
                    setOldPassword("")
                    setNewPassword("")
                // Error during updating password
                } catch (e) {
                    setIsLoading(false)
                    dispatch(setModalError("Oops. Something went wrong. Please, try a bit later"))
                    setPortalParam()
                }
            }
            //Error during test login request
            catch (e) {
                setIsLoading(false)
                if (e.response.status === 401) {
                    dispatch(setModalError("Wrong Password"))
                    setPortalParam()
                } else {
                    dispatch(setModalError("Oops. Something went wrong. Please, try a bit later"))
                    setPortalParam()
                }
            }
        //Not all fields are filled
        } else {
            dispatch(setModalError("Please, provide old password and the new one"))
            setResetPassword(false)
            setOldPassword("")
            setNewPassword("")
            setPortalParam()
        }
    }


    const onResetPasswordClick = () => {
        setResetPassword(!resetPassword)
        setEditInfo(false)
    }

    const onLogout = (e) => {
        e.preventDefault()
        localStorage.removeItem('token')
        dispatch(logoutAction())
        setPortalParam()
        dispatch(closeModal())
        dispatch(setTotalAlertsNumber(0))
    }


    return (
        <>
            {
                isLoading
                    ?
                        <div className={styles.loadOverlay}>
                            <ReactLoading color={'#01A2D8'} type={"spin"} height={200} width={100}/>
                        </div>
                    :
                        <></>
            }
            <div className={styles.userInfoHeader}>
                <div className={styles.userInfoLogo}/>
                <div className={styles.userInfoTitle}>{user.userName}</div>
            </div>
            <div className={styles.userInfoBody}>
                <ul className={styles.userInfoInfoBlock}>
                    {editInfo
                        ?
                        <input
                            className={styles.userEditForm}
                        type='text'
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        />
                        :
                        <li className={styles.userInfoItem} key={user.userName}> {user.userName}</li>
                    }
                    {
                        editInfo
                            ?
                            <input
                                className={styles.userEditForm}
                                type='text'
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                            />
                            :
                            <li className={styles.userInfoItem} key={user.userEmail}> {user.userEmail}</li>
                    }
                    {
                        editInfo
                            ?
                            <input
                                className={styles.userEditForm}
                                type='text'
                                value={newPhone}
                                onChange={(e) => setNewPhone(e.target.value)}
                            />
                            :
                            <li className={styles.userInfoItem} key={user.userPhone}> {user.userPhone}</li>
                    }
                </ul>
                <div className={styles.userEditButtonsBlock}>
                    <button className={`${styles.userEditButton} ${editInfo ? styles.userEditButtonActive : null}`}
                            onClick={ e => {
                                e.preventDefault()
                                onEditButtonClick()
                            }}
                    >
                        Edit Info
                    </button>
                    <button className={`${styles.userEditButton} ${resetPassword ? styles.userEditButtonActive : null}`}
                            onClick={ e => {
                                e.preventDefault()
                                onResetPasswordClick()
                            }}
                    >
                        Change Password
                    </button>
                    <button className={`${styles.userEditButton} ${styles.userEditButtonActive} ${(!editInfo && !resetPassword) ? styles.hiddenElement : ''}`}
                            onClick={ e => {
                                e.preventDefault()
                                editInfo ? handleEditUserInfo() :  resetPassword ? handleResetPassword() : console.log("Nothing to do")
                            }}
                    >
                        Save
                    </button>
                </div>
                <div className={styles.userInfoAvatar} style={{backgroundImage: `url(${user.userImage})`}}/>
            </div>
            <div className={`${styles.resetPassBlock} ${!resetPassword ? styles.hiddenElement : ''}`}>
                <form className={styles.resetPassForm}>
                    <input className={styles.resetPassField}
                           type='password'
                           placeholder='old password'
                           value={oldPassword}
                           onChange={(e) => setOldPassword(e.target.value)}
                    />
                    <input className={styles.resetPassField}
                           type='password'
                            placeholder='new password'
                           value={newPassword}
                           onChange={(e) => setNewPassword(e.target.value)}
                    />
                </form>
            </div>

            <button className={styles.logoutButton} onClick={(e) => onLogout(e)}>LOGOUT</button>
        </>
    );
};

export default UserInfo;