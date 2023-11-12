import {BrowserRouter, Navigate, Route, Routes} from "react-router-dom";
import MainPage from "../MainPage/MainPage";

function App () {
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
