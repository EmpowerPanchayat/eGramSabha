// Author: Anuj Pratap Singh

const cron = require('node-cron');
require('dotenv').config();
const mongoose = require('mongoose');
const Issue = require('../models/Issue');
const Panchayat = require('../models/Panchayat');
const IssueSummary = require('../models/IssueSummary');
const SummaryRequest = require('../models/SummaryRequest');
const agendaService = require('../services/agendaService');

const INITIATE_SUMMARY_CRON = process.env.INITIATE_SUMMARY_CRON || '0 * * * *';
const FETCH_SUMMARY_RESULTS_CRON = process.env.FETCH_SUMMARY_RESULTS_CRON || '0 * * * *';
const RETRY_FAILED_SUMMARY_CRON = process.env.RETRY_FAILED_SUMMARY_CRON || '*/15 * * * *';

// Cron job to initiate issue summary generation
const initiateSummaryGeneration = cron.schedule(INITIATE_SUMMARY_CRON, async () => {
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

            // Filter out only system-created agenda items
            const systemAgendaItems = existingSummary?.agendaItems?.filter(item => item.createdByType !== 'USER') || [];

            if (systemAgendaItems.length > 0) {
                requestType = 'UPDATE';

                const currentAgenda = systemAgendaItems.map(item => {
                    const title = item.title instanceof Map ? item.title.get('en') : item.title?.en || '';
                    const description = item.description instanceof Map ? item.description.get('en') : item.description?.en || '';
                    return {
                        title,
                        description,
                        linked_issues: Array.isArray(item.linkedIssues)
                            ? item.linkedIssues.map(id => id.toString())
                            : []
                    };
                });

                response = await agendaService.initiateUpdateSummary(
                    currentAgenda,
                    unsummarizedIssues,
                    panchayat?.language.toLowerCase()
                );
            } else {
                requestType = 'CREATE';
                response = await agendaService.initiateNewSummary(unsummarizedIssues, panchayat?.language.toLowerCase());
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
const fetchSummaryResults = cron.schedule(FETCH_SUMMARY_RESULTS_CRON, async () => {
    try {
        const pendingRequests = await SummaryRequest.find({ status: 'PROCESSING' });

        for (const request of pendingRequests) {
            const status = await agendaService.checkSummaryStatus(request.requestId);

            if (status.status !== 'completed') {
                if (status.status === 'failed') {
                    request.status = 'FAILED';
                    request.error = status.error || 'Unknown error from LLM';
                    await request.save();
                }
                continue;
            }

            const result = await agendaService.getSummaryResult(request.result_url);
            if (!result || result.llm_status !== 'success') {
                request.status = 'FAILED';
                request.error = `LLM failed with status: ${result?.llm_status || 'N/A'}`;
                await request.save();
                continue;
            }

            // Normalize and parse agenda result
            const safeParseJSON = (input) => {
                try { return typeof input === 'string' ? JSON.parse(input) : input; }
                catch { return []; }
            };

            const lang = (result.primary_language || 'en').toLowerCase();
            const langs = ['english', 'hindi', lang];

            langs.forEach(key => {
                result[`${key}_agenda`] = safeParseJSON(result[`${key}_agenda`]);
            });

            const agendaByLang = {
                en: result.english_agenda || [],
                hi: result.hindi_agenda || [],
                [lang]: result[`${lang}_agenda`] || []
            };

            const issueDescriptions = {};

            const extractDescriptions = (agenda, langKey) => {
                agenda.forEach(item => {
                const agendaDescription = typeof item.description === 'object' ? item.description.en || '' : item.description;
                if (item.issue_ids && typeof item.issue_ids === 'object') {
                    for (const [issueId, shortLabel] of Object.entries(item.issue_ids)) {
                        if (!mongoose.Types.ObjectId.isValid(issueId)) continue;
                            issueDescriptions[issueId] = issueDescriptions[issueId] || {};
                            issueDescriptions[issueId][langKey] = shortLabel;
                        }
                } else if (Array.isArray(item.linked_issues)) {
                    // Fallback: use full description
                    item.linked_issues.forEach(issueId => {
                        if (!mongoose.Types.ObjectId.isValid(issueId)) return;
                            issueDescriptions[issueId] = issueDescriptions[issueId] || {};
                            issueDescriptions[issueId][langKey] = agendaDescription;
                        });
                    }
                });
            };

            extractDescriptions(agendaByLang.en, 'en');
            extractDescriptions(agendaByLang.hi, 'hi');
            if (!['en', 'hi'].includes(lang)) extractDescriptions(agendaByLang[lang], lang);

            const descriptionOps = Object.entries(issueDescriptions).map(([issueId, langs]) => {
                const $set = {};
                for (const l in langs) {
                    $set[`transcription.description.${l}`] = langs[l];
                }
                return {
                    updateOne: {
                        filter: { _id: issueId },
                        update: { $set }
                    }
                };
            });

            if (descriptionOps.length > 0) {
                await Issue.bulkWrite(descriptionOps);
            }

            const flattenLangField = (obj) => {
                const out = {};
                for (const l in obj) {
                    const val = obj[l];
                    out[l] = typeof val === 'string' ? val : (val?.en || '');
                }
                return out;
            };

            const extractIssueIds = (item) => {
                if (typeof item.issue_ids === 'object') {
                    return Object.keys(item.issue_ids).filter(id => mongoose.Types.ObjectId.isValid(id));
                } else if (Array.isArray(item.linked_issues)) {
                    return item.linked_issues.filter(id => mongoose.Types.ObjectId.isValid(id));
                }
                return [];
            };

            const enAgenda = agendaByLang.en;
            const newSystemAgendaItems = enAgenda.map((enItem, i) => {
                const hiItem = agendaByLang.hi[i] || {};
                const loItem = agendaByLang[lang][i] || {};

                return {
                    _id: new mongoose.Types.ObjectId(),
                    title: flattenLangField({
                        en: enItem.title,
                        hi: hiItem.title,
                        [lang]: loItem.title
                    }),
                    description: flattenLangField({
                        en: enItem.description,
                        hi: hiItem.description,
                        [lang]: loItem.description
                    }),
                    linkedIssues: extractIssueIds(enItem).map(id => new mongoose.Types.ObjectId(id)),
                    estimatedDuration: 15,
                    createdByType: 'SYSTEM'
                };
            });

            const existingSummary = await IssueSummary.findOne({ panchayatId: request.panchayatId });
            const userAgendaItems = existingSummary?.agendaItems?.filter(a => a.createdByType === 'USER') || [];

            const dedupedSystemItems = newSystemAgendaItems.filter(newItem => {
                return !userAgendaItems.some(userItem =>
                    userItem.title?.en?.trim() === newItem.title?.en?.trim()
                );
            });

            const finalAgenda = [...userAgendaItems, ...dedupedSystemItems];
            const uniqueIssueIds = [
                ...new Set(finalAgenda.flatMap(item => item.linkedIssues.map(id => id.toString())))
            ].map(id => new mongoose.Types.ObjectId(id));

            await IssueSummary.findOneAndUpdate(
                { panchayatId: request.panchayatId },
                {
                $set: {
                    agendaItems: finalAgenda,
                    issues: uniqueIssueIds
                }
                },
                { upsert: true }
            );

            await Issue.updateMany({ _id: { $in: uniqueIssueIds } }, { $set: { isSummarized: true } });

            request.status = 'COMPLETED';
            await request.save();
        }
    } catch (err) {
        console.error(`[CronJobs] Error in fetchSummaryResults:`, {
            error: err.message,
            stack: err.stack
        });
    }
});

// Cron job to retry failed summary requests
const retryFailedSummaryRequests = cron.schedule(RETRY_FAILED_SUMMARY_CRON, async () => {
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
                request.status = 'COMPLETED';
                await request.save();
                continue;
            }

            let response;
            if (request.requestType === 'UPDATE') {
                const existingSummary = await IssueSummary.findOne({ panchayatId: request.panchayatId });
                const currentAgenda = existingSummary?.agendaItems
                ?.filter(item => item.createdByType !== 'USER')
                .map(item => {
                    const getValue = (field) =>
                    typeof field === 'string'
                        ? field
                        : (typeof field === 'object' && field !== null && typeof field.en === 'string')
                        ? field.en
                        : '';

                    return {
                    title: getValue(item.title),
                    description: getValue(item.description),
                    linked_issues: Array.isArray(item.linkedIssues)
                        ? item.linkedIssues.map(id => id.toString())
                        : []
                    };
                }) || [];

                if (currentAgenda.length === 0) {
                request.status = 'FAILED';
                request.lastError = 'No SYSTEM agenda items found to update.';
                await request.save();
                continue;
                }

                response = await agendaService.initiateUpdateSummary(
                currentAgenda,
                unsummarizedIssues,
                panchayat?.language.toLowerCase()
                );
            } else if (request.requestType === 'CREATE') {
                response = await agendaService.initiateNewSummary(
                unsummarizedIssues,
                panchayat?.language.toLowerCase()
                );
            } else {
                request.status = 'FAILED';
                request.lastError = 'Unknown request type during retry.';
                await request.save();
                continue;
            }
            request.requestId = response.request_id;
            request.status = 'PROCESSING';
            request.status_url = response.status_url;
            request.result_url = response.result_url;
            request.retryCount += 1;
            request.lastError = null;
            request.lastRetryAt = new Date(); // Optional: track retry time
            await request.save();

            // Optional: small delay between retries to avoid rapid-fire API hits
            await new Promise(resolve => setTimeout(resolve, 300)); // 300ms delay
        }

    } catch (error) {
        console.error(`[CronJobs] Error in retryFailedSummaryRequests:`, {
            error: error.message,
            stack: error.stack
        });
    }
});

module.exports = {
  initiateSummaryGeneration,
  fetchSummaryResults,
  retryFailedSummaryRequests
};