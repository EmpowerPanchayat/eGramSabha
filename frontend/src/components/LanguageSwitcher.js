// File: frontend/src/components/LanguageSwitcher.js
import React from 'react';
import { Button, ButtonGroup, Box, Typography } from '@mui/material';
import { useLanguage } from '../utils/LanguageContext';

const LanguageSwitcher = ({ sx = {} }) => {
    const { language, changeLanguage } = useLanguage();

    return (
        <Box sx={{ ...sx, display: 'flex', alignItems: 'center' }}>
            <ButtonGroup size="small" aria-label="language selector">
                <Button
                    onClick={() => changeLanguage('en')}
                    variant={language === 'en' ? 'contained' : 'outlined'}
                    sx={{
                        fontWeight: language === 'en' ? 'bold' : 'normal',
                        minWidth: '40px',
                        backgroundColor: language === 'en' ? 'primary.main' : 'rgba(255,255,255,0.2)',
                        color: 'white',
                        borderColor: 'rgba(255,255,255,0.3)',
                        '&:hover': {
                            backgroundColor: language === 'en' ? 'primary.dark' : 'rgba(255,255,255,0.3)',
                        }
                    }}
                >
                    EN
                </Button>
                <Button
                    onClick={() => changeLanguage('hi')}
                    variant={language === 'hi' ? 'contained' : 'outlined'}
                    sx={{
                        fontWeight: language === 'hi' ? 'bold' : 'normal',
                        minWidth: '40px',
                        backgroundColor: language === 'hi' ? 'primary.main' : 'rgba(255,255,255,0.2)',
                        color: 'white',
                        borderColor: 'rgba(255,255,255,0.3)',
                        '&:hover': {
                            backgroundColor: language === 'hi' ? 'primary.dark' : 'rgba(255,255,255,0.3)',
                        }
                    }}
                >
                    हिं
                </Button>
            </ButtonGroup>
        </Box>
    );
};

export default LanguageSwitcher;