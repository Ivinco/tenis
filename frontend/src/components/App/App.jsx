import {BrowserRouter, Navigate, Route, Routes} from "react-router-dom";
import MainPage from "../MainPage/MainPage";
import {useDispatch, useSelector} from "react-redux";
import {useEffect} from "react";
import {BACKEND_SERVER} from "../../utils/vars";
import UserService from "../../services/UserService";
import {loginAction} from "../../store/reducers/authReducer";
import axios from "axios";
import {closeModal} from "../../store/reducers/modalReducer";
import {startLoadAction, stopLoadAction} from "../../store/reducers/loadingReducer";
import LoadingWindow from "../LoadingWindow/LoadingWindow";
import {prepareUser} from "../../utils/utils";

function App () {
    const dispatch = useDispatch()
    const isLoading = useSelector(state => state.switchLoadingWindow.isLoading)
    const totalAlerts = useSelector(state => state.setAlertReducer.totalAlertsNumber)

    useEffect( () => {
        async function checkAuth () {
            if(localStorage.getItem('token')){
                dispatch(startLoadAction())
                try {
                    const refresh = await axios.get(`${BACKEND_SERVER}/refresh`, {withCredentials: true})
                    localStorage.setItem('token', refresh.data.access_token)
                    const fetchUser = await UserService.getUser()
                    const user = prepareUser(fetchUser.data)
                    dispatch(loginAction(user))
                    dispatch(closeModal())
                } catch (e) {
                    console.log(`Error while refreshing token: ${e}`)
                } finally {
                    dispatch(stopLoadAction())
                }

            }
        }
        checkAuth()
    },[dispatch]);

    useEffect(() => {
        document.title = `${totalAlerts} alerts fired`;


            const favicon = document.getElementById('favicon');
            const faviconSize = 22;

            const canvas = document.createElement('canvas');
            canvas.width = faviconSize;
            canvas.height = faviconSize;

            const context = canvas.getContext('2d');
            const img = document.createElement('img');
            img.src = favicon.href;

            img.onload = () => {
                context.drawImage(img, 0, 0, faviconSize, faviconSize);

                context.beginPath();
                context.arc(canvas.width - faviconSize / 3, faviconSize / 3, faviconSize / 3, 0, 2 * Math.PI);
                context.fillStyle = '#FF0000';
                context.fill();

                context.font = '14px "helvetica", sans-serif';
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillStyle = '#FFFFFF';

                context.fillText(`${totalAlerts}`, canvas.width - faviconSize / 3, faviconSize / 3);

                favicon.href = canvas.toDataURL('image/png');
            };
    }, [totalAlerts]);

  if(isLoading){
      return <LoadingWindow/>
  }

  return (
      <BrowserRouter>
        <Routes>
          <Route path='/main' element={<MainPage />}/>
          <Route path='*' element={<Navigate replace to='/main' />} />
        </Routes>

      </BrowserRouter>
  )
}

export default App;
