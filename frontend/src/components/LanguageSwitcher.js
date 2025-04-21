// File: frontend/src/components/LanguageSwitcher.js
import React from 'react';
import { Button, Box, useTheme, useMediaQuery, Tooltip } from '@mui/material';
import { useLanguage } from '../utils/LanguageContext';
import LanguageIcon from '@mui/icons-material/Language';

const LanguageSwitcher = ({ sx = {} }) => {
    const { language, changeLanguage } = useLanguage();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const languages = [
        { code: 'en', label: 'English', shortLabel: 'EN' },
        { code: 'hi', label: 'हिंदी', shortLabel: 'हिं' }
    ];

    return (
        <Box 
            sx={{ 
                ...sx,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                '& .MuiButton-root': {
                    minWidth: isMobile ? '36px' : '40px',
                    height: isMobile ? '36px' : '40px',
                    padding: isMobile ? '4px 8px' : '6px 12px',
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: theme.shadows[2]
                    }
                }
            }}
        >
            <LanguageIcon 
                sx={{ 
                    color: 'white',
                    fontSize: isMobile ? '1.25rem' : '1.5rem',
                    opacity: 0.8
                }} 
            />
            {languages.map((lang) => (
                <Tooltip 
                    key={lang.code}
                    title={lang.label}
                    arrow
                    placement="bottom"
                >
                    <Button
                        onClick={() => changeLanguage(lang.code)}
                        variant={language === lang.code ? 'contained' : 'outlined'}
                        sx={{
                            backgroundColor: language === lang.code 
                                ? 'rgba(255, 255, 255, 0.2)' 
                                : 'transparent',
                            color: 'white',
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                            fontWeight: language === lang.code ? 'bold' : 'normal',
                            '&:hover': {
                                backgroundColor: language === lang.code 
                                    ? 'rgba(255, 255, 255, 0.3)' 
                                    : 'rgba(255, 255, 255, 0.1)',
                                borderColor: 'rgba(255, 255, 255, 0.5)'
                            }
                        }}
                    >
                        {lang.shortLabel}
                    </Button>
                </Tooltip>
            ))}
        </Box>
    );
};

export default LanguageSwitcher;