import styles from './Header.module.css'

const Header = () => {

    return (
        <>
            <div className={styles.logo}></div>
            <div className={`${styles.avatar} ${styles.avatar_unknown}`}></div>
        </>
    )
}

export default Header;