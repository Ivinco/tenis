import ReactLoading from 'react-loading'
import styles from './LoadingWindow.module.css'

export default function LoadingWindow(){
    return(
        <div className={styles.overlay}>
            <ReactLoading color={'#01A2D8'} type={"spin"} height={200} width={100}/>
        </div>

    )
}