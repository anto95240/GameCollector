import {
  RouterProvider,
} from "react-router";

import './config/i18n'
import router from "./config/router";
// import './config/interceptor'

function App() {

  return (
      <RouterProvider router={router} />
  )
}

export default App
