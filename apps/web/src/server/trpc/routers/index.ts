import { router } from '../init';
import { projectRouter } from './project';
import { roomRouter } from './room';
import { uploadRouter } from './upload';
import { designVariantRouter } from './designVariant';
import { apiKeyRouter } from './apiKey';
import { bomRouter } from './bom';
import { drawingRouter } from './drawing';
import { cutlistRouter } from './cutlist';
import { mepRouter } from './mep';
import { scheduleRouter } from './schedule';
import { paymentRouter } from './payment';
import { contractorRouter } from './contractor';
import { notificationRouter } from './notification';
import { adminRouter } from './admin';
import { analyticsRouter } from './analytics';
import { catalogueRouter } from './catalogue';
import { procurementRouter } from './procurement';
import { floorPlanRouter } from './floorPlan';
import { complianceRouter } from './compliance';
// Phase 4
import { predictionRouter } from './prediction';
import { budgetOptimizationRouter } from './budgetOptimization';
import { sustainabilityRouter } from './sustainability';
import { portfolioRouter } from './portfolio';
// Phase 5
import { digitalTwinRouter } from './digitalTwin';
import { maintenanceRouter } from './maintenance';
import { warrantyRouter } from './warranty';
import { communityRouter } from './community';
import { developerPortalRouter } from './developerPortal';
import { localizationRouter } from './localization';
// Pending features
import { reconstructionRouter } from './reconstruction';
// Missing features
import { qualityRouter } from './quality';
import { handoverRouter } from './handover';
import { collaborationRouter } from './collaboration';
import { deliveryRouter } from './delivery';
import { financialReportRouter } from './financialReport';
import { vendorManagementRouter } from './vendorManagement';
import { styleQuizRouter } from './styleQuiz';
import { roomRedesignRouter } from './roomRedesign';
import { floorPlanRenderRouter } from './floorPlanRender';
// C1-C6: Project Management & Field
import { rfiRouter } from './rfi';
import { submittalRouter } from './submittal';
import { progressReportRouter } from './progressReport';
import { safetyRouter } from './safety';
import { permitRouter } from './permit';
import { documentVersionRouter } from './documentVersion';
// D1-D4: Client Experience
import { clientPortalRouter } from './clientPortal';
import { selectionRouter } from './selection';
import { inspirationRouter } from './inspiration';
import { walkthroughAnnotationRouter } from './walkthroughAnnotation';
// E1-E5: Business Operations
import { proposalRouter } from './proposal';
import { crmRouter } from './crm';
import { timeTrackingRouter } from './timeTracking';
import { insuranceRouter } from './insurance';
import { teamRouter } from './team';
// F1-F7: Advanced Technology
import { spacePlanningRouter } from './spacePlanning';
import { complianceQueryRouter } from './complianceQuery';
import { complianceChatRouter } from './complianceChat';
import { droneRouter } from './drone';
import { lidarRouter } from './lidar';
import { smartHomeRouter } from './smartHome';
// G1-G5: Specialized Design Areas
import { closetDesignRouter } from './closetDesign';
import { theaterDesignRouter } from './theaterDesign';
import { outdoorDesignRouter } from './outdoorDesign';
import { universalDesignRouter } from './universalDesign';
import { multiUnitRouter } from './multiUnit';
// H1-H4: Reporting & Documentation
import { drawingSetRouter } from './drawingSet';
import { specWriterRouter } from './specWriter';
import { asBuiltRouter } from './asBuilt';
// I-J: Integrations & Marketplace
import { integrationRouter } from './integration';
import { propertyValuationRouter } from './propertyValuation';
import { serviceBookingRouter } from './serviceBooking';
import { sampleRequestRouter } from './sampleRequest';
// L1-L3: Data & Intelligence
import { benchmarkRouter } from './benchmark';
import { postOccupancyRouter } from './postOccupancy';
import { designLearningRouter } from './designLearning';
// A1-A7: Design & Visualization
import { parametricRouter } from './parametric';
import { floorPlanEditorRouter } from './floorPlanEditor';
import { exteriorRouter } from './exterior';
import { kitchenBathRouter } from './kitchenBath';
import { lightingRouter } from './lighting';
import { materialBoardRouter } from './materialBoard';
import { renderRouter } from './render';
// B1-B4: Structural & Engineering
import { structuralRouter } from './structural';
import { siteAnalysisRouter } from './siteAnalysis';
import { energyModelRouter } from './energyModel';
import { acousticRouter } from './acoustic';

export const appRouter = router({
  project: projectRouter,
  room: roomRouter,
  upload: uploadRouter,
  designVariant: designVariantRouter,
  apiKey: apiKeyRouter,
  bom: bomRouter,
  drawing: drawingRouter,
  cutlist: cutlistRouter,
  mep: mepRouter,
  schedule: scheduleRouter,
  payment: paymentRouter,
  contractor: contractorRouter,
  notification: notificationRouter,
  admin: adminRouter,
  analytics: analyticsRouter,
  catalogue: catalogueRouter,
  procurement: procurementRouter,
  floorPlan: floorPlanRouter,
  compliance: complianceRouter,
  // Phase 4
  prediction: predictionRouter,
  budgetOptimization: budgetOptimizationRouter,
  sustainability: sustainabilityRouter,
  portfolio: portfolioRouter,
  // Phase 5
  digitalTwin: digitalTwinRouter,
  maintenance: maintenanceRouter,
  warranty: warrantyRouter,
  community: communityRouter,
  developerPortal: developerPortalRouter,
  localization: localizationRouter,
  // Pending features
  reconstruction: reconstructionRouter,
  // Missing features
  quality: qualityRouter,
  handover: handoverRouter,
  collaboration: collaborationRouter,
  delivery: deliveryRouter,
  financialReport: financialReportRouter,
  vendorManagement: vendorManagementRouter,
  styleQuiz: styleQuizRouter,
  roomRedesign: roomRedesignRouter,
  floorPlanRender: floorPlanRenderRouter,
  // C1-C6: Project Management & Field
  rfi: rfiRouter,
  submittal: submittalRouter,
  progressReport: progressReportRouter,
  safety: safetyRouter,
  permit: permitRouter,
  documentVersion: documentVersionRouter,
  // D1-D4: Client Experience
  clientPortal: clientPortalRouter,
  selection: selectionRouter,
  inspiration: inspirationRouter,
  walkthroughAnnotation: walkthroughAnnotationRouter,
  annotation: walkthroughAnnotationRouter,
  // E1-E5: Business Operations
  proposal: proposalRouter,
  crm: crmRouter,
  timeTracking: timeTrackingRouter,
  insurance: insuranceRouter,
  team: teamRouter,
  // F1-F7: Advanced Technology
  spacePlanning: spacePlanningRouter,
  complianceQuery: complianceQueryRouter,
  complianceChat: complianceChatRouter,
  drone: droneRouter,
  lidar: lidarRouter,
  smartHome: smartHomeRouter,
  // G1-G5: Specialized Design Areas
  closetDesign: closetDesignRouter,
  theaterDesign: theaterDesignRouter,
  theater: theaterDesignRouter,
  outdoorDesign: outdoorDesignRouter,
  outdoor: outdoorDesignRouter,
  universalDesign: universalDesignRouter,
  multiUnit: multiUnitRouter,
  // H1-H4: Reporting & Documentation
  drawingSet: drawingSetRouter,
  specWriter: specWriterRouter,
  asBuilt: asBuiltRouter,
  // I-J: Integrations & Marketplace
  integration: integrationRouter,
  integrations: integrationRouter,
  propertyValuation: propertyValuationRouter,
  propertyValue: propertyValuationRouter,
  serviceBooking: serviceBookingRouter,
  bookings: serviceBookingRouter,
  sampleRequest: sampleRequestRouter,
  samples: sampleRequestRouter,
  // L1-L3: Data & Intelligence
  benchmark: benchmarkRouter,
  benchmarks: benchmarkRouter,
  postOccupancy: postOccupancyRouter,
  designLearning: designLearningRouter,
  designFeedback: designLearningRouter,
  // A1-A7: Design & Visualization
  parametric: parametricRouter,
  floorPlanEditor: floorPlanEditorRouter,
  exterior: exteriorRouter,
  kitchenBath: kitchenBathRouter,
  lighting: lightingRouter,
  materialBoard: materialBoardRouter,
  render: renderRouter,
  // B1-B4: Structural & Engineering
  structural: structuralRouter,
  siteAnalysis: siteAnalysisRouter,
  energy: energyModelRouter,
  acoustics: acousticRouter,
});

export type AppRouter = typeof appRouter;
