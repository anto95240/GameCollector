import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
    const [isDark, setIsDark] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("dark")) || false;
        } catch {
            return false;
        }
    });

    useEffect(() => {
        document.body.setAttribute("data-theme", isDark ? "dark" : "light");
        localStorage.setItem("dark", JSON.stringify(isDark));
    }, [isDark]);

    const toggleTheme = () => setIsDark(prev => !prev);

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme doit être utilisé à l'intérieur d'un ThemeProvider");
    }
    return context;
};
