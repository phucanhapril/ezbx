#!/usr/bin/env bash

# Execute bx command with exit & error message on fail
exe () {
  if ! eval ${1}; then
    echo "bx command failed: ${1}"
    exit 1
  fi
}

# Variables (required unless noted with *)
# APP_NAME: name of Cloud Foundry application to map route to
# OLD_APP_NAME*: name of CF application to unmap route from
# DOMAIN: domain of route, e.g. mybluemix.net
# HOSTNAME*: host name of route. set to app name/container group by default

echo $"\nPreparing to map..."
exe "bx app route-map ${APP_NAME} ${DOMAIN} -n ${HOSTNAME}"

if [ "$OLD_APP_NAME" != null  ]; then
  echo $"\nPreparing to unmap..."
  exe "bx app route-unmap ${OLD_APP_NAME} ${DOMAIN} -n ${HOSTNAME}"
fi
