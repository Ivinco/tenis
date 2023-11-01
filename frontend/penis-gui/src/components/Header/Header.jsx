import styles from './Header.module.css'
import HeaderMenuItem from "../HeaderMenuItem/HeaderMenuItem";
import {headerMenuItems} from "../../utils/vars";

const Header = () => {
    return (
        <>
            <div className={styles.logo}></div>
            <button className={styles.headerButton}> Refresh</button>
            <ul className={styles.headerMenu}>
                {
                    headerMenuItems.map((item, index) =>

                        <HeaderMenuItem item={item} key={index}/>
                    )
                }


            </ul>
            <button className={`${styles.headerButton} ${styles.scheduleButton}`}> Schedule DT</button>
            <div className={`${styles.avatar} ${styles.avatar_unknown}`}></div>
        </>
    )
}

export default Header;