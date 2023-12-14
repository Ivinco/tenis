import React from 'react';
import styles from "./AuthForm.module.css";
import {useInput} from "../../hooks/vallidationHooks";
import {useDispatch} from "react-redux";
import {loginAction} from "../../store/reducers/authReducer";
import {closeModal} from "../../store/reducers/modalReducer";
import AuthService from "../../services/AuthService";
import {switchErrorMessageModal} from "../../store/reducers/modalReducer";
import {sha256} from "js-sha256";


const AuthForm = () => {
    const emailValidator = useInput('',{isEmpty: true, minLength: 3, maxLength: 20})
    const passwordValidator = useInput('', {isEmpty: true, minLength: 6, maxLength: 20})
    const dispatch = useDispatch()

    const onLogin = async (email, password) => {
        try {
            const response = await AuthService.login(email, password)
                    localStorage.setItem('token', response.data.access_token)
                    console.log(`https://gravatar.com/avatar/${sha256(response.data.user.email)}?s=150`)
                    const user = {
                                        userName: response.data.user.name,
                                        userId: response.data.user._id,
                                        userEmail: response.data.user.email,
                                        userImage: `https://gravatar.com/avatar/${sha256(response.data.user.email)}?s=150`,
                                        usersCommentReplaceRules: response.data.user.commentReplaceRules
                                    }
                    dispatch(loginAction(user))
                    dispatch(closeModal())
                    console.log(response.data)
        }
        catch (e) {
            switch (e.request.status){
                case 401:
                    dispatch(switchErrorMessageModal("Login failed"))
                    break
                default:
                    dispatch(switchErrorMessageModal("Oops. Something went worng. Please, try a bit later"))
            }
            console.error(`This is request error: ${e.request.status}`)
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