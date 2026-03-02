// File: frontend/src/components/HelpDeskDialog.js
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Tabs,
    Tab,
    Box,
    Typography,
    IconButton,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    CircularProgress,
    Alert,
    Paper
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import PublicIcon from '@mui/icons-material/Public';
import { useLanguage } from '../utils/LanguageContext';
import { fetchSupportContacts } from '../api/supportTicket';
import SupportTicketForm from './SupportTicketForm';

function TabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`help-tabpanel-${index}`}
            aria-labelledby={`help-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
        </div>
    );
}

const HelpDeskDialog = ({ open, onClose, user, panchayatId, sourcePortal }) => {
    const { strings } = useLanguage();
    const [tabValue, setTabValue] = useState(0);
    const [contacts, setContacts] = useState(null);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [contactsError, setContactsError] = useState('');
    const [ticketSubmitted, setTicketSubmitted] = useState(false);
    const [submittedTicketNumber, setSubmittedTicketNumber] = useState('');

    useEffect(() => {
        if (open) {
            loadContacts();
        }
    }, [open, panchayatId]);

    const loadContacts = async () => {
        setLoadingContacts(true);
        setContactsError('');
        try {
            const response = await fetchSupportContacts(panchayatId);
            if (response.success) {
                setContacts(response.contacts);
            }
        } catch (error) {
            console.error('Error loading contacts:', error);
            setContactsError(strings.errorFetchingContacts || 'Failed to load contact information');
        } finally {
            setLoadingContacts(false);
        }
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const handleTicketSuccess = (ticketNumber) => {
        setSubmittedTicketNumber(ticketNumber);
        setTicketSubmitted(true);
    };

    const handleClose = () => {
        setTicketSubmitted(false);
        setSubmittedTicketNumber('');
        setTabValue(0);
        onClose();
    };

    const handleSubmitAnother = () => {
        setTicketSubmitted(false);
        setSubmittedTicketNumber('');
    };

    const renderContactItem = (icon, label, value, type = 'text') => {
        if (!value) return null;

        let content = value;
        if (type === 'email') {
            content = (
                <a href={`mailto:${value}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {value}
                </a>
            );
        } else if (type === 'phone') {
            content = (
                <a href={`tel:${value}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {value}
                </a>
            );
        }

        return (
            <ListItem>
                <ListItemIcon>{icon}</ListItemIcon>
                <ListItemText
                    primary={label}
                    secondary={content}
                    primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                    secondaryTypographyProps={{ variant: 'body1' }}
                />
            </ListItem>
        );
    };

    const renderContactsTab = () => {
        if (loadingContacts) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            );
        }

        if (contactsError) {
            return (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {contactsError}
                </Alert>
            );
        }

        const hasPanchayatContacts = contacts?.panchayat && (
            contacts.panchayat.email ||
            contacts.panchayat.phone ||
            contacts.panchayat.contactName
        );

        const hasGlobalContacts = contacts?.global && (
            contacts.global.email ||
            contacts.global.phone ||
            contacts.global.contactName
        );

        if (!hasPanchayatContacts && !hasGlobalContacts) {
            return (
                <Alert severity="info" sx={{ mt: 2 }}>
                    {strings.noContactsAvailable || 'No contact information available at this time.'}
                </Alert>
            );
        }

        return (
            <Box>
                {/* Panchayat Contacts */}
                {hasPanchayatContacts && (
                    <Paper variant="outlined" sx={{ mb: 2, p: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, pt: 1 }}>
                            <LocationCityIcon sx={{ mr: 1, color: 'primary.main' }} />
                            <Typography variant="subtitle1" fontWeight="medium">
                                {contacts.panchayat.panchayatName || strings.panchayatContacts || 'Panchayat Support'}
                            </Typography>
                        </Box>
                        <List dense>
                            {renderContactItem(
                                <PersonIcon color="action" />,
                                strings.contactPerson || 'Contact Person',
                                contacts.panchayat.contactName
                            )}
                            {renderContactItem(
                                <EmailIcon color="action" />,
                                strings.email || 'Email',
                                contacts.panchayat.email,
                                'email'
                            )}
                            {renderContactItem(
                                <PhoneIcon color="action" />,
                                strings.phone || 'Phone',
                                contacts.panchayat.phone,
                                'phone'
                            )}
                        </List>
                    </Paper>
                )}

                {/* Global Contacts */}
                {hasGlobalContacts && (
                    <Paper variant="outlined" sx={{ p: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, pt: 1 }}>
                            <PublicIcon sx={{ mr: 1, color: 'secondary.main' }} />
                            <Typography variant="subtitle1" fontWeight="medium">
                                {strings.globalSupport || 'eGramSabha Support'}
                            </Typography>
                        </Box>
                        <List dense>
                            {renderContactItem(
                                <PersonIcon color="action" />,
                                strings.contactPerson || 'Contact Person',
                                contacts.global.contactName
                            )}
                            {renderContactItem(
                                <EmailIcon color="action" />,
                                strings.email || 'Email',
                                contacts.global.email,
                                'email'
                            )}
                            {renderContactItem(
                                <PhoneIcon color="action" />,
                                strings.phone || 'Phone',
                                contacts.global.phone,
                                'phone'
                            )}
                        </List>
                    </Paper>
                )}
            </Box>
        );
    };

    const renderTicketTab = () => {
        if (ticketSubmitted) {
            return (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                        {strings.ticketSubmittedSuccess || 'Ticket Submitted Successfully!'}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                        {strings.yourTicketNumber || 'Your ticket number is:'}
                    </Typography>
                    <Typography variant="h5" color="primary" fontWeight="bold" sx={{ mb: 3 }}>
                        {submittedTicketNumber}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        {strings.ticketSubmittedNote || 'Please save this number for future reference. Our support team will review your ticket.'}
                    </Typography>
                    <Button
                        variant="outlined"
                        onClick={handleSubmitAnother}
                        sx={{ mr: 1 }}
                    >
                        {strings.submitAnotherTicket || 'Submit Another Ticket'}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleClose}
                    >
                        {strings.close || 'Close'}
                    </Button>
                </Box>
            );
        }

        return (
            <SupportTicketForm
                user={user}
                panchayatId={panchayatId}
                sourcePortal={sourcePortal}
                onSuccess={handleTicketSuccess}
            />
        );
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 2 }
            }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6" component="span">
                    {strings.helpDesk || 'Help Desk'}
                </Typography>
                <IconButton
                    aria-label="close"
                    onClick={handleClose}
                    sx={{ color: 'grey.500' }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <Divider />

            <DialogContent sx={{ p: 0 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                    <Tabs value={tabValue} onChange={handleTabChange} aria-label="help desk tabs">
                        <Tab label={strings.contactUs || 'Contact Us'} id="help-tab-0" />
                        <Tab label={strings.submitTicket || 'Submit Ticket'} id="help-tab-1" />
                    </Tabs>
                </Box>

                <Box sx={{ p: 2 }}>
                    <TabPanel value={tabValue} index={0}>
                        {renderContactsTab()}
                    </TabPanel>
                    <TabPanel value={tabValue} index={1}>
                        {renderTicketTab()}
                    </TabPanel>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default HelpDeskDialog;
