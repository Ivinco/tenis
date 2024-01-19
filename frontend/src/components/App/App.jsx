import {BrowserRouter, Navigate, Route, Routes} from "react-router-dom";
import MainPage from "../MainPage/MainPage";
import {useDispatch, useSelector} from "react-redux";
import {useEffect} from "react";
import {BACKEND_SERVER} from "../../utils/vars";
import UserService from "../../services/UserService";
import {loginAction} from "../../store/reducers/authReducer";
import axios from "axios";
import {sha256} from 'js-sha256'
import {closeModal} from "../../store/reducers/modalReducer";
import {startLoadAction, stopLoadAction} from "../../store/reducers/loadingReducer";
import LoadingWindow from "../LoadingWindow/LoadingWindow";

function App () {
    const dispatch = useDispatch()
    const isLoading = useSelector(state => state.switchLoadingWindow.isLoading)

    useEffect( () => {
        async function checkAuth () {
            if(localStorage.getItem('token')){
                dispatch(startLoadAction())
                try {
                    const refresh = await axios.get(`${BACKEND_SERVER}/refresh`, {withCredentials: true})
                    localStorage.setItem('token', refresh.data.access_token)
                    const fetchUser = await UserService.getUser()
                    const raw_user = {
                        userName: fetchUser.data.user.name,
                        userId: fetchUser.data.user._id,
                        userEmail: fetchUser.data.user.email,
                        userImage: `https://gravatar.com/avatar/${sha256(fetchUser.data.user.email)}?s=150`,
                        usersCommentReplaceRules: fetchUser.data.user.commentReplaceRules,
                        userProjects: fetchUser.data.user.userProjects
                    }
                    const user = {...raw_user, userProjects: ['All', ...raw_user.userProjects]}
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
