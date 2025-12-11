import { Outlet } from "react-router";
import axios from "axios"
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";

import Navbar from "../Navbar";
import "./AppLayout.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowUp
} 
from "@fortawesome/free-solid-svg-icons";

const AppLayout = () => {
  
  const { t } = useTranslation();
//   const API_URL = import.meta.env.VITE_API_URL;  
//   const [user, setUser] = useState(null);
//   const [account, setAccount] = useState(null);
//   const [transactions, setTransactions] = useState([]);
//   const [categories, setCategories] = useState([]);
  const [showScrollToTopButton, setShowScrollToTopButton] = useState(false);

// // //   useEffect(() => {
// // //     const fetchData = async () => {
      
// // //     try {
// // //       const userRes = await axios.get(`${API_URL}/api/user/me`);
// // //       setUser(userRes.data);
// // //     } catch (error) {
// // //       console.error("Erreur user:", error);
// // //     }

// // //     let currentAccount = null;
// // //     try {
// // //       const accountRes = await axios.get(`${API_URL}/api/account/me`);
// // //       currentAccount = Array.isArray(accountRes.data)
// // //         ? accountRes.data[0]
// // //         : accountRes.data;
// // //       setAccount(currentAccount);
// // //     } catch (error) {
// // //       console.error("Erreur compte:", error);
// // //     }
    
// // //     try {
// // //       if (currentAccount?._id) {
// // //         const transactionRes = await axios.get(`${API_URL}/api/transaction/account/${currentAccount._id}`);
// // //         setTransactions(Array.isArray(transactionRes.data) ? transactionRes.data : []);
// // //       } else {
// // //         setTransactions([]);
// // //       }
// // //     } catch (error) {
// // //       console.error("Erreur transactions:", error);
// // //     }
        
// //     try {
// //       const categoryRes = await axios.get(`${API_URL}/api/category/visible`);
// //       setCategories(categoryRes.data);
// //     } catch (error) {
// //       console.error("Erreur catégories:", error);
// //     }
// //   };

//     fetchData();
//   }, []);

  const handleScroll = useCallback(() => {
    setShowScrollToTopButton(window.scrollY > 50);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [ handleScroll]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app-container">
      <main className="main-content">
        <Navbar />
        <Outlet context={{ t }} />
      </main>
      <div>
        
        {showScrollToTopButton && (
          <button 
            className="return-top" 
            onClick={scrollToTop}   
            aria-label="Retour en haut"
          >
            <FontAwesomeIcon icon={faArrowUp} />
          </button>
        )}
      </div>
    </div>
  );
};

export default AppLayout;
