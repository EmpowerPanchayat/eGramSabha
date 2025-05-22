import React from 'react';
import {
    FormControl,
    Select,
    MenuItem,
} from '@mui/material';
import { useLanguage } from '../utils/LanguageContext';

const STATUS_OPTIONS = [
    "statusReported",
    "statusAgendaCreated",
    "statusResolved",
    "statusEscalated",
    "statusNoActionNeeded"
];

const IssueStatusDropdown = ({ status, setStatus }) => {
    const { strings } = useLanguage();

    const handleChange = (event) => {
        setStatus(event.target.value);
    };

    return (
        <>
            <FormControl size="small">
                <Select
                    value={status}
                    onChange={handleChange}
                    displayEmpty
                >
                    <MenuItem value="" disabled>
                        {strings.issueStatus}
                    </MenuItem>
                    {STATUS_OPTIONS.map((status) => (
                        <MenuItem key={status} value={status}>
                            {strings[status]}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </>
    );
};

export default IssueStatusDropdown;
