import React from 'react';
import style from './AlertGroup.module.css'
import {useSelector} from "react-redux";
import styles from "../Alert/Alert.module.css";

const AlertGroup = ({group}) => {
    const isInspectMode = useSelector(state => state.setHeaderMenuItemValue.inspectMode)

    return (
        <div className={`${style.groupBody} ${isInspectMode ? null : style.groupBody_small}`}>
        {/*<div className={style.groupBody}>*/}
            <div className={`${isInspectMode ? style.projectName : style.projectName_small}`}>I</div>
            <div className={`${isInspectMode ? style.alertsNumber : style.alertsNumber_small}`}>20</div>
            <div className={`${isInspectMode ? style.groupAttribute : style.groupAttribute_small}`}>Host: repo01</div>
            <div className={`${isInspectMode ? style.groupResponsibleUser : style.groupResponsibleUser_small}`}
                 style={{backgroundImage: `url(${alert.responsibleUser ? process.env.PUBLIC_URL + "/images/stop-sign.svg" : process.env.PUBLIC_URL + "/images/stop-sign.svg"})`}}
            />
            <div className={`${isInspectMode ? style.description : style.description_small}`}> Some group description</div>
        </div>
    );
};

export default AlertGroup;