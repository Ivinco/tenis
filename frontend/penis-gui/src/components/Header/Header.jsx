import styles from './Header.module.css'
import HeaderMenuItem from "../HeaderMenuItem/HeaderMenuItem";
import {headerMenuItems} from "../../utils/vars";

const Header = () => {
    const testItem = headerMenuItems[0]

    return (
        <>
            <div className={styles.logo}></div>
            <ul className={styles.headerMenu}>
                {
                    headerMenuItems.map((item, index) =>
                        <HeaderMenuItem item={item} key={index}/>
                    )
                }


            </ul>
            <div className={`${styles.avatar} ${styles.avatar_unknown}`}></div>
        </>
    )
}

export default Header;