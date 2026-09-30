// Jenkinsfile (Frontend - wiki-ai-react)
pipeline {
    agent any

    environment {
        IMAGE_NAME     = 'wikiai-frontend'
        IMAGE_TAG      = 'latest'
        CONTAINER_NAME = 'frontend'
        HOST_PORT      = '3000'
        CONTAINER_PORT = '3000'
        // NEXT_PUBLIC_* vars are inlined into the client bundle at build
        // time, not read at container runtime, so they must reach `docker
        // build` as --build-args, not just live in the .env file below —
        // the Dockerfile's own ARG/ENV fallback (ws://localhost:9001)
        // otherwise wins over the .env file's value, since Next's dotenv
        // loader never overrides an already-set process env var.
        NEXT_PUBLIC_API_URL = 'https://api.wikiai.by'
        NEXT_PUBLIC_WS_URL  = 'wss://api.wikiai.by'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Create .env') {
            steps {
                echo 'Writing .env file...'
                writeFile file: '.env', text: """\
# ========================================
# UNIFIED BACKEND CONFIGURATION
# ========================================

# OPTION 1: Local Development (default)
# NEXT_PUBLIC_API_URL=http://localhost:9001
# NEXT_PUBLIC_WS_URL=ws://localhost:9001

# OPTION 2: Production Server
NEXT_PUBLIC_API_URL=${env.NEXT_PUBLIC_API_URL}
NEXT_PUBLIC_WS_URL=${env.NEXT_PUBLIC_WS_URL}

# ========================================
# ADDITIONAL CONFIGURATION
# ========================================

# API Timeout (in milliseconds)
NEXT_PUBLIC_API_TIMEOUT=30000

# Enable Debug Mode (shows detailed API logs)
NEXT_PUBLIC_DEBUG=true

# CORS Fallback (enables mock responses when CORS fails)
NEXT_PUBLIC_ENABLE_CORS_FALLBACK=true

# ========================================
# CMS SPECIFIC CONFIGURATION
# ========================================

# CMS API Prefix (usually /api/cms)
NEXT_PUBLIC_CMS_PREFIX=/api/cms

# CMS Admin Password (for admin login)
# User must enter this manually - no default value
"""
                sh 'cat .env'
            }
        }

        stage('Build Docker Image') {
            steps {
                echo "Building ${IMAGE_NAME}:${IMAGE_TAG} ..."
                sh """
                    docker build \
                        --build-arg NEXT_PUBLIC_WS_URL=${env.NEXT_PUBLIC_WS_URL} \
                        --build-arg BACKEND_URL=${env.NEXT_PUBLIC_API_URL} \
                        -t ${IMAGE_NAME}:${IMAGE_TAG} .
                """
            }
        }

        stage('Stop & Remove Old Container') {
            steps {
                echo "Stopping and removing old container '${CONTAINER_NAME}' if it exists..."
                sh """
                    docker stop ${CONTAINER_NAME} || true
                    docker rm   ${CONTAINER_NAME} || true
                """
            }
        }

        stage('Run New Container') {
            steps {
                echo "Starting new container '${CONTAINER_NAME}' on port ${HOST_PORT}..."
                sh """
                    docker run -d \
                        --name ${CONTAINER_NAME} \
                        -p ${HOST_PORT}:${CONTAINER_PORT} \
                        --restart unless-stopped \
                        ${IMAGE_NAME}:${IMAGE_TAG}
                """
            }
        }

        stage('Healthcheck') {
            steps {
                echo 'Waiting for container to become healthy...'
                sh """
                    sleep 5
                    docker ps --filter "name=${CONTAINER_NAME}" --filter "status=running" | grep ${CONTAINER_NAME}
                """
            }
        }

        stage('Cleanup Dangling Images') {
            steps {
                echo 'Removing dangling/unused images...'
                sh 'docker image prune -f || true'
            }
        }
    }

    post {
        success {
            echo "✅ Frontend deployed successfully on port ${HOST_PORT}"
        }
        failure {
            echo "❌ Frontend deployment failed — check logs"
            sh "docker logs ${CONTAINER_NAME} || true"
        }
    }
}
