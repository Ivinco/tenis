
import React, {useState} from 'react';
import dayjs from 'dayjs';
import styles from './HistoryDisplay.module.css'
import commonStiles from '../MainDisplay/MainDisplay.module.css'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { MobileDateTimePicker } from '@mui/x-date-pickers/MobileDateTimePicker';
import {setModalError} from "../../store/reducers/modalReducer";
import {useDispatch} from "react-redux";
import AlertService from "../../services/AlertService";



function HistoryDisplay() {

    const dispatch = useDispatch();

    const [startDate, setStartDate] = useState(new Date());

    const onClickHander = async (e) => {
        e.preventDefault()
        const datetime = Date.parse(startDate) / 1000
        try {
            const response = await AlertService.getHistoryAlerts(datetime)
            const historyAlerts = response.data.history
            console.log(historyAlerts)
        }
        catch (e) {
            dispatch(setModalError("Oops. Something went wrong. Please, try a bit later"))
        }
    }

    return (
        <div className={commonStiles.mainDisplay}>
            <div className={styles.dateField}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <MobileDateTimePicker defaultValue={dayjs(startDate)} onChange={e => setStartDate(e)} ampm={false}/>
                </LocalizationProvider>
                <button className={styles.submitDateButton} onClick={e => onClickHander(e)}/>
            </div>


        </div>
    );
}

export default HistoryDisplay;