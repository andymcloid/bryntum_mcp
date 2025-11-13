/**
 * Job Manager
 *
 * Manages background indexing jobs with progress tracking.
 * Follows Single Responsibility Principle (SRP).
 */
import { EventEmitter } from 'events';
import { nanoid } from 'nanoid';
import { createLogger } from '../utils/logger.js';

const logger = createLogger({ component: 'JobManager' });

export class JobManager extends EventEmitter {
  constructor() {
    super();
    this.jobs = new Map(); // jobId -> job data
    this.activeJobs = new Set(); // Set of currently running job IDs
  }

  /**
   * Create a new job
   */
  createJob(type, metadata = {}) {
    const jobId = nanoid();
    const job = {
      id: jobId,
      type,
      status: 'pending',
      progress: 0,
      stage: 'created',
      message: 'Job created',
      metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      result: null,
      error: null,
    };

    this.jobs.set(jobId, job);
    logger.info({ jobId, type }, 'Job created');

    return jobId;
  }

  /**
   * Update job progress
   */
  updateJob(jobId, updates) {
    const job = this.jobs.get(jobId);
    if (!job) {
      logger.warn({ jobId }, 'Job not found');
      return;
    }

    Object.assign(job, updates, { updatedAt: new Date().toISOString() });
    this.jobs.set(jobId, job);

    // Emit progress event
    this.emit('progress', job);
    this.emit(`progress:${jobId}`, job);

    logger.debug({ jobId, updates }, 'Job updated');
  }

  /**
   * Mark job as started
   */
  startJob(jobId) {
    this.activeJobs.add(jobId);
    this.updateJob(jobId, {
      status: 'running',
      startedAt: new Date().toISOString(),
    });
  }

  /**
   * Mark job as completed
   */
  completeJob(jobId, result) {
    this.activeJobs.delete(jobId);
    this.updateJob(jobId, {
      status: 'completed',
      progress: 100,
      stage: 'completed',
      message: 'Job completed successfully',
      result,
      completedAt: new Date().toISOString(),
    });

    logger.info({ jobId }, 'Job completed');
  }

  /**
   * Mark job as failed
   */
  failJob(jobId, error) {
    this.activeJobs.delete(jobId);
    this.updateJob(jobId, {
      status: 'failed',
      stage: 'error',
      message: error.message || 'Job failed',
      error: {
        message: error.message,
        stack: error.stack,
      },
      failedAt: new Date().toISOString(),
    });

    logger.error({ jobId, error: error.message }, 'Job failed');
  }

  /**
   * Get job status
   */
  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all jobs
   */
  getAllJobs() {
    return Array.from(this.jobs.values());
  }

  /**
   * Get active jobs
   */
  getActiveJobs() {
    return Array.from(this.activeJobs)
      .map(id => this.jobs.get(id))
      .filter(Boolean);
  }

  /**
   * Clean up old completed jobs (older than 24h)
   */
  cleanup() {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status === 'completed' || job.status === 'failed') {
        const jobTime = new Date(job.updatedAt).getTime();
        if (jobTime < oneDayAgo) {
          this.jobs.delete(jobId);
          logger.debug({ jobId }, 'Cleaned up old job');
        }
      }
    }
  }
}

// Export singleton instance
export const jobManager = new JobManager();

// Auto cleanup every hour
setInterval(() => {
  jobManager.cleanup();
}, 60 * 60 * 1000);
