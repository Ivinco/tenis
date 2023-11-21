import {BrowserRouter, Navigate, Route, Routes} from "react-router-dom";
import MainPage from "../MainPage/MainPage";
import {useDispatch} from "react-redux";
import {useEffect} from "react";
import {BACKEND_SERVER} from "../../utils/vars";
import UserService from "../../services/UserService";
import {loginAction} from "../../store/reducers/authReducer";
import axios from "axios";
import {sha256} from 'js-sha256'

function App () {
    const dispatch = useDispatch()

    useEffect( () => {
        async function checkAuth () {
            if(localStorage.getItem('token')){
                try {
                    const refresh = await axios.get(`${BACKEND_SERVER}/refresh`, {withCredentials: true})
                    localStorage.setItem('token', refresh.data.access_token)
                    const fetchUser = await UserService.getUser()
                    console.log('Response from whoami endpoint:')
                    console.log(fetchUser)
                    const user = {
                        userName: fetchUser.data.user.name,
                        userId: fetchUser.data.user._id,
                        userEmail: fetchUser.data.user.email,
                        userImage: `https://gravatar.com/avatar/${sha256(fetchUser.data.user.email)}?s=150`
                    }
                    console.log('User DTO:')
                    console.log(user)
                    dispatch(loginAction(user))
                    console.log('user logged in')
                } catch (e) {
                    console.log(`Error while refreshing token: ${e}`)
                }

            }
        }
        checkAuth()
    }, []);


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
