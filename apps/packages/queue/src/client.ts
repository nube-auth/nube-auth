/**
 * BullMQ Queue Client
 * High-level abstractions for queue and worker management
 * Future-ready for RabbitMQ migration
 */

import { Queue, Worker, type Job } from "bullmq";
import Redis from "ioredis";
import type {
	QueueName,
	AllJobData,
	JobResult,
	WorkerOptions,
	QueueConnectionOptions,
} from "./types";
import {
	DEFAULT_REDIS_CONFIG,
	JOB_RETRY_CONFIG,
	JOB_TIMEOUT_CONFIG,
	DEFAULT_WORKER_OPTIONS,
} from "./constants";

/**
 * Queue client wrapper
 * Provides unified interface for queue operations
 */
export class QueueClient {
	private queues: Map<string, Queue> = new Map();
	private redisConnection: Redis;
	private connectionOptions: QueueConnectionOptions;

	constructor(connectionOptions?: Partial<QueueConnectionOptions>) {
		this.connectionOptions = {
			...DEFAULT_REDIS_CONFIG,
			...connectionOptions,
		} as QueueConnectionOptions;

		this.redisConnection = new Redis(this.connectionOptions);
	}

	/**
	 * Get or create a queue by name
	 */
	public getQueue<T extends AllJobData = AllJobData>(
		queueName: QueueName | string
	): Queue<T> {
		if (!this.queues.has(queueName)) {
			const queue = new Queue<T>(queueName, {
				connection: this.redisConnection,
				defaultJobOptions: {
					removeOnComplete: {
						age: 3600, // Remove completed jobs after 1 hour
					},
					removeOnFail: {
						age: 604800, // Keep failed jobs for 7 days
					},
				},
			});

			this.queues.set(queueName, queue);
		}

		return this.queues.get(queueName) as Queue<T>;
	}

	/**
	 * Add a job to a queue
	 */
	public async addJob<T extends AllJobData = AllJobData>(
		queueName: QueueName | string,
		data: T,
		options?: {
			priority?: number;
			delay?: number;
			repeat?: {
				pattern?: string;
				every?: number;
			};
			jobId?: string;
			removeOnComplete?: boolean | { age: number };
			removeOnFail?: boolean | { age: number };
		}
	): Promise<Job<T>> {
		const queue = this.getQueue<T>(queueName);
		const retryConfig = (JOB_RETRY_CONFIG as any)[queueName] || {
			maxAttempts: 3,
			backoff: { type: "exponential", delay: 5000 },
		};

		return (queue.add as any)(queueName, data, {
			attempts: retryConfig.maxAttempts,
			backoff: retryConfig.backoff,
			timeout: (JOB_TIMEOUT_CONFIG as any)[queueName] || 30000,
			...options,
		});
	}

	/**
	 * Bulk add jobs
	 */
	public async addJobs<T extends AllJobData = AllJobData>(
		queueName: QueueName | string,
		jobs: Array<{ data: T; options?: any }>
	): Promise<Job<T>[]> {
		const queue = this.getQueue<T>(queueName);
		const retryConfig = (JOB_RETRY_CONFIG as any)[queueName] || {
			maxAttempts: 3,
			backoff: { type: "exponential", delay: 5000 },
		};

		return Promise.all(
			jobs.map((job) =>
				(queue.add as any)(queueName, job.data, {
					attempts: retryConfig.maxAttempts,
					backoff: retryConfig.backoff,
					timeout: (JOB_TIMEOUT_CONFIG as any)[queueName] || 30000,
					...job.options,
				})
			)
		);
	}

	/**
	 * Get job by ID
	 */
	public async getJob<T extends AllJobData = AllJobData>(
		queueName: QueueName | string,
		jobId: string
	): Promise<Job<T> | undefined> {
		const queue = this.getQueue<T>(queueName);
		return queue.getJob(jobId);
	}

	/**
	 * Get queue statistics
	 */
	public async getQueueStats(queueName: QueueName | string) {
		const queue = this.getQueue(queueName);

		return {
			waiting: await queue.getWaitingCount(),
			active: await queue.getActiveCount(),
			completed: await queue.getCompletedCount(),
			failed: await queue.getFailedCount(),
			delayed: await queue.getDelayedCount(),
		};
	}

	/**
	 * Pause queue
	 */
	public async pauseQueue(queueName: QueueName | string): Promise<void> {
		const queue = this.getQueue(queueName);
		await queue.pause();
	}

	/**
	 * Resume queue
	 */
	public async resumeQueue(queueName: QueueName | string): Promise<void> {
		const queue = this.getQueue(queueName);
		await queue.resume();
	}

	/**
	 * Clean queue
	 */
	public async cleanQueue(
		queueName: QueueName | string,
		options?: {
			status?: "completed" | "failed" | "delayed" | "active" | "wait";
			olderThan?: number;
		}
	): Promise<string[]> {
		const queue = this.getQueue(queueName);

		return queue.clean(
			options?.olderThan || 0,
			10000,
			options?.status || "completed"
		);
	}

	/**
	 * Close queue connection
	 */
	public async closeQueue(queueName: QueueName | string): Promise<void> {
		const queue = this.queues.get(queueName);
		if (queue) {
			await queue.close();
			this.queues.delete(queueName);
		}
	}

	/**
	 * Close all queues
	 */
	public async closeAllQueues(): Promise<void> {
		const promises = Array.from(this.queues.keys()).map((name) =>
			this.closeQueue(name)
		);
		await Promise.all(promises);
	}

	/**
	 * Close Redis connection
	 */
	public async closeConnection(): Promise<void> {
		await this.closeAllQueues();
		this.redisConnection.disconnect();
	}
}

/**
 * Worker wrapper for processing jobs
 */
export class WorkerClient {
	private workers: Map<string, Worker> = new Map();
	private redisConnection: Redis;
	private connectionOptions: QueueConnectionOptions;

	constructor(connectionOptions?: Partial<QueueConnectionOptions>) {
		this.connectionOptions = {
			...DEFAULT_REDIS_CONFIG,
			...connectionOptions,
		} as QueueConnectionOptions;

		this.redisConnection = new Redis(this.connectionOptions);
	}

	/**
	 * Create worker for a queue
	 */
	public createWorker<T extends AllJobData = AllJobData>(
		queueName: QueueName | string,
		processor: (job: Job<T>) => Promise<JobResult>,
		options?: Partial<WorkerOptions>
	): Worker<T, JobResult> {
		const workerOptions = {
			...DEFAULT_WORKER_OPTIONS,
			...options,
		};

		const worker = new Worker<T, JobResult>(queueName, processor, {
			connection: this.redisConnection,
			concurrency: workerOptions.concurrency,
		});

		this.workers.set(queueName, worker);

		// Setup event listeners
		this.setupWorkerListeners(worker, queueName);

		return worker;
	}

	/**
	 * Setup default event listeners for worker
	 */
	private setupWorkerListeners(worker: Worker, queueName: string): void {
		worker.on("ready", () => {
			console.log(`[Worker] ${queueName} ready`);
		});

		worker.on("error", (err: Error) => {
			console.error(`[Worker] ${queueName} error:`, err);
		});

		worker.on("failed", (job: Job | undefined, err: Error) => {
			console.error(
				`[Worker] ${queueName} job ${job?.id} failed:`,
				err.message
			);
		});

		worker.on("completed", (job: Job) => {
			console.log(`[Worker] ${queueName} job ${job.id} completed`);
		});

		worker.on("drained", () => {
			console.log(`[Worker] ${queueName} drained (no pending jobs)`);
		});
	}

	/**
	 * Get worker by queue name
	 */
	public getWorker(queueName: QueueName | string): Worker | undefined {
		return this.workers.get(queueName);
	}

	/**
	 * Close specific worker
	 */
	public async closeWorker(queueName: QueueName | string): Promise<void> {
		const worker = this.workers.get(queueName);
		if (worker) {
			await worker.close();
			this.workers.delete(queueName);
		}
	}

	/**
	 * Close all workers
	 */
	public async closeAllWorkers(): Promise<void> {
		const promises = Array.from(this.workers.keys()).map((name) =>
			this.closeWorker(name)
		);
		await Promise.all(promises);
	}

	/**
	 * Close Redis connection
	 */
	public async closeConnection(): Promise<void> {
		await this.closeAllWorkers();
		this.redisConnection.disconnect();
	}
}

/**
 * Combined queue manager
 * Manages both queues and workers
 */
export class QueueManager {
	private queueClient: QueueClient;
	private workerClient: WorkerClient;

	constructor(connectionOptions?: Partial<QueueConnectionOptions>) {
		this.queueClient = new QueueClient(connectionOptions);
		this.workerClient = new WorkerClient(connectionOptions);
	}

	public getQueueClient(): QueueClient {
		return this.queueClient;
	}

	public getWorkerClient(): WorkerClient {
		return this.workerClient;
	}

	public async close(): Promise<void> {
		await this.queueClient.closeConnection();
		await this.workerClient.closeConnection();
	}
}
