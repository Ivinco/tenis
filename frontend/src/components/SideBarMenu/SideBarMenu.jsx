import React from 'react';
import styles from './SideBarMenu.module.css'
import {useDispatch, useSelector} from "react-redux";
import {switchActiveSideBarMenuItem} from "../../store/reducers/hiddenMenuReducer";

const SideBarMenu = ({header, items}) => {
    const dispatch = useDispatch()
    const isOpenedSideBar = useSelector(state => state.hiddenMenu.isOpenedSideBar)
    const activeMenuItem = useSelector(state => state.switchSideBarMenuItem.activeMenuItem)

    const onClickItem = (item) => {
        dispatch(switchActiveSideBarMenuItem(item))
    }
    return (
        <div className={isOpenedSideBar ? `${styles.menu}` : `${styles.menu} ${styles.menu_closed}`}>
            <div className={styles.menuHeader}> {header}</div>
            <ul className={styles.menuList}>
                {
                    items.map( (item, index) =>
                        <li key={index} className={styles.menuItem}>
                            <button className={activeMenuItem === item.value ? `${styles.menuButton} ${styles.menuButtonActive}` : `${styles.menuButton}`} onClick={e => {
                                e.preventDefault()
                                onClickItem(item.value)
                                console.log(`Selected mode: ${item.value}`)
                            }}> {item.value}</button>
                        </li>
                    )
                }
            </ul>
        </div>
    );
};

export default SideBarMenu;