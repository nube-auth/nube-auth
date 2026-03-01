import { createLogger } from "@proofa/shared";
import { Hono } from "hono";
import { billingRouter } from "./billing.js";
import { globalLicensesRouter } from "./global-licenses.js";
import { providersRouter } from "./providers.js";
import { projectsRouter } from "./projects.js";
import { appsRouter } from "./apps.js";
import { statsRouter } from "./stats.js";
import { membersRouter } from "./members.js";
import { licenseManagementRouter } from "./license-management.js";
import { subscriptionsRouter } from "./subscriptions.js";
import { promotionsRouter } from "./promotions.js";
import { plansRouter } from "./plans.js";
import routingRulesRouter from "./routing-rules.js";
import { testRouter } from "./test.js";

const _log = createLogger("admin-routes");
const router = new Hono();

// Mount subrouters with appropriate prefixes
router.route("/projects", statsRouter);
router.route("/projects", projectsRouter);
router.route("/projects", appsRouter);
router.route("/projects", membersRouter);
router.route("/providers", providersRouter);
router.route("/routing-rules", routingRulesRouter);

// Billing & global routes
router.route("/billing", billingRouter);
router.route("/licenses", globalLicensesRouter);

// App-scoped v2 routes
router.route("/apps/:appId/plans", plansRouter);
router.route("/apps/:appId/licenses", licenseManagementRouter);
router.route("/apps/:appId/subscriptions", subscriptionsRouter);
router.route("/apps/:appId/promotions", promotionsRouter);

router.route("/test", testRouter);

export const adminRoutes = router;
