import React, {useState} from 'react';
import styles from './HeaderMenuItem.module.css'

function HeaderMenuItem({item}, key) {
    const [openItem, setOpenItem] = useState(null)
    const onClickHandler = (menuItem) => {
        if (menuItem === openItem){setOpenItem(null)}
        else setOpenItem(menuItem)
    }
    return (
        <li key={key} className={styles.menuItem}>
            <button className={styles.menuHeader} onClick={() => onClickHandler(key)}>{item.name}: {item.buttons[0].name}</button>
            <div className={openItem === key ? `${styles.itemBody} ${styles.itemBody_active}`: styles.itemBody}>
            {
                item.buttons.map((button, index) =>
                    <button key={index} onClick={button.onClickFunction} className={styles.itemButton}>{button.name}</button>
                )
            }
            </div>
        </li>
    );
}

export default HeaderMenuItem;