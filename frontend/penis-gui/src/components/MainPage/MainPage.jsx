import styles from './MainPage.module.css'
import Header from "../Header/Header";
import SideBarMenu from "../SideBarMenu/SideBarMenu";
import {useDispatch, useSelector} from "react-redux";
import {switchSideBarState} from "../../store/reducers/sideBarReducer";


function MainPage(){
    const menuItems = [{value: 'Normal', href: '#'}, {value: 'History', href: '#'}, {value: 'Stats', href: '#'}]
    const dispatch = useDispatch()
    const isOpenedSideBar = useSelector(state => state.switchSideBar.isOpenedSideBar)

    const onSideBarClick = () => {
        dispatch(switchSideBarState())
    }



    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <Header />
            </header>
            <div>

            </div>
            <div className={styles.mainWindow}>
                <SideBarMenu header={'Mode'} items={menuItems}/>
                <div className={styles.sideBar}>
                    <button className={isOpenedSideBar ? `${styles.menuErrow} ${styles.menuErrowOpened}` : `${styles.menuErrow} ${styles.menuErrowClosed}`}
                    onClick={e => {
                        e.preventDefault()
                        onSideBarClick()
                    }}
                    ></button>
                </div>

            </div>
        </div>
    )
}

export default MainPage;

