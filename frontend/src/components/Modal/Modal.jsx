import styles from './Modal.module.css'
import {useDispatch, useSelector} from "react-redux";
import {closeModal} from "../../store/reducers/modalReducer";
import {useEffect} from "react";
import ReactDOM from 'react-dom'
import AuthForm from "../AuthForm/AuthForm";
import UserInfo from "../UserInfo/UserInfo";
import ErrorMessage from "../ErrorMessage/ErrorMessage";
import {ALERT_DETAILS, LOGIN_MODAL, PROFILE_MODAL, SILENCE_MODAL} from "../../store/actions/MODAL_ACTIONS";
import AlertsDetails from "../AlertsDetails/AlertsDetails";
import {setDetailedAlert} from "../../store/reducers/alertReducer";
import SilenceWindow from "../SilenceWindow/SilenceWindow";
import { useSearchParams } from "react-router-dom";

const Modal = (content) => {
    const portalElement = document.getElementById("portal")
    const [searchParams, setSearchParams] = useSearchParams();
    const dispatch = useDispatch()
    const isOpenedModal = useSelector(state => state.switchModal.isOpened)
    const modalContent = useSelector(state => state.switchModal.content)
    const modalMessage = useSelector(state => state.switchModal.customMessage)
    const portalParam = searchParams.get("portal")
    const alertParam = searchParams.get("alert")

    const onClose = () => {
        dispatch(closeModal())
        dispatch(setDetailedAlert({}))
        searchParams.delete("alert")
        searchParams.delete("portal")
        setSearchParams(searchParams)

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
                    {/*{ modalContent === LOGIN_MODAL ? <AuthForm/> : modalContent === PROFILE_MODAL ? <UserInfo/> :  modalContent === SILENCE_MODAL ? <SilenceWindow/> : <ErrorMessage message={modalMessage}/> }*/}
                    {(modalContent === LOGIN_MODAL || portalParam === 'login') && <AuthForm/>}
                    {alertParam && <AlertsDetails/>}
                    {portalParam === 'userInfo' && <UserInfo/>}
                    {portalParam === 'silenceRules' && <SilenceWindow/>}
                </div>
            </div>
    ), portalElement)
}

export default Modal;