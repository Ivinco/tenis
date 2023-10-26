import styles from './MainPage.module.css'
import Header from "../Header/Header";
import SideBarMenu from "../SideBarMenu/SideBarMenu";
import {useDispatch, useSelector} from "react-redux";
import {switchSideBarState} from "../../store/reducers/sideBarReducer";
import {sideBarMenuItems} from "../../utils/vars";


function MainPage(){

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
                <SideBarMenu header={'Mode'} items={sideBarMenuItems}/>
                <div className={styles.sideBar}>
                    <button className={isOpenedSideBar ? `${styles.menuArrow} ${styles.menuArrowOpened}` : `${styles.menuArrow} ${styles.menuArrowClosed}`}
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

