const cron = require('node-cron');
const mongoose = require('mongoose');
const Issue = require('../models/Issue');
const Panchayat = require('../models/Panchayat');
const IssueSummary = require('../models/IssueSummary');
const SummaryRequest = require('../models/SummaryRequest');
const agendaService = require('../services/agendaService');
const transcriptionService = require('../services/transcriptionService');

// Cron job to initiate issue summary generation
const initiateSummaryGeneration = cron.schedule('0 * * * *', async () => {
    try {
        const panchayats = await Panchayat.find({});
        for (const panchayat of panchayats) {
            // Check if a summary request is already being processed for this panchayat
            const existingRequest = await SummaryRequest.findOne({
                panchayatId: panchayat._id,
                status: 'PROCESSING'
            });

            if (existingRequest) {
                continue;
            }

            const unsummarizedIssues = await Issue.find({
                panchayatId: panchayat._id,
                isSummarized: { $ne: true },
                'transcription.status': 'COMPLETED'
            });

            if (unsummarizedIssues.length === 0) {
                continue;
            }

            const existingSummary = await IssueSummary.findOne({ panchayatId: panchayat._id });
            let response;
            let requestType;

            if (existingSummary && existingSummary.agendaItems.length > 0) {
                requestType = 'UPDATE';
                const currentAgenda = existingSummary.agendaItems.map(item => ({
                    title: item.title.en,
                    description: item.description.en,
                    linked_issues: item.linkedIssues.map(id => id.toString())
                }));
                response = await agendaService.initiateUpdateSummary(currentAgenda, unsummarizedIssues, panchayat.language);
            } else {
                requestType = 'CREATE';
                response = await agendaService.initiateNewSummary(unsummarizedIssues, panchayat?.language);
            }

            await new SummaryRequest({
                requestId: response.request_id,
                panchayatId: panchayat._id,
                requestType: requestType,
                status: 'PROCESSING',
                status_url: response.status_url,
                result_url: response.result_url
            }).save();
        }
    } catch (error) {
        console.error(`[CronJobs] Error in initiateSummaryGeneration:`, {
            error: error.message,
            stack: error.stack
        });
    }
});


// Cron job to fetch results of summary generation
const fetchSummaryResults = cron.schedule('0 * * * *', async () => {
    try {
        const pendingRequests = await SummaryRequest.find({ status: 'PROCESSING' });

        for (const request of pendingRequests) {
            const status = await agendaService.checkSummaryStatus(request.requestId);

            if (status.status === 'completed') {
                const responseData = await agendaService.getSummaryResult(request.result_url);
                const result = responseData;

                if (result && result.llm_status === 'success') {
                    // Helper to safely parse stringified JSON
                    const safeParseJSON = (jsonString) => {
                        if (typeof jsonString !== 'string') return jsonString; // Already an object/array
                        try {
                            return JSON.parse(jsonString);
                        } catch (e) {
                            console.error(`[CronJobs] Failed to parse JSON string: `, jsonString, e);
                            return null; // Return null to indicate failure
                        }
                    };

                    // Normalize all top-level keys to lowercase
                    const normalizedResult = {};
                    for (const key in result) {
                        normalizedResult[key.toLowerCase()] = result[key];
                    }

                    // Process each agenda (english, hindi, local)
                    const panchayatLang = (normalizedResult.primary_language || 'en').toLowerCase();
                    const agendaKeys = ['english_agenda', 'hindi_agenda', `${panchayatLang}_agenda`];
                    
                    agendaKeys.forEach(key => {
                        if (normalizedResult[key]) {
                            // First-level parse: The whole agenda might be a string
                            let agendaArray = safeParseJSON(normalizedResult[key]);

                            // Second-level parse: Each item's issue_ids might also be a string
                            if (Array.isArray(agendaArray)) {
                                agendaArray.forEach(item => {
                                    if (item && item.issue_ids) {
                                        item.issue_ids = safeParseJSON(item.issue_ids);
                                    }
                                });
                                normalizedResult[key] = agendaArray;
                            } else {
                                normalizedResult[key] = []; // Default to empty array if top-level parse fails
                            }
                        }
                    });

                    const issueUpdatePayload = {}; // Using a map to collect all description updates for each issue

                    const processAgendaForUpdates = (agenda, langKey) => {
                        if (!agenda || !Array.isArray(agenda)) return;
                        agenda.forEach(item => {
                            if (item.issue_ids && typeof item.issue_ids === 'object' && !Array.isArray(item.issue_ids)) {
                                for (const issueId in item.issue_ids) {
                                    if (Object.prototype.hasOwnProperty.call(item.issue_ids, issueId)) {
                                        const description = item.issue_ids[issueId];
                                        if (mongoose.Types.ObjectId.isValid(issueId)) {
                                            if (!issueUpdatePayload[issueId]) {
                                                issueUpdatePayload[issueId] = {};
                                            }
                                            issueUpdatePayload[issueId][langKey] = description;
                                        }
                                    }
                                }
                            }
                        });
                    };

                    const localAgendaKey = `${panchayatLang}_agenda`;

                    // Process all language agendas to gather description updates
                    processAgendaForUpdates(normalizedResult.english_agenda, 'en');
                    processAgendaForUpdates(normalizedResult.hindi_agenda, 'hi');
                    if (normalizedResult[localAgendaKey] && localAgendaKey !== 'english_agenda' && localAgendaKey !== 'hindi_agenda') {
                        processAgendaForUpdates(normalizedResult[localAgendaKey], panchayatLang);
                    }

                    // Perform a single bulk write operation to update all issues with their new descriptions
                    const bulkOps = Object.keys(issueUpdatePayload).map(issueId => {
                        const updates = {};
                        // Only set subfields, do not set the parent field
                        for (const lang in issueUpdatePayload[issueId]) {
                            updates[`transcription.description.${lang}`] = issueUpdatePayload[issueId][lang];
                        }
                        return {
                            updateOne: {
                                filter: { _id: issueId },
                                update: { $set: updates }
                            }
                        };
                    });

                    if (bulkOps.length > 0) {
                        await Issue.bulkWrite(bulkOps);
                    }

                    // --- Proceed with creating/updating the IssueSummary document ---
                    const getCleanIssueIds = (agenda) => {
                        if (!agenda || !Array.isArray(agenda)) return [];
                        return agenda.flatMap(item => {
                            if (item.issue_ids && typeof item.issue_ids === 'object' && !Array.isArray(item.issue_ids)) {
                                return Object.keys(item.issue_ids)
                                    .map(issueId => mongoose.Types.ObjectId.isValid(issueId) ? issueId : null)
                                    .filter(id => id !== null);
                            }
                            return [];
                        });
                    };

                    const allIssueIds = [...new Set(getCleanIssueIds(normalizedResult.english_agenda))];

                    const agendaItems = normalizedResult.english_agenda.map((enItem, index) => {
                        const hiItem = normalizedResult.hindi_agenda[index];
                        const localItem = normalizedResult[localAgendaKey] ? normalizedResult[localAgendaKey][index] : enItem;

                        // Extract string values from title and description objects
                        const enTitle = typeof enItem.title === 'object' && enItem.title !== null ? enItem.title.en || enItem.title : enItem.title;
                        const hiTitle = typeof hiItem.title === 'object' && hiItem.title !== null ? hiItem.title.en || hiItem.title : hiItem.title;
                        const localTitle = typeof localItem.title === 'object' && localItem.title !== null ? localItem.title.en || localItem.title : localItem.title;
                        
                        const enDescription = typeof enItem.description === 'object' && enItem.description !== null ? enItem.description.en || enItem.description : enItem.description;
                        const hiDescription = typeof hiItem.description === 'object' && hiItem.description !== null ? hiItem.description.en || hiItem.description : hiItem.description;
                        const localDescription = typeof localItem.description === 'object' && localItem.description !== null ? localItem.description.en || localItem.description : localItem.description;

                        // Create Mongoose Map objects for title and description
                        const titleMap = new Map();
                        titleMap.set('en', enTitle);
                        titleMap.set('hi', hiTitle);
                        titleMap.set(panchayatLang, localTitle);
                        
                        const descriptionMap = new Map();
                        descriptionMap.set('en', enDescription);
                        descriptionMap.set('hi', hiDescription);
                        descriptionMap.set(panchayatLang, localDescription);

                        return {
                            _id: new mongoose.Types.ObjectId(),
                            title: titleMap,
                            description: descriptionMap,
                            linkedIssues: getCleanIssueIds([enItem]).map(id => new mongoose.Types.ObjectId(id))
                        };
                    });


                    // check if issue summary already exists for the panchayat
                    const existingSummary = await IssueSummary.findOne({ panchayatId: request.panchayatId });
                    // If it exists and it's agenda items are empty, we update it; otherwise, we create a new one
                    if (existingSummary && existingSummary.agendaItems.length == 0) {
                        await IssueSummary.findOneAndUpdate(
                            { panchayatId: request.panchayatId },
                            {
                                $set: { agendaItems: agendaItems },
                                $addToSet: { issues: { $each: allIssueIds.map(id => new mongoose.Types.ObjectId(id)) } }
                            },
                            { new: true, upsert: true }
                        );
                    }
                    else if (request.requestType === 'CREATE') {
                        await IssueSummary.create({
                            panchayatId: request.panchayatId,
                            agendaItems: agendaItems,
                            issues: allIssueIds.map(id => new mongoose.Types.ObjectId(id)),
                        });
                    } else { // UPDATE
                        await IssueSummary.findOneAndUpdate(
                            { panchayatId: request.panchayatId },
                            {
                                $set: { agendaItems: agendaItems },
                                $addToSet: { issues: { $each: allIssueIds.map(id => new mongoose.Types.ObjectId(id)) } }
                            },
                            { new: true, upsert: true }
                        );
                    }

                    await Issue.updateMany({ _id: { $in: allIssueIds } }, { $set: { isSummarized: true } });
                    request.status = 'COMPLETED';
                    await request.save();

                } else {
                    request.status = 'FAILED';
                    request.error = `LLM processing failed with status: ${result ? result.llm_status : 'N/A'}`;
                }

                await request.save();
            } else if (status.status === 'failed') {
                request.status = 'FAILED';
                request.error = status.error || 'Processing failed at the backend.';
                await request.save();
            }
        }
    } catch (error) {
        console.error(`[CronJobs] Error in fetchSummaryResults:`, {
            error: error.message,
            stack: error.stack
        });
    }
});

// Cron job to retry failed summary requests
const retryFailedSummaryRequests = cron.schedule('*/15 * * * *', async () => {
    try {
        const failedRequests = await SummaryRequest.find({
            status: 'FAILED',
            retryCount: { $lt: 3 }
        });

        for (const request of failedRequests) {
            const panchayat = await Panchayat.findById(request.panchayatId);
            if (!panchayat) {
                console.error(`[CronJobs] Panchayat ${request.panchayatId} not found for failed request. Skipping retry.`);
                request.lastError = "Panchayat not found.";
                await request.save();
                continue;
            }

            const unsummarizedIssues = await Issue.find({
                panchayatId: request.panchayatId,
                isSummarized: { $ne: true },
                'transcription.status': 'COMPLETED'
            });

            if (unsummarizedIssues.length === 0) {
                request.status = 'COMPLETED'; // Or perhaps a new status like 'RESOLVED_NO_ISSUES'
                await request.save();
                continue;
            }

            let response;
            if (request.requestType === 'UPDATE') {
                const existingSummary = await IssueSummary.findOne({ panchayatId: request.panchayatId });
                const currentAgenda = existingSummary ? existingSummary.agendaItems.map(item => ({
                    title: item.title.en,
                    description: item.description.en,
                    linked_issues: item.linkedIssues.map(id => id.toString())
                })) : [];
                response = await agendaService.initiateUpdateSummary(currentAgenda, unsummarizedIssues, panchayat.language);
            } else { // CREATE
                response = await agendaService.initiateNewSummary(unsummarizedIssues, panchayat?.language);
            }
            
            // Update the existing request with new details for the retry attempt
            request.requestId = response.request_id;
            request.status = 'PROCESSING';
            request.status_url = response.status_url;
            request.result_url = response.result_url;
            request.retryCount += 1;
            request.lastError = null;
            await request.save();
        }

    } catch (error) {
        console.error(`[CronJobs] Error in retryFailedSummaryRequests:`, {
            error: error.message,
            stack: error.stack
        });
    }
});