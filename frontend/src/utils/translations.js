/* eslint-disable no-dupe-keys */
const translations = {
  en: {
    // Common
    appName: "Gram Sabha Management",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    submit: "Submit",
    add: "Add",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    view: "View",
    back: "Back",
    next: "Next",
    close: "Close",
    refresh: "Refresh",
    actions: "Actions",
    logout: "Logout",
    panchayat: "Panchayat",
    district: "District",
    state: "State",
    block: "Block", // Added
    address: "Address",
    mobileNumber: "Mobile Number",

    // ===== NEW: Location-based login error messages =====
    invalidLgdCode:
      "Invalid LGD Code. Please check the code or select manually.",
    lgdCodeNotFound:
      "LGD Code not found. Please verify the code or use manual selection.",
    locationNotFound:
      "Location not found. Please check the spelling or select manually.",
    missingBlockInUrl:
      "Block is required in the location path. Please provide complete location.",
    incompleteLocationPath:
      "Incomplete location path. Expected format: /State/District/Block/Panchayat",
    locationError:
      "Error loading location. Please try again or select manually.",
    panchayatNotFound: "Panchayat not found in the specified location.",

    // ===== NEW: UI elements for location selection =====
    selectManually: "Select Manually",
    changeLocation: "Change Location",
    panchayatFound: "Panchayat Found",
    loginError: "Login Error",
    selectYourPanchayat: "Select Your Panchayat",
    processingLoginMethod: "Processing login method...",

    // ===== NEW: Location hierarchy labels =====
    locationDetails: "Location Details",
    currentSelection: "Current Selection",
    refreshLocationData: "Refresh location data",
    loadingLocationData: "Loading location data...",

    // ===== NEW: Form labels and hints =====
    lgdCode: "LGD Code",
    lgdCodeOptional:
      "Government-issued Local Governance Directory Code (optional)",
    enterLgdCode: "Enter LGD Code (optional)",
    lgdCodeExample: "e.g. 123456789",
    lgdCodeAlreadyExists:
      "This LGD Code is already in use by another panchayat",
    lgdCodeValidation:
      "LGD Code must be a numeric string with maximum 10 digits",

    // ===== NEW: Location selection hints =====
    createNewOption: 'Create "%s"',
    nameWillSync: "Name will sync with location selection",

    // ===== NEW: Quick access methods =====
    quickAccessMethods: "Quick Access Methods:",
    useLgdCode: "Use LGD Code: ?lgdCode=123456",
    useLocationPath: "Use Path: /State/District/Block/Panchayat",

    // ===== NEW: Enhanced validation messages =====
    stateRequired: "State is required",
    districtRequired: "District is required",
    blockRequired: "Block is required",
    panchayatNameRequired: "Panchayat name is required",
    invalidCharacters: "Contains invalid characters",

    // ===== NEW: System messages =====
    failedToSavePanchayat: "Failed to save panchayat. Please try again.",
    failedToLoadLocationData:
      "Failed to load location data. Please refresh the page.",
    failedToRefreshLocationData: "Failed to refresh location data",

    // ===== NEW: Navigation and breadcrumbs =====
    basicInformation: "Basic Information",
    demographicsAndCommunication: "Demographics & Communication",
    additionalDetails: "Additional Details",

    // ===== NEW: Camera and face recognition (enhanced) =====
    readyToStartCamera: "Ready to start camera",
    noAdditionalCameras: "No additional cameras available",

    // ===== NEW: Cache and performance =====
    fresh: "Fresh",
    stale: "Stale",

    // Authentication
    citizenLogin: "Citizen Login",
    loginWithFace: "Login with Face Recognition",
    faceNotRecognized: "Face not recognized. Please try again.",
    positionFace: "Position your face within the frame",
    startCamera: "Start Camera",
    takePhoto: "Login",
    retake: "Retake",
    selectPanchayat: "Select your Panchayat",
    voterIdLastFour: "Last 4 digits of Voter ID",
    enterVoterId: "Please enter the last 4 digits of your voter ID",
    exactlyFourDigits: "Please enter exactly 4 digits",
    faceDetected: "Face Detected",
    noFaceDetected: "No Face Detected",
    imageCaptured: "Image Captured",
    startingCamera: "Starting Camera...",
    processing: "Processing...",
    cameraNotActive: "Camera not active. Please start the camera first.",
    noFaceInFrame: "No face detected. Please position your face in the frame.",
    cameraAccessDenied:
      "Camera access denied. Please allow camera access and try again.",
    noCameraFound:
      "No camera found. Please ensure your device has a working camera.",
    cameraInUse:
      "Camera is already in use by another application or not available.",
    cameraConstraints:
      "Camera does not meet the required constraints. Try a different camera.",
    cameraAborted: "Camera initialization was aborted. Please try again.",
    cameraError: "Error accessing camera",
    faceAuthFailed: "Face authentication failed",
    errorCapturingImage: "Error capturing image",
    cameraPermissionWarning:
      "Please ensure you have granted camera permissions to this site. You might need to update your browser settings.",
    selectPanchayatFirst:
      'Please select your panchayat and click "Start Camera" to begin the face login process',
    completeLivelinessChecks: "Please complete all liveliness checks",
    errorLoadingModels: "Error loading face recognition models",

    // Citizen dashboard
    welcomeCitizen: "Welcome",
    myIssues: "My Issues/Suggestions",
    allIssues: "All Issues/Suggestions",
    issueSummary: "Issues/Suggestions Summary",
    reportIssue: "Report an Issue/Suggestion",
    createNewIssue: "Create New Issue/Suggestion",
    viewAllIssues: "View All Issues/Suggestions",
    reportIssueDesc: "Create a new issue/suggestion to report your concerns",
    issueListDesc: "View and track the status of all issues/suggestions",
    totalIssues: "Total Issues/Suggestions",
    pending: "Pending",
    resolved: "Resolved",
    submitTextIssues: "Submit text-based issues/suggestions",
    attachPhotos: "Attach photos or documents",
    recordVoice: "Record voice descriptions",
    trackPendingIssues: "Track pending issues/suggestions",
    viewResolvedIssues: "View resolved issues/suggestions",
    monitorResponses: "Monitor panchayat responses",

    // Issue creation
    reportNewIssue: "Report a New Issue/Suggestion",
    issueDescription: "Description",
    issueTitle: "Issue/Suggestion Description",
    issueDetails: "Describe your issue/suggestion in detail",
    issueDetailView: "Issue/Suggestion Details",
    issuePlaceholder: "Please describe the issue/suggestion you are facing...",
    issueCategory: "Category",
    issueSubcategory: "Subcategory",
    selectCategory: "Select Category",
    selectSubcategory: "Select Subcategory",
    issuePriority: "Priority",
    priorityUrgent: "Urgent",
    priorityNormal: "Normal",
    issueLocation: "Location",
    targetDate: "Target Resolution Date",
    addAttachment: "Add Attachment",
    uploadImage: "Upload Image",
    captureAudio: "Capture Audio",
    audioRecording: "Audio Recording",
    startRecording: "Start Recording",
    stopRecording: "Stop Recording",
    audioRecorded: "Audio recorded successfully",
    issueReported: "Issue/Suggestion reported successfully",
    createdFor: "Created for",
    createdForDesc: "Who is this issue/suggestion for?",
    attachments: "Attachments",
    recordings: "Download Recording",
    fileAttachments: "File Attachments",
    remark: "Additional Remarks",
    createdDate: "Created Date",
    searchIssues: "Search issues/suggestions...",

    // Transcription
    audioTranscription: "Audio Transcription",
    transcriptionText: "Transcription Text",
    enhancedEnglish: "English",
    enhancedHindi: "Hindi",
    originalTranscription: "Original Language",
    transcriptionStatus: "Transcription Status",
    transcriptionPending:
      "Audio attachment detected, transcription will be initiated automatically",
    transcriptionProcessing: "Transcription is being processed...",
    transcriptionCompleted: "Transcription completed successfully",
    transcriptionFailed: "Transcription failed",
    retryTranscription: "Retry Transcription",
    transcriptionLanguage: "Language",
    transcriptionCompletedAt: "Completed",
    transcriptionError: "Transcription failed",
    transcriptionRetrySuccess: "Transcription retry initiated successfully",
    transcriptionRetryError: "Transcription retry failed",
    transcriptionLoading: "Loading transcription...",
    transcriptionNoData: "No transcription data available",

    // Issue list
    issuesList: "Issues/Suggestions List",
    noIssuesFound: "No issues/suggestions found",
    issueStatus: "Status",
    issueDate: "Date",
    createdOn: "Created On",
    creator: "Creator",
    recording: "Recording",
    no: "No.",
    rowsPerPage: "Rows per page",

    // Issue details sections
    timeline: "Timeline",
    additionalInformation: "Additional Information",

    // Issue status
    statusReported: "Reported",
    statusAgendaCreated: "Picked In Agenda",
    statusDiscussedInGramSabha: "Discussed In Gram Sabha",
    statusResolved: "Resolved",
    statusTransferred: "Transferred",
    statusNoActionNeeded: "No Action Needed",

    // Categories
    categoryCultureAndNature: "Culture and Nature",
    categoryInfrastructure: "Infrastructure",
    categoryEarningOpportunities: "Earning Opportunities",
    categoryBasicAmenities: "Basic Amenities",
    categorySocialWelfareSchemes: "Social Welfare Schemes",
    categoryOther: "Other",

    // Subcategories - Culture and Nature
    subcategoryFestivals: "Festivals",
    subcategoryTreesAndForests: "Trees and Forests",
    subcategorySoil: "Soil",
    subcategoryNaturalWaterResources: "Natural Water Resources",
    subcategoryReligiousPlaces: "Religious Places",

    // Subcategories - Infrastructure
    subcategoryLand: "Land",
    subcategoryWater: "Water",
    subcategoryEnergy: "Energy",
    subcategoryTransportation: "Transportation",
    subcategoryCommunication: "Communication",

    // Subcategories - Earning Opportunities
    subcategoryAgriculture: "Agriculture",
    subcategoryAnimalHusbandry: "Animal Husbandry",
    subcategoryFisheries: "Fisheries",
    subcategorySmallScaleIndustries: "Small-scale Industries",
    subcategoryMinorForestProduce: "Minor Forest Produce",
    subcategoryKhadiAndVillageIndustries: "Khadi and Village Industries",

    // Subcategories - Basic Amenities
    subcategoryHealth: "Health",
    subcategoryEducation: "Education",
    subcategoryHousingAndSanitation: "Housing and Sanitation",
    subcategorySportsAndEntertainment: "Sports and Entertainment",
    subcategoryFood: "Food",

    // Subcategories - Social Welfare Schemes
    subcategoryWeakerSections: "Welfare of Weaker Sections",
    subcategoryHandicappedWelfare: "Welfare of Handicapped",
    subcategoryFamilyWelfare: "Family Welfare",
    subcategoryWomenAndChildDevelopment: "Women and Child Development",
    subcategoryPovertyAlleviation: "Poverty Alleviation",

    // Subcategories - Other
    subcategoryOther: "Other",

    // Errors
    errorMissingFields: "Please fill all required fields",
    errorCameraAccess: "Camera access denied",
    errorAudioAccess: "Microphone access denied",
    errorNetworkIssue: "Network error. Please try again",
    errorUploadingAttachment: "Error uploading attachment",
    errorFetchingIssues: "Error fetching issues",
    errorReportingIssue: "Error reporting issue",

    // Backend Error Messages
    errorValidFaceDescriptor:
      "Valid face descriptor is required for authentication",
    errorVoterIdRequired: "Last 4 digits of voter ID are required",
    errorPanchayatNotFound: "Panchayat not found",
    errorNoRegisteredUsers: "No registered users found with matching voter ID",
    errorMultipleMatches:
      "Multiple potential matches found. Please try again or contact administrator.",
    errorFaceNotRecognized:
      "Face not recognized. Please try again or contact administrator.",
    errorUserRegistrationIncomplete:
      "User registration incomplete. Please contact administrator.",
    errorAuthenticationSuccessful: "Authentication successful",
    errorUserNotFound: "User not found",
    errorFetchingProfile: "Error fetching citizen profile",
    errorFaceAuthentication: "Error during face authentication",

    // Gram Sabha Management
    gramSabhaManagement: "Gram Sabha Management",
    scheduleMeeting: "Schedule Meeting",
    editMeeting: "Edit Gram Sabha Meeting",
    createMeeting: "Create New Gram Sabha Meeting",
    pastMeetings: "Past Meetings",
    titleOptional: "Title (Optional)",
    titleHelperText: "If left empty, a title will be automatically generated",
    previewTitle: "Preview Title",
    date: "Date",
    time: "Time",
    duration: "Duration (Hours)",
    durationMins: "Duration (Minutes)",
    durationHelperText: "Duration in Hours (0.25-8)",
    location: "Location",
    agenda: "Agenda",
    addAgendaItem: "Add Agenda Item",
    agendaHelperText: "Enter the detailed agenda for the Gram Sabha meeting",
    description: "Description",
    descriptionHelperText: "Additional details about the meeting (optional)",
    deleteMeeting: "Delete Gram Sabha Meeting",
    deleteConfirmation:
      "Are you sure you want to delete this Gram Sabha meeting? This action cannot be undone.",
    addAttendance: "Add Attendance",
    name: "Name",
    age: "Age",
    gender: "Gender",
    contactNumber: "Contact Number",
    male: "Male",
    female: "Female",
    other: "Other",
    download: "Download",
    meetingNotFound: "Meeting not found",
    meetingLink: "Meeting Link",
    uploadFile: "Upload Files",
    fileSelected: "file selected",
    filesSelected: "files selected",
    clickToUpload: "Click to upload",
    uploadFiles: "Upload Files",
    fileName: "File Name",
    meetingConcludedInfo:
      "Since the meeting is CONCLUDED, you can only upload any attachment if required. To view meeting details, please click on the View Details(eye) button in Actions Section.",
    noAgendaInfo:
      "No agenda items available. Please ensure issues have been summarized for this panchayat.",

    // Table Headers
    tableTitle: "Title",
    tableDateTime: "Date & Time",
    tableLocation: "Location",
    tableDuration: "Duration",
    tableStatus: "Status",
    tableActions: "Actions",
    noDataToDisplay: "No data to display",

    // Official Dashboard
    officialPortal: "Official Portal",
    backToDashboard: "Back to Dashboard",
    createIssue: "Create Issue",
    manageIssues: "Manage Issues",
    createIssuesDesc: "Create new issues on behalf of citizens",
    manageIssuesDesc: "View and manage all panchayat issues",
    processPendingIssues: "Process pending issue requests",
    updateStatus: "Update status of ongoing issues",
    reviewHistory: "Review resolved issue history",
    createWithDetails: "Create issues with detailed descriptions",
    attachDocuments: "Attach supporting documents",
    setPriority: "Set priority levels and categories",
    changePassword: "Change Password",
    passwordChangeError: "Failed to change password",
    pendingIssues: "Pending Issues",
    inProgressIssues: "In Progress Issues",
    resolvedIssues: "Resolved Issues",
    totalIssues: "Total Issues",
    viewAllIssues: "View All Issues",
    manageGramSabha: "Manage Gram Sabha",
    scheduleMeetings: "Schedule upcoming gram sabha meetings",
    manageAttendees: "Manage attendees and participation",
    trackAgendas: "Track meeting agendas and resolutions",
    gramSabhaDesc: "Schedule and manage gram sabha meetings",
    viewDetails: "View Details",
    gramSabhaDetails: "Gram Sabha Details",

    // Gram Sabha Status
    statusSCHEDULED: "Scheduled",
    statusCANCELLED: "Cancelled",
    statusUNSCHEDULED: "Unscheduled",
    statusCONCLUDED: "Concluded",
    statusIN_PROGRESS: "In Progress",
    statusRESCHEDULED: "Rescheduled",

    // Gram Sabha Details
    minutes: "minutes",
    hours: "hours",
    status: "Status",
    fileType: "File Type",
    uploadedAt: "Uploaded At",
    noAttachments: "No attachments uploaded yet",
    downloadPDF: "Download PDF",
    downloadCSV: "Download CSV",
    attachFile: "Attach File",
    rsvpStats: "RSVP Statistics",
    noResponse: "No Response",
    totalRegisteredUsers: "Total Registered Users",
    noAgenda: "No agenda available",
    translationInProgress: "Some translations are in progress. Please wait a few moments.",
    noDescription: "No description available",

    // Upcoming Meetings
    upcomingMeeting: "Upcoming Gram Sabha Meeting",
    noUpcomingMeetings: "No upcoming meetings scheduled",
    meetingDetails: "Meeting Details",
    rsvp: "RSVP",
    attending: "Attending",
    notAttending: "Not Attending",
    mayAttend: "May Attend",
    pastGramSabhaMeetings: "Past Gram Sabha Meetings",
    noPastMeetings: "No past meetings available",
    viewAllMeetings: "View All Meetings",
    districtState: "District/State",
    welcome: "Welcome",

    // TodaysMeetingsBanner
    todaysMeeting: "Today's Meeting",
    noMeetingsToday: "No meetings scheduled for today",
    markAttendance: "Mark Attendance",
    attendanceStats: "Attendance Statistics",
    totalVoters: "Total Voters",
    totalRegistered: "Total Registered",
    present: "Present",
    quorumRequired: "Quorum Required",
    attendanceProgress: "Attendance Progress",
    attendeesNeeded: "attendees needed",
    attendeesPresent: "attendees present",
    quorumIs: "quorum is",
    quorumMet: "Quorum Met",
    quorumNotMet: "Quorum Not Met",
    showMeetingDetails: "Show Meeting Details",
    joinMeeting: "Join Meeting",
    endMeeting: "End Meeting",
    verifyAttendee: "Verify Attendee",
    enterLastFourDigits: "Enter the last 4 digits of the voter ID card",
    faceVerification: "Face Verification",
    cameraInstructions: "Camera will be used to verify the attendee's identity",
    loadingModels: "Loading models...",
    stopCamera: "Stop Camera",

    //Attendance
    verifyAttendance: "Verify Attendance",
    attendanceReportTitle: "Gram Sabha Attendance Report",
    panchayatDetails: "Panchayat Details",
    title: "Title",
    genderStats: "Gender Statistics",
    casteStats: "Caste Category Statistics",
    attendanceList: "Attendance List",
    sNo: "S.No",
    casteCategory: "Caste Category",
    verificationMethod: "Verification Method",
    noData: "No data available",

    //Agenda
    gramSabhaAgendaNotice: "Gram Sabha Meeting – Agenda Notice",
    gramSabhaNoticeText:
      "All respected villagers are hereby informed that the Gram Sabha meeting is being organized as per the above details. Please be present on time and ensure your participation in the development of the village.",
    newIssuesAndPlanHeading: "New Issues and Upcoming Action Plan",
    newIssuesAndPlanDescription:
      "In this section, Gram Sabha members can discuss current and future needs, propose new initiatives, and formulate plans for the overall development of the village.",
    linkedIssues: "Linked Issues",
    filterAll: "All",
    filterCategory: "Category",
    filterSubcategory: "Subcategory",
    filterStatusAll: "All issues",
    filterStatusCurrent: "Linked with current item",
    filterStatusOther: "Linked with other items",
    filterStatusNone: "Unlinked issues",
    filterStatusExplanation: "Background colors indicate link status: blue = linked to this item; grey = linked to other items; white = unlinked",
    filterReset: "Reset filters",
    filters: "Filters",
    linkStatusAll: "All issues",
    linkStatusCurrent: "Linked with current item",
    linkStatusOther: "Linked with other items",
    linkStatusNone: "Unlinked issues",
    linkStatusExplanation: "Background colors: blue = current, grey = other, white = unlinked",
    secretary: "Secretary",
    sarpanch: "Sarpanch",
    gramPanchayat: "Gram Panchayat",
    serialNo: "S.No.",
    issueOwner: "Issue Owner",
    issueDescription: "Issue Description",
    village: "Village",
  },
  hi: {
    // Common
    appName: "ग्राम सभा प्रबंधन",
    loading: "लोड हो रहा है...",
    error: "त्रुटि",
    success: "सफलता",
    submit: "जमा करें",
    "add": "जोड़ें",
    cancel: "रद्द करें",
    save: "सहेजें",
    delete: "हटाएं",
    edit: "संपादित करें",
    view: "देखें",
    back: "वापस",
    next: "अगला",
    close: "बंद करें",
    refresh: "रीफ्रेश करें",
    actions: "कार्रवाई",
    logout: "लॉग आउट",
    panchayat: "पंचायत",
    district: "जिला",
    state: "राज्य",
    block: "ब्लॉक", // Added
    address: "पता",
    mobileNumber: "मोबाइल नंबर",

    // ===== NEW: Location-based login error messages =====
    invalidLgdCode:
      "अमान्य एलजीडी कोड। कृपया कोड जांचें या मैन्युअल रूप से चुनें।",
    lgdCodeNotFound:
      "एलजीडी कोड नहीं मिला। कृपया कोड सत्यापित करें या मैन्युअल चयन का उपयोग करें।",
    locationNotFound:
      "स्थान नहीं मिला। कृपया वर्तनी जांचें या मैन्युअल रूप से चुनें।",
    missingBlockInUrl:
      "स्थान पथ में ब्लॉक आवश्यक है। कृपया पूरा स्थान प्रदान करें।",
    incompleteLocationPath:
      "अधूरा स्थान पथ। अपेक्षित प्रारूप: /राज्य/जिला/ब्लॉक/पंचायत",
    locationError:
      "स्थान लोड करने में त्रुटि। कृपया पुनः प्रयास करें या मैन्युअल रूप से चुनें।",
    panchayatNotFound: "निर्दिष्ट स्थान में पंचायत नहीं मिली।",

    // ===== NEW: UI elements for location selection =====
    selectManually: "मैन्युअल रूप से चुनें",
    changeLocation: "स्थान बदलें",
    panchayatFound: "पंचायत मिली",
    loginError: "लॉगिन त्रुटि",
    selectYourPanchayat: "अपनी पंचायत चुनें",
    processingLoginMethod: "लॉगिन विधि प्रोसेसिंग...",

    // ===== NEW: Location hierarchy labels =====
    locationDetails: "स्थान विवरण",
    currentSelection: "वर्तमान चयन",
    refreshLocationData: "स्थान डेटा रीफ्रेश करें",
    loadingLocationData: "स्थान डेटा लोड हो रहा है...",

    // ===== NEW: Form labels and hints =====
    lgdCode: "एलजीडी कोड",
    lgdCodeOptional: "सरकार द्वारा जारी स्थानीय शासन निर्देशिका कोड (वैकल्पिक)",
    enterLgdCode: "एलजीडी कोड दर्ज करें (वैकल्पिक)",
    lgdCodeExample: "जैसे 123456789",
    lgdCodeAlreadyExists:
      "यह एलजीडी कोड पहले से ही दूसरी पंचायत द्वारा उपयोग में है",
    lgdCodeValidation:
      "एलजीडी कोड अधिकतम 10 अंकों की संख्यात्मक स्ट्रिंग होनी चाहिए",

    // ===== NEW: Location selection hints =====
    createNewOption: '"%s" बनाएं',
    nameWillSync: "नाम स्थान चयन के साथ सिंक होगा",

    // ===== NEW: Quick access methods =====
    quickAccessMethods: "त्वरित पहुंच विधियां:",
    useLgdCode: "एलजीडी कोड का उपयोग करें: ?lgdCode=123456",
    useLocationPath: "पथ का उपयोग करें: /राज्य/जिला/ब्लॉक/पंचायत",

    // ===== NEW: Enhanced validation messages =====
    stateRequired: "राज्य आवश्यक है",
    districtRequired: "जिला आवश्यक है",
    blockRequired: "ब्लॉक आवश्यक है",
    panchayatNameRequired: "पंचायत का नाम आवश्यक है",
    invalidCharacters: "अमान्य वर्ण शामिल हैं",

    // ===== NEW: System messages =====
    failedToSavePanchayat: "पंचायत सहेजने में विफल। कृपया पुनः प्रयास करें।",
    failedToLoadLocationData:
      "स्थान डेटा लोड करने में विफल। कृपया पृष्ठ को रीफ्रेश करें।",
    failedToRefreshLocationData: "स्थान डेटा रीफ्रेश करने में विफल",

    // ===== NEW: Navigation and breadcrumbs =====
    basicInformation: "बुनियादी जानकारी",
    demographicsAndCommunication: "जनसांख्यिकी और संचार",
    additionalDetails: "अतिरिक्त विवरण",

    // ===== NEW: Camera and face recognition (enhanced) =====
    readyToStartCamera: "कैमरा शुरू करने के लिए तैयार",
    noAdditionalCameras: "कोई अतिरिक्त कैमरा उपलब्ध नहीं",

    // ===== NEW: Cache and performance =====
    fresh: "ताज़ा",
    stale: "पुराना",

    // Authentication
    citizenLogin: "नागरिक लॉगिन",
    loginWithFace: "चेहरे की पहचान से लॉगिन करें",
    faceNotRecognized: "चेहरा पहचाना नहीं गया। कृपया पुनः प्रयास करें।",
    positionFace: "अपना चेहरा फ्रेम के अंदर रखें",
    startCamera: "कैमरा शुरू करें",
    takePhoto: "लॉगिन",
    retake: "पुनः लें",
    selectPanchayat: "अपनी पंचायत चुनें",
    voterIdLastFour: "मतदाता पहचान पत्र के अंतिम 4 अंक",
    enterVoterId: "कृपया अपने मतदाता पहचान पत्र के अंतिम 4 अंक दर्ज करें",
    exactlyFourDigits: "कृपया ठीक 4 अंक दर्ज करें",
    faceDetected: "चेहरा पहचाना गया",
    noFaceDetected: "कोई चेहरा नहीं पहचाना गया",
    imageCaptured: "छवि कैप्चर की गई",
    startingCamera: "कैमरा शुरू हो रहा है...",
    processing: "प्रोसेसिंग...",
    cameraNotActive: "कैमरा सक्रिय नहीं है। कृपया पहले कैमरा शुरू करें।",
    noFaceInFrame:
      "कोई चेहरा नहीं पहचाना गया। कृपया अपना चेहरा फ्रेम में रखें।",
    cameraAccessDenied:
      "कैमरा एक्सेस अस्वीकृत। कृपया कैमरा एक्सेस की अनुमति दें और पुनः प्रयास करें।",
    noCameraFound:
      "कोई कैमरा नहीं मिला। कृपया सुनिश्चित करें कि आपके डिवाइस में कार्यशील कैमरा है।",
    cameraInUse:
      "कैमरा पहले से ही किसी अन्य एप्लिकेशन द्वारा उपयोग में है या उपलब्ध नहीं है।",
    cameraConstraints:
      "कैमरा आवश्यक आवश्यकताओं को पूरा नहीं करता है। कृपया कोई अन्य कैमरा आज़माएं।",
    cameraAborted:
      "कैमरा इनिशियलाइज़ेशन रद्द कर दिया गया। कृपया पुनः प्रयास करें।",
    cameraError: "कैमरा एक्सेस करने में त्रुटि",
    faceAuthFailed: "चेहरे की प्रमाणीकरण विफल",
    errorCapturingImage: "छवि कैप्चर करने में त्रुटि",
    cameraPermissionWarning:
      "कृपया सुनिश्चित करें कि आपने इस साइट को कैमरा अनुमतियां दी हैं। आपको अपनी ब्राउज़र सेटिंग्स अपडेट करनी पड़ सकती हैं।",
    selectPanchayatFirst:
      'कृपया अपनी पंचायत चुनें और चेहरे की लॉगिन प्रक्रिया शुरू करने के लिए "कैमरा शुरू करें" पर क्लिक करें',
    completeLivelinessChecks: "कृपया सभी जीवंतता जांच पूरी करें",
    errorLoadingModels: "चेहरा पहचान मॉडल लोड करने में त्रुटि",

    // Citizen dashboard
    welcomeCitizen: "स्वागत है",
    myIssues: "मेरे मुद्दे/सुझाव",
    allIssues: "सभी मुद्दे/सुझाव",
    issueSummary: "मुद्दे/सुझाव सारांश",
    reportIssue: "मुद्दा/सुझाव दर्ज करें",
    createNewIssue: "नया मुद्दा/सुझाव बनाएं",
    viewAllIssues: "सभी मुद्दे/सुझाव देखें",
    reportIssueDesc:
      "अपनी समस्याओं को रिपोर्ट करने के लिए नया मुद्दा/सुझाव बनाएं",
    issueListDesc: "सभी मुद्दों/सुझावों की स्थिति देखें और ट्रैक करें",
    totalIssues: "कुल मुद्दे/सुझाव",
    pending: "लंबित",
    resolved: "हल किया गया",
    submitTextIssues: "टेक्स्ट-आधारित मुद्दे/सुझाव जमा करें",
    attachPhotos: "फोटो या दस्तावेज़ अटैच करें",
    recordVoice: "आवाज़ विवरण रिकॉर्ड करें",
    trackPendingIssues: "लंबित मुद्दों/सुझावों को ट्रैक करें",
    viewResolvedIssues: "हल किए गए मुद्दों/सुझावों को देखें",
    monitorResponses: "पंचायत की प्रतिक्रियाओं को मॉनिटर करें",

    // Issue creation
    reportNewIssue: "नया मुद्दा/सुझाव दर्ज करें",
    issueDescription: "विवरण",
    issueTitle: "मुद्दे/सुझाव का विवरण",
    issueDetails: "अपने मुद्दे/सुझाव का विस्तृत विवरण दें",
    issueDetailView: "मुद्दे/सुझाव का विवरण",
    issuePlaceholder: "कृपया अपने सामने आ रही समस्या/सुझाव का वर्णन करें...",
    issueCategory: "श्रेणी",
    issueSubcategory: "उपश्रेणी",
    selectCategory: "श्रेणी चुनें",
    selectSubcategory: "उपश्रेणी चुनें",
    issuePriority: "प्राथमिकता",
    priorityUrgent: "अत्यावश्यक",
    priorityNormal: "सामान्य",
    issueLocation: "स्थान",
    targetDate: "समाधान की लक्षित तिथि",
    addAttachment: "अटैचमेंट जोड़ें",
    uploadImage: "छवि अपलोड करें",
    captureAudio: "ऑडियो रिकॉर्ड करें",
    audioRecording: "ऑडियो रिकॉर्डिंग",
    startRecording: "रिकॉर्डिंग शुरू करें",
    stopRecording: "रिकॉर्डिंग बंद करें",
    audioRecorded: "ऑडियो सफलतापूर्वक रिकॉर्ड किया गया",
    issueReported: "मुद्दा/सुझाव सफलतापूर्वक दर्ज किया गया",
    createdFor: "किसके लिए",
    createdForDesc: "यह मुद्दा/सुझाव किसके लिए है?",
    attachments: "अटैचमेंट",
    recordings: "रिकॉर्डिंग डाउनलोड करें ",
    fileAttachments: "फ़ाइल अटैचमेंट",
    remark: "अतिरिक्त टिप्पणी",
    createdDate: "बनाने की तिथि",
    searchIssues: "मुद्दे/सुझाव खोजें...",

    // Transcription
    audioTranscription: "ऑडियो ट्रांस्क्रिप्शन",
    transcriptionText: "ट्रांस्क्रिप्शन टेक्स्ट",
    enhancedEnglish: "अंग्रेजी",
    enhancedHindi: "हिंदी",
    originalTranscription: "मूल भाषा",
    transcriptionStatus: "ट्रांस्क्रिप्शन स्थिति",
    transcriptionPending:
      "ऑडियो अटैचमेंट डिटेक्ट किया गया, ट्रांस्क्रिप्शन स्वचालित रूप से शुरू होगा",
    transcriptionProcessing: "ट्रांस्क्रिप्शन प्रोसेस हो रहा है...",
    transcriptionCompleted: "ट्रांस्क्रिप्शन सफलतापूर्वक पूरा हुआ",
    transcriptionFailed: "ट्रांस्क्रिप्शन विफल",
    retryTranscription: "ट्रांस्क्रिप्शन पुनः प्रयास करें",
    transcriptionLanguage: "भाषा",
    transcriptionCompletedAt: "पूरा",
    transcriptionError: "ट्रांस्क्रिप्शन विफल",
    transcriptionRetrySuccess:
      "ट्रांस्क्रिप्शन पुनः प्रयास सफलतापूर्वक शुरू हुआ",
    transcriptionRetryError: "ट्रांस्क्रिप्शन पुनः प्रयास विफल",
    transcriptionLoading: "ट्रांस्क्रिप्शन लोड हो रहा है...",
    transcriptionNoData: "कोई ट्रांस्क्रिप्शन डेटा उपलब्ध नहीं",

    // Issue list
    issuesList: "मुद्दों/सुझावों की सूची",
    noIssuesFound: "कोई मुद्दा/सुझाव नहीं मिला",
    issueStatus: "स्थिति",
    issueDate: "तिथि",
    createdOn: "बनाया गया",
    creator: "बनाने वाला",
    recording: "रिकॉर्डिंग",
    no: "क्रमांक",
    rowsPerPage: "प्रति पृष्ठ पंक्तियाँ",

    // Issue details sections
    timeline: "समयरेखा",
    additionalInformation: "अतिरिक्त जानकारी",

    // Issue status
    statusReported: "दर्ज किया गया",
    statusAgendaCreated: "एजेंडा में चुना गया",
    statusDiscussedInGramSabha: "ग्राम सभा में चर्चित",
    statusResolved: "हल किया गया",
    statusTransferred: "आगे बढ़ाया गया",
    statusNoActionNeeded: "कोई कार्रवाई आवश्यक नहीं",

    // Categories
    categoryCultureAndNature: "संस्कृति और प्रकृति",
    categoryInfrastructure: "बुनियादी सुविधाएँ",
    categoryEarningOpportunities: "आमदनी के अवसर",
    categoryBasicAmenities: "मूलभूत सुविधाएँ",
    categorySocialWelfareSchemes: "सामाजिक कल्याण योजनाएँ",
    categoryOther: "अन्य",

    // Subcategories - Culture and Nature
    subcategoryFestivals: "समारोह",
    subcategoryTreesAndForests: "पेड़ और जंगल",
    subcategorySoil: "मिट्टी",
    subcategoryNaturalWaterResources: "प्राकृतिक जल संसाधन",
    subcategoryReligiousPlaces: "धार्मिक स्थान",

    // Subcategories - Infrastructure
    subcategoryLand: "भूमि और मिट्टी",
    subcategoryWater: "पानी",
    subcategoryEnergy: "बिजली",
    subcategoryTransportation: "सड़क, जलमार्ग, पुलिया",
    subcategoryCommunication: "दूर संचार",

    // Subcategories - Earning Opportunities
    subcategoryAgriculture: "कृषि",
    subcategoryAnimalHusbandry: "पशुपालन, डेयरी और मुर्गीपालन",
    subcategoryFisheries: "मत्स्य पालन",
    subcategorySmallScaleIndustries: "लघु उद्योग",
    subcategoryMinorForestProduce: "वन उपज",
    subcategoryKhadiAndVillageIndustries: "खादी, ग्राम एवं कुटीर उद्योग",

    // Subcategories - Basic Amenities
    subcategoryHealth: "स्वास्थ्य",
    subcategoryEducation: "शिक्षा",
    subcategoryHousingAndSanitation: "आवास और स्वच्छता",
    subcategorySportsAndEntertainment: "खेल और मनोरंजन",
    subcategoryFood: "भोजन",

    // Subcategories - Social Welfare Schemes
    subcategoryWeakerSections: "कमजोर या पिछड़ा वर्ग (एससी/एसटी/ओबीसी)",
    subcategoryHandicappedWelfare: "विकलांगों और मानसिक रूप से विकलांगों",
    subcategoryFamilyWelfare: "परिवार कल्याण",
    subcategoryWomenAndChildDevelopment: "महिला और बाल विकास",
    subcategoryPovertyAlleviation: "गरीबी उन्मूलन",

    // Subcategories - Other
    subcategoryOther: "अन्य",

    // Errors
    errorMissingFields: "कृपया सभी आवश्यक फ़ील्ड भरें",
    errorCameraAccess: "कैमरा एक्सेस अस्वीकृत",
    errorAudioAccess: "माइक्रोफोन एक्सेस अस्वीकृत",
    errorNetworkIssue: "नेटवर्क त्रुटि। कृपया पुनः प्रयास करें",
    errorUploadingAttachment: "अटैचमेंट अपलोड करने में त्रुटि",
    errorFetchingIssues: "मुद्दे प्राप्त करने में त्रुटि",
    errorReportingIssue: "मुद्दा दर्ज करने में त्रुटि",

    // Backend Error Messages
    errorValidFaceDescriptor: "प्रमाणीकरण के लिए वैध चेहरे का विवरण आवश्यक है",
    errorVoterIdRequired: "मतदाता पहचान पत्र के अंतिम 4 अंक आवश्यक हैं",
    errorPanchayatNotFound: "पंचायत नहीं मिली",
    errorNoRegisteredUsers:
      "मिलान वाले मतदाता पहचान पत्र के साथ कोई पंजीकृत उपयोगकर्ता नहीं मिला",
    errorMultipleMatches:
      "कई संभावित मिलान पाए गए। कृपया पुनः प्रयास करें या प्रशासक से संपर्क करें।",
    errorFaceNotRecognized:
      "चेहरा पहचाना नहीं गया। कृपया पुनः प्रयास करें या प्रशासक से संपर्क करें।",
    errorUserRegistrationIncomplete:
      "उपयोगकर्ता पंजीकरण अधूरा है। कृपया प्रशासक से संपर्क करें।",
    errorAuthenticationSuccessful: "प्रमाणीकरण सफल",
    errorUserNotFound: "उपयोगकर्ता नहीं मिला",
    errorFetchingProfile: "नागरिक प्रोफ़ाइल प्राप्त करने में त्रुटि",
    errorFaceAuthentication: "चेहरे की प्रमाणीकरण के दौरान त्रुटि",

    // Gram Sabha Management
    gramSabhaManagement: "ग्राम सभा प्रबंधन",
    scheduleMeeting: "बैठक शेड्यूल करें",
    editMeeting: "ग्राम सभा बैठक संपादित करें",
    createMeeting: "नई ग्राम सभा बैठक बनाएं",
    pastMeetings: "पिछली बैठकें",
    titleOptional: "शीर्षक (वैकल्पिक)",
    titleHelperText:
      "यदि खाली छोड़ा जाता है, तो शीर्षक स्वचालित रूप से उत्पन्न किया जाएगा",
    previewTitle: "पूर्वावलोकन शीर्षक",
    date: "तिथि",
    time: "समय",
    duration: "अवधि (घंटे)",
    durationMins: "अवधि (मिनट)",
    durationHelperText: "घंटों में अवधि (0.25-8)",
    location: "स्थान",
    agenda: "एजेंडा",
    addAgendaItem: "एजेंडा आइटम जोड़ें",
    agendaHelperText: "ग्राम सभा बैठक के लिए विस्तृत एजेंडा दर्ज करें",
    description: "विवरण",
    descriptionHelperText: "बैठक के बारे में अतिरिक्त विवरण (वैकल्पिक)",
    deleteMeeting: "ग्राम सभा बैठक हटाएं",
    deleteConfirmation:
      "क्या आप वाकई इस ग्राम सभा बैठक को हटाना चाहते हैं? यह कार्रवाई पूर्ववत नहीं की जा सकती।",
    addAttendance: "उपस्थिति जोड़ें",
    name: "नाम",
    age: "आयु",
    gender: "लिंग",
    contactNumber: "संपर्क नंबर",
    male: "पुरुष",
    female: "महिला",
    other: "अन्य",
    download: "डाउनलोड",
    meetingNotFound: "बैठक नहीं मिली",
    meetingLink: "बैठक लिंक",
    uploadFile: "फ़ाइल अपलोड करें",
    fileSelected: "फ़ाइल चयनित",
    filesSelected: "फ़ाइलें चयनित",
    clickToUpload: "अपलोड करने के लिए क्लिक करें",
    uploadFiles: "फ़ाइल अपलोड करें",
    fileName: "फ़ाइल का नाम",
    meetingConcludedInfo:
      "चूंकि बैठक समाप्त हो चुकी है, आप केवल आवश्यकतानुसार कोई अटैचमेंट अपलोड कर सकते हैं। बैठक विवरण देखने के लिए कृपया क्रियाएँ अनुभाग में विवरण देखें (आंख) बटन पर क्लिक करें।",
    noAgendaInfo:
      "कोई एजेंडा आइटम उपलब्ध नहीं है। कृपया सुनिश्चित करें कि इस पंचायत के मुद्दों को संक्षेपित किया गया है।",

    // Table Headers
    tableTitle: "शीर्षक",
    tableDateTime: "तिथि और समय",
    tableLocation: "स्थान",
    tableDuration: "अवधि",
    tableStatus: "स्थिति",
    tableActions: "कार्रवाई",
    noDataToDisplay: "दिखाने के लिए कोई डेटा नहीं है",

    // Official Dashboard
    officialPortal: "अधिकारी पोर्टल",
    backToDashboard: "डैशबोर्ड पर वापस जाएं",
    createIssue: "मुद्दा बनाएं",
    manageIssues: "मुद्दों का प्रबंधन करें",
    createIssuesDesc: "नागरिकों की ओर से नए मुद्दे बनाएं",
    manageIssuesDesc: "सभी पंचायत मुद्दों को देखें और प्रबंधित करें",
    processPendingIssues: "लंबित मुद्दों के अनुरोधों को प्रक्रिया करें",
    updateStatus: "चल रहे मुद्दों की स्थिति अपडेट करें",
    reviewHistory: "हल किए गए मुद्दों का इतिहास समीक्षा करें",
    createWithDetails: "विस्तृत विवरण के साथ मुद्दे बनाएं",
    attachDocuments: "समर्थन दस्तावेज़ संलग्न करें",
    setPriority: "प्राथमिकता स्तर और श्रेणियां निर्धारित करें",
    changePassword: "पासवर्ड बदलें",
    passwordChangeError: "पासवर्ड बदलने में त्रुटि",
    pendingIssues: "लंबित मुद्दे",
    inProgressIssues: "प्रगति में मुद्दे",
    resolvedIssues: "हल किए गए मुद्दे",
    totalIssues: "कुल मुद्दे",
    viewAllIssues: "सभी मुद्दे देखें",
    manageGramSabha: "ग्राम सभा प्रबंधन",
    scheduleMeetings: "बैठकें शेड्यूल करें",
    manageAttendees: "प्रतिभागियों का प्रबंधन करें",
    trackAgendas: "एजेंडा ट्रैक करें",
    gramSabhaDesc: "ग्राम सभा बैठकों का प्रबंधन",
    titleHelperText:
      "यदि खाली छोड़ा जाता है, तो शीर्षक स्वचालित रूप से उत्पन्न किया जाएगा",
    previewTitle: "पूर्वावलोकन शीर्षक",
    date: "तिथि",
    time: "समय",
    duration: "अवधि",
    durationHelperText: "अवधि मिनटों में (15-480)",
    location: "स्थान",
    agenda: "एजेंडा",
    agendaHelperText: "ग्राम सभा बैठक का विस्तृत एजेंडा दर्ज करें",
    descriptionHelperText: "बैठक का अतिरिक्त विवरण (वैकल्पिक)",
    deleteMeeting: "बैठक हटाएं",
    deleteConfirmation:
      "क्या आप वाकई इस बैठक को हटाना चाहते हैं? यह कार्रवाई पूर्ववत नहीं की जा सकती।",
    name: "नाम",
    age: "आयु",
    gender: "लिंग",
    contactNumber: "संपर्क नंबर",
    male: "पुरुष",
    female: "महिला",
    other: "अन्य",
    download: "डाउनलोड",
    tableTitle: "शीर्षक",
    tableDateTime: "तिथि और समय",
    tableLocation: "स्थान",
    tableDuration: "अवधि",
    tableStatus: "स्थिति",
    tableActions: "कार्रवाई",
    noDataToDisplay: "दिखाने के लिए कोई डेटा नहीं है",
    scheduleMeetings: "आगामी ग्राम सभा बैठकें शेड्यूल करें",
    manageAttendees: "प्रतिभागियों और भागीदारी का प्रबंधन करें",
    trackAgendas: "बैठक एजेंडा और प्रस्तावों को ट्रैक करें",
    gramSabhaDesc: "ग्राम सभा बैठकों को शेड्यूल और प्रबंधित करें",
    viewDetails: "विवरण देखें",
    gramSabhaDetails: "ग्राम सभा विवरण",

    // Gram Sabha Status
    statusSCHEDULED: "निर्धारित",
    statusCANCELLED: "रद्द",
    statusUNSCHEDULED: "अनिर्धारित",
    statusCONCLUDED: "समाप्त",
    statusIN_PROGRESS: "प्रगति में",
    statusRESCHEDULED: "पुनर्निर्धारित",

    // Gram Sabha Details
    minutes: "मिनट",
    hours: "घंटे",
    status: "स्थिति",
    fileType: "फ़ाइल का प्रकार",
    uploadedAt: "अपलोड की तिथि",
    noAttachments: "अभी तक कोई अटैचमेंट अपलोड नहीं किया गया है",
    downloadPDF: "पीडीएफ डाउनलोड करें",
    downloadCSV: "सीएसवी डाउनलोड करें",
    attachFile: "फ़ाइल संलग्न करें",
    rsvpStats: "उपस्थिति पुष्टि आंकड़े",
    noResponse: "कोई प्रतिक्रिया नहीं",
    totalRegisteredUsers: "कुल पंजीकृत उपयोगकर्ता",
    noAgenda: "कोई एजेंडा उपलब्ध नहीं है",
    translationInProgress: "कुछ अनुवाद प्रगति में हैं। कृपया कुछ क्षण प्रतीक्षा करें।",
    noDescription: "कोई विवरण उपलब्ध नहीं है",

    // Upcoming Meetings
    upcomingMeeting: "आगामी ग्राम सभा बैठक",
    noUpcomingMeetings: "कोई आगामी बैठक निर्धारित नहीं है",
    meetingDetails: "बैठक विवरण",
    rsvp: "उपस्थिति पुष्टि",
    attending: "उपस्थित हो रहे हैं",
    notAttending: "उपस्थित नहीं हो रहे हैं",
    mayAttend: "शायद उपस्थित होंगे",
    pastGramSabhaMeetings: "पिछली ग्राम सभा बैठकें",
    noPastMeetings: "कोई पिछली बैठक उपलब्ध नहीं है",
    viewAllMeetings: "सभी बैठकें देखें",
    districtState: "जिला/राज्य",
    welcome: "स्वागत है",

    // TodaysMeetingsBanner
    todaysMeeting: "आज की बैठक",
    noMeetingsToday: "आज के लिए कोई बैठक निर्धारित नहीं है",
    markAttendance: "उपस्थिति दर्ज करें",
    attendanceStats: "उपस्थिति आंकड़े",
    totalVoters: "कुल मतदाता",
    totalRegistered: "कुल पंजीकृत",
    present: "उपस्थित",
    quorumRequired: "निर्धारित उपस्थिति संख्या आवश्यक",
    attendanceProgress: "उपस्थिति प्रगति",
    attendeesNeeded: "प्रतिभागियों की आवश्यकता",
    attendeesPresent: "प्रतिभागी उपस्थित",
    quorumIs: "निर्धारित उपस्थिति संख्या है",
    quorumMet: "निर्धारित उपस्थिति संख्या पूरी हुई",
    quorumNotMet: "निर्धारित उपस्थिति संख्या पूरी नहीं हुई",
    showMeetingDetails: "बैठक विवरण देखें",
    joinMeeting: "बैठक में शामिल हों",
    endMeeting: "बैठक समाप्त करें",
    verifyAttendee: "प्रतिभागी सत्यापित करें",
    enterLastFourDigits: "मतदाता पहचान पत्र के अंतिम 4 अंक दर्ज करें",
    faceVerification: "चेहरा सत्यापन",
    cameraInstructions:
      "प्रतिभागी की पहचान सत्यापित करने के लिए कैमरा का उपयोग किया जाएगा",
    loadingModels: "मॉडल लोड हो रहे हैं...",
    stopCamera: "कैमरा बंद करें",

    //Attendance
    verifyAttendance: "उपस्थिति सत्यापित करें",
    attendanceReportTitle: "ग्राम सभा उपस्थिति रिपोर्ट",
    panchayatDetails: "पंचायत विवरण",
    title: "शीर्षक",
    genderStats: "लिंग आधारित आँकड़े",
    casteStats: "जाति वर्गीकरण",
    attendanceList: "उपस्थिति सूची",
    sNo: "क्रम संख्या",
    casteCategory: "जाति वर्ग",
    verificationMethod: "सत्यापन विधि",
    noData: "कोई रिकॉर्ड उपलब्ध नहीं",

    //Agenda
    gramSabhaAgendaNotice: "ग्राम सभा बैठक – कार्यसूची सूचना",
    gramSabhaNoticeText:
      "सभी सम्माननीय ग्रामीणों को सूचित किया जाता है कि उपरोक्त विवरणानुसार ग्राम सभा की बैठक आयोजित की जा रही है। कृपया समय पर उपस्थित होकर गाँव के विकास में अपनी भागीदारी सुनिश्चित करें।",
    newIssuesAndPlanHeading: "नए मुद्दे एवं आगामी कार्य योजना",
    newIssuesAndPlanDescription:
      "इस खंड में, ग्राम सभा के सदस्य वर्तमान और भविष्य की जरूरतों पर चर्चा कर सकते हैं, नए प्रस्ताव रख सकते हैं, और गाँव के समग्र विकास के लिए योजनाएँ बना सकते हैं।",
    linkedIssues: "संबंधित मुद्दे",
    filterAll: "सभी",
    filterCategory: "श्रेणी",
    filterSubcategory: "उपश्रेणी",
    filterStatusAll: "सभी मुद्दे",
    filterStatusCurrent: "वर्तमान आइटम से जुड़े",
    filterStatusOther: "अन्य आइटम से जुड़े",
    filterStatusNone: "अजोड़ मुद्दे",
    filterStatusExplanation: "पृष्ठभूमि का रंग लिंक की स्थिति दर्शाता है: नीला=वर्तमान आइटम से जुड़ा; धूसर=अन्य आइटम से जुड़ा; सफेद=अजोड़",
    filterReset: "फ़िल्टर रीसेट करें",
    filters: "फ़िल्टर",
    secretary: "ग्राम सचिव",
    sarpanch: "सरपंच",
    gramPanchayat: "ग्राम पंचायत",
    serialNo: "क्रमांक",
    issueOwner: "मुद्दा किसका है",
    issueDescription: "मुद्दे का विवरण",
    village: "गांव",
  },
};

export default translations;
