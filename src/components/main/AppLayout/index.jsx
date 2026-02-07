import { Outlet } from "react-router";
import axios from "axios"
import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";

import Navbar from "../Navbar";
import BottomNav from "../../secondary/Navbar/BottomNav";
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
  const scrollContainerRef = useRef(null);

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
    if (scrollContainerRef.current) {
        setShowScrollToTopButton(scrollContainerRef.current.scrollTop > 50);
    }
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
    }
    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      }
    };
  }, [handleScroll]);

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="layout-container" ref={scrollContainerRef}>
      <main className="main-content">
        <Navbar />
        <Outlet context={{ t }} />
      </main>

      <BottomNav t={t} />

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
