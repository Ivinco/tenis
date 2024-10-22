import React, {useEffect, useState} from 'react';
import styles from './StatPage.module.css';
import UserService from "../../services/UserService";
import {setModalError} from "../../store/reducers/modalReducer";
import {useDispatch} from "react-redux";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import {MobileDateTimePicker} from "@mui/x-date-pickers/MobileDateTimePicker";
import dayjs from "dayjs";
import {LocalizationProvider} from "@mui/x-date-pickers/LocalizationProvider";
import {startOfWeek, startOfDay, startOfMonth, startOfYear, endOfDay, endOfWeek, endOfMonth, subWeeks} from 'date-fns'
import StatService from "../../services/StatService";
import ReactLoading from "react-loading";

function StatPage() {
    const dispatch = useDispatch();
    const [users, setUsers] = useState(['All'])
    const [selectedUser, setSelectedUser] = useState('All');
    const [timeRange, setTimeRange] = useState(["Last 24h", "Today", "Yesterday", "This week", "Last week", "This month", "Last month", "This year"]);
    const [selectedTimeRange, setSelectedTimeRange] = useState("Last 24h");
    const [statsStart, setStatsStart] = useState(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const [statsEnd, setStatsEnd] = useState(new Date(Date.now()));
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const processTimeRange = () => {
        switch (selectedTimeRange) {
            case "Last 24h":
                setStatsStart(new Date(Date.now() - 24 * 60 * 60 * 1000));
                setStatsEnd(new Date(Date.now()));
                break;
            case "Today":
                setStatsStart(startOfDay(new Date(Date.now())));
                setStatsEnd(new Date(Date.now()));
                break
            case "Yesterday":
                    setStatsStart(startOfDay(new Date(Date.now() - 24 * 60 * 60 * 1000)));
                    setStatsEnd(endOfDay(new Date( Date.now() - 24 * 60 * 60 * 1000)));
                    break
            case "This week":
                setStatsStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
                setStatsEnd(new Date(Date.now()));
                break
            case "Last week":
                const lastWeek = subWeeks(new Date(), 1)
                setStatsStart(startOfWeek(lastWeek, { weekStartsOn: 1 }));
                setStatsEnd(endOfWeek(lastWeek, { weekStartsOn: 1 }));
                break
            case "This month":
                setStatsStart(startOfMonth(new Date()))
                setStatsEnd(new Date(Date.now()));
                break
            case "Last month":
                const lastMonth = new Date()
                lastMonth.setMonth(lastMonth.getMonth() - 1)
                setStatsStart(startOfMonth(lastMonth));
                setStatsEnd(endOfMonth(lastMonth));
                break
            case "This year":
                setStatsStart(startOfYear(new Date()))
                setStatsEnd(new Date(Date.now()));
                break
            default:
                setStatsStart(new Date(Date.now() - 24 * 60 * 60 * 1000))
                setStatsEnd(new Date(Date.now()))
        }
    }

    useEffect(() => {
        setUsers(['All'])
        const fetchUsers = async () => {
            try {
                const response = await UserService.getUsers();
                if (response.data) {
                    setUsers( prevUser => [...prevUser, ...response.data.map(user => user.name)])
                    }
                }
            catch (error) {
                dispatch(setModalError("Oops. Something went wrong. Please, try again"))
            }
        }
        fetchUsers();
    }, []);

    useEffect(() => {
        processTimeRange()
    }, [selectedTimeRange]);

    const formatDate = (date) => {
        return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
    }

    const getReport = async () => {
        try {
            const startTimestamp = Math.floor(statsStart.getTime() / 1000);
            const endTimestamp = Math.floor(statsEnd.getTime() / 1000);
            const userParam = selectedUser !== 'All' ? selectedUser : undefined;
            setIsLoading(true);
            const response = await StatService.getStats(userParam, startTimestamp, endTimestamp);
            setReportData(response.data);
        } catch (e) {
            dispatch(setModalError("Failed to fetch the report"));
            setIsLoading(false);
        }
        setIsLoading(false);
    }

    return (
        <>
        <div className={styles.mainPage}>
            <div className={styles.controlBar}>
                <div className={`${styles.buttonBlock} ${styles.userBlock}`}>
                    <button className={styles.button}> User: {selectedUser}</button>
                    <ul className={`${styles.dropdownBlock} ${styles.userDropdownBlock}`}>
                        {users.map(user => (
                            <li className={styles.dropdownItem} onClick={() => setSelectedUser(user)}> {user}</li>
                        ))}
                    </ul>
                </div>
                <div className={`${styles.buttonBlock} ${styles.timeRangeBlock}`}>
                    <button className={styles.button}> {selectedTimeRange}</button>
                    <ul className={`${styles.dropdownBlock} ${styles.timeRangeDropdownBlock}`}>
                        {timeRange.map(range => (
                            <li className={styles.dropdownItem}
                                onClick={() => {setSelectedTimeRange(range)}}> {range}</li>
                        ))}
                    </ul>
                </div>
                <div className={`${styles.buttonBlock} ${styles.dateForm}`}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <MobileDateTimePicker value={dayjs(statsStart)} onChange={(e) => {
                            const changedDate = formatDate(e);
                            setStatsStart(new Date(changedDate))
                        }}
                                              ampm={false}/>
                    </LocalizationProvider>
                </div>
                <div className={`${styles.buttonBlock} ${styles.dateForm}`}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <MobileDateTimePicker value={dayjs(statsEnd)} onChange={(e) => {
                            const changedDate = formatDate(e);
                            setStatsEnd(new Date(changedDate))
                        }}
                                              ampm={false}
                                              inputFormat="YYYY-MM-DD HH:mm"
                        />
                    </LocalizationProvider>
                </div>
                <div className={`${styles.buttonBlock}`}>
                    <button  className={`${styles.button} ${styles.reportButton}`} onClick={(e) => {
                        e.preventDefault();
                        getReport()
                    }}>Get Report</button>
                </div>
            </div>
            {reportData && (
                <div className={styles.reportTitleBlock}>
                    <h1 className={styles.reportTitle}> {`Statistics Report for ${selectedUser} user(s)`} </h1>
                    <h2 className={styles.reportSubTitle}>{ `Period from ${dayjs(statsStart).format("MMM DD YYYY HH:mm")} to ${dayjs(statsEnd).format("MMM DD YYYY HH:mm")}`}</h2>
                </div>

            )}
            {reportData && (
                <div className={styles.reportTable}>
                    <React.Fragment>
                        <div className={styles.tableCell}> Total Number of Alerts</div>
                        <div className={styles.tableCell}>{reportData.total_number_of_alerts}</div>
                    </React.Fragment>
                    <React.Fragment>
                        <div className={styles.tableCell}> Total Alerts Duration </div>
                        <div className={styles.tableCell}>{`${Number(reportData.total_alert_seconds) / 3600} hours`}</div>
                    </React.Fragment>
                    <React.Fragment>
                        <div className={styles.tableCell}> Unhandled Alerts Duration (h)</div>
                        <div className={styles.tableCell}>{`${Number(reportData.total_unhandled_seconds) / 3600} hours`}</div>
                    </React.Fragment>
                    <React.Fragment>
                        <div className={styles.tableCell}> Average Reaction Time</div>
                        <div className={styles.tableCell}>{`${reportData.average_reaction_time} sec`}</div>
                    </React.Fragment>
                </div>
            )}
        </div>
            {
                isLoading
                    ?
                    <div className={styles.loadOverlay}>
                        <ReactLoading color={'#01A2D8'} type={"spin"} height={200} width={100}/>
                    </div>
                    :
                    <></>
            }
        </>

    );
}

export default StatPage;