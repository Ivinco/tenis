import styles from './MainPage.module.css'
import Header from "../Header/Header";
import SideBarMenu from "../SideBarMenu/SideBarMenu";
import {useDispatch, useSelector} from "react-redux";
import {switchSideBarState} from "../../store/reducers/hiddenMenuReducer";
import {sideBarMenuItems} from "../../utils/vars";
import {switchActiveHeaderMenuItem} from "../../store/reducers/headerMenuReducer";
import MainDisplay from "../MainDisplay/MainDisplay";
import Modal from "../Modal/Modal";
import {useEffect} from "react";
import {openModal} from "../../store/reducers/modalReducer";
import usePortalParam from "../../hooks/usePortalParam";
import {useSearchParams} from "react-router-dom";
import {STATS_DISPLAY} from "../../store/actions/DISPLAY_ACTIONS";
import StatPage from "../StatPage/StatPage";


function MainPage(){

    const dispatch = useDispatch()
    const isOpenedSideBar = useSelector(state => state.hiddenMenu.isOpenedSideBar)
    const modalContent = useSelector(state => state.switchModal.content)
    const isLoggedIn = useSelector(state => state.authReducer.isLogged)
    const [searchParams, setSearchParams] = useSearchParams();
    const setPortalParams = usePortalParam()
    const alertParam = searchParams.get("alert_id")
    const displayMode = useSelector(state => state.setDisplay.display)


    const onSideBarClick = () => {
        dispatch(switchSideBarState())
    }
    const closeHeaderMenu = () => {
        dispatch(switchActiveHeaderMenuItem(null))
    }

    useEffect(() => {
        if (!isLoggedIn){
            dispatch(openModal())
            setPortalParams("login");
        }
        else {
            setPortalParams()
            if(alertParam){
                dispatch(openModal())
            }
        }
    }, [dispatch, isLoggedIn, alertParam]);

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <Header />
            </header>
            <div className={styles.mainWindow} onClick={closeHeaderMenu}>
                <SideBarMenu header={'Mode'} items={sideBarMenuItems}/>
                <div className={styles.sideBar}>
                    <button className={isOpenedSideBar ? `${styles.menuArrow} ${styles.menuArrowOpened}` : `${styles.menuArrow} ${styles.menuArrowClosed}`}
                            disabled={!isLoggedIn}
                            onClick={e => {
                            e.preventDefault()
                            onSideBarClick()
                        }}
                    ></button>
                </div>
                {
                    isLoggedIn ? displayMode === STATS_DISPLAY ? <StatPage/> : <MainDisplay/> : null
                }

            </div>
            <Modal content={modalContent}/>
        </div>
    )
}

export default MainPage;

