import styles from './MainPage.module.css'
import Header from "../Header/Header";

function MainPage(){
    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <Header />
            </header>
        </div>
    )
}

export default MainPage;

