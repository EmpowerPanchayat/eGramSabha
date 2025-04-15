// File: frontend/src/utils/LanguageContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import translations from './translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState('en');
    const [strings, setStrings] = useState(translations.en);

    // Load language preference from local storage when component mounts
    useEffect(() => {
        const savedLanguage = localStorage.getItem('language') || 'en';
        setLanguage(savedLanguage);
        setStrings(translations[savedLanguage] || translations.en);
    }, []);

    // Change language function
    const changeLanguage = (lang) => {
        if (translations[lang]) {
            setLanguage(lang);
            setStrings(translations[lang]);
            localStorage.setItem('language', lang);
        } else {
            console.error(`Language ${lang} not supported`);
        }
    };

    return (
        <LanguageContext.Provider value={{ language, strings, changeLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
};

// Custom hook to use language context
export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};