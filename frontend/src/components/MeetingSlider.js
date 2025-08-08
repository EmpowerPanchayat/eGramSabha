import React from "react";
import Slider from "react-slick";
import {
    Box,
    Card,
    CardContent,
    Typography,
    Stack,
    Button,
} from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import EventIcon from "@mui/icons-material/Event";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import VideocamIcon from "@mui/icons-material/Videocam";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { useLanguage } from "../utils/LanguageContext";

const ArrowButton = ({ className, style, onClick, icon }) => (
    <Box
        onClick={onClick}
        sx={{
            position: "absolute",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 2,
            backgroundColor: "rgba(255,255,255,0.8)",
            borderRadius: "50%",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: 2,
            "&:hover": {
                backgroundColor: "white",
            },
            ...(icon === "prev" ? { left: 0 } : { right: 0 }),
        }}
    >
        {icon === "prev" ? (
            <ArrowBackIosNewIcon fontSize="small" />
        ) : (
            <ArrowForwardIosIcon fontSize="small" />
        )}
    </Box>
);

export default function MeetingSlider({
    meetings,
    onMarkAttendance,
    onShowMeetingDetails,
    isStarting,
    attendanceStats,
    setCurrentMeetingIndex,
}) {
    const { strings } = useLanguage();
        const settings = {
        dots: true,
        infinite: true,
        speed: 500,
        slidesToShow: 1,
        slidesToScroll: 1,
        arrows: true,
        nextArrow: <ArrowButton icon="next" />,
        prevArrow: <ArrowButton icon="prev" />,
        beforeChange: (oldIndex, newIndex) => {
            setCurrentMeetingIndex(newIndex);
        }
    };

    return (
        <Slider {...settings}>
            {meetings.map((meetingItem) => (
                <Box
                    key={meetingItem._id}
                    sx={{
                        width: "100%",
                        boxSizing: "border-box",
                        display: "flex",
                        justifyContent: "center",
                        px: 1,
                    }}
                >
                    <Card
                        elevation={2}
                        sx={{
                            overflow: "hidden",
                            border: "1px solid",
                            borderColor: "divider",
                            display: "flex",
                            flexDirection: "column",
                            width: "100%",
                            flex: 1,
                        }}
                    >
                        <CardContent
                            sx={{
                                px: { xs: 2, sm: 4, md: 6 },
                                py: { xs: 1.5, sm: 2 },
                            }}
                        >
                            <Typography
                                variant="h6"
                                fontWeight="bold"
                                gutterBottom
                                sx={{
                                    fontSize: { xs: "1rem", sm: "1.25rem" },
                                }}
                            >
                                {meetingItem.title}
                            </Typography>

                            <Stack spacing={1.5} sx={{ mb: 2 }}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <LocationOnIcon fontSize="small" color="primary" />
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{
                                            fontSize: { xs: "0.85rem", sm: "1rem" },
                                        }}
                                    >
                                        {meetingItem.location}
                                    </Typography>
                                </Box>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <EventIcon fontSize="small" color="primary" />
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{
                                            fontSize: { xs: "0.85rem", sm: "1rem" },
                                        }}
                                    >
                                        {new Date(meetingItem.dateTime).toLocaleString("en-IN", {
                                            day: "numeric",
                                            month: "long",
                                            hour: "numeric",
                                            minute: "numeric",
                                            hour12: true,
                                        })}
                                    </Typography>
                                </Box>
                            </Stack>

                            <Box
                                display="flex"
                                flexDirection={{ xs: "column", sm: "row" }}
                                justifyContent="flex-end"
                                gap={2}
                                sx={{ mt: 1 }}
                            >
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<HowToRegIcon />}
                                    onClick={() => onMarkAttendance(meetingItem._id)}
                                    sx={{
                                        px: 3,
                                        width: { xs: "100%", sm: "auto" },
                                    }}
                                >
                                    {strings.markAttendance}
                                </Button>
                                <Button
                                    variant="contained"
                                    color="success"
                                    startIcon={<VideocamIcon />}
                                    disabled={!attendanceStats[meetingItem._id]?.quorumMet}
                                    onClick={() => onShowMeetingDetails(meetingItem._id,
                                        meetingItem.jioMeetData?.jiomeetId,
                                        meetingItem.meetingLink,
                                        meetingItem.jioMeetData?.roomPIN,
                                        meetingItem.jioMeetData?.hostToken
                                    )}
                                    sx={{
                                        width: { xs: "100%", sm: "auto" },
                                    }}
                                >
                                    {isStarting ? "Starting..." : strings.showMeetingDetails}
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>
            ))}
        </Slider>
    );
}