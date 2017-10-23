#!/usr/bin/env bash

# Execute bx command with exit & error message on fail
exe () {
  if ! eval ${1}; then
    echo "bx command failed: ${1}"
    exit 1
  fi
}

# Required Environment Variables
# APP_NAME: name of Cloud Foundry application to deploy
# BUILD_CMD: command to run the build system
# BUILD_DIR: directory of compiled code to distribute, e.g. dist, build
# ENV: NODE_ENV will be set to this, e.g. development, production
# MANIFEST: path to manifest file

# Set Node environment
export NODE_ENV="${ENV}"

# Install node modules & compile the source
npm install
rm -rf ${BUILD_DIR}

${BUILD_CMD}

# Push & start service
exe "bx app push ${APP_NAME} -f ${MANIFEST} --no-start --no-route"
exe "bx app start ${APP_NAME}"
