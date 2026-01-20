// File: frontend/src/components/HelpButton.js
import React, { useState } from 'react';
import { Fab, Tooltip } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useLanguage } from '../utils/LanguageContext';
import HelpDeskDialog from './HelpDeskDialog';

/**
 * Floating Help Button component
 * Appears in the bottom-right corner of all portals
 */
const HelpButton = ({ user, panchayatId, sourcePortal }) => {
    const { strings } = useLanguage();
    const [dialogOpen, setDialogOpen] = useState(false);

    const handleOpenDialog = () => {
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
    };

    return (
        <>
            <Tooltip title={strings.helpDesk || 'Help Desk'} placement="left">
                <Fab
                    variant="extended"
                    color="primary"
                    aria-label="help"
                    onClick={handleOpenDialog}
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        zIndex: 1200,
                        textTransform: 'none',
                        fontWeight: 500,
                        px: 2,
                        boxShadow: 3,
                        '&:hover': {
                            boxShadow: 6
                        }
                    }}
                >
                    <HelpOutlineIcon sx={{ mr: 1 }} />
                    {strings.help || 'Help'}
                </Fab>
            </Tooltip>

            <HelpDeskDialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                user={user}
                panchayatId={panchayatId}
                sourcePortal={sourcePortal}
            />
        </>
    );
};

export default HelpButton;
