import styles from './Modal.module.css'
import {useDispatch, useSelector} from "react-redux";
import {closeModal} from "../../store/reducers/modalReducer";
import {useEffect} from "react";
import ReactDOM from 'react-dom'
import AuthForm from "../AuthForm/AuthForm";
import UserInfo from "../UserInfo/UserInfo";
import ErrorMessage from "../ErrorMessage/ErrorMessage";
import {ALERT_DETAILS, LOGIN_MODAL, PROFILE_MODAL} from "../../store/actions/MODAL_ACTIONS";
import AlertsDetails from "../AlertsDetails/AlertsDetails";
import {setDetailedAlert} from "../../store/reducers/alertReducer";

const Modal = (content) => {
    const portalElement = document.getElementById("portal")
    const dispatch = useDispatch()
    const isOpenedModal = useSelector(state => state.switchModal.isOpened)
    const modalContent = useSelector(state => state.switchModal.content)
    const modalMessage = useSelector(state => state.switchModal.customMessage)

    const onClose = () => {
        dispatch(closeModal())
        dispatch(setDetailedAlert({}))
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
                    { modalContent === LOGIN_MODAL ? <AuthForm/> : modalContent === PROFILE_MODAL ? <UserInfo/> :  modalContent === ALERT_DETAILS ? <AlertsDetails/> : <ErrorMessage message={modalMessage}/>}
                </div>
            </div>
    ), portalElement)
}

export default Modal;