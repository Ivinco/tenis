import React from 'react';
import styles from './FilterMenu.module.css'
import {headerMenuItems} from "../../utils/vars";
import HeaderMenuItem from "../HeaderMenuItem/HeaderMenuItem";
import {useSelector} from "react-redux";

const FilterMenu = () => {
    const isOpened = useSelector(state => state.hiddenMenu.isOpenedFilterMenu)
    return (
        <>
            <div className={`${styles.menuSpace} ${isOpened ? null : styles.menuClosed }`}>
                <ul className={styles.filterMenu}>
                    {
                        headerMenuItems.map((item, index) =>

                            <HeaderMenuItem item={item} key={index}/>
                        )
                    }


                </ul>
            </div>

        </>
    );
};

export default FilterMenu;