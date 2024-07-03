import styles from './Modal.module.css'
import {useDispatch, useSelector} from "react-redux";
import {closeModal, setModalError} from "../../store/reducers/modalReducer";
import {useEffect, useState} from "react";
import ReactDOM from 'react-dom'
import AuthForm from "../AuthForm/AuthForm";
import UserInfo from "../UserInfo/UserInfo";
import ErrorMessage from "../ErrorMessage/ErrorMessage";
import AlertsDetails from "../AlertsDetails/AlertsDetails";
import {setDetailedAlert} from "../../store/reducers/alertReducer";
import SilenceWindow from "../SilenceWindow/SilenceWindow";
import { useSearchParams } from "react-router-dom";
import AlertService from "../../services/AlertService";


const Modal = (content) => {
    const portalElement = document.getElementById("portal")
    const [searchParams, setSearchParams] = useSearchParams();
    const dispatch = useDispatch()
    const isOpenedModal = useSelector(state => state.switchModal.isOpened)
    const modalMessage = useSelector(state => state.switchModal.customMessage)
    const portalParam = searchParams.get("portal")
    const alertParam = searchParams.get("alert_id")
    const [alertDetails, setAlertDetails] = useState({})
    const [alertHistory, setAlertHistory] = useState([])

    useEffect(() => {
       if (alertParam) {
           const params = {
               alert_id: alertParam,
           }
           const fetchAlert = async () => {
               try {
                   const response = await AlertService.getAlert(params)
                   if (response.status === 200) {
                       setAlertDetails (response.data.details)
                       setAlertHistory (response.data.history.map(item => ["STATUS", ...item]))
                   } else if(response.status === 404) {
                       dispatch(setModalError("Alert not find"))
                       console.log(response.status)
                   } else {
                       dispatch(setModalError("Oops. Something went wrong. Please, try again"))
                       console.log(response.status)
                   }


               } catch (e) {
                   console.log(`Error: ${e}`)
                   dispatch(setModalError(e))
               }
           }
           fetchAlert()
       }
    }, [alertParam])

    useEffect(() => {
        if(portalParam === 'login') {
            searchParams.delete("alert_id")
            setSearchParams(searchParams)
        }

    }, [portalParam])

    const onClose = () => {
        dispatch(closeModal())
        dispatch(setModalError(""))
        dispatch(setDetailedAlert({}))
        searchParams.delete("alert_id")
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
                    {modalMessage && <ErrorMessage message={modalMessage}/> }
                    {portalParam === 'login' && <AuthForm/>}
                    {alertParam && alertDetails._id && <AlertsDetails details={alertDetails} history={alertHistory}/>}
                    {portalParam === 'userInfo' && <UserInfo/>}
                    {portalParam === 'silenceRules' && <SilenceWindow/>}
                </div>
            </div>
    ), portalElement)
}

export default Modal;