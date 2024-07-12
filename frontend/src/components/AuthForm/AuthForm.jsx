import React from 'react';
import styles from "./AuthForm.module.css";
import {useInput} from "../../hooks/vallidationHooks";
import {useDispatch} from "react-redux";
import {loginAction} from "../../store/reducers/authReducer";
import {closeModal} from "../../store/reducers/modalReducer";
import AuthService from "../../services/AuthService";
import {setModalError} from "../../store/reducers/modalReducer";
import usePortalParam from "../../hooks/usePortalParam";
import {prepareUser} from "../../utils/utils";


const AuthForm = () => {
    const emailValidator = useInput('',{isEmpty: true, minLength: 3, maxLength: 20})
    const passwordValidator = useInput('', {isEmpty: true, minLength: 6, maxLength: 20})
    const dispatch = useDispatch()
    const setPortalParams = usePortalParam()

    const onLogin = async (email, password) => {
        try {
            const response = await AuthService.login(email, password)
                    localStorage.setItem('token', response.data.access_token)
            const user = prepareUser(response.data.user)
                    dispatch(loginAction(user))
                    setPortalParams()
                    dispatch(closeModal())
        }
        catch (e) {
            if (e.request.status) {
                switch (e.request.status){
                    case 401:
                        dispatch(setModalError("Login failed"))
                        setPortalParams()
                        break
                    default:
                        dispatch(setModalError("Oops. Something went wrong. Please, try a bit later"))
                        setPortalParams()
                }
            } else {
                dispatch(setModalError("Oops. Something went wrong. Please, try a bit later"))
                setPortalParams()
            }

        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter'){
            e.preventDefault()
            onLogin(emailValidator.value, passwordValidator.value)
        }
    }

    return (
        <>
            <div className={styles.loginHeader}>
                <div className={styles.loginLogo}/>
                <div className={styles.loginTitle}>LOGIN</div>
            </div>
            <input type='email'
                   name='email'
                   className={(emailValidator.isDirty && !emailValidator.isValid)
                                            ? `${styles.loginInput} ${styles.inputInvalid}`
                                            : `${styles.loginInput}`}
                   value={(emailValidator.value)}
                   placeholder={"E-MAIL"}
                   onChange={(e) => emailValidator.onChange(e)}
                   onBlur={(e) => emailValidator.onBlur(e)}
                   onKeyDown={handleKeyDown}
            />
            <input type='password'
                   name='password'
                   className={(passwordValidator.isDirty && !passwordValidator.isValid)
                       ? `${styles.loginInput} ${styles.inputInvalid}`
                       : `${styles.loginInput}`}
                   value={(passwordValidator.value)}
                   placeholder={"PASSWORD"}
                   onChange={(e) => passwordValidator.onChange(e)}
                   onBlur={(e) => passwordValidator.onBlur(e)}
                   onKeyDown={handleKeyDown}
            />
            <button className={
                `${styles.loginButton} ${emailValidator.isValid && passwordValidator.isValid
                    ? styles.loginButtonEnabled
                    : styles.loginButtonDisabled}`
                }
                    onClick={(e)=> {
                        e.preventDefault()
                        onLogin(emailValidator.value, passwordValidator.value)
                        }
                    }
            disabled={(!emailValidator.isValid || !passwordValidator.isValid)}>
                LOGIN
            </button>
        </>
    );
};

export default AuthForm;