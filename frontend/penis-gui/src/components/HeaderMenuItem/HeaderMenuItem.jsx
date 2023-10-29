import React from 'react';
import styles from './HeaderMenuItem.module.css'
import {useDispatch, useSelector} from "react-redux";
import {switchActiveHeaderMenuItem} from "../../store/reducers/headerMenuReducer";

function HeaderMenuItem({item}, key) {
    const dispatch = useDispatch()
    const activeHeaderMenuItem = useSelector(state => state.switchHeaderMenuItem.activeHeaderMenuItem)
    const activeHeaderMenuSubItem = useSelector(state => state.setHeaderMenuItemValue)

    const itemOnClickHandler = (itemName) => {
        if (activeHeaderMenuItem === item.name){
            dispatch(switchActiveHeaderMenuItem(null))
        }
        else {
            dispatch(switchActiveHeaderMenuItem(itemName))
        }
    }

    const subItemOnClickHandler = (action, subItemName) => {
        dispatch(action(subItemName))
        dispatch(switchActiveHeaderMenuItem(null))
        console.log(`Selected ${subItemName} menu option`)
    }

    return (
        <li key={key} className={styles.menuItem}>
            <button className={activeHeaderMenuItem === item.name ? `${styles.menuHeader} ${styles.menuHeader_active}`: styles.menuHeader} onClick={() => itemOnClickHandler(item.name)}>
                {`${item.name}: ${activeHeaderMenuSubItem[item.name.toLowerCase()]}`}
            </button>
            <div className={activeHeaderMenuItem === item.name ? `${styles.itemBody} ${styles.itemBody_active}` : styles.itemBody}>
            {
                item.buttons.map((button, index) =>
                    <button key={index} onClick={(e) => {
                        e.preventDefault()
                        subItemOnClickHandler(item.action,button)
                    }} className={styles.itemButton}>{button}</button>
                )
            }
            </div>
        </li>
    );
}

export default HeaderMenuItem;