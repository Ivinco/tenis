import React, {useState} from 'react';
import styles from './FilterMenu.module.css'
import {headerMenuItems} from "../../utils/vars";
import HeaderMenuItem from "../HeaderMenuItem/HeaderMenuItem";
import {useDispatch, useSelector} from "react-redux";
import {setFoundAlerts} from "../../store/reducers/alertReducer";


const FilterMenu = () => {
    const dispatch = useDispatch()
    const isOpened = useSelector(state => state.hiddenMenu.isOpenedFilterMenu)
    const alerts = useSelector(state => state.webSocket.alerts)
    const [searchPhrase, setSearchPhrase] = useState('')
    const projects = useSelector(state => state.authReducer.user.userProjects)
    const menuItems = headerMenuItems.map((item, index) =>
        index === 0 ? { ...item, buttons: projects } : item
    );

    const submitAction = (searchString) => {
        const foundAlerts = []
        alerts.forEach(alert => {
            for (const [key, value] of Object.entries(alert)){
                if (typeof value === 'string'){
                    if (value.toLowerCase().includes(searchString.toLowerCase())) {
                        foundAlerts.push(alert)
                    }
                }
            }
        })
        dispatch(setFoundAlerts(foundAlerts))
    }


    const resetAction = () => {
        dispatch(setFoundAlerts(null))
        setSearchPhrase('')
    }
    return (
        <>
            <div className={`${styles.menuSpace} ${isOpened ? null : styles.menuClosed}`}>

                <ul className={styles.filterMenu}>
                    <li key="searchField" className={styles.menuItem}>
                        <form className={styles.searchForm}>
                            <button id="alertSearchButton" type="submit" className={styles.searchButton}
                                    onClick={e => {
                                        e.preventDefault()
                                        submitAction(searchPhrase)
                                    }}
                            />
                            <input id="alertSearchField" type="search" className={styles.searchField}
                                   placeholder="Search..."
                                   onChange={e => setSearchPhrase(e.target.value)}
                                   onKeyDown={e => {
                                       if (e.key === 'Escape') {
                                           resetAction()
                                       }
                                   }}
                            />
                            <button id="resetSearchButton"
                                    type="reset"
                                    className={`${styles.resetSearchButton} ${searchPhrase ? '' : styles.resetSearchButton_hidden}`}
                                    onClick={e => resetAction()}
                            />
                        </form>
                    </li>
                    {
                        menuItems.map((item, index) =>
                            <li key={index} className={styles.menuItem}>
                                <HeaderMenuItem item={item}/>
                            </li>
                        )

                    }

                </ul>
            </div>

        </>
);
};

export default FilterMenu;