import styles from './Modal.module.css'
import {useDispatch, useSelector} from "react-redux";
import {closeModal} from "../../store/reducers/modalReducer";
import {useEffect} from "react";
import ReactDOM from 'react-dom'
import AuthForm from "../AuthForm/AuthForm";
import UserInfo from "../UserInfo/UserInfo";

const Modal = (content) => {
    const portalElement = document.getElementById("portal")
    const dispatch = useDispatch()
    const isOpenedModal = useSelector(state => state.switchModal.isOpened)
    const modalContent = useSelector(state => state.switchModal.content)

    const onClose = () => {
        dispatch(closeModal())
    }
    const closeByEsc = (e) => {
        if (e.key === 'Escape') {
            onClose()
        }
    }
    useEffect(() => {
        document.addEventListener("keydown", closeByEsc)
        return () => {
            document.removeEventListener("keydown", closeByEsc)
        }
    });

    if (!isOpenedModal){
        return null
    }
    if (!portalElement){
        return null
    }
    return ReactDOM.createPortal((
            <div className={styles.overlay}>
                <div className={styles.modal}>
                    <button className={styles.closeButton}
                    onClick={(e) => onClose()}
                    />
                    { modalContent === "LOGIN" ? <AuthForm/> : <UserInfo/>}
                </div>
            </div>
    ), portalElement)
}

export default Modal;