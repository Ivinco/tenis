import React, {useEffect, useState} from 'react';
import styles from './FilterMenu.module.css'
import commonStyles from '../../styles/common.module.css'
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
    const activeProject = useSelector(state => state.setHeaderMenuItemValue.project)
    const grouping = useSelector(state => state.setHeaderMenuItemValue.grouping)
    const inspectMode = useSelector(state => state.setHeaderMenuItemValue.inspectMode)
    const [ifSavedSettings, setIfSavedSettings] = useState(false)

    useEffect(() => {
        const savedPreferences = JSON.parse(localStorage.getItem("userPreferences"));
        if (savedPreferences && savedPreferences.isSavedSettings) {
            setIfSavedSettings(true);
        }
    }, []);

    const menuItems = headerMenuItems.map((item, index) =>
        index === 0 ? { ...item, buttons: projects } : item
    );


    const preferences = {
        inspectMode: inspectMode,
        grouping: grouping,
        project: activeProject,
        isSavedSettings: ifSavedSettings
    }

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

    const handleSaveSettingsCheckbox = (event ) => {
        const newChecked = !ifSavedSettings
        setIfSavedSettings(newChecked)

        if (newChecked) {
            const newPreferences = {
                ...preferences,
                isSavedSettings: newChecked
            };
            localStorage.setItem('userPreferences',JSON.stringify(newPreferences))
        } else {
            localStorage.removeItem('userPreferences')
        }
    }


    return (
        <>
            <div className={`${styles.menuSpace} ${isOpened ? null : styles.menuClosed}`}>

                <ul className={styles.filterMenu}>
                    {
                        menuItems.map((item, index) =>
                            <li key={index} className={styles.menuItem}>
                                <HeaderMenuItem item={item}/>
                            </li>
                        )

                    }
                </ul>
                <label className={styles.settingsTumbler}>
                    <input type="checkbox" className={styles.settingsSaver}
                           data-tooltip="save preferences"
                           checked={ifSavedSettings}
                           onChange={e => handleSaveSettingsCheckbox(e)}
                    />
                    <span className={`${styles.settingsSlider} ${commonStyles.buttonHint}`}
                          data-tooltip="save preferences"/>
                </label>
            </div>

        </>
    );
};

export default FilterMenu;