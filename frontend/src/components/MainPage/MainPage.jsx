import styles from './MainPage.module.css'
import Header from "../Header/Header";
import SideBarMenu from "../SideBarMenu/SideBarMenu";
import {useDispatch, useSelector} from "react-redux";
import {switchSideBarState} from "../../store/reducers/sideBarReducer";
import {sideBarMenuItems} from "../../utils/vars";
import {switchActiveHeaderMenuItem} from "../../store/reducers/headerMenuReducer";
import MainDisplay from "../MainDisplay/MainDisplay";
import Modal from "../Modal/Modal";
import {useEffect} from "react";
import {openModal, switchLoginModal} from "../../store/reducers/modalReducer";


function MainPage(){

    const dispatch = useDispatch()
    const isOpenedSideBar = useSelector(state => state.switchSideBar.isOpenedSideBar)
    const isOpenedModal = useSelector(state => state.switchModal.isOpened)
    const modalContent = useSelector(state => state.switchModal.content)
    const isLoggedIn = useSelector(state => state.authReducer.isLogged)


    const onSideBarClick = () => {
        dispatch(switchSideBarState())
    }
    const closeHeaderMenu = () => {
        dispatch(switchActiveHeaderMenuItem(null))
    }

    useEffect(() => {
        if (!isLoggedIn){
            dispatch(switchLoginModal())
        }
    }, []);

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
                    isLoggedIn ? <MainDisplay/> : (isOpenedModal ? <></> : <div className={styles.noLoginMainDisplay}/>)
                }

            </div>
            <Modal content={modalContent}/>
        </div>
    )
}

export default MainPage;

