#!/usr/bin/env bash

# Execute bx command with exit & error message on fail
exe () {
  if ! eval ${1}; then
    echo "bx command failed: ${1}"
    exit 1
  fi
}

# Required Environment Variables
# API: API endpoint, e.g. api.ng.bluemix.net
# ORGANIZATION: name of target Cloud Foundry organization to deploy in
# SPACE: name of target CF space to deploy in
# USE_SSO: true if one-time passcode is used

if [ "$USE_SSO" = true ]; then
  exe "bx login -a ${API} --sso -o ${ORGANIZATION} -s ${SPACE}"
else
  exe "bx login -a ${API} -o ${ORGANIZATION} -s ${SPACE}"
fi
