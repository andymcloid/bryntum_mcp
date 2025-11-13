/**
 * Jobs WebSocket Client
 *
 * Handles WebSocket connection for real-time job progress updates.
 * Follows Single Responsibility Principle (SRP).
 */
export class JobsWebSocket {
    constructor() {
        this.ws = null;
        this.reconnectInterval = 3000;
        this.reconnectTimer = null;
        this.listeners = new Map();
        this.connected = false;
    }

    /**
     * Connect to WebSocket
     */
    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/jobs`;

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.connected = true;
                this.emit('connected');

                // Clear reconnect timer
                if (this.reconnectTimer) {
                    clearTimeout(this.reconnectTimer);
                    this.reconnectTimer = null;
                }
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('WebSocket message parse error:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.emit('error', error);
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.connected = false;
                this.emit('disconnected');

                // Attempt to reconnect
                this.scheduleReconnect();
            };

        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.scheduleReconnect();
        }
    }

    /**
     * Handle incoming message
     */
    handleMessage(data) {
        const { type, job, jobs, active, allJobs } = data;

        switch (type) {
            case 'init':
                this.emit('init', { jobs, allJobs });
                break;

            case 'progress':
                this.emit('progress', job);
                this.emit(`progress:${job.id}`, job);
                break;

            case 'job':
                this.emit('job', job);
                break;

            case 'list':
                this.emit('list', { jobs, active });
                break;

            default:
                console.warn('Unknown message type:', type);
        }
    }

    /**
     * Subscribe to a specific job
     */
    subscribeToJob(jobId) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'subscribe',
                jobId,
            }));
        }
    }

    /**
     * Request list of all jobs
     */
    requestList() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'list',
            }));
        }
    }

    /**
     * Schedule reconnect
     */
    scheduleReconnect() {
        if (this.reconnectTimer) return;

        this.reconnectTimer = setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            this.connect();
        }, this.reconnectInterval);
    }

    /**
     * Add event listener
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     */
    off(event, callback) {
        if (!this.listeners.has(event)) return;

        const listeners = this.listeners.get(event);
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }

    /**
     * Emit event
     */
    emit(event, data) {
        if (!this.listeners.has(event)) return;

        this.listeners.get(event).forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in ${event} listener:`, error);
            }
        });
    }

    /**
     * Close connection
     */
    close() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.connected = false;
    }

    /**
     * Check if connected
     */
    isConnected() {
        return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}

// Export singleton instance
export const jobsWebSocket = new JobsWebSocket();
