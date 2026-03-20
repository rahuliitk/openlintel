import { relations } from 'drizzle-orm';
import { users, accounts, sessions } from './auth';
import {
  projects, rooms, designVariants, uploads, userApiKeys, jobs,
  bomResults, drawingResults, cutlistResults, mepCalculations,
  categories, products, vendors, productPrices, productEmbeddings,
  schedules, milestones, siteLogs, changeOrders,
  purchaseOrders, payments, invoices,
  comments, approvals, notifications,
  contractors, contractorReviews, contractorAssignments,
  yjsDocuments,
  // Phase 4
  costPredictions, timelinePredictions, budgetScenarios,
  sustainabilityReports, portfolios, portfolioProjects,
  // Phase 5
  digitalTwins, iotDevices, iotDataPoints, emergencyReferences,
  maintenanceSchedules, maintenanceLogs, warranties, warrantyClaims,
  offcutListings, offcutInquiries, projectGalleryEntries, contractorReferrals,
  developerApps, apiAccessTokens, apiRequestLogs, webhookSubscriptions,
  exchangeRates,
  // Missing features (existing)
  qualityCheckpoints, punchListItems, handoverPackages,
  collaborationThreads, collaborationMessages,
  deliveryTracking, stylePreferences,
  // Missing features (new A-L)
  parametricRules, designTemplates, parametricHistory,
  floorPlanCanvases, wallSegments, openings, staircases,
  exteriorDesigns, cabinetLayouts, bathroomLayouts, kitchenBathLayouts, lightingFixtures,
  lightingDesigns, materialBoards, renderJobs,
  structuralElements, structuralAnalyses, siteAnalysisItems, siteAnalyses, energyModels, energyModelItems, acousticAssessments, acousticAnalyses,
  rfis, submittals, submittalItems, progressReports,
  safetyRecords, safetyChecklists, safetyIncidents, safetyTrainingRecords,
  permits, inspections, documentVersions,
  projectClients, selectionCategories, selections,
  inspirationBoards, inspirationPins, walkthroughAnnotations,
  contractTemplates, proposals, leads, leadActivities,
  timeEntries, insuranceCertificates,
  teams, teamMembers, projectAssignments,
  spacePlans, complianceQueries, complianceReports, complianceChatMessages, droneCaptures, lidarScans, smartHomePlans,
  closetLayouts, theaterDesigns, outdoorDesigns, universalDesignChecks, multiUnitPlans,
  drawingSetConfigs, specifications, specSections, asBuiltMarkups, asBuiltFieldMarkups,
  integrationConfigs, communicationPreferences, propertyValuations,
  serviceBookings, sampleRequests,
  marketBenchmarks, laborRates, postOccupancySurveys, lessonsLearned, designFeedback,
} from './app';

// ─── Auth Relations ──────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  projects: many(projects),
  uploads: many(uploads),
  apiKeys: many(userApiKeys),
  jobs: many(jobs),
  comments: many(comments),
  notifications: many(notifications),
  siteLogs: many(siteLogs),
  contractorReviews: many(contractorReviews),
  // Phase 4
  portfolios: many(portfolios),
  // Phase 5
  offcutListings: many(offcutListings),
  offcutInquiries: many(offcutInquiries),
  contractorReferrals: many(contractorReferrals),
  developerApps: many(developerApps),
  apiAccessTokens: many(apiAccessTokens),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

// ─── Core App Relations ──────────────────────────────────────────────────────

export const userApiKeysRelations = relations(userApiKeys, ({ one }) => ({
  user: one(users, { fields: [userApiKeys.userId], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  rooms: many(rooms),
  uploads: many(uploads),
  jobs: many(jobs),
  schedules: many(schedules),
  siteLogs: many(siteLogs),
  changeOrders: many(changeOrders),
  purchaseOrders: many(purchaseOrders),
  payments: many(payments),
  invoices: many(invoices),
  comments: many(comments),
  approvals: many(approvals),
  contractorAssignments: many(contractorAssignments),
  // Phase 4
  costPredictions: many(costPredictions),
  timelinePredictions: many(timelinePredictions),
  budgetScenarios: many(budgetScenarios),
  sustainabilityReports: many(sustainabilityReports),
  portfolioProjects: many(portfolioProjects),
  // Phase 5
  digitalTwins: many(digitalTwins),
  emergencyReferences: many(emergencyReferences),
  maintenanceSchedules: many(maintenanceSchedules),
  warranties: many(warranties),
  projectGalleryEntries: many(projectGalleryEntries),
  // Missing features
  qualityCheckpoints: many(qualityCheckpoints),
  punchListItems: many(punchListItems),
  handoverPackages: many(handoverPackages),
  collaborationThreads: many(collaborationThreads),
  deliveryTracking: many(deliveryTracking),
  stylePreferences: many(stylePreferences),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  project: one(projects, { fields: [rooms.projectId], references: [projects.id] }),
  designVariants: many(designVariants),
  uploads: many(uploads),
  jobs: many(jobs),
  // Phase 5
  iotDevices: many(iotDevices),
  emergencyReferences: many(emergencyReferences),
}));

export const designVariantsRelations = relations(designVariants, ({ one, many }) => ({
  room: one(rooms, { fields: [designVariants.roomId], references: [rooms.id] }),
  sourceUpload: one(uploads, { fields: [designVariants.sourceUploadId], references: [uploads.id] }),
  bomResults: many(bomResults),
  drawingResults: many(drawingResults),
  cutlistResults: many(cutlistResults),
  mepCalculations: many(mepCalculations),
}));

export const uploadsRelations = relations(uploads, ({ one }) => ({
  user: one(users, { fields: [uploads.userId], references: [users.id] }),
  project: one(projects, { fields: [uploads.projectId], references: [projects.id] }),
  room: one(rooms, { fields: [uploads.roomId], references: [rooms.id] }),
}));

// ─── Jobs ────────────────────────────────────────────────────────────────────

export const jobsRelations = relations(jobs, ({ one }) => ({
  user: one(users, { fields: [jobs.userId], references: [users.id] }),
  project: one(projects, { fields: [jobs.projectId], references: [projects.id] }),
  room: one(rooms, { fields: [jobs.roomId], references: [rooms.id] }),
  designVariant: one(designVariants, { fields: [jobs.designVariantId], references: [designVariants.id] }),
}));

// ─── BOM / Drawings / Cut List / MEP ─────────────────────────────────────────

export const bomResultsRelations = relations(bomResults, ({ one }) => ({
  designVariant: one(designVariants, { fields: [bomResults.designVariantId], references: [designVariants.id] }),
  job: one(jobs, { fields: [bomResults.jobId], references: [jobs.id] }),
}));

export const drawingResultsRelations = relations(drawingResults, ({ one }) => ({
  designVariant: one(designVariants, { fields: [drawingResults.designVariantId], references: [designVariants.id] }),
  job: one(jobs, { fields: [drawingResults.jobId], references: [jobs.id] }),
}));

export const cutlistResultsRelations = relations(cutlistResults, ({ one }) => ({
  designVariant: one(designVariants, { fields: [cutlistResults.designVariantId], references: [designVariants.id] }),
  job: one(jobs, { fields: [cutlistResults.jobId], references: [jobs.id] }),
}));

export const mepCalculationsRelations = relations(mepCalculations, ({ one }) => ({
  designVariant: one(designVariants, { fields: [mepCalculations.designVariantId], references: [designVariants.id] }),
  job: one(jobs, { fields: [mepCalculations.jobId], references: [jobs.id] }),
}));

// ─── Catalogue ───────────────────────────────────────────────────────────────

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'categoryParent',
  }),
  children: many(categories, { relationName: 'categoryParent' }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  vendor: one(vendors, { fields: [products.vendorId], references: [vendors.id] }),
  category_rel: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  prices: many(productPrices),
  productEmbedding: one(productEmbeddings, { fields: [products.id], references: [productEmbeddings.productId] }),
}));

export const productEmbeddingsRelations = relations(productEmbeddings, ({ one }) => ({
  product: one(products, { fields: [productEmbeddings.productId], references: [products.id] }),
}));

export const vendorsRelations = relations(vendors, ({ many }) => ({
  products: many(products),
  productPrices: many(productPrices),
  purchaseOrders: many(purchaseOrders),
}));

export const productPricesRelations = relations(productPrices, ({ one }) => ({
  product: one(products, { fields: [productPrices.productId], references: [products.id] }),
  vendor: one(vendors, { fields: [productPrices.vendorId], references: [vendors.id] }),
}));

// ─── Schedules / Milestones / Site Logs / Change Orders ──────────────────────

export const schedulesRelations = relations(schedules, ({ one, many }) => ({
  project: one(projects, { fields: [schedules.projectId], references: [projects.id] }),
  job: one(jobs, { fields: [schedules.jobId], references: [jobs.id] }),
  milestones: many(milestones),
}));

export const milestonesRelations = relations(milestones, ({ one, many }) => ({
  schedule: one(schedules, { fields: [milestones.scheduleId], references: [schedules.id] }),
  payments: many(payments),
}));

export const siteLogsRelations = relations(siteLogs, ({ one }) => ({
  project: one(projects, { fields: [siteLogs.projectId], references: [projects.id] }),
  user: one(users, { fields: [siteLogs.userId], references: [users.id] }),
}));

export const changeOrdersRelations = relations(changeOrders, ({ one }) => ({
  project: one(projects, { fields: [changeOrders.projectId], references: [projects.id] }),
  user: one(users, { fields: [changeOrders.userId], references: [users.id] }),
}));

// ─── Procurement / Payments / Invoices ───────────────────────────────────────

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one }) => ({
  project: one(projects, { fields: [purchaseOrders.projectId], references: [projects.id] }),
  vendor: one(vendors, { fields: [purchaseOrders.vendorId], references: [vendors.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  project: one(projects, { fields: [payments.projectId], references: [projects.id] }),
  milestone: one(milestones, { fields: [payments.milestoneId], references: [milestones.id] }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  project: one(projects, { fields: [invoices.projectId], references: [projects.id] }),
  purchaseOrder: one(purchaseOrders, { fields: [invoices.purchaseOrderId], references: [purchaseOrders.id] }),
}));

// ─── Collaboration ───────────────────────────────────────────────────────────

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, { fields: [comments.userId], references: [users.id] }),
  project: one(projects, { fields: [comments.projectId], references: [projects.id] }),
}));

export const approvalsRelations = relations(approvals, ({ one }) => ({
  project: one(projects, { fields: [approvals.projectId], references: [projects.id] }),
  requester: one(users, { fields: [approvals.requestedBy], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

// ─── Contractors / Marketplace ───────────────────────────────────────────────

export const contractorsRelations = relations(contractors, ({ one, many }) => ({
  user: one(users, { fields: [contractors.userId], references: [users.id] }),
  reviews: many(contractorReviews),
  assignments: many(contractorAssignments),
  referrals: many(contractorReferrals),
}));

export const contractorReviewsRelations = relations(contractorReviews, ({ one }) => ({
  contractor: one(contractors, { fields: [contractorReviews.contractorId], references: [contractors.id] }),
  user: one(users, { fields: [contractorReviews.userId], references: [users.id] }),
  project: one(projects, { fields: [contractorReviews.projectId], references: [projects.id] }),
}));

export const contractorAssignmentsRelations = relations(contractorAssignments, ({ one }) => ({
  contractor: one(contractors, { fields: [contractorAssignments.contractorId], references: [contractors.id] }),
  project: one(projects, { fields: [contractorAssignments.projectId], references: [projects.id] }),
}));

// ===========================================================================
// PHASE 4: INTELLIGENCE
// ===========================================================================

export const costPredictionsRelations = relations(costPredictions, ({ one }) => ({
  project: one(projects, { fields: [costPredictions.projectId], references: [projects.id] }),
}));

export const timelinePredictionsRelations = relations(timelinePredictions, ({ one }) => ({
  project: one(projects, { fields: [timelinePredictions.projectId], references: [projects.id] }),
}));

export const budgetScenariosRelations = relations(budgetScenarios, ({ one }) => ({
  project: one(projects, { fields: [budgetScenarios.projectId], references: [projects.id] }),
}));

export const sustainabilityReportsRelations = relations(sustainabilityReports, ({ one }) => ({
  project: one(projects, { fields: [sustainabilityReports.projectId], references: [projects.id] }),
}));

export const portfoliosRelations = relations(portfolios, ({ one, many }) => ({
  user: one(users, { fields: [portfolios.userId], references: [users.id] }),
  portfolioProjects: many(portfolioProjects),
}));

export const portfolioProjectsRelations = relations(portfolioProjects, ({ one }) => ({
  portfolio: one(portfolios, { fields: [portfolioProjects.portfolioId], references: [portfolios.id] }),
  project: one(projects, { fields: [portfolioProjects.projectId], references: [projects.id] }),
}));

// ===========================================================================
// PHASE 5: ECOSYSTEM
// ===========================================================================

export const digitalTwinsRelations = relations(digitalTwins, ({ one, many }) => ({
  project: one(projects, { fields: [digitalTwins.projectId], references: [projects.id] }),
  iotDevices: many(iotDevices),
}));

export const iotDevicesRelations = relations(iotDevices, ({ one, many }) => ({
  digitalTwin: one(digitalTwins, { fields: [iotDevices.digitalTwinId], references: [digitalTwins.id] }),
  room: one(rooms, { fields: [iotDevices.roomId], references: [rooms.id] }),
  dataPoints: many(iotDataPoints),
}));

export const iotDataPointsRelations = relations(iotDataPoints, ({ one }) => ({
  device: one(iotDevices, { fields: [iotDataPoints.deviceId], references: [iotDevices.id] }),
}));

export const emergencyReferencesRelations = relations(emergencyReferences, ({ one }) => ({
  project: one(projects, { fields: [emergencyReferences.projectId], references: [projects.id] }),
  room: one(rooms, { fields: [emergencyReferences.roomId], references: [rooms.id] }),
}));

export const maintenanceSchedulesRelations = relations(maintenanceSchedules, ({ one, many }) => ({
  project: one(projects, { fields: [maintenanceSchedules.projectId], references: [projects.id] }),
  logs: many(maintenanceLogs),
}));

export const maintenanceLogsRelations = relations(maintenanceLogs, ({ one }) => ({
  schedule: one(maintenanceSchedules, { fields: [maintenanceLogs.scheduleId], references: [maintenanceSchedules.id] }),
}));

export const warrantiesRelations = relations(warranties, ({ one, many }) => ({
  project: one(projects, { fields: [warranties.projectId], references: [projects.id] }),
  claims: many(warrantyClaims),
}));

export const warrantyClaimsRelations = relations(warrantyClaims, ({ one }) => ({
  warranty: one(warranties, { fields: [warrantyClaims.warrantyId], references: [warranties.id] }),
}));

export const offcutListingsRelations = relations(offcutListings, ({ one, many }) => ({
  user: one(users, { fields: [offcutListings.userId], references: [users.id] }),
  inquiries: many(offcutInquiries),
}));

export const offcutInquiriesRelations = relations(offcutInquiries, ({ one }) => ({
  listing: one(offcutListings, { fields: [offcutInquiries.listingId], references: [offcutListings.id] }),
  buyer: one(users, { fields: [offcutInquiries.buyerUserId], references: [users.id] }),
}));

export const projectGalleryEntriesRelations = relations(projectGalleryEntries, ({ one }) => ({
  project: one(projects, { fields: [projectGalleryEntries.projectId], references: [projects.id] }),
}));

export const contractorReferralsRelations = relations(contractorReferrals, ({ one }) => ({
  referrer: one(users, { fields: [contractorReferrals.referrerUserId], references: [users.id] }),
  contractor: one(contractors, { fields: [contractorReferrals.contractorId], references: [contractors.id] }),
}));

export const developerAppsRelations = relations(developerApps, ({ one, many }) => ({
  user: one(users, { fields: [developerApps.userId], references: [users.id] }),
  accessTokens: many(apiAccessTokens),
  requestLogs: many(apiRequestLogs),
  webhookSubscriptions: many(webhookSubscriptions),
}));

export const apiAccessTokensRelations = relations(apiAccessTokens, ({ one }) => ({
  app: one(developerApps, { fields: [apiAccessTokens.appId], references: [developerApps.id] }),
  user: one(users, { fields: [apiAccessTokens.userId], references: [users.id] }),
}));

export const apiRequestLogsRelations = relations(apiRequestLogs, ({ one }) => ({
  app: one(developerApps, { fields: [apiRequestLogs.appId], references: [developerApps.id] }),
}));

export const webhookSubscriptionsRelations = relations(webhookSubscriptions, ({ one }) => ({
  app: one(developerApps, { fields: [webhookSubscriptions.appId], references: [developerApps.id] }),
}));

// ===========================================================================
// MISSING FEATURES
// ===========================================================================

export const qualityCheckpointsRelations = relations(qualityCheckpoints, ({ one }) => ({
  project: one(projects, { fields: [qualityCheckpoints.projectId], references: [projects.id] }),
}));

export const punchListItemsRelations = relations(punchListItems, ({ one }) => ({
  project: one(projects, { fields: [punchListItems.projectId], references: [projects.id] }),
  room: one(rooms, { fields: [punchListItems.roomId], references: [rooms.id] }),
}));

export const handoverPackagesRelations = relations(handoverPackages, ({ one }) => ({
  project: one(projects, { fields: [handoverPackages.projectId], references: [projects.id] }),
}));

export const collaborationThreadsRelations = relations(collaborationThreads, ({ one, many }) => ({
  project: one(projects, { fields: [collaborationThreads.projectId], references: [projects.id] }),
  room: one(rooms, { fields: [collaborationThreads.roomId], references: [rooms.id] }),
  createdByUser: one(users, { fields: [collaborationThreads.createdBy], references: [users.id] }),
  messages: many(collaborationMessages),
}));

export const collaborationMessagesRelations = relations(collaborationMessages, ({ one }) => ({
  thread: one(collaborationThreads, { fields: [collaborationMessages.threadId], references: [collaborationThreads.id] }),
  user: one(users, { fields: [collaborationMessages.userId], references: [users.id] }),
}));

export const deliveryTrackingRelations = relations(deliveryTracking, ({ one }) => ({
  project: one(projects, { fields: [deliveryTracking.projectId], references: [projects.id] }),
  purchaseOrder: one(purchaseOrders, { fields: [deliveryTracking.purchaseOrderId], references: [purchaseOrders.id] }),
}));

export const stylePreferencesRelations = relations(stylePreferences, ({ one }) => ({
  project: one(projects, { fields: [stylePreferences.projectId], references: [projects.id] }),
}));

// ===========================================================================
// NEW MISSING FEATURES RELATIONS (A–L)
// ===========================================================================

// A1. Parametric
export const parametricRulesRelations = relations(parametricRules, ({ one }) => ({
  project: one(projects, { fields: [parametricRules.projectId], references: [projects.id] }),
}));
export const designTemplatesRelations = relations(designTemplates, ({ one }) => ({
  author: one(users, { fields: [designTemplates.authorId], references: [users.id] }),
}));
export const parametricHistoryRelations = relations(parametricHistory, ({ one }) => ({
  project: one(projects, { fields: [parametricHistory.projectId], references: [projects.id] }),
}));

// A2. Floor Plan Editor
export const floorPlanCanvasesRelations = relations(floorPlanCanvases, ({ one, many }) => ({
  project: one(projects, { fields: [floorPlanCanvases.projectId], references: [projects.id] }),
  walls: many(wallSegments),
  staircases: many(staircases),
}));
export const wallSegmentsRelations = relations(wallSegments, ({ one, many }) => ({
  canvas: one(floorPlanCanvases, { fields: [wallSegments.canvasId], references: [floorPlanCanvases.id] }),
  room: one(rooms, { fields: [wallSegments.roomId], references: [rooms.id] }),
  openings: many(openings),
}));
export const openingsRelations = relations(openings, ({ one }) => ({
  wall: one(wallSegments, { fields: [openings.wallSegmentId], references: [wallSegments.id] }),
}));
export const staircasesRelations = relations(staircases, ({ one }) => ({
  canvas: one(floorPlanCanvases, { fields: [staircases.canvasId], references: [floorPlanCanvases.id] }),
}));

// A3. Exterior
export const exteriorDesignsRelations = relations(exteriorDesigns, ({ one }) => ({
  project: one(projects, { fields: [exteriorDesigns.projectId], references: [projects.id] }),
  job: one(jobs, { fields: [exteriorDesigns.jobId], references: [jobs.id] }),
}));

// A4. Kitchen & Bath
export const cabinetLayoutsRelations = relations(cabinetLayouts, ({ one }) => ({
  room: one(rooms, { fields: [cabinetLayouts.roomId], references: [rooms.id] }),
}));
export const bathroomLayoutsRelations = relations(bathroomLayouts, ({ one }) => ({
  room: one(rooms, { fields: [bathroomLayouts.roomId], references: [rooms.id] }),
}));

// A4b. Kitchen & Bath Layouts (project-level)
export const kitchenBathLayoutsRelations = relations(kitchenBathLayouts, ({ one }) => ({
  project: one(projects, { fields: [kitchenBathLayouts.projectId], references: [projects.id] }),
}));

// A5. Lighting
export const lightingDesignsRelations = relations(lightingDesigns, ({ one }) => ({
  room: one(rooms, { fields: [lightingDesigns.roomId], references: [rooms.id] }),
}));
// A5b. Lighting Fixtures (project-level)
export const lightingFixturesRelations = relations(lightingFixtures, ({ one }) => ({
  project: one(projects, { fields: [lightingFixtures.projectId], references: [projects.id] }),
  room: one(rooms, { fields: [lightingFixtures.roomId], references: [rooms.id] }),
}));

// A6. Material Boards
export const materialBoardsRelations = relations(materialBoards, ({ one }) => ({
  project: one(projects, { fields: [materialBoards.projectId], references: [projects.id] }),
  room: one(rooms, { fields: [materialBoards.roomId], references: [rooms.id] }),
}));

// A7. Render Jobs
export const renderJobsRelations = relations(renderJobs, ({ one }) => ({
  project: one(projects, { fields: [renderJobs.projectId], references: [projects.id] }),
  room: one(rooms, { fields: [renderJobs.roomId], references: [rooms.id] }),
  job: one(jobs, { fields: [renderJobs.jobId], references: [jobs.id] }),
}));

// B. Structural & Engineering
export const structuralElementsRelations = relations(structuralElements, ({ one }) => ({
  project: one(projects, { fields: [structuralElements.projectId], references: [projects.id] }),
}));
export const structuralAnalysesRelations = relations(structuralAnalyses, ({ one }) => ({
  project: one(projects, { fields: [structuralAnalyses.projectId], references: [projects.id] }),
  job: one(jobs, { fields: [structuralAnalyses.jobId], references: [jobs.id] }),
}));
export const siteAnalysisItemsRelations = relations(siteAnalysisItems, ({ one }) => ({
  project: one(projects, { fields: [siteAnalysisItems.projectId], references: [projects.id] }),
}));
export const siteAnalysesRelations = relations(siteAnalyses, ({ one }) => ({
  project: one(projects, { fields: [siteAnalyses.projectId], references: [projects.id] }),
}));
export const energyModelsRelations = relations(energyModels, ({ one }) => ({
  project: one(projects, { fields: [energyModels.projectId], references: [projects.id] }),
  job: one(jobs, { fields: [energyModels.jobId], references: [jobs.id] }),
}));
export const energyModelItemsRelations = relations(energyModelItems, ({ one }) => ({
  project: one(projects, { fields: [energyModelItems.projectId], references: [projects.id] }),
}));
export const acousticAssessmentsRelations = relations(acousticAssessments, ({ one }) => ({
  project: one(projects, { fields: [acousticAssessments.projectId], references: [projects.id] }),
}));
export const acousticAnalysesRelations = relations(acousticAnalyses, ({ one }) => ({
  project: one(projects, { fields: [acousticAnalyses.projectId], references: [projects.id] }),
}));

// C. Project Management
export const rfisRelations = relations(rfis, ({ one }) => ({
  project: one(projects, { fields: [rfis.projectId], references: [projects.id] }),
  asker: one(users, { fields: [rfis.askedBy], references: [users.id] }),
  relatedDrawing: one(drawingResults, { fields: [rfis.relatedDrawingId], references: [drawingResults.id] }),
}));
export const submittalsRelations = relations(submittals, ({ one }) => ({
  project: one(projects, { fields: [submittals.projectId], references: [projects.id] }),
  submittedProduct: one(products, { fields: [submittals.submittedProductId], references: [products.id] }),
}));
export const submittalItemsRelations = relations(submittalItems, ({ one }) => ({
  project: one(projects, { fields: [submittalItems.projectId], references: [projects.id] }),
}));
export const progressReportsRelations = relations(progressReports, ({ one }) => ({
  project: one(projects, { fields: [progressReports.projectId], references: [projects.id] }),
}));
export const safetyRecordsRelations = relations(safetyRecords, ({ one }) => ({
  project: one(projects, { fields: [safetyRecords.projectId], references: [projects.id] }),
}));
export const safetyChecklistsRelations = relations(safetyChecklists, ({ one }) => ({
  project: one(projects, { fields: [safetyChecklists.projectId], references: [projects.id] }),
}));
export const safetyIncidentsRelations = relations(safetyIncidents, ({ one }) => ({
  project: one(projects, { fields: [safetyIncidents.projectId], references: [projects.id] }),
}));
export const safetyTrainingRecordsRelations = relations(safetyTrainingRecords, ({ one }) => ({
  project: one(projects, { fields: [safetyTrainingRecords.projectId], references: [projects.id] }),
}));
export const permitsRelations = relations(permits, ({ one, many }) => ({
  project: one(projects, { fields: [permits.projectId], references: [projects.id] }),
  inspections: many(inspections),
}));
export const inspectionsRelations = relations(inspections, ({ one }) => ({
  permit: one(permits, { fields: [inspections.permitId], references: [permits.id] }),
}));
export const documentVersionsRelations = relations(documentVersions, ({ one }) => ({
  project: one(projects, { fields: [documentVersions.projectId], references: [projects.id] }),
}));

// D. Client Experience
export const projectClientsRelations = relations(projectClients, ({ one }) => ({
  project: one(projects, { fields: [projectClients.projectId], references: [projects.id] }),
  client: one(users, { fields: [projectClients.clientUserId], references: [users.id] }),
}));
export const selectionCategoriesRelations = relations(selectionCategories, ({ one, many }) => ({
  project: one(projects, { fields: [selectionCategories.projectId], references: [projects.id] }),
  selections: many(selections),
}));
export const selectionsRelations = relations(selections, ({ one }) => ({
  project: one(projects, { fields: [selections.projectId], references: [projects.id] }),
  category: one(selectionCategories, { fields: [selections.categoryId], references: [selectionCategories.id] }),
  room: one(rooms, { fields: [selections.roomId], references: [rooms.id] }),
  product: one(products, { fields: [selections.selectedProductId], references: [products.id] }),
}));
export const inspirationBoardsRelations = relations(inspirationBoards, ({ one, many }) => ({
  project: one(projects, { fields: [inspirationBoards.projectId], references: [projects.id] }),
  pins: many(inspirationPins),
}));
export const inspirationPinsRelations = relations(inspirationPins, ({ one }) => ({
  board: one(inspirationBoards, { fields: [inspirationPins.boardId], references: [inspirationBoards.id] }),
  user: one(users, { fields: [inspirationPins.userId], references: [users.id] }),
}));
export const walkthroughAnnotationsRelations = relations(walkthroughAnnotations, ({ one }) => ({
  project: one(projects, { fields: [walkthroughAnnotations.projectId], references: [projects.id] }),
  room: one(rooms, { fields: [walkthroughAnnotations.roomId], references: [rooms.id] }),
  creator: one(users, { fields: [walkthroughAnnotations.createdBy], references: [users.id] }),
}));

// E. Business Operations
export const contractTemplatesRelations = relations(contractTemplates, ({ one }) => ({
  user: one(users, { fields: [contractTemplates.userId], references: [users.id] }),
}));
export const proposalsRelations = relations(proposals, ({ one }) => ({
  project: one(projects, { fields: [proposals.projectId], references: [projects.id] }),
  template: one(contractTemplates, { fields: [proposals.templateId], references: [contractTemplates.id] }),
}));
export const leadsRelations = relations(leads, ({ one, many }) => ({
  user: one(users, { fields: [leads.userId], references: [users.id] }),
  project: one(projects, { fields: [leads.projectId], references: [projects.id] }),
  activities: many(leadActivities),
}));
export const leadActivitiesRelations = relations(leadActivities, ({ one }) => ({
  lead: one(leads, { fields: [leadActivities.leadId], references: [leads.id] }),
}));
export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  user: one(users, { fields: [timeEntries.userId], references: [users.id] }),
  project: one(projects, { fields: [timeEntries.projectId], references: [projects.id] }),
}));
export const teamsRelations = relations(teams, ({ one, many }) => ({
  owner: one(users, { fields: [teams.userId], references: [users.id] }),
  members: many(teamMembers),
}));
export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
  user: one(users, { fields: [teamMembers.userId], references: [users.id] }),
}));
export const projectAssignmentsRelations = relations(projectAssignments, ({ one }) => ({
  project: one(projects, { fields: [projectAssignments.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectAssignments.userId], references: [users.id] }),
}));

// F. Advanced Technology
export const spacePlansRelations = relations(spacePlans, ({ one }) => ({
  room: one(rooms, { fields: [spacePlans.roomId], references: [rooms.id] }),
  job: one(jobs, { fields: [spacePlans.jobId], references: [jobs.id] }),
}));
export const complianceQueriesRelations = relations(complianceQueries, ({ one }) => ({
  project: one(projects, { fields: [complianceQueries.projectId], references: [projects.id] }),
  user: one(users, { fields: [complianceQueries.userId], references: [users.id] }),
}));
export const droneCapturesRelations = relations(droneCaptures, ({ one }) => ({
  project: one(projects, { fields: [droneCaptures.projectId], references: [projects.id] }),
}));
export const lidarScansRelations = relations(lidarScans, ({ one }) => ({
  project: one(projects, { fields: [lidarScans.projectId], references: [projects.id] }),
}));
export const smartHomePlansRelations = relations(smartHomePlans, ({ one }) => ({
  project: one(projects, { fields: [smartHomePlans.projectId], references: [projects.id] }),
}));

// G. Specialized Design
export const closetLayoutsRelations = relations(closetLayouts, ({ one }) => ({
  room: one(rooms, { fields: [closetLayouts.roomId], references: [rooms.id] }),
}));
export const theaterDesignsRelations = relations(theaterDesigns, ({ one }) => ({
  room: one(rooms, { fields: [theaterDesigns.roomId], references: [rooms.id] }),
}));
export const outdoorDesignsRelations = relations(outdoorDesigns, ({ one }) => ({
  project: one(projects, { fields: [outdoorDesigns.projectId], references: [projects.id] }),
}));
export const universalDesignChecksRelations = relations(universalDesignChecks, ({ one }) => ({
  project: one(projects, { fields: [universalDesignChecks.projectId], references: [projects.id] }),
  room: one(rooms, { fields: [universalDesignChecks.roomId], references: [rooms.id] }),
}));
export const multiUnitPlansRelations = relations(multiUnitPlans, ({ one }) => ({
  project: one(projects, { fields: [multiUnitPlans.projectId], references: [projects.id] }),
}));

// H. Reporting
export const drawingSetConfigsRelations = relations(drawingSetConfigs, ({ one }) => ({
  user: one(users, { fields: [drawingSetConfigs.userId], references: [users.id] }),
}));
export const specificationsRelations = relations(specifications, ({ one }) => ({
  project: one(projects, { fields: [specifications.projectId], references: [projects.id] }),
}));
export const specSectionsRelations = relations(specSections, ({ one }) => ({
  project: one(projects, { fields: [specSections.projectId], references: [projects.id] }),
}));
export const asBuiltMarkupsRelations = relations(asBuiltMarkups, ({ one }) => ({
  drawingResult: one(drawingResults, { fields: [asBuiltMarkups.drawingResultId], references: [drawingResults.id] }),
  creator: one(users, { fields: [asBuiltMarkups.createdBy], references: [users.id] }),
}));
export const asBuiltFieldMarkupsRelations = relations(asBuiltFieldMarkups, ({ one }) => ({
  project: one(projects, { fields: [asBuiltFieldMarkups.projectId], references: [projects.id] }),
  user: one(users, { fields: [asBuiltFieldMarkups.userId], references: [users.id] }),
}));

// I. Integrations
export const integrationConfigsRelations = relations(integrationConfigs, ({ one }) => ({
  user: one(users, { fields: [integrationConfigs.userId], references: [users.id] }),
}));
export const communicationPreferencesRelations = relations(communicationPreferences, ({ one }) => ({
  user: one(users, { fields: [communicationPreferences.userId], references: [users.id] }),
}));
export const propertyValuationsRelations = relations(propertyValuations, ({ one }) => ({
  project: one(projects, { fields: [propertyValuations.projectId], references: [projects.id] }),
}));

// J. Marketplace
export const serviceBookingsRelations = relations(serviceBookings, ({ one }) => ({
  professional: one(contractors, { fields: [serviceBookings.professionalId], references: [contractors.id] }),
  project: one(projects, { fields: [serviceBookings.projectId], references: [projects.id] }),
  client: one(users, { fields: [serviceBookings.clientUserId], references: [users.id] }),
}));
export const sampleRequestsRelations = relations(sampleRequests, ({ one }) => ({
  user: one(users, { fields: [sampleRequests.userId], references: [users.id] }),
  project: one(projects, { fields: [sampleRequests.projectId], references: [projects.id] }),
}));

// L. Data & Intelligence
export const postOccupancySurveysRelations = relations(postOccupancySurveys, ({ one }) => ({
  project: one(projects, { fields: [postOccupancySurveys.projectId], references: [projects.id] }),
}));
export const lessonsLearnedRelations = relations(lessonsLearned, ({ one }) => ({
  project: one(projects, { fields: [lessonsLearned.projectId], references: [projects.id] }),
  user: one(users, { fields: [lessonsLearned.userId], references: [users.id] }),
}));
export const complianceReportsRelations = relations(complianceReports, ({ one }) => ({
  project: one(projects, { fields: [complianceReports.projectId], references: [projects.id] }),
  user: one(users, { fields: [complianceReports.userId], references: [users.id] }),
}));
export const complianceChatMessagesRelations = relations(complianceChatMessages, ({ one }) => ({
  project: one(projects, { fields: [complianceChatMessages.projectId], references: [projects.id] }),
  user: one(users, { fields: [complianceChatMessages.userId], references: [users.id] }),
}));
export const designFeedbackRelations = relations(designFeedback, ({ one }) => ({
  designVariant: one(designVariants, { fields: [designFeedback.designVariantId], references: [designVariants.id] }),
}));
