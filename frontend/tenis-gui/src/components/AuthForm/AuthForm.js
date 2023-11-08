import React from 'react';
import styles from "./AuthForm.module.css";
import {useInput} from "../../hooks/vallidationHooks";

const AuthForm = () => {
    const loginValidator = useInput('',{isEmpty: true, minLength: 3, maxLength: 20})
    const passwordValidator = useInput('', {isEmpty: true, minLength: 6, maxLength: 20})

    return (
        <>
            <div className={styles.loginHeader}>
                <div className={styles.loginLogo}/>
                <div className={styles.loginTitle}>LOGIN</div>
            </div>
            <input type='text'
                   className={(loginValidator.isDirty && !loginValidator.isValid)
                                            ? `${styles.loginInput} ${styles.inputInvalid}`
                                            : `${styles.loginInput}`}
                   value={(loginValidator.value)}
                   placeholder={"LOGIN"}
                   onChange={(e) => loginValidator.onChange(e)}
                   onBlur={(e) => loginValidator.onBlur(e)}
            />
            <input type='password'
                   className={(passwordValidator.isDirty && !passwordValidator.isValid)
                       ? `${styles.loginInput} ${styles.inputInvalid}`
                       : `${styles.loginInput}`}
                   value={(passwordValidator.value)}
                   placeholder={"PASSWORD"}
                   onChange={(e) => passwordValidator.onChange(e)}
                   onBlur={(e) => passwordValidator.onBlur(e)}
            />
            <button className={
                `${styles.loginButton} ${loginValidator.isValid && passwordValidator.isValid
                    ? styles.loginButtonEnabled
                    : styles.loginButtonDisabled}`
            }
            disabled={(!loginValidator.isValid || passwordValidator.isValid)}>
                LOGIN
            </button>
        </>
    );
};

AuthForm.propTypes = {

};

export default AuthForm;