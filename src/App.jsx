// App.jsx
import {
  RouterProvider,
} from "react-router";

import './config/i18n'
import router from "./config/router";
// import './config/interceptor'

function App() {

  return (
    <div id="app-container" className="app-container">
      <RouterProvider router={router} />
    </div>
      
  )
}

export default App
