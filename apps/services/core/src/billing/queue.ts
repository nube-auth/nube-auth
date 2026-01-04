/**
 * Queue Job Enqueuers
 * Phase 2 Implementation Pending
 */

export interface ProcessPaymentJobData {}
export interface ProcessWebhookJobData {}
export interface SyncLicenseJobData {}
export interface ProcessRefundJobData {}

export const enqueuePaymentProcessing = async () => {};
export const enqueueWebhookProcessing = async (
	_provider?: string,
	_rawBody?: string,
	_signature?: string,
	_providerConfigId?: number,
	_ipAddress?: string,
) => {};
export const enqueueLicenseSync = async () => {};
export const enqueueRefundProcessing = async () => {};
