# Authentik User Manager

A simple GUI to give sub users a tool to move certain users from group to another. Tipical scenario:  You have a gym with a group of gym managers and you want to give access to them to move gym users from a no access group to the main app group.  Instead of explaing and giving the full course on how to do it using Authentik, this app allows you to give them a simple GUI to do it.

## Features

- Responsive design
- Uses Authentik API to manage users
- Connection to Healtcheck services (<https://healthchecks.io>)
- Full log of events (access, errors, etc.)

## Prerequisites

You need to have an Authentik instance running and an user with API access to user/group management. You can find more information on how to do this on Authentik documentation [here](https://authentik.io/docs/).

Next, you need to generate an API token, required for the application to access to the API. You can do this on the Authentik UI, under the user profile section.

Once you have done this, you need to setup 4 groups:

- One group for managers, who will have access to this application. For this documentation, this group will be called `ADMIN`.
- One group for new users, where all new users will be added by default. Once this group is set, you need to edit the Authentik flow called `default-source-enrollment` and at the *Stage Bindings* tab, edit the `default-source-enrollment-write` stage and edit the Group with the one you just created. For this documentation, this group will be called `New_Users`.
- One group for users that will have access to the application. For this documentation, this group will be called `APPROVED`.
- One group for users that will not have access to the application. For this documentation, this group will be called `BLOCKED`.

## Installation

- Docker and Docker Compose are required
- Git clone the repo and install the dependencies:
- Edit docker-compose.yml and change the environment variables to your needs. Check `docker-compose.sample.yml` for more details and guidance. This variables, following the details explained in the *Prerequisites* section will be as follows:

```yaml
    environment:
      - TZ=America/New_York
      - APP_PORT=3000 # this must match the port above
      - APP_HEALTHCHECK_URI=https://hc-ping.com/healuuid # https://hc-ping.com/ is a free service to monitor your container
      - APP_HEALTHCHECK_INTERVAL=300 # Healtcheck in seconds.
      - APP_DEBUG=0 # This is the debug level for the app. 0 is no debug, 1 is debug.
      - AUTHENTIK_SERVER=http://authentik:9000/api/v3/ # This is the url to the authentik server.
      - AUTHENTIK_TOKEN=DKDKDKDKDKD-DKDKDKDKDKDKDKD # This is the access token for authentik.
      - AUTHENTIK_MANAGER_GROUP=ADMIN # This is the group name for managers who will control users. (This is not implemented, it will be set for future releases)
      - AUTHENTIK_NEWUSER_GROUP=New_Users # This is the source group for new users.
      - AUTHENTIK_DESUSER_GROUP=APPROVED # This is the destination group name.
      - AUTHENTIK_BLOCKED_GROUP=BLOCKED # This is the blocked group name.

```

- Run `docker-compose up -d` to start the container application

## Other stuff

Tested on Authentik version 2023.5.2
