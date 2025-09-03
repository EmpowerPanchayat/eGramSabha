# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Edit user details feature for official and no need to link citizen in case of guest user or Panchayat Secretaries on admin.([#139](https://github.com/EmpowerPanchayat/eGramSabha/issues/139))
- Initial and seed DB scripts.([#155](https://github.com/EmpowerPanchayat/eGramSabha/issues/155))

### Fixed

- Citizen Portal issue list view.([#149](https://github.com/EmpowerPanchayat/eGramSabha/issues/149))
- Save button when mandatory field location is not entered.([#144](https://github.com/EmpowerPanchayat/eGramSabha/issues/144))

## [1.1.0] - 2025-08-20

### Added

- Workaround for using Google meet link instead of Jio meet Link when required.([#145](https://github.com/EmpowerPanchayat/eGramSabha/issues/145))
- Scripts to take backup, import or delete data from DB based on panchayatIds or state names.([#91](https://github.com/EmpowerPanchayat/eGramSabha/issues/91))

### Fixed

- Citizen Portal issues/bugs.([#138](https://github.com/EmpowerPanchayat/eGramSabha/issues/138))

## [1.0.1] - 2025-08-14

### Fixed

- Unable to create new Panchayat issue.([#141](https://github.com/EmpowerPanchayat/eGramSabha/issues/141))

## [1.0.0] - 2025-08-08

### Added

- Multilingual file generation with proper Hindi text rendering and word wrapping.([#57](https://github.com/EmpowerPanchayat/eGramSabha/issues/57))
- Centralized all category and subcategory configurations into a single category.js source file to avoid duplication and improve maintainability. ([#42](https://github.com/EmpowerPanchayat/eGramSabha/issues/42))
- Enhancements to platform configutation. ([#47](https://github.com/EmpowerPanchayat/eGramSabha/issues/47))
- Custom Swagger/OpenAPI documentation generator: Automatically scans Express route files using AST parsing, generates accurate API docs with full endpoint URLs and correct tags. ([#32](https://github.com/EmpowerPanchayat/eGramSabha/issues/32))
- Secure All APIs in Admin with proper auth. ([#15](https://github.com/EmpowerPanchayat/eGramSabha/issues/15))
- Citizen API must be secured with token and proper auth. ([#16](https://github.com/EmpowerPanchayat/eGramSabha/issues/16))
- Migrated user face images storage from local `/uploads` folder to MongoDB GridFS for improved scalability and reliability with thumbnail functionality. ([#17](https://github.com/EmpowerPanchayat/eGramSabha/issues/17))
- add issues with filters, pagination, sorting, and search. ([#45](https://github.com/EmpowerPanchayat/eGramSabha/issues/45))
- Implement End Meeting button and Cron Job for status change.([#71](https://github.com/EmpowerPanchayat/eGramSabha/pull/71))
- Added transcription for issue audio and meeting video.([#68](https://github.com/EmpowerPanchayat/eGramSabha/issues/68))
- Added issue summary generation and updation from issues using LLM.([#67](https://github.com/EmpowerPanchayat/eGramSabha/issues/67))
- Added MoM generation using LLM.([#65](https://github.com/EmpowerPanchayat/eGramSabha/issues/65))
- Added Issue Transcription Implementation.([#65](https://github.com/EmpowerPanchayat/eGramSabha/issues/65))
- Filters for createdFor and createdBy on Issue Creation Page.([#85](https://github.com/EmpowerPanchayat/eGramSabha/issues/85))
- Issue Summary and Agenda generation & display features implementation.
  - Supports linking recorded issues to Gram Sabha agenda.
  - Includes backend schema, APIs, and UI updates for display and PDF download.
  - Admins can review, edit, and finalize agenda items.
  - Improved meeting detail view with final agenda integration.
  ([#78](https://github.com/EmpowerPanchayat/eGramSabha/issues/78), resolves [#79](https://github.com/EmpowerPanchayat/eGramSabha/issues/79), [#80](https://github.com/EmpowerPanchayat/eGramSabha/issues/80), [#81](https://github.com/EmpowerPanchayat/eGramSabha/issues/81), [#94](https://github.com/EmpowerPanchayat/eGramSabha/issues/94))
- Add Agenda Item button on issue summary screen.([#97](https://github.com/EmpowerPanchayat/eGramSabha/issues/97))
- Issue lifecycle after End Meeting.([#125](https://github.com/EmpowerPanchayat/eGramSabha/issues/125))

### Removed

- Removed check-in time from PDF and CSV reports.([#57](https://github.com/EmpowerPanchayat/eGramSabha/issues/57))

### Fixed

- CSV import to upsert users by voter ID instead of deleting existing records.([#31](https://github.com/EmpowerPanchayat/eGramSabha/issues/31))
- Fix data issue on update in Registration View ([#69](https://github.com/EmpowerPanchayat/eGramSabha/pull/69))
- Filtering of issues on the basis of Status ([#84](https://github.com/EmpowerPanchayat/eGramSabha/issues/84))
- Attendance progress bar and message display.([#74](https://github.com/EmpowerPanchayat/eGramSabha/issues/74))
- Language casing to the requests sent to LLM.([#103](https://github.com/EmpowerPanchayat/eGramSabha/issues/103))
- Agenda PDF content splitting issue.([#106](https://github.com/EmpowerPanchayat/eGramSabha/issues/106))
- Unable to schedule a gram sabha issue.([#109](https://github.com/EmpowerPanchayat/eGramSabha/issues/109))

### Changed

- Issue Life Cycle and it's translations. ([#22](https://github.com/EmpowerPanchayat/eGramSabha/issues/22))
- createdFor field with createdForId and update related logic in IssueCreationView and IssueListView.([#85](https://github.com/EmpowerPanchayat/eGramSabha/issues/85))
- Display of gram sabha meeting details based on status.
  - Adds conditional rendering, If gram sabha meeting is CONCLUDED, the basic details cannot be edited.
  ([#100](https://github.com/EmpowerPanchayat/eGramSabha/issues/100))

## [0.2.0] - 2025-05-27

### Added

- Liveliness checks ([#12](https://github.com/EmpowerPanchayat/eGramSabha/issues/12))
- Caste feature implementation ([#5](https://github.com/EmpowerPanchayat/eGramSabha/issues/5))
- Facial Recognition Enhancements ([#10](https://github.com/EmpowerPanchayat/eGramSabha/issues/10))
- API Liveness monitor ([#33](https://github.com/EmpowerPanchayat/eGramSabha/issues/33))
- Attendance Statistics Display and Export feature implementation([#13](https://github.com/EmpowerPanchayat/eGramSabha/issues/13))
- Filters for category, subcategory, and status in issue list ([#18](https://github.com/EmpowerPanchayat/eGramSabha/issues/18))
- Platform level configurations([#27])(https://github.com/EmpowerPanchayat/eGramSabha/issues/27)
- Backend API for filteration with pagination in issues([#19])(https://github.com/EmpowerPanchayat/eGramSabha/issues/19)

### Changed

- favicon, page title, and meta description in app ([#18](https://github.com/EmpowerPanchayat/eGramSabha/issues/18))
- Attendance stats are now displayed only for concluded Gram Sabha meetings. ([#50](https://github.com/EmpowerPanchayat/eGramSabha/issues/50))

## [0.1.0] - 2025-04-23

### Added

- Gram Sabha meeting status and integration ([#24](https://github.com/EmpowerPanchayat/eGramSabha/pull/24))
- Meeting details feature ([#2](https://github.com/EmpowerPanchayat/eGramSabha/pull/2))
- Upcoming and Past Meetings with RSVP
- Attendance implementation
- Officials and Gram Sabha modules

### Fixed

- Show meeting link error
- Logout on refresh issue
- Miscellaneous bug fixes in Gram Sabha and Officials modules

## [0.0.1] - 2025-04-15

### Added

- Initial project commit
- Added `README.md` ([#1](https://github.com/EmpowerPanchayat/eGramSabha/pull/1))

---

[Unreleased]: https://github.com/EmpowerPanchayat/eGramSabha/compare/1.1.0...HEAD
[1.0.1]: https://github.com/EmpowerPanchayat/eGramSabha/compare/1.0.1...1.1.0
[1.0.1]: https://github.com/EmpowerPanchayat/eGramSabha/compare/1.0.0...1.0.1
[1.0.0]: https://github.com/EmpowerPanchayat/eGramSabha/compare/0.2.0...1.0.0
[0.2.0]: https://github.com/EmpowerPanchayat/eGramSabha/compare/0.1.0...0.2.0
[0.1.0]: https://github.com/EmpowerPanchayat/eGramSabha/compare/0.0.1...0.1.0
[0.0.1]: https://github.com/EmpowerPanchayat/eGramSabha/releases/tag/0.0.1
