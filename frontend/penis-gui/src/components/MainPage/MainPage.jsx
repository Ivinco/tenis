import styles from './MainPage.module.css'
import Header from "../Header/Header";
import SideBarMenu from "../SideBarMenu/SideBarMenu";
import {useDispatch, useSelector} from "react-redux";
import {switchSideBarState} from "../../store/reducers/sideBarReducer";
import {sideBarMenuItems} from "../../utils/vars";
import {switchActiveHeaderMenuItem} from "../../store/reducers/headerMenuReducer";
import {useConnectSocket} from "../../hooks/useConnectSocket";
import Alert from "../Alert/Alert";


function MainPage(){

    const dispatch = useDispatch()
    const isOpenedSideBar = useSelector(state => state.switchSideBar.isOpenedSideBar)
    const isActiveSocket = useSelector(state => state.webSocket.isOpened)

    const onSideBarClick = () => {
        dispatch(switchSideBarState())
    }
    const closeHeaderMenu = () => {
        dispatch(switchActiveHeaderMenuItem(null))
    }

    const rawAlerts = useConnectSocket()
    console.log(rawAlerts)

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <Header />
            </header>
            <div>

            </div>
            <div className={styles.mainWindow} onClick={closeHeaderMenu}>
                <SideBarMenu header={'Mode'} items={sideBarMenuItems}/>
                <div className={styles.sideBar}>
                    <button className={isOpenedSideBar ? `${styles.menuArrow} ${styles.menuArrowOpened}` : `${styles.menuArrow} ${styles.menuArrowClosed}`}
                    onClick={e => {
                        e.preventDefault()
                        onSideBarClick()
                    }}
                    ></button>
                </div>
                <div className={styles.mainDisplay}>
                    {
                        rawAlerts.map((alert) => (
                            <Alert alert={alert} key={alert.id}></Alert>
                        ))
                    }
                </div>
            </div>
        </div>
    )
}

export default MainPage;

