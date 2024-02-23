
import React, {useState} from 'react';
import dayjs from 'dayjs';
import styles from './HistoryDisplay.module.css'
import commonStiles from '../MainDisplay/MainDisplay.module.css'
import "react-datepicker/dist/react-datepicker.css";
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { MobileDateTimePicker } from '@mui/x-date-pickers/MobileDateTimePicker';


function HistoryDisplay(props) {

    const [startDate, setStartDate] = useState(new Date());

    const onClickHander = (e) => {
        e.preventDefault()
        console.log(`Find Alerts for this date: ${startDate}`)
    }

    return (
        <div className={commonStiles.mainDisplay}>
            <div className={styles.dateField}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <MobileDateTimePicker defaultValue={dayjs(startDate)} onChange={e => setStartDate(e)}/>
                </LocalizationProvider>
                <button className={styles.submitDateButton} onClick={e => onClickHander(e)}/>
            </div>


        </div>
    );
}

export default HistoryDisplay;